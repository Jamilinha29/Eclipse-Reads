# Eclipse Reads — Deploy na Vercel

## Uma pasta `api/` (raiz do repositório)

O projeto usa **uma única** superfície de serverless na Vercel: a pasta **`api/` na raiz do repo** (não existe `frontend/api/`).

| Arquivo | Função | Ativo no deploy recomendado? |
|---------|--------|------------------------------|
| `api/auth.ts` | Auth-proxy (`/api/auth/*`) | **Sim** — rewrites em `vercel.json` (raiz) |
| `api/books.ts` | Books-api (opcional) | Não — em produção use host dedicado ou local |
| `api/library.ts` | Library-service (opcional) | Não — idem |

Cada `api/*.ts` reexporta o Express em `services/backend/*/src/index.ts`. O código-fonte dos microserviços continua em `services/backend/`; `api/` é só o **adaptador** para a Vercel.

**Login no app:** o React usa o cliente Supabase (`signInWithPassword` em `frontend/src`). As rotas `/api/auth/*` servem para integrações, testes, validação de token no mesmo domínio e compatibilidade com o auth-proxy — não substituem o fluxo principal do navegador.

---

## Deploy recomendado (SPA + `/api/auth`)

Site estático **e** auth-proxy no **mesmo domínio**.

### Painel da Vercel

| Campo | Valor |
|--------|--------|
| **Root Directory** | *(vazio — raiz do repositório)* |
| **Framework Preset** | Other |
| **Build / Output / Install** | Definidos em `vercel.json` na raiz |
| **Node.js** | 20.x |

O CI (`.github/workflows/main.yml`) executa `vercel deploy --prod --name eclipse-reads` **na raiz**, alinhado a este fluxo.

**Secrets opcionais no GitHub** (evitam criar projeto duplicado): `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` — copie em Vercel → Project → Settings → General.

### Variáveis de ambiente (obrigatórias)

**Frontend (prefixo `VITE_` — embutidas no build):**

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_BOOKS_API_URL=https://url-do-books-api
VITE_LIBRARY_API_URL=https://url-do-library-service
```

**Auth serverless (`api/auth.ts` — sem prefixo `VITE_`):**

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=MESMA_CHAVE_ANON_PUBLICA
```

Sem `SUPABASE_URL` e `SUPABASE_ANON_KEY`, a função `api/auth` falha ao iniciar.

### URLs públicas do auth-proxy

Substitua `https://seu-projeto.vercel.app` pelo domínio real:

- `GET  .../api/auth/health`
- `POST .../api/auth/login`
- `POST .../api/auth/signup` ou `.../cadastro`
- `GET  .../api/auth/validate` (header `Authorization: Bearer …`)

### Validação pós-deploy

```bash
curl -s https://seu-projeto.vercel.app/api/auth/health
```

Resposta esperada: JSON com status ok — **não** HTML do `index.html` do React.

---

## Deploy só do frontend (modo SPA)

Se **Root Directory** = `frontend`:

- Sobe apenas o build Vite (`frontend/vercel.json` — **sem** rewrites de `/api/auth`).
- A pasta `api/` na raiz **não** entra no deploy.
- Login segue pelo Supabase no navegador; **não** há `/api/auth/*` no domínio.

Use este modo só se aceitar auth 100% no cliente e backends em outros hosts.

---

## Desenvolvimento local

| Rota no browser | Destino |
|-----------------|--------|
| `http://localhost:8080` | Vite (frontend) |
| `/api/auth/*` | Proxy Vite → `http://localhost:4100` (auth-proxy) |
| `/api/books/*` | Proxy Vite → `http://localhost:4000` |
| `/api/library/*` | Proxy Vite → `http://localhost:4200` |

```bash
# Tudo junto (recomendado)
npm run dev:all

# Ou separado
cd frontend && npm run dev
cd services/backend/auth-proxy && npm run dev:env
```

---

## Estrutura resumida

```
Eclipse-Reads/
├── vercel.json          ← deploy produção (raiz)
├── api/
│   ├── auth.ts          ← usado na Vercel (rewrites)
│   ├── books.ts         ← opcional / outros hosts
│   └── library.ts
├── frontend/
│   ├── vercel.json      ← só SPA (Root Directory = frontend)
│   └── ...
└── services/backend/
    ├── auth-proxy/
    ├── books-api/
    └── library-service/
```

---

## Comandos úteis

```bash
cd frontend && npm install && npm run dev
cd services/backend/auth-proxy && npm run dev:env
```

Guia geral do repositório: [README.md](README.md).
