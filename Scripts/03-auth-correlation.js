/**
 * HODINA 3 — Auth flow & Correlation
 *
 * Otázka: "Ako testovať endpoint ktorý vracia dynamický token?"
 *
 * NOVÉ KONCEPTY:
 * - setup(): bežíme RAZ pred všetkými VU — registrácia, login, seed dáta
 * - teardown(data): bežíme RAZ po skončení — cleanup
 * - Correlation: vytiahneme token/ID z response a použijeme v ďalšom requeste
 * - group(): logicky zoskupíme requesty — vidno v HTML/Cloud reporte
 * - JSON path extraction: res.json("data.token") — nie celý JSON
 *
 * FLOW:
 *   setup()  → registrácia + login → return { token, username }
 *   VU loop  → POST /api/pizza (s tokenom) → extract pizza.name
 *           → POST /api/ratings (pizza.name + token) ← KORELACE!
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://quickpizza.grafana.com";

// ─── Metriky ──────────────────────────────────────────────────────────────────
const pizzaDuration = new Trend("pizza_duration", true);
const ratingDuration = new Trend("rating_duration", true);
const ratingsTotal = new Counter("ratings_submitted");

// ─── Konfigurácia ─────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    auth_flow: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 3 }, // ramp-up
        { duration: "20s", target: 3 }, // steady — malé číslo, auth flow je zložitejší
        { duration: "10s", target: 0 }, // ramp-down
      ],
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"], // auth má viac variability
    http_req_duration: ["p(95)<5000"],
    pizza_duration: ["p(95)<3000"],
    rating_duration: ["p(95)<2000"],
    ratings_submitted: ["count>5"], // overíme, že sme naozaj ratovali
  },
};

// ─── setup(): bežíme RAZ, return data dostanú VŠETKY VU ──────────────────────
export function setup() {
  // Vytvoríme jedinečného test usera
  const username = `k6_${Date.now()}`;
  const password = "Testpass123!";

  // 1. Registrácia
  const registerRes = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify({ username, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(registerRes, {
    "[setup] user registered": (r) => r.status === 201 || r.status === 200,
  });

  if (registerRes.status !== 201 && registerRes.status !== 200) {
    console.error(
      `[setup] Registration failed: ${registerRes.status} ${registerRes.body?.slice(0, 200)}`,
    );
    // setup() failure = celý test sa nepustí
    throw new Error(`Cannot register user — aborting test`);
  }

  console.log(`[setup] Registered user: ${username}`);

  // 2. Login — KORELACE: vytiahneme token z response
  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(loginRes, {
    "[setup] login ok": (r) => r.status === 200,
    "[setup] token present": (r) => r.json()?.token !== undefined,
  });

  // json("token") = shorthand pre r.json().token
  const token = loginRes.json("token");
  console.log(`[setup] Got token: ${token?.slice(0, 8)}...`);

  // Vrátime dáta — každý VU dostane tento objekt ako parameter `data`
  return { token, username };
}

// ─── Hlavný VU kód ────────────────────────────────────────────────────────────
// `data` = čo sme vrátili zo setup()
export default function authFlow(data) {
  const { token } = data;

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `token ${token}`,
  };

  // group() = len logická sekcia, neovplyvňuje beh
  // V HTML reporte uvidíš časy per-group
  group("Get pizza recommendation", () => {
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
      "pizza: has name": (r) => r.json()?.pizza?.name !== undefined,
    });

    // KORELACE: z pizza response vytiahneme ID pre rating
    if (ok) {
      const pizzaId = res.json("pizza.id"); // integer, nie name!

      sleep(1); // user si prečíta pizzu pred hodnotením

      // Vnorená korelace: pizzaId z predošlého requestu → rating request
      group("Rate pizza", () => {
        const ratingRes = http.post(
          `${BASE_URL}/api/ratings`,
          JSON.stringify({
            pizza_id: pizzaId,
            stars: Math.floor(Math.random() * 5) + 1, // 1–5 hviezd
          }),
          { headers: authHeaders, tags: { name: "POST /api/ratings" } },
        );

        ratingDuration.add(ratingRes.timings.duration);

        const ratingOk = check(ratingRes, {
          "rating: status 200 or 201": (r) =>
            r.status === 200 || r.status === 201,
        });

        if (ratingOk) {
          ratingsTotal.add(1);
        } else {
          console.error(
            `[rating] FAIL: status=${ratingRes.status} | ${ratingRes.body?.slice(0, 200)}`,
          );
        }
      });
    }
  });

  sleep(1);
}

// ─── teardown(data): bežíme RAZ po skončení všetkých VU ──────────────────────
export function teardown(data) {
  console.log(`[teardown] Test finished for user: ${data.username}`);
  // Tu by sme mohli napr. vymazať test usera cez DELETE /api/users/:id
  // Pre demo necháme — QuickPizza je verejný sandbox
}
