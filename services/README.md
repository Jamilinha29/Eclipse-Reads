# Backends — Eclipse Reads

Manual dos **microserviços Node/Express** que sustentam catálogo, autenticação auxiliar, biblioteca e perfil. O frontend React consome estas APIs; dados persistentes ficam no **Supabase**.

---

## Índice

1. [Visão geral](#visão-geral)
2. [Serviços e portas](#serviços-e-portas)
3. [Pacote compartilhado](#pacote-compartilhado)
4. [Instalação e configuração](#instalação-e-configuração)
5. [Executar localmente](#executar-localmente)
6. [Executar com Docker](#executar-com-docker)
7. [Variáveis de ambiente](#variáveis-de-ambiente)
8. [Health e monitoramento](#health-e-monitoramento)
9. [Fluxo de comunicação](#fluxo-de-comunicação)

Variáveis locais: [backend/envs/README.md](backend/envs/README.md).

---

## Visão geral

A camada backend separa responsabilidades em três APIs independentes, escaláveis e testáveis:

| Serviço | Responsabilidade principal |
|---------|---------------------------|
| **books-api** | Catálogo, submissões, reviews, download seguro de arquivos, admin |
| **auth-proxy** | Login, cadastro, refresh, validação de token JWT |
| **library-service** | Biblioteca pessoal, perfil, settings, progresso de leitura |

Todos usam **Supabase** (Auth, PostgREST, Storage) e carregam configuração de `backend/envs/*.env`.

---

## Serviços e portas

| Serviço | Pasta | Porta | Endpoints principais |
|---------|-------|------:|----------------------|
| books-api | `backend/books-api/` | 4000 | `/health`, `/books`, `/submissions`, `/metrics` (admin) |
| auth-proxy | `backend/auth-proxy/` | 4100 | `/health`, `/login`, `/signup`, `/validate`, `/refresh` |
| library-service | `backend/library-service/` | 4200 | `/health`, `/library`, `/me/profile`, `/me/settings` |

### books-api

- CRUD de livros e moderação de submissões (PDF/EPUB/MOBI).
- Validação de magic bytes via `@eclipse-reads/shared`.
- Download de arquivos com token HMAC (`FILE_ACCESS_SECRET`).
- Limite de upload: `BOOKS_SUBMISSION_MAX_BYTES` (padrão 50 MB).

### auth-proxy

- Proxy fino sobre Supabase Auth para integrações e `/api/auth/*` na Vercel.
- Rate limit em login/signup (30 req / 15 min por IP).
- O login principal no browser usa o cliente Supabase direto no frontend.

### library-service

- Listas `favoritos`, `lendo`, `lidos` por usuário autenticado.
- Perfil, avatar, banner, metas e progresso de leitura.
- Respostas **sem** `file_path` (segurança).

---

## Pacote compartilhado

```
backend/shared/   →  @eclipse-reads/shared
```

| Módulo | Uso |
|--------|-----|
| `validateBookFileBytes` | Validação PDF/EPUB/MOBI (frontend + books-api) |
| `DEFAULT_BOOKS_SUBMISSION_MAX_BYTES` | Limite padrão de upload (50 MB) |

O `books-api` compila o shared antes do `tsc` (`npm run build`). No Docker, o Dockerfile inclui o build do shared.

---

## Instalação e configuração

Na **raiz** do monorepo (recomendado):

```bash
npm install
npm run install:backends
```

Copie os templates em `services/backend/envs/` (`*.env.example` → `*.env`) e edite com URL e chaves do [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

---

## Executar localmente

Um serviço por terminal:

```bash
cd services/backend/books-api && npm run dev
```

Repita para `library-service` e `auth-proxy`. O frontend em `frontend/` aponta para `localhost:4000`, `:4200` e `:4100`.

Ou, na raiz: `npm run dev:all` (sobe frontend + três backends).

---

## Executar com Docker

Requer Docker Desktop em execução e arquivos em `backend/envs/`.

```bash
cd services/backend
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
```

| Container | Porta |
|-----------|------:|
| `backend-books-api-1` | 4000 |
| `backend-auth-proxy-1` | 4100 |
| `backend-library-service-1` | 4200 |

O **frontend não está no Compose** — rode `npm run dev` em `frontend/` separadamente.

Rebuild forçado:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Variáveis de ambiente

Resumo — detalhes em [backend/envs/README.md](backend/envs/README.md).

| Arquivo | Variáveis críticas |
|---------|-------------------|
| `auth-proxy.env` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT=4100` |
| `books-api.env` | `SUPABASE_*`, `FILE_ACCESS_SECRET`, `PORT=4000` |
| `library-service.env` | `SUPABASE_*`, `PORT=4200` |

Opcional em todos: `ALLOWED_ORIGINS` (CORS, lista separada por vírgula).

> **Nunca** coloque `SUPABASE_SERVICE_KEY` no frontend nem em variáveis `VITE_*`.

---

## Health e monitoramento

```bash
curl http://localhost:4000/health
curl http://localhost:4100/health
curl http://localhost:4200/health
```

**books-api — métricas** (exige admin):

```bash
curl http://localhost:4000/metrics -H "Authorization: Bearer SEU_TOKEN"
```

Docker Compose define healthchecks a cada 10 s; status **healthy** aparece no Docker Desktop.

---

## Fluxo de comunicação

```
Frontend (React :8080)
    │
    ├─► auth-proxy (:4100)     — validate, login (integrações)
    ├─► books-api (:4000)      — catálogo, submissões, arquivos
    └─► library-service (:4200)— biblioteca, perfil, progresso
              │
              ▼
         Supabase (Auth · DB · Storage)
```

Em produção: frontend na **Vercel**; `books-api` e `library-service` em host dedicado (ex.: Render); `auth-proxy` opcionalmente como serverless (`api/auth.ts`).
