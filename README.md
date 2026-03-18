# k6 Performance Tests

Performance and load testing suite built with [k6](https://k6.io), targeting the [QuickPizza](https://quickpizza.grafana.com) demo API.

Covers smoke, load, and authenticated user journey scenarios with per-endpoint metrics, thresholds, and a GitHub Actions CI pipeline.

## Scripts

| Script                           | Type      | What it tests                              |
| -------------------------------- | --------- | ------------------------------------------ |
| `Scripts/01-smoke.js`            | Smoke     | API is alive, response structure is valid  |
| `Scripts/02-load.js`             | Load      | API handles 10 concurrent users within SLA |
| `Scripts/03-auth-correlation.js` | Auth flow | Register → login → order pizza → rate it   |
| `Scripts/04-typescript.ts`       | Typed     | Same as smoke, with TypeScript interfaces  |

## Setup

```bash
npm install        # installs @types/k6 for IDE support
cp .env.example .env
```

Edit `.env` with your values — k6 reads them via `-e` flags, not dotenv.

## Running tests

```bash
# Smoke — run before anything else
k6 run Scripts/01-smoke.js

# Load
k6 run Scripts/02-load.js

# Auth flow
k6 run Scripts/03-auth-correlation.js

# With custom target
k6 run -e BASE_URL=https://staging.example.com Scripts/02-load.js

# HTML report
k6 run --out json=results.json Scripts/02-load.js
k6 report results.json
```

## Environment variables

| Variable    | Required | Default                          |
| ----------- | -------- | -------------------------------- |
| `BASE_URL`  | no       | `https://quickpizza.grafana.com` |
| `API_TOKEN` | no       | demo token                       |

## CI

GitHub Actions runs smoke on every push and pull request. Load test runs only on `main` after smoke passes.

Add `API_TOKEN` and `BASE_URL` as [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) if targeting a non-public environment.

## Project structure

```
Scripts/          test scripts
helpers/          shared request builders and env vars
.github/
  workflows/
    k6.yml        CI pipeline
.env.example      required environment variables
```
