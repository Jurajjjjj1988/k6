# k6 Performance Tests

k6 test suite against the [QuickPizza](https://quickpizza.grafana.com) demo API. Smoke, load, and auth flow scenarios with per-endpoint metrics and a CI pipeline.

## Requirements

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed locally
- Node.js (only for `npm install` to get `@types/k6` — not needed to run tests)

## Quick start

```bash
npm install
k6 run Scripts/01-smoke.js
```

k6 doesn't read `.env` files — pass variables with `-e`:

```bash
k6 run -e BASE_URL=https://staging.example.com -e API_TOKEN=yourtoken Scripts/02-load.js
```

Copy `.env.example` to see what variables are available.

## Scripts

- `01-smoke.js` — sanity check, 1 VU, zero error tolerance. Run this before anything else.
- `02-load.js` — ramps to 10 VUs, checks p95/p99 against SLA thresholds
- `03-auth-correlation.js` — full user journey: register → login → order pizza → rate it
- `04-typescript.ts` — same as smoke but typed, useful as a starting point for new scripts

## CI

Smoke runs on every push. Load test runs only on `main` after smoke passes — no point hammering the API on every PR branch.

If you're targeting a non-public environment, add `API_TOKEN` and `BASE_URL` as GitHub Secrets.
