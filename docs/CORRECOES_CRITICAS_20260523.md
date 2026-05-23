# Correções da Auditoria — Eclipse Reads

**Data:** 23 de maio de 2026  
**Escopo:** Críticos, altos, médios, baixos e CI/DevOps  
**Verificação:** `npm test` → **56/56 OK** · migration `20260525230000` **aplicada no remoto**

> Índice de status resumido: [AUDITORIA_ECLIPSE_READS.md](./AUDITORIA_ECLIPSE_READS.md)

---

## Como ler este documento

| Campo | Significado |
|-------|-------------|
| **Prioridade** | Ordem de impacto (1 = mais urgente) |
| **ID** | Identificador da auditoria |
| **Antes** | Comportamento ou código vulnerável |
| **Depois** | Comportamento ou código corrigido |
| **Arquivo** | Caminho no repositório |
| **Linhas** | Referência aproximada (pode variar após merges) |

**Aplicar no Supabase remoto:**

```powershell
npm run db:push
```

> **Ordem das migrations:** o arquivo de segurança usa timestamp `20260525230000`, **posterior** à baseline `20260525180000`. Se o CLI reclamar de ordem, use `npm run db:push -- --include-all`.

Ou colar a migration manualmente no SQL Editor do Supabase.

---

## Resumo das correções

| Prioridade | ID | Título | Status |
|:----------:|:---|--------|:------:|
| 1 | **C-01** | RLS `user_id IS NULL` — bypass de isolamento | Corrigido (migration + bootstrap) |
| 2 | **C-02** | `file_path` exposto via Supabase direto | Corrigido (GRANT colunar + bootstrap) |
| 3 | **C-03** | Storage bucket `books` inteiro legível | Corrigido (policy só `covers/`) |
| 4 | **C-05** | Edge function `books` sem JWT + service role | Corrigido |
| 5 | **C-06** | Dockerfiles ausentes — CI Linux falha | Corrigido |
| 6 | **A-01** | `FILE_ACCESS_SECRET` previsível em produção | Corrigido |
| 7 | **A-03** | `GET /library` expunha `file_path` | Corrigido |
| 8 | **A-04** | Avatar proxy sem sanitização de path | Corrigido |
| 9 | **A-06** | Usuários auto-concediam conquistas | Corrigido |
| 10 | **A-09** | `POST /books` sem validar arquivo no Storage | Corrigido |
| 11 | **A-16** | Guest consumia slot antes de checar login | Corrigido |
| 12 | **M-01** | Notificações falsas no 1º login | Corrigido |

---

## 1. C-01 — RLS com `user_id IS NULL`

**Prioridade:** 1 (Crítico)  
**Arquivo:** `services/main-service/supabase/migrations/20260525230000_security_rls_file_path_storage.sql`  
**Bootstrap:** `services/main-service/supabase/bootstrap/all_migrations_combined.sql` (L28–244)

### Antes

Políticas em 8 tabelas permitiam acesso quando `user_id` era nulo:

```sql
-- Exemplo: profiles (L28-30 do bootstrap)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);
```

**Risco:** Qualquer usuário autenticado podia ler/escrever linhas órfãs ou inserir registros com `user_id: null` e compartilhá-los com todos.

### Depois

Policies recriadas **sem** a cláusula `OR user_id IS NULL`, linhas nulas removidas e colunas `user_id` tornadas `NOT NULL`:

```sql
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
-- (idem: favorites, reading, read, reading_goals, user_settings, reading_progress)
```

**Tabelas afetadas:** `profiles`, `favorites`, `reading`, `read`, `reading_goals`, `user_settings`, `reading_progress`

---

## 2. C-02 — `file_path` exposto na tabela `books`

**Prioridade:** 2 (Crítico)  
**Arquivo:** migration `20260525230000_security_rls_file_path_storage.sql` (seção C-02)  
**Bootstrap:** `all_migrations_combined.sql` (após L450)

### Antes

Policy `"Anyone can view books"` com `USING (true)` + `SELECT *` no cliente Supabase retornava **`file_path`** (caminho interno do Storage):

```sql
CREATE POLICY "Anyone can view books"
ON public.books FOR SELECT TO authenticated, anon
USING (true);
```

A API Express já removia `file_path` via `toPublicBook()`, mas o frontend (`supabaseLibrary.ts`) consultava o Postgres diretamente.

### Depois

Revogação de `SELECT` amplo e grant **colunar** sem `file_path`:

```sql
REVOKE ALL ON TABLE public.books FROM anon, authenticated;
GRANT SELECT (
  id, title, author, description, category, cover_image, rating,
  file_type, created_at, updated_at, submission_id, age_rating
) ON TABLE public.books TO anon, authenticated;
```

**Nota:** `service_role` (backends) mantém acesso total à coluna `file_path`.

---

## 3. C-03 — Storage: download de todo o bucket `books`

**Prioridade:** 3 (Crítico)  
**Arquivo:** migration (seção C-03) + bootstrap L514–519

### Antes

```sql
CREATE POLICY "Authenticated users can download books"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'books');
```

Usuário autenticado baixava **qualquer** objeto em `books/livros/...` via Storage API.

### Depois

Policy permissiva removida; leitura direta limitada a capas:

```sql
DROP POLICY IF EXISTS "Authenticated users can download books" ON storage.objects;

CREATE POLICY "Read cover images in books bucket"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
  bucket_id = 'books' AND
  (storage.foldername(name))[1] = 'covers'
);
```

Arquivos em `livros/` só via `books-api` + token HMAC (`/books/:id/file?access=`).

---

## 4. C-05 — Edge function `books` insegura

**Prioridade:** 4 (Crítico)  
**Arquivos:**
- `services/main-service/supabase/config.toml` L3–4
- `services/main-service/supabase/functions/books/index.ts`

### Antes

```toml
[functions.books]
verify_jwt = false
```

```typescript
// index.ts L28-35, L42-45
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabaseClient = createClient(supabaseUrl, supabaseKey);
// ...
.select('*')  // incluía file_path
```

**Risco:** Endpoint público com service role retornando todos os campos.

### Depois

```toml
[functions.books]
verify_jwt = true
```

```typescript
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
const PUBLIC_BOOK_FIELDS =
  'id, title, author, description, category, cover_image, rating, file_type, created_at, age_rating';
// .select(PUBLIC_BOOK_FIELDS) — sem file_path
```

CORS restrito a `ALLOWED_ORIGIN` (default: `https://eclipse-reads.vercel.app`).

---

## 5. C-06 — Dockerfiles ausentes (CI Linux)

**Prioridade:** 5 (Crítico)  
**Arquivos criados:**
- `services/backend/books-api/Dockerfile`
- `services/backend/auth-proxy/Dockerfile`
- `services/backend/library-service/Dockerfile`

**Referenciado por:** `.github/workflows/main.yml` L115,122,129 · `docker-compose.yml` L7,21,35

### Antes

```yaml
# docker-compose.yml
dockerfile: Dockerfile
```

Arquivo `Dockerfile` **não existia** (apenas referência deletada no git). Build falhava em `ubuntu-latest` (case-sensitive).

### Depois

Dockerfile multi-stage em cada serviço (Node 20 Alpine):

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000   # 4100 auth-proxy · 4200 library-service
CMD ["node", "dist/index.js"]
```

---

## 6. A-01 — `FILE_ACCESS_SECRET` previsível

**Prioridade:** 6 (Alto)  
**Arquivo:** `services/backend/books-api/src/index.ts` ~L92–98

### Antes

```typescript
const FILE_ACCESS_SECRET = process.env.FILE_ACCESS_SECRET ?? SUPABASE_SERVICE_KEY.slice(0, 32);
```

### Depois

```typescript
const FILE_ACCESS_SECRET =
  process.env.FILE_ACCESS_SECRET ??
  (NODE_ENV === "production" ? "" : SUPABASE_SERVICE_KEY.slice(0, 32));
if (!FILE_ACCESS_SECRET) {
  console.error("❌ FILE_ACCESS_SECRET é obrigatório em produção.");
  process.exit(1);
}
```

**Ação manual:** definir `FILE_ACCESS_SECRET` nos envs de produção/Docker.

---

## 7. A-03 — `GET /library` expunha `file_path`

**Prioridade:** 7 (Alto)  
**Arquivo:** `services/backend/library-service/src/index.ts` ~L154–220

### Antes

```typescript
// L186-196
.select("id, title, author, category, cover_image, rating, age_rating, created_at, file_path")
// ...
return res.json({ books });
```

### Depois

```typescript
function toPublicLibraryBook(book: Record<string, unknown>) {
  const { file_path: _fp, ...rest } = book;
  return rest;
}
// ...
return res.json({
  books: (books ?? []).map((book) => toPublicLibraryBook(book as Record<string, unknown>)),
});
```

---

## 8. A-04 — Path traversal no proxy de avatars

**Prioridade:** 8 (Alto)  
**Arquivo:** `services/backend/library-service/src/index.ts` ~L154–170, ~L770–785

### Antes

```typescript
// L747-753
const filePath = req.params[0];
// download direto sem validação
await svc.storage.from(PROFILE_MEDIA_BUCKET).download(filePath);
```

### Depois

```typescript
function sanitizeAvatarStoragePath(raw: string): string | null {
  // rejeita .., paths absolutos
  // aceita apenas: {uuid}/avatar.ext ou {uuid}/banner.ext
  if (!/^[0-9a-f-]{36}\/(avatar|banner)\.[a-z0-9]+$/i.test(path)) return null;
  return path;
}
// GET /images/avatars/* usa sanitizeAvatarStoragePath antes do download
```

---

## 9. A-06 — Conquistas auto-concedidas

**Prioridade:** 9 (Alto)  
**Arquivos:**
- Migration (DROP policies INSERT/DELETE em `user_achievements`)
- `services/backend/library-service/src/index.ts` ~L820
- `frontend/src/lib/supabaseLibrary.ts` ~L222

### Antes

```sql
CREATE POLICY "Users can insert their own user_achievements" ...
CREATE POLICY "Users can delete their own user_achievements" ...
```

```typescript
// supabaseLibrary.ts — insert/delete direto no Supabase
await supabase.from("user_achievements").insert({ user_id, achievement_id: id });
```

```typescript
// library-service — POST /me/achievements/:id/toggle permitia toggle livre
```

### Depois

- Policies INSERT/DELETE removidas (só leitura das próprias conquistas).
- Endpoint toggle retorna **403**:

```typescript
return res.status(403).json({
  error: "Conquistas são concedidas automaticamente e não podem ser alteradas manualmente.",
});
```

- Frontend `toggleAchievement()` lança erro explícito (UI exibe toast de erro).

---

## 10. A-09 — `POST /books` sem validar Storage

**Prioridade:** 10 (Alto)  
**Arquivo:** `services/backend/books-api/src/index.ts` ~L1149–1160

### Antes

```typescript
if (!title || !author || !category || !file_path) {
  return res.status(400).json({ error: "..." });
}
const { data, error } = await supabase.from("books").insert({ ... });
```

### Depois

```typescript
const storageErr = await assertBookFileInStorage(file_path);
if (storageErr) {
  return res.status(400).json({ error: storageErr });
}
const { data, error } = await supabase.from("books").insert({ ... });
```

Alinhado ao fluxo de `/admin/books/import`.

---

## 11. A-16 — Guest consumia slot de biblioteca

**Prioridade:** 11 (Alto)  
**Arquivo:** `frontend/src/pages/Read.tsx` ~L49–76

### Antes

```typescript
setBook(data);
const addedToReading = await addToReading(id, bookLimit);  // guest perdia slot
// ...
if (!token) {
  navigate("/auth");
  return;
}
```

### Depois

```typescript
setBook(data);
if (!token) {
  toastNeedLogin("Faça login para ler este livro.", navigate);
  navigate("/auth");
  return;
}
const addedToReading = await addToReading(id, bookLimit);
```

Login verificado **antes** de mutar a biblioteca.

---

## 12. M-01 — Notificações falsas no primeiro login

**Prioridade:** 12 (Médio, UX crítico)  
**Arquivo:** `frontend/src/contexts/NotificationContext.tsx` ~L44–55

### Antes

```typescript
const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);
// todo o catálogo era "novo" → toast com centenas de livros
```

### Depois

```typescript
if (!lastCheck) {
  localStorage.setItem(`last_book_check_${userId}`, new Date().toISOString());
  setNewBooks([]);
  setUnreadCount(0);
  return;
}
const lastCheckDate = new Date(lastCheck);
```

Primeiro acesso inicializa baseline **sem** notificar.

---

## Itens já corrigidos antes desta sessão (referência)

| ID | Descrição | Arquivo |
|:---|-----------|---------|
| **C-04** | `/file-access` exige `requireUser()`; `/images/books/*` só `covers/` | `books-api/src/index.ts` L418, L1030 |
| **C-FE-01** | Profile usa `adminGetSubmissions` | `Profile.tsx` L83 |
| **A-FE-01** | Read não usa URL de arquivo sem token | `Read.tsx` L71–72 |

---

## Checklist pós-deploy

- [x] `npm run db:push` aplicado no Supabase remoto
- [ ] `FILE_ACCESS_SECRET` definido em produção (books-api)
- [ ] Importar 18 livros do Storage → Admin → Importar
- [ ] Docker CI: push para `main` builda imagens GHCR
- [ ] Teste manual: `file_path` inacessível via Supabase client
- [x] Guest em `/read/:id` não muta biblioteca antes do login
- [x] Primeiro login sem toast falso de novos livros

---

# PARTE II — Altos, médios, baixos e CI (23/05/2026)

## Resumo PARTE II

| ID | Título | Arquivo principal |
|:--:|--------|-------------------|
| **A-07** | Rate limit login/signup (30/15min) | `auth-proxy/src/index.ts` |
| **A-08** | `/refresh`, `/logout`, headers, CORS env | `auth-proxy/src/index.ts` |
| **A-10** | `safeDbError()` — erros DB genéricos em prod | `books-api/src/index.ts` |
| **A-11** | Validação `age_rating` enum | `books-api` PUT admin |
| **A-14** | Approve valida arquivo Storage | `books-api` approve |
| **A-17** | AdminPanel loading + redirect sem token | `AdminPanel.tsx` |
| **A-19** | Metas Profile com try/catch | `Profile.tsx` |
| **M-02** | Settings skip primeiro auto-save | `Settings.tsx` |
| **M-03** | Reviews recalculam `books.rating` | `books-api` PUT reviews |
| **M-04** | Review exige livro existente | `books-api` PUT reviews |
| **M-06** | Rejeição remove arquivo Storage | `books-api` reject |
| **M-07** | Library type inválido → 400 | `library-service` |
| **M-08** | Bloqueio URLs `data:` no perfil | `library-service` |
| **M-FE-06** | EPUB locations uma vez (ref) | `BookViewer.tsx` |
| **M-FE-07** | PDF worker bundle local | `BookViewer.tsx` |
| **M-FE-10** | EPUB tema escuro | `BookViewer.tsx` |
| **M-FE-20** | Progresso leitura — toast erro | `Read.tsx` |
| **B-01** | `/metrics` admin em todos ambientes | `books-api` |
| **B-02** | Morgan só em dev | `books-api` |
| **B-03** | SIGTERM `server.close()` | `books-api` |
| **CI-01** | `tsc --noEmit` frontend no CI | `.github/workflows/main.yml` |
| **CI-02** | `docs/CI_SECRETS.md` | novo |
| **CI-03** | Supabase CLI `2.101.0` | `supabase-migrate.yml` |
| **CI-04** | OAuth test porta 8080 | `oauth-google.contract.test.ts` |
| **CI-05** | Teste metrics 401 | `cadastro-email.test.ts` |
| **CI-06** | `@types/node` library-service | `package.json` |
| **CI-07** | `ALLOWED_ORIGINS` env CORS | backends |

### Exemplo — A-07 Rate limit (auth-proxy)

**Antes:** login/signup sem limite → credential stuffing.

**Depois:** `rateLimit()` in-memory 30 req / 15 min por IP; resposta `429`.

### Exemplo — M-03 Reviews rating

**Antes:** `PUT /books/:id/reviews` não atualizava `books.rating`.

**Depois:** `recomputeBookRating(bookId)` após upsert.

---

## Arquivos alterados (PARTE I + II)

| Arquivo | Tipo de mudança |
|---------|-----------------|
| `services/main-service/supabase/migrations/20260525230000_security_rls_file_path_storage.sql` | **Novo** — migration incremental |
| `services/main-service/supabase/bootstrap/all_migrations_combined.sql` | RLS, storage, books GRANT, achievements |
| `services/main-service/supabase/config.toml` | `verify_jwt = true` |
| `services/main-service/supabase/functions/books/index.ts` | Anon key, campos públicos, CORS |
| `services/backend/books-api/Dockerfile` | **Novo** |
| `services/backend/auth-proxy/Dockerfile` | **Novo** |
| `services/backend/library-service/Dockerfile` | **Novo** |
| `services/backend/books-api/src/index.ts` | Segurança, reviews, approve/reject, metrics, shutdown |
| `services/backend/auth-proxy/src/index.ts` | Rate limit, refresh/logout, headers |
| `services/backend/library-service/src/index.ts` | library type 400, data: URLs, avatars |
| `frontend/src/pages/AdminPanel.tsx` | loading auth |
| `frontend/src/pages/Profile.tsx` | try/catch metas |
| `frontend/src/pages/Settings.tsx` | skip first save |
| `frontend/src/pages/Read.tsx` | progresso toast |
| `frontend/src/components/BookViewer.tsx` | EPUB/PDF |
| `.github/workflows/main.yml` | tsc frontend |
| `.github/workflows/supabase-migrate.yml` | CLI pin |
| `docs/CI_SECRETS.md` | **Novo** |
| `tests/auth/oauth-google.contract.test.ts` | porta 8080 |
| `tests/cadastro/cadastro-email.test.ts` | metrics 401 |

---

*Gerado após implementação e `npm test` 56/56. Itens não listados aqui permanecem abertos na auditoria geral (`docs/AUDITORIA_ECLIPSE_READS.md`).*
