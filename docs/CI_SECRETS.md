# Secrets e variáveis — CI/CD Eclipse Reads

Documentação dos secrets do GitHub Actions e variáveis de ambiente por ambiente.

## GitHub Actions — secrets obrigatórios

| Secret | Job | Descrição |
|--------|-----|-----------|
| `CR_PAT` | `build-and-push-docker-images` | Personal Access Token com `write:packages` para GHCR |
| `SUPABASE_ACCESS_TOKEN` | `supabase-migrate` | Token da CLI Supabase ([Account → Access Tokens](https://supabase.com/dashboard/account/tokens)) |
| `SUPABASE_DB_PASSWORD` | `supabase-migrate` | Senha do Postgres do projeto remoto |
| `VERCEL_TOKEN` | `deploy-frontend` | Token Vercel |
| `VERCEL_ORG_ID` | `deploy-frontend` | ID da org/team Vercel |
| `VERCEL_PROJECT_ID` | `deploy-frontend` | ID do projeto Vercel |
| `VITE_SUPABASE_URL` | `deploy-frontend` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `deploy-frontend` | Chave anon/public |
| `VITE_BOOKS_API_URL` | `deploy-frontend` | URL pública books-api (ou vazio para `/api/books`) |
| `VITE_LIBRARY_API_URL` | `deploy-frontend` | URL pública library-service (ou vazio para `/api/library`) |

## Backend local — arquivos em `services/backend/envs/`

Copie de `*.env.example` e preencha:

| Arquivo | Variáveis críticas |
|---------|-------------------|
| `books-api.env` | `SUPABASE_*`, `FILE_ACCESS_SECRET` (produção) |
| `auth-proxy.env` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `library-service.env` | `SUPABASE_*` |

Opcional em todos: `ALLOWED_ORIGINS` (lista separada por vírgula) para CORS além dos defaults localhost + Vercel.

## Supabase remoto — manual

| Ação | Onde |
|------|------|
| Site URL + Redirect URLs | Authentication → URL Configuration |
| Google OAuth | Authentication → Providers |
| Admin inicial | SQL: `INSERT INTO user_roles (user_id, role) VALUES ('…', 'admin');` |
| Importar livros do Storage | Painel Admin → Importar (18 arquivos em `livros/` sem registro em `books`) |

## Comandos úteis

```powershell
npm run db:push          # aplica migrations pendentes
npm run db:status        # local vs remoto
npm run audit:supabase   # schema + buckets + admins
```
