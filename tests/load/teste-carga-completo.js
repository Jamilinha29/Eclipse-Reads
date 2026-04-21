/**
 * Carga contra PostgREST do Supabase (REST `books`). Credenciais só via env — nunca no código.
 *
 *   k6 run tests/load/teste-carga-completo.js -e SUPABASE_URL=... -e SUPABASE_KEY=...
 */
import http from "k6/http";
import { sleep, check } from "k6";

const BASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_KEY = __ENV.SUPABASE_KEY;

if (!BASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Defina SUPABASE_URL e SUPABASE_KEY (anon). " +
      "Ex.: k6 run tests/load/teste-carga-completo.js -e SUPABASE_URL=https://xxx.supabase.co -e SUPABASE_KEY=eyJ..."
  );
}

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-vus",
      vus: 5,
      duration: "45s",
    },
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "45s", target: 50 },
        { duration: "45s", target: 150 },
        { duration: "60s", target: 200 },
        { duration: "30s", target: 0 },
      ],
      startTime: "45s",
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<4000"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  const params = {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    tags: { name: "Listar_Livros_Anonimos" },
  };

  const res = http.get(`${BASE_URL}/rest/v1/books?select=*`, params);

  check(res, {
    "status 200": (r) => r.status === 200,
    "body não vazio": (r) => typeof r.body === "string" && r.body.length > 0,
  });

  sleep(1);
}