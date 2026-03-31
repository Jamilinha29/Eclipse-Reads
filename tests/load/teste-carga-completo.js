import http from 'k6/http';
import { sleep, check } from 'k6';


const BASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_KEY = __ENV.SUPABASE_KEY;

if (!BASE_URL || !SUPABASE_KEY) {
    throw new Error(
        "Missing required env vars: SUPABASE_URL and SUPABASE_KEY. " +
        "Example: k6 run -e SUPABASE_URL=https://your-project.supabase.co -e SUPABASE_KEY=your_anon_key tests/load/teste-carga-completo.js"
    );
}


export let options = {
    
    stages: [
        { duration: "45s", target: 10 },
        { duration: "45s", target: 50 },
        { duration: "45s", target: 150 },
        { duration: "60s", target: 500 },
        { duration: "30s", target: 0 }
    ],
    thresholds: {
        "http_req_duration": ["p(95)<4000"], 
        "http_req_failed": ["rate<0.01"]    
    },
};

export default function () {
    const params = {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`, 
        },
        tags: { name: 'Listar_Livros_Anonimos' }
    };

    const res = http.get(`${BASE_URL}/rest/v1/books?select=*`, params);

    check(res, {
        'status é 200 (OK)': (r) => r.status === 200,
        'recebeu dados': (r) => typeof r.body === "string" && r.body.length > 0,
    });

    sleep(1);
}