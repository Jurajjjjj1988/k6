/**
 * Soak test — checks system stability over an extended period.
 *
 * Runs at normal load for a long time to catch problems that only appear
 * after sustained use: memory leaks, connection pool exhaustion, log disk
 * filling up, DB connection limits, or gradual response time degradation.
 *
 * For trading systems this is critical — markets are open for hours and
 * the platform must maintain consistent performance throughout the session.
 *
 * NOTE: This test runs for 5 minutes by default. For real soak testing
 * increase to 1-4 hours via: k6 run -e SOAK_DURATION=3600s Scripts/06-soak.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";
const SOAK_DURATION = __ENV.SOAK_DURATION || "300s";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${__ENV.API_TOKEN || "abcdef0123456789"}`,
};

const pizzaDuration = new Trend("pizza_duration", true);
const errors = new Counter("errors");

export const options = {
  scenarios: {
    soak: {
      executor: "ramping-vus",
      stages: [
        // Ramp up to normal load
        { duration: "30s", target: 10 },
        // Hold at steady state for the configured duration
        { duration: SOAK_DURATION, target: 10 },
        // Ramp down
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    // Same thresholds as load test — performance must stay consistent
    // If these fail after 30 minutes but pass after 5, that's a leak
    http_req_duration: ["p(95)<3000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    pizza_duration: ["p(95)<3000"],
    errors: ["count<10"],
  },
};

const PAYLOAD = JSON.stringify({
  maxCaloriesPerSlice: 500,
  mustBeVegetarian: false,
  excludedIngredients: [],
  excludedTools: [],
  maxNumberOfToppings: 6,
  minNumberOfToppings: 2,
});

export default function soakTest() {
  const res = http.post(`${BASE_URL}/api/pizza`, PAYLOAD, {
    headers: HEADERS,
    tags: { name: "POST /api/pizza" },
  });

  pizzaDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "pizza has name": (r) => typeof r.json()?.pizza?.name === "string",
    "response under SLA": (r) => r.timings.duration < 3000,
  });

  if (!ok) {
    errors.add(1);
  }

  sleep(1);
}
