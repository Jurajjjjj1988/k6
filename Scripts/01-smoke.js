/**
 * HODINA 1 — Smoke test
 *
 * Otázka: "Je API nahoré a vracia správne dáta?"
 * Pravidlo: 1 VU, 1 iterácia — žiadna záťaž, len overenie.
 *
 * ČO SME SA NAUČILI:
 * - Vždy si prečítaj API docs pred písaním testu
 * - GET vs POST je základný rozdiel — k6 to neoverí za teba
 * - http_req_failed = 100% neznamená "sieť padla", ale "server vrátil chybu"
 */

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

// Request body — čo chceme od pizze
const RESTRICTIONS = JSON.stringify({
  maxCaloriesPerSlice: 500,
  mustBeVegetarian: false,
  excludedIngredients: [],
  excludedTools: [],
  maxNumberOfToppings: 6,
  minNumberOfToppings: 2,
});

// Headers — každý request potrebuje tieto
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: "token abcdef0123456789",
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
  const res = http.post(`${BASE_URL}/api/pizza`, RESTRICTIONS, {
    headers: HEADERS,
    tags: { name: "POST /api/pizza" },
  });

  check(res, {
    "status je 200": (r) => r.status === 200,
    "pizza má meno": (r) => r.json()?.pizza?.name !== undefined,
    "pizza má ingredients": (r) => r.json()?.pizza?.ingredients?.length > 0,
    "response time < 2000ms": (r) => r.timings.duration < 2000,
  });

  if (res.status === 200) {
    const pizza = res.json().pizza;
    console.log(
      `Pizza: "${pizza.name}" | Ingredients: ${pizza.ingredients.length} | Time: ${res.timings.duration.toFixed(0)}ms`,
    );
  } else {
    console.error(
      `FAIL: status=${res.status} | body=${res.body?.slice(0, 200)}`,
    );
  }
}
