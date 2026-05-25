# Variáveis de ambiente — Backends

Configuração **local por máquina** dos três microserviços. No GitHub ficam apenas os arquivos `*.env.example`.

---

## Setup inicial

```powershell
Set-Location services\backend\envs
Copy-Item auth-proxy.env.example auth-proxy.env
Copy-Item books-api.env.example books-api.env
Copy-Item library-service.env.example library-service.env
```

Edite cada `.env` com os valores do [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API**.

| Arquivo | Porta | Serviço |
|---------|------:|---------|
| `auth-proxy.env` | 4100 | Login, signup, validate |
| `books-api.env` | 4000 | Catálogo, submissões, arquivos |
| `library-service.env` | 4200 | Biblioteca, perfil, settings |

---

## O que versionar

| Arquivo | Git |
|---------|-----|
| `*.env.example` | Sim (modelo sem segredos) |
| `*.env` | **Não** (`.gitignore`) |

Se um `.env` chegou a ser commitado em repo público, **rotacione as chaves** no Supabase.

---

## Chaves Supabase

| Chave | Onde usar | Frontend / Git? |
|-------|-----------|-----------------|
| **anon / publishable** | `auth-proxy.env`, `frontend/.env` | Pode ir no browser (`VITE_*`) |
| **service_role** | `books-api.env`, `library-service.env` | **Nunca** no frontend nem no Git |

Proteção de dados: **RLS** (políticas SQL), não ocultar a chave anon.

---

## Variáveis por serviço

### auth-proxy.env

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON
PORT=4100
```

### books-api.env

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_KEY=SUA_SERVICE_ROLE
FILE_ACCESS_SECRET=GERAR_32_BYTES_HEX
PORT=4000
```

Gerar `FILE_ACCESS_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### library-service.env

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_KEY=SUA_SERVICE_ROLE
PORT=4200
```

Opcional em todos: `ALLOWED_ORIGINS` (CORS, URLs separadas por vírgula).

---

## Decisão D-01 — service_role nos backends

`books-api` e `library-service` usam **service_role** no servidor para operações administrativas e de catálogo (projeto acadêmico):

- Cada rota valida JWT ou `requireAdmin` antes de chamar o Supabase.
- RLS protege acesso direto via PostgREST com chave anon.
- **Nunca** exponha `SUPABASE_SERVICE_KEY` em variáveis `VITE_*`.

---

## Carregamento

Cada serviço lê `../../envs/<serviço>.env` a partir de `src/index.ts` — funciona com `npm run dev` e com Docker Compose (`env_file` no `docker-compose.yml`).
