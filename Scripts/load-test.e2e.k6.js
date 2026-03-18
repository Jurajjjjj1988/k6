import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

import {
  makeId,
  createAccount,
  updateAccountPayload,
} from "../helpers/dataCreators.js";
import { url, bearerToken } from "../helpers/dataVariable.js";

// ─── Custom metrics ───────────────────────────────────────────────────────────
// Counters: how many requests succeeded / failed per method
const getOk = new Counter("get_ok");
const postOk = new Counter("post_ok");
const putOk = new Counter("put_ok");
const getErr = new Counter("get_err");
const postErr = new Counter("post_err");
const putErr = new Counter("put_err");

// Trends: response time per key endpoint (visible in k6 Cloud / HTML report)
const accountListDuration = new Trend("duration_account_list", true);
const accountCreateDuration = new Trend("duration_account_create", true);
const accountUpdateDuration = new Trend("duration_account_update", true);
const transactionListDuration = new Trend("duration_transaction_list", true);

// ─── Shared auth headers ──────────────────────────────────────────────────────
const headers = {
  Authorization: `Bearer ${bearerToken}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// ─── Scenarios ────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // 1. CRUD flow — 1 VU for 30s, verifies full account lifecycle
    account_basic_flow: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      exec: "scenarioCrudFlow",
    },
    // 2. Load test — ramps up to 5 concurrent users creating accounts
    account_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 5 },
        { duration: "10s", target: 0 },
      ],
      exec: "scenarioLoadAccounts",
    },
    // 3. Spike — burst of 50 req/s to list endpoints (simulates traffic spike)
    transaction_spike: {
      executor: "constant-arrival-rate",
      rate: 50,
      timeUnit: "1s",
      duration: "10s",
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: "scenarioSpike",
    },
    // 4. Negative — unauthorized requests must return 401, not 500
    unauthorized: {
      executor: "constant-vus",
      vus: 1,
      duration: "10s",
      exec: "scenarioUnauthorized",
    },
  },

  thresholds: {
    // Global
    http_req_duration: ["p(90)<2500", "p(95)<3500"],
    http_req_failed: ["rate<0.01"],
    // Per endpoint
    duration_account_list: ["p(95)<1000"],
    duration_account_create: ["p(95)<2000"],
    duration_account_update: ["p(95)<2000"],
    duration_transaction_list: ["p(95)<1500"],
    // Error budgets
    get_err: ["count<5"],
    post_err: ["count<5"],
    put_err: ["count<5"],
  },
};

// ─── Setup — verify API is alive before load starts ───────────────────────────
export function setup() {
  const res = http.get(`${url}/v1/accounts?limit=1`, { headers });
  if (res.status !== 200) {
    throw new Error(
      `[setup] API not ready — status: ${res.status}, body: ${res.body}`,
    );
  }
  console.log(`[setup] API is up (${res.timings.duration.toFixed(0)}ms)`);
}

// ─── Scenario 1: Full account CRUD lifecycle ──────────────────────────────────
export function scenarioCrudFlow() {
  // GET list
  let res = http.get(`${url}/v1/accounts`, {
    headers,
    tags: { name: "GET /accounts" },
  });
  accountListDuration.add(res.timings.duration);
  assertStatus(res, 200, "GET accounts", getOk, getErr);
  sleep(1);

  // POST create
  res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), {
    headers,
    tags: { name: "POST /accounts" },
  });
  accountCreateDuration.add(res.timings.duration);
  assertStatus(res, [200, 201], "POST account", postOk, postErr);

  const accountId = res.json("data.id");
  if (!accountId) return;
  sleep(1);

  // PUT update
  res = http.put(
    `${url}/v1/accounts/${accountId}`,
    JSON.stringify(updateAccountPayload(makeId(10))),
    { headers, tags: { name: "PUT /accounts/:id" } },
  );
  accountUpdateDuration.add(res.timings.duration);
  assertStatus(res, [200, 201], "PUT account", putOk, putErr);
  sleep(1);
}

// ─── Scenario 2: Account creation under load ──────────────────────────────────
export function scenarioLoadAccounts() {
  const res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), {
    headers,
    tags: { name: "POST /accounts" },
  });
  accountCreateDuration.add(res.timings.duration);
  assertStatus(res, [200, 201], "POST account (load)", postOk, postErr);

  const accountId = res.json("data.id");
  if (!accountId) return;

  const detail = http.get(`${url}/v1/accounts/${accountId}`, {
    headers,
    tags: { name: "GET /accounts/:id" },
  });
  accountListDuration.add(detail.timings.duration);
  assertStatus(detail, 200, "GET account detail (load)", getOk, getErr);
  sleep(1);
}

// ─── Scenario 3: Spike — high-concurrency read burst ─────────────────────────
export function scenarioSpike() {
  const res = http.get(`${url}/v1/transactions`, {
    headers,
    tags: { name: "GET /transactions" },
  });
  transactionListDuration.add(res.timings.duration);
  assertStatus(res, 200, "GET transactions (spike)", getOk, getErr);
}

// ─── Scenario 4: Unauthorized — API must reject missing token with 401 ────────
export function scenarioUnauthorized() {
  const res = http.get(`${url}/v1/accounts`, {
    headers: { Accept: "application/json" }, // no Authorization header
    tags: { name: "GET /accounts unauthorized" },
  });

  check(res, {
    "unauthorized: status is 401": (r) => r.status === 401,
    "unauthorized: not 500": (r) => r.status !== 500,
  });
  sleep(2);
}

// ─── Teardown ─────────────────────────────────────────────────────────────────
export function teardown() {
  console.log("[teardown] Load test complete.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assertStatus(res, expected, name, okCounter, errCounter) {
  const expectedArr = Array.isArray(expected) ? expected : [expected];
  const ok = check(res, {
    [`${name} → status ${expectedArr.join("/")}`]: (r) =>
      expectedArr.includes(r.status),
    [`${name} → has body`]: (r) => r.body && r.body.length > 0,
  });

  ok ? okCounter.add(1) : errCounter.add(1);

  if (!ok) {
    console.error(
      `[FAIL] ${name} | status: ${res.status} | body: ${res.body?.slice(0, 200)}`,
    );
  }
}
