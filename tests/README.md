# Tests - Eclipse Reads

Testes automatizados (Vitest + Supertest), regras de UI espelhadas onde não há API dedicada, e scripts K6 para carga. Os backends são carregados via `import()` com mocks de `@supabase/supabase-js` (`tests/setup.ts` + shim).

## Estrutura

```
tests/
├── api/                    # Contratos HTTP dos microserviços (prioridade)
├── auth/
├── cadastro/
├── upload/
├── perfil/
├── users/                  # Caixa branca (ex.: usernameValidation importado do frontend)
├── helpers/
├── mocks/
├── load/                   # K6 (opcional; exige binário k6 instalado)
├── setup-env.ts
└── setup.ts
```

## Comandos

| Comando | Descrição |
|--------|-----------|
| `npm test` | Toda a suíte Vitest |
| `npm run test:coverage` | Cobertura v8 nos `services/backend/*/src` (limiares no `vitest.config.ts`) |
| `npm run test:api` | Só `tests/api/**` |
| `npm run test:auth` | `tests/auth/**` |
| `npm run test:cadastro` | `tests/cadastro/**` |
| `npm run test:upload` | `tests/upload/**` |
| `npm run test:perfil` | `tests/perfil/**` |
| `npm run test:users` | `tests/users/**` |
| `npm run test:one-by-one` | Cada ficheiro `.test.ts` isolado (scripts/run-tests-sequential.mjs) |
| `npm run test:load:books-api` | K6 contra `BOOKS_API_BASE_URL` (obrigatório) |
| `npm run test:load:supabase` | K6 contra PostgREST (`SUPABASE_URL` + `SUPABASE_KEY`) |
| `npm run test:e2e` | Playwright (`e2e/`) — opt-in: `PLAYWRIGHT_RUN=1` e frontend em execução |

## Variáveis úteis (uploads)

- `BOOKS_SUBMISSION_MAX_BYTES` — limite POST `/submissions` (bytes); padrão 50MB.
- `PROFILE_MEDIA_MAX_BYTES` — limite POST `/me/profile-media` (bytes); padrão 25MB.

## E2E (Playwright)

```powershell
npx playwright install
cd frontend; npm run dev
# noutro terminal, na raiz do repo:
set PLAYWRIGHT_RUN=1
npm run test:e2e
```

## Carga (K6)

Instale o [k6](https://k6.io/docs/get-started/installation/). Os scripts **não** contêm segredos — passe variáveis no CLI.

Exemplo microserviços locais:

```powershell
k6 run tests/load/k6-books-api.js -e BOOKS_API_BASE_URL=http://localhost:4000 -e LIBRARY_SERVICE_URL=http://localhost:4200 -e AUTH_PROXY_URL=http://localhost:4100
```

## Docker

```powershell
npm run test:docker
npm run test:docker:one-by-one
npm run test:docker:down
```

## Notas

- `vitest.config.ts`: alias `@` → `frontend/src` para testar utilitários partilhados; cobertura limitada aos três serviços Express em `services/backend`.
- Cadastro/login “real” (OAuth Google, e-mail já existente) é tratado no **Supabase** e no **frontend** (`Auth.tsx`); onde não há endpoint próprio, usamos regras espelhadas em teste ou mocks.
