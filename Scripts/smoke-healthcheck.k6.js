import http from "k6/http";
import { check } from "k6";
import { url } from "../helpers/dataVariable.js";

// Smoke test — run before every load test to confirm API is alive.
// Usage: k6 run -e API_TOKEN=<token> Scripts/smoke-healthcheck.k6.js

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate==0"],
  },
};

export default function () {
  const res = http.get(`${url}/health`, {
    tags: { name: "GET /health" },
  });

  check(res, {
    "health: status 200": (r) => r.status === 200,
    "health: response time <500ms": (r) => r.timings.duration < 500,
    "health: body contains ok": (r) => {
      try {
        return r.json()?.data === "ok" || r.body?.includes("ok");
      } catch {
        return r.body?.includes("ok");
      }
    },
  });
}
