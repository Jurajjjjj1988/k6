/**
 * Load test — validates API behaviour under concurrent users.
 *
 * Thresholds based on internal SLA:
 *   p95 < 3s  — acceptable UX degradation under load
 *   p99 < 5s  — hard ceiling before users abandon the request
 *   error rate < 1% — aligns with 99.9% uptime target
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${__ENV.API_TOKEN || "abcdef0123456789"}`,
};

// Per-endpoint trend instead of relying solely on http_req_duration,
// which aggregates all requests and can mask slow individual endpoints.
const pizzaDuration = new Trend("pizza_duration", true);

export const options = {
  scenarios: {
    pizza_load: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 10 },
        { duration: "20s", target: 10 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
    pizza_duration: ["p(95)<3000", "p(99)<5000"],
  },
};

const PIZZA_PAYLOAD = JSON.stringify({
  maxCaloriesPerSlice: 500,
  mustBeVegetarian: false,
  excludedIngredients: [],
  excludedTools: [],
  maxNumberOfToppings: 6,
  minNumberOfToppings: 2,
});

export default function loadTest() {
  const res = http.post(`${BASE_URL}/api/pizza`, PIZZA_PAYLOAD, {
    headers: HEADERS,
    tags: { name: "POST /api/pizza" },
  });

  pizzaDuration.add(res.timings.duration);

  check(res, {
    "status 200": (r) => r.status === 200,
    "pizza has name": (r) => typeof r.json()?.pizza?.name === "string",
    "pizza has ingredients": (r) => r.json()?.pizza?.ingredients?.length > 0,
  });

  sleep(1);
}
