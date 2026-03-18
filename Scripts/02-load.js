/**
 * HODINA 2 — Load test
 *
 * Otázka: "Zvládne API 10 súbežných userov?"
 *
 * NOVÉ KONCEPTY:
 * - ramping-vus executor: postupné pridávanie záťaže
 * - Trend metrika: meriame response time PER ENDPOINT (nie globálne)
 * - sleep(): simuluje reálneho usera — ľudia neklíkajú 1000x za sekundu
 * - stages: fázy záťaže (ramp-up → steady → ramp-down)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: "token abcdef0123456789",
};

// Trend = vlastná metrika pre response time konkrétneho endpointu
// Uvidíš ju v reporte ako: pizza_duration (avg, p90, p95, p99)
const pizzaDuration = new Trend("pizza_duration", true);

export const options = {
  scenarios: {
    pizza_load: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 5 }, // ramp-up: 0 → 5 VU
        { duration: "20s", target: 10 }, // ramp-up: 5 → 10 VU
        { duration: "20s", target: 10 }, // steady: 10 VU
        { duration: "10s", target: 0 }, // ramp-down: 10 → 0 VU
      ],
    },
  },

  thresholds: {
    // Globálne thresholds
    http_req_failed: ["rate<0.01"], // max 1% chýb
    http_req_duration: ["p(95)<3000"], // globálny p95 < 3s

    // Per-endpoint threshold (cez náš Trend)
    pizza_duration: ["p(95)<3000", "p(99)<5000"],
  },
};

export default function loadTest() {
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
    { headers: HEADERS, tags: { name: "POST /api/pizza" } },
  );

  // Zaznamenáme response time do nášho Trend
  pizzaDuration.add(res.timings.duration);

  check(res, {
    "status je 200": (r) => r.status === 200,
    "pizza má meno": (r) => r.json()?.pizza?.name !== undefined,
    "pizza má ingredients": (r) => r.json()?.pizza?.ingredients?.length > 0,
  });

  // sleep(1) = user si prečíta výsledok pred ďalším kliknutím
  // BEZ sleep: k6 pošle tisíce requestov za sekundu → nereálne
  // S sleep(1): každý VU robí ~1 request/s → realistické
  sleep(1);
}
