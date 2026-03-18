/**
 * Smoke test — run before every load test to confirm API is alive.
 * Zero tolerance: any failure here blocks the pipeline.
 */

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

const PAYLOAD = JSON.stringify({
  maxCaloriesPerSlice: 500,
  mustBeVegetarian: false,
  excludedIngredients: [],
  excludedTools: [],
  maxNumberOfToppings: 6,
  minNumberOfToppings: 2,
});

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${__ENV.API_TOKEN || "abcdef0123456789"}`,
};

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function smokeTest() {
  const res = http.post(`${BASE_URL}/api/pizza`, PAYLOAD, {
    headers: HEADERS,
    tags: { name: "POST /api/pizza" },
  });

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "pizza has name": (r) => typeof r.json()?.pizza?.name === "string",
    "pizza has ingredients": (r) => r.json()?.pizza?.ingredients?.length > 0,
    "response under 2s": (r) => r.timings.duration < 2000,
  });

  if (ok) {
    const pizza = res.json().pizza;
    console.log(
      `[smoke] OK — "${pizza.name}" (${pizza.ingredients.length} ingredients, ${res.timings.duration.toFixed(0)}ms)`,
    );
  } else {
    console.error(`[smoke] FAIL ${res.status}: ${res.body?.slice(0, 300)}`);
  }
}
