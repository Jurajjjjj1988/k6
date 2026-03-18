import {
  makeAccNum,
  makeId,
  generateIBAN,
  generateSimplePiggyName,
} from "./dataCreators.js";

// ─── Environment variables ────────────────────────────────────────────────────
// Usage:
//   k6 run -e API_TOKEN=<token> Scripts/load-test.e2e.k6.js
//   k6 run -e API_TOKEN=<token> -e BASE_URL=https://staging.example.com/api Scripts/load-test.e2e.k6.js

export const url = __ENV.BASE_URL || "https://fintech-testlab.coderslab.pl/api";

if (!__ENV.API_TOKEN) {
  throw new Error(
    "[k6] Missing required env var: API_TOKEN\n" +
      "Run: k6 run -e API_TOKEN=<your_token> Scripts/load-test.e2e.k6.js",
  );
}

export const bearerToken = __ENV.API_TOKEN;

// ─── Per-VU test data (generated fresh for each VU in init context) ───────────
export const accountName = makeId(16);
export const accountNumber = makeAccNum(13);
export const iban1 = generateIBAN();
export const piggyBankName = generateSimplePiggyName();
