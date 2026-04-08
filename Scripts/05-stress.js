/**
 * Stress test — finds the breaking point of the API.
 *
 * Ramps beyond normal load to see where the system degrades or fails.
 * Unlike load test (stays within SLA), stress test deliberately pushes
 * past the limit to answer: "At what point does the API stop responding
 * within acceptable time, and does it recover after the load drops?"
 *
 * Relevant for trading systems where traffic spikes during market open,
 * economic announcements, or flash crashes are expected.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${__ENV.API_TOKEN || "abcdef0123456789"}`,
};

const pizzaDuration = new Trend("pizza_duration", true);
const errors = new Counter("errors");

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      stages: [
        // Warm up
        { duration: "10s", target: 5 },
        // Normal load
        { duration: "20s", target: 10 },
        // Push beyond normal
        { duration: "20s", target: 25 },
        // Peak stress
        { duration: "20s", target: 50 },
        // Hold at peak — does the system stay alive?
        { duration: "30s", target: 50 },
        // Recovery — ramp down and observe if metrics return to normal
        { duration: "20s", target: 10 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    // Intentionally looser than load test — we EXPECT degradation
    // The question is: does it degrade gracefully or crash?
    http_req_duration: ["p(95)<10000"],
    http_req_failed: ["rate<0.15"], // up to 15% errors acceptable under extreme load
    errors: ["count<100"],
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

export default function stressTest() {
  const res = http.post(`${BASE_URL}/api/pizza`, PAYLOAD, {
    headers: HEADERS,
    tags: { name: "POST /api/pizza" },
  });

  pizzaDuration.add(res.timings.duration);

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "has body": (r) => r.body && r.body.length > 0,
  });

  if (!ok) {
    errors.add(1);
  }

  // Shorter sleep than load test — higher request rate per VU
  sleep(0.5);
}
