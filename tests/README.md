# Testes — Eclipse Reads

Manual da **suíte automatizada** do projeto: contratos de API, regras de negócio, uploads, auth e (opcional) carga e E2E.

---

## Índice

1. [Para que serve](#para-que-serve)
2. [Pré-requisitos](#pré-requisitos)
3. [Como executar](#como-executar)
4. [Estrutura de pastas](#estrutura-de-pastas)
5. [Suites por área](#suites-por-área)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Docker e K6](#docker-e-k6)
8. [E2E (Playwright)](#e2e-playwright)
9. [Como funciona por baixo](#como-funciona-por-baixo)

---

## Para que serve

Os testes garantem que microserviços e regras críticas continuem corretos após mudanças:

| Área | O que valida |
|------|----------------|
| **API** | Respostas HTTP, status codes, contratos dos backends |
| **Auth** | Login, signup, validate, rate limit |
| **Cadastro** | Política de senha, confirmação, regras do cliente |
| **Upload** | Limites multer, formatos, erros de Storage |
| **Perfil** | Avatar, mídia, erros de autenticação |
| **Users** | Validação de username (import do frontend) |

Backends são carregados via `import()` com **mocks** de `@supabase/supabase-js` — não é necessário Supabase real para a maioria dos testes.

---

## Pré-requisitos

- Node.js 20.x
- Dependências instaladas na raiz: `npm install`
- Backends instalados: `npm run install:backends`

Opcional: Docker Desktop (testes em container), k6 (carga), Playwright (E2E).

---

## Como executar

Na **raiz** do repositório:

```bash
npm install
npm run install:backends
npm test
```

Cobertura dos backends Express:

```bash
npm run test:coverage
```

Executar um arquivo isolado (debug):

```bash
npm run test:one-by-one
```

---

## Estrutura de pastas

```
tests/
├── api/           # Contratos HTTP (books-api, library-service)
├── auth/          # auth-proxy, JWT, OAuth contract
├── cadastro/      # Regras de senha e signup
├── upload/        # Submissões e limites de arquivo
├── perfil/        # Avatar e profile-media
├── users/         # usernameValidation (caixa branca)
├── helpers/       # loadApps, factories Supabase
├── mocks/         # Shim @supabase/supabase-js
├── load/          # Scripts K6 (carga)
├── setup-env.ts
└── setup.ts
```

---

## Suites por área

| Comando | Pasta | Foco |
|---------|-------|------|
| `npm run test:api` | `tests/api/` | Endpoints REST dos microserviços |
| `npm run test:auth` | `tests/auth/` | auth-proxy, validate, mensagens JWT |
| `npm run test:cadastro` | `tests/cadastro/` | Senha, confirmação, regras client-side |
| `npm run test:upload` | `tests/upload/` | Upload e formatos de livro |
| `npm run test:perfil` | `tests/perfil/` | Perfil e mídia |
| `npm run test:users` | `tests/users/` | Validação de username |
| `npm test` | `tests/**` | Suíte completa (Vitest) |

---

## Variáveis de ambiente

Usadas em testes de limite de upload (`tests/api/multer-limits.api.test.ts`):

| Variável | Padrão | Efeito |
|----------|--------|--------|
| `BOOKS_SUBMISSION_MAX_BYTES` | 50 MB | Limite POST `/submissions` |
| `PROFILE_MEDIA_MAX_BYTES` | 25 MB | Limite POST `/me/profile-media` |

Exemplo temporário:

| Terminal | Comando |
|----------|---------|
| bash | `BOOKS_SUBMISSION_MAX_BYTES=800 npm run test:api` |
| PowerShell | `$env:BOOKS_SUBMISSION_MAX_BYTES="800"; npm run test:api` |
| CMD | `set BOOKS_SUBMISSION_MAX_BYTES=800 && npm run test:api` |

---

## Docker e K6

### Testes em container

Imagem `eclipse-reads-tests` (compose na raiz, separado dos backends):

```bash
npm run test:docker
npm run test:docker:one-by-one
npm run test:docker:down
```

### Teste de carga (K6)

Requer backends no ar (`docker compose up -d` ou `npm run dev:all`).

Com k6 instalado localmente:

```bash
npm run test:load:books-api
```

Com Docker (imagem `grafana/k6`):

```bash
# bash / PowerShell
docker run --rm -i grafana/k6 run - < tests/load/k6-books-api.js
```

Variáveis típicas:

```bash
k6 run tests/load/k6-books-api.js \
  -e BOOKS_API_BASE_URL=http://localhost:4000 \
  -e LIBRARY_SERVICE_URL=http://localhost:4200 \
  -e AUTH_PROXY_URL=http://localhost:4100
```

---

## E2E (Playwright)

Opt-in — não roda no CI por padrão.

```powershell
npx playwright install
```

Terminal 1 — frontend:

```bash
cd frontend && npm run dev
```

Terminal 2 — raiz:

| Terminal | Comando |
|----------|---------|
| bash | `PLAYWRIGHT_RUN=1 npm run test:e2e` |
| PowerShell | `$env:PLAYWRIGHT_RUN="1"; npm run test:e2e` |
| CMD | `set PLAYWRIGHT_RUN=1 && npm run test:e2e` |

---

## Como funciona por baixo

| Peça | Função |
|------|--------|
| `vitest.config.ts` | Alias `@` → `frontend/src`; alias `@eclipse-reads/shared` |
| `tests/setup.ts` | Mock global de `@supabase/supabase-js` |
| `tests/helpers/loadApps.ts` | Import dinâmico de cada `services/backend/*/src/index.ts` |
| Cobertura | Limitada a `services/backend/*/src` (limiares em `vitest.config.ts`) |

Cadastro/login “real” (OAuth, e-mail Supabase) é exercitado no **frontend** e no painel Supabase; nos testes de API usamos mocks ou contratos HTTP.
