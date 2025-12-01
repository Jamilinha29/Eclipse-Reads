import http from 'k6/http';
import { sleep, check } from 'k6';


const BASE_URL = 'https://vwipzzvyziqwtfwivhns.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3aXB6enZ5emlxd3Rmd2l2aG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTc1MDEsImV4cCI6MjA3NzE3MzUwMX0.g8aeCqgF3_UjKrL6EEMdU_AfS3i8UZF6Cve1vicGnkU'; 


export let options = {
    
    stages: [
        { duration: "30s", target: 10 },  
        { duration: "30s", target: 50 }, 
        { duration: "30s", target: 100 }, 
        { duration: "30s", target: 1000 } 
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
        'recebeu dados': (r) => r.body.length > 0, 
    });

    sleep(1);
}