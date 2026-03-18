/**
 * HODINA 4 — TypeScript
 *
 * NOVÉ KONCEPTY:
 * - interface: definujeme tvar objektu — IDE ti napovie, TS zachytí preklep
 * - Options type: k6 Options má typ → žiadne neznáme polia
 * - Response typing: vieš čo je v res.json() bez hádania
 * - Enum namiesto magic strings: "POST /api/pizza" → TagName.Pizza
 */

import http, { RefinedResponse, ResponseType } from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { Options } from "k6/options";

const BASE_URL: string = __ENV.BASE_URL || "https://quickpizza.grafana.com";

// ─── Typy ─────────────────────────────────────────────────────────────────────

// Tvar request body — TS ti nedovolí poslať neznáme pole
interface PizzaRequest {
  maxCaloriesPerSlice: number;
  mustBeVegetarian: boolean;
  excludedIngredients: string[];
  excludedTools: string[];
  maxNumberOfToppings: number;
  minNumberOfToppings: number;
}

// Tvar response — vieš čo čakáš späť
interface Ingredient {
  id: number;
  name: string;
}

interface Pizza {
  id: number;
  name: string;
  ingredients: Ingredient[];
}

interface PizzaResponse {
  pizza: Pizza;
}

// ─── Metriky ──────────────────────────────────────────────────────────────────
const pizzaDuration = new Trend("pizza_duration", true);

// ─── Options — typované, IDE napovie každé pole ───────────────────────────────
export const options: Options = {
  scenarios: {
    pizza_ts: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 5 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
    pizza_duration: ["p(95)<3000"],
  },
};

// ─── Request body ako typed konštanta ─────────────────────────────────────────
const PIZZA_REQUEST: PizzaRequest = {
  maxCaloriesPerSlice: 500,
  mustBeVegetarian: false,
  excludedIngredients: [],
  excludedTools: [],
  maxNumberOfToppings: 6,
  minNumberOfToppings: 2,
  // caloriesPerSlice: 500  ← TS ERROR: neexistuje v PizzaRequest
};

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `token ${__ENV.API_TOKEN || "abcdef0123456789"}`,
};

// ─── Hlavný VU kód ────────────────────────────────────────────────────────────
export default function typedTest(): void {
  const res = http.post(
    `${BASE_URL}/api/pizza`,
    JSON.stringify(PIZZA_REQUEST),
    { headers: HEADERS, tags: { name: "POST /api/pizza" } },
  );

  pizzaDuration.add(res.timings.duration);

  // TypeScript: musíme explicitne pretypovať json()
  // res.json() vracia unknown — TS ťa núti myslieť čo tam naozaj je
  const body = res.json() as PizzaResponse;

  check(res, {
    "status 200": (r) => r.status === 200,
    "pizza má meno": () => typeof body?.pizza?.name === "string",
    "pizza má ingredients": () => body?.pizza?.ingredients?.length > 0,
    "kalórie sú číslo": () => typeof body?.pizza?.id === "number",
  });

  sleep(1);
}
