/**
 * Carga nos endpoints HTTP dos microserviços (sem segredos no ficheiro).
 *
 * Uso:
 *   k6 run tests/load/k6-books-api.js -e BOOKS_API_BASE_URL=http://localhost:4000
 *
 * Opcional: LIBRARY_SERVICE_URL, AUTH_PROXY_URL para pings adicionais.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BOOKS = __ENV.BOOKS_API_BASE_URL;
const LIBRARY = __ENV.LIBRARY_SERVICE_URL;
const AUTH = __ENV.AUTH_PROXY_URL;

if (!BOOKS) {
  throw new Error(
    "Defina BOOKS_API_BASE_URL (ex.: http://localhost:4000). Sem valor padrão para evitar disparar carga contra ambiente errado."
  );
}

export const options = {
  scenarios: {
    leve: {
      executor: "constant-vus",
      vus: 3,
      duration: "30s",
      startTime: "0s",
      gracefulStop: "5s",
      tags: { phase: "leve" },
    },
    media: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 15 },
        { duration: "40s", target: 15 },
      ],
      startTime: "30s",
      gracefulRampDown: "10s",
      tags: { phase: "media" },
    },
    pico: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 80 },
        { duration: "30s", target: 80 },
        { duration: "15s", target: 0 },
      ],
      startTime: "1m45s",
      gracefulRampDown: "15s",
      tags: { phase: "pico" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.08"],
    checks: ["rate>0.90"],
  },
};

function ping(name, url) {
  const res = http.get(url, { tags: { name } });
  check(res, {
    [`${name} status 2xx ou 404 onde aplicável`]: (r) => r.status >= 200 && r.status < 500,
  });
  return res;
}

export default function () {
  ping("books_health", `${BOOKS}/health`);
  ping("books_catalog", `${BOOKS}/books`);

  if (LIBRARY) {
    ping("library_health", `${LIBRARY}/health`);
  }
  if (AUTH) {
    ping("auth_health", `${AUTH}/health`);
  }

  sleep(0.3);
}
