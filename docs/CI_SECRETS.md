# Secrets e variáveis — CI/CD Eclipse Reads

Documentação dos secrets do GitHub Actions e variáveis de ambiente por ambiente.

## GitHub Actions — secrets obrigatórios

| Secret | Job | Descrição |
|--------|-----|-----------|
| `CR_PAT` | `docker` | Personal Access Token com `write:packages` para GHCR |
| `SUPABASE_ACCESS_TOKEN` | `supabase-migrate` (job em `main.yml`) | Token da CLI Supabase ([Account → Access Tokens](https://supabase.com/dashboard/account/tokens)). Se ausente, o job de migração é **ignorado** (não falha). |
| `SUPABASE_DB_PASSWORD` | `supabase-migrate` (job em `main.yml`) | Senha do Postgres do projeto remoto. Obrigatório junto com os demais secrets Supabase para aplicar migrations no push. |
| `SUPABASE_PROJECT_REF` | `supabase-migrate` (job em `main.yml`) | Reference ID do projeto (20 caracteres). Dashboard → Project Settings → General. **Não commite no Git.** |
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

## Render — books-api (produção)

**Build command (Render):** `npm install && npm run build` — `typescript` está em `dependencies` para compilar mesmo com `NODE_ENV=production`.

**Node:** use **20.x** (`.node-version` em cada serviço backend).

No painel do serviço **books-api** → **Environment**:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Sim | Chave anon/public |
| `SUPABASE_SERVICE_KEY` | Sim | Service role key |
| `FILE_ACCESS_SECRET` | Sim | Segredo aleatório (32+ bytes hex). Sem isso o serviço **não inicia** em produção. |

Gerar valor:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Teste após deploy: `curl https://SEU-SERVICO.onrender.com/health`

## Supabase remoto — manual

| Ação | Onde |
|------|------|
| Site URL + Redirect URLs | Authentication → URL Configuration |
| Google OAuth | Authentication → Providers |
| Admin inicial | SQL: `INSERT INTO user_roles (user_id, role) VALUES ('…', 'admin');` |
| Importar livros do Storage | Painel Admin → Importar (18 arquivos em `livros/` sem registro em `books`) |

## CI — lock file (`npm ci`)

O repositório usa **npm workspaces** (lock único na raiz). Após alterar `package.json` em qualquer workspace:

```powershell
npm install
git add package-lock.json
```

Não commite só `package.json` sem atualizar o `package-lock.json` — o CI roda `npm ci` e falha se estiverem dessincronizados.

## Comandos úteis

```powershell
npm run db:push          # aplica migrations pendentes
npm run db:status        # local vs remoto
npm run audit:supabase   # schema + buckets + admins
```
