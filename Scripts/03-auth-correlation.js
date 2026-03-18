/**
 * Auth flow — registration, login, and authenticated pizza rating.
 *
 * Covers the full user journey: register → get token → order pizza → rate it.
 * Uses setup() so we register once and share the token across all VUs.
 * For a realistic multi-user load test, move login into the default function
 * and use __VU to assign unique accounts per virtual user.
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

const pizzaDuration = new Trend("pizza_duration", true);
const ratingDuration = new Trend("rating_duration", true);
const ratingsSubmitted = new Counter("ratings_submitted");

export const options = {
  scenarios: {
    auth_flow: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 3 },
        { duration: "20s", target: 3 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
    pizza_duration: ["p(95)<3000"],
    rating_duration: ["p(95)<2000"],
    // business metric — confirms the feature actually worked, not just that it was fast
    ratings_submitted: ["count>5"],
  },
};

export function setup() {
  const username = `k6_${Date.now()}`;
  const password = "Testpass123!";
  const jsonHeaders = { "Content-Type": "application/json" };

  const registerRes = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify({ username, password }),
    { headers: jsonHeaders },
  );

  check(registerRes, {
    "[setup] registered": (r) => r.status === 200 || r.status === 201,
  });

  if (registerRes.status !== 200 && registerRes.status !== 201) {
    throw new Error(
      `Registration failed (${registerRes.status}): ${registerRes.body?.slice(0, 200)}`,
    );
  }

  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username, password }),
    { headers: jsonHeaders },
  );

  check(loginRes, {
    "[setup] login ok": (r) => r.status === 200,
    "[setup] token present": (r) => r.json()?.token !== undefined,
  });

  const token = loginRes.json("token");
  console.log(`[setup] user: ${username}, token: ${token?.slice(0, 8)}...`);

  return { token, username };
}

export default function authFlow(data) {
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `token ${data.token}`,
  };

  group("order pizza", () => {
    const res = http.post(
      `${BASE_URL}/api/pizza`,
      JSON.stringify({
        maxCaloriesPerSlice: 500,
        mustBeVegetarian: false,
        excludedIngredients: [],
        excludedTools: [],
        maxNumberOfToppings: 6,
        minNumberOfToppings: 2,
      }),
      { headers: authHeaders, tags: { name: "POST /api/pizza" } },
    );

    pizzaDuration.add(res.timings.duration);

    const ok = check(res, {
      "pizza: status 200": (r) => r.status === 200,
      "pizza: has name": (r) => typeof r.json()?.pizza?.name === "string",
    });

    if (ok) {
      const pizzaId = res.json("pizza.id");
      sleep(1);

      group("rate pizza", () => {
        const ratingRes = http.post(
          `${BASE_URL}/api/ratings`,
          JSON.stringify({
            pizza_id: pizzaId,
            stars: Math.floor(Math.random() * 5) + 1,
          }),
          { headers: authHeaders, tags: { name: "POST /api/ratings" } },
        );

        ratingDuration.add(ratingRes.timings.duration);

        const ratingOk = check(ratingRes, {
          "rating: accepted": (r) => r.status === 200 || r.status === 201,
        });

        if (ratingOk) {
          ratingsSubmitted.add(1);
        } else {
          console.error(
            `[rating] ${ratingRes.status}: ${ratingRes.body?.slice(0, 200)}`,
          );
        }
      });
    }
  });

  sleep(1);
}

export function teardown(data) {
  console.log(`[teardown] finished — user: ${data.username}`);
}
