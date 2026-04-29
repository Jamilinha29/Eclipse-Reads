# Eclipse Reads - Deploy na Vercel

## Deploy recomendado (frontend + auth-proxy público)

Para o site estático **e** as rotas HTTP do auth-proxy (`/api/auth/login`, `/api/auth/validate`, etc.) funcionarem no mesmo domínio:

### Painel da Vercel

| Campo | Valor |
|--------|--------|
| **Root Directory** | *(vazio — raiz do repositório)* |
| **Framework Preset** | Other *(ou detecta pelo `vercel.json`)* |
| **Build Command** | *(usa `vercel.json`: `cd frontend && npm run build`)* |
| **Output Directory** | *(usa `vercel.json`: `frontend/dist`)* |
| **Install Command** | `npm install` *(na raiz — instala workspaces)* |
| **Node.js** | 20.x |

O arquivo **`vercel.json` na raiz do repo** define build, `outputDirectory`, rewrites do SPA e encaminhamento de `/api/auth/*` para a serverless function **`api/auth.ts`**.

### Variáveis de ambiente (obrigatórias)

**Frontend (prefixo `VITE_` — embutidas no build):**

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA
```

**Auth-proxy na Vercel (serverless — não use prefixo `VITE_`):**

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=MESMA_CHAVE_ANON_PUBLICA_DO_SUPABASE
```

Use o mesmo projeto Supabase que no frontend (`SUPABASE_URL` = URL do projeto; `SUPABASE_ANON_KEY` = anon/publishable key). Sem essas duas, a função `api/auth` encerra com erro ao inicializar.

### URLs públicas do auth-proxy (após deploy)

Substitua `https://seu-projeto.vercel.app` pelo domínio real:

- `POST https://seu-projeto.vercel.app/api/auth/login`
- `POST https://seu-projeto.vercel.app/api/auth/signup` ou `.../cadastro`
- `GET https://seu-projeto.vercel.app/api/auth/validate` (header `Authorization: Bearer …`)
- `GET https://seu-projeto.vercel.app/api/auth/health`

---

## Deploy só do frontend (sem API auth na Vercel)

Se **Root Directory** = `frontend`, só o build estático sobe; **`api/` na raiz não é deployado**. Login continua pelo Supabase no navegador; não há `/api/auth/*` no domínio.

Use o `frontend/vercel.json` local ou as mesmas variáveis só `VITE_*`.

---

## Estrutura

- **Frontend:** `frontend/` (Vite + React)
- **Auth-proxy (Express):** `services/backend/auth-proxy/` — exposto na nuvem via `api/auth.ts` na raiz
- **Demais backends** (books-api, library-service): em geral outros hosts ou só local

---

## Comandos úteis

```bash
# Frontend
cd frontend && npm install && npm run dev

# Auth-proxy local (porta 4100)
cd services/backend/auth-proxy && npm run dev:env
```
