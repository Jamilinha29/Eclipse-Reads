# Eclipse Reads — Correções de bugs, erros e falhas

> **Documento para o grupo (documentação externa).**  
> Este arquivo **não altera** o comportamento do app — serve para montar relatório, dock ou apresentação manualmente.  
> Data: maio/2026 | Base: auditoria estática + testes caixa branca/preta.

---

## 1. Como ler este documento

Cada correção contém:

| Campo | Significado |
|-------|-------------|
| **ID** | Referência cruzada com `AUDITORIA_ECLIPSE_READS.md` |
| **Tipo de teste** | Caixa branca (código/testes) ou caixa preta (comportamento externo) |
| **O que era o problema** | Descrição clara do bug/falha |
| **Por que era grave** | Impacto para usuário, segurança ou dados |
| **Como foi corrigido** | Resumo da solução |
| **Antes / Depois** | Trechos de código (quando aplicável) |
| **Como validar** | Passo manual ou comando de teste |
| **Arquivo(s)** | Onde mexer se for revisar no Git |

**Estrutura:**

| Seção | Conteúdo |
|-------|----------|
| **§3** | FIX-01 … FIX-15 — 1ª rodada de correções |
| **§3.2** | FIX-16 … FIX-30 — 2ª rodada (itens que estavam pendentes na §4) |
| **§3.3** | FIX-31 … FIX-48 — 3ª rodada (M/B restantes no código) |
| **§4** | O que **ainda** falta (Supabase manual + backlog menor) |

## 2. Resultados dos testes (resumo)

### Caixa branca — testes automatizados

```powershell
Set-Location "Eclipse-Reads"
npm test
```

| Métrica | Resultado |
|---------|-----------|
| Arquivos de teste | 20 |
| Testes executados | 54 |
| Aprovados | **54** |
| Falhas após correções (1ª + 2ª rodada) | **0** |

**Rodada 1:** mock `books-catalog.api.test.ts` (POST /books duplo).  
**Rodada 2:** após FIX-16 … FIX-30 — `npm test` e `npm run build` continuam **54/54** e **OK**.  
**Rodada 3:** após FIX-31 … FIX-48 — **54/54** e build **OK**.

### Caixa preta — build e comportamento

```powershell
Set-Location "Eclipse-Reads\frontend"
npm run build
```

| Teste | Resultado |
|-------|-----------|
| Build produção frontend | **OK** (dist gerado) |
| Dev sem `.env` de API (com backends no ar) | **OK** após proxy Vite |
| Login “Lembrar-me” | **OK** — não grava senha |
| Build sem `VITE_*` (2ª rodada) | **OK** — não crasha; exibe `ApiConfigBanner` |
| Docker healthcheck (2ª rodada) | **OK** — Node em vez de `curl` |

---

## 3. Correções detalhadas — 1ª rodada (FIX-01 … FIX-15)

---

### FIX-01 | Senha em plaintext no localStorage

| | |
|---|---|
| **ID auditoria** | C-04 |
| **Severidade** | Crítica (segurança) |
| **Tipo de teste** | Caixa preta (DevTools) + caixa branca (revisão de código) |
| **Arquivo** | `frontend/src/pages/Auth.tsx` |

#### O que era o problema

Com o checkbox **“Lembrar-me”** marcado, o login gravava **e-mail e senha** em `localStorage`. A senha nunca era relida (código morto), mas ficava exposta a XSS, extensões maliciosas ou acesso físico ao PC.

#### Por que era grave

Violação de boas práticas de segurança (OWASP). Credencial sensível persistida em texto puro no navegador.

#### Como foi corrigido

- Removido import e uso de `AUTH_SAVED_PASSWORD_KEY`.
- “Lembrar-me” passa a salvar **somente o e-mail**.
- E-mail é **pré-preenchido** na tela de login se “Lembrar-me” estava ativo.
- Chave legada de senha é **removida** no login bem-sucedido.

#### Antes

```typescript
// import
import {
  AUTH_REMEMBER_ME_KEY,
  AUTH_SAVED_EMAIL_KEY,
  AUTH_SAVED_PASSWORD_KEY,
} from "@/integrations/supabase/client";

// estado
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

// após login OK
if (rememberMe) {
  localStorage.setItem(AUTH_SAVED_EMAIL_KEY, email);
  localStorage.setItem(AUTH_SAVED_PASSWORD_KEY, password);
} else {
  localStorage.removeItem(AUTH_SAVED_EMAIL_KEY);
  localStorage.removeItem(AUTH_SAVED_PASSWORD_KEY);
}
```

#### Depois

```typescript
// import — sem AUTH_SAVED_PASSWORD_KEY
import {
  AUTH_REMEMBER_ME_KEY,
  AUTH_SAVED_EMAIL_KEY,
} from "@/integrations/supabase/client";

// estado — e-mail restaurado se "Lembrar-me"
const [email, setEmail] = useState(() => {
  try {
    return localStorage.getItem(AUTH_REMEMBER_ME_KEY) === "true"
      ? localStorage.getItem(AUTH_SAVED_EMAIL_KEY) ?? ""
      : "";
  } catch {
    return "";
  }
});
const [password, setPassword] = useState("");

// após login OK
if (rememberMe) {
  localStorage.setItem(AUTH_SAVED_EMAIL_KEY, email);
} else {
  localStorage.removeItem(AUTH_SAVED_EMAIL_KEY);
}
localStorage.removeItem("eclipse_reads_saved_password"); // limpa legado
```

#### Como validar

1. Login com “Lembrar-me” marcado.
2. DevTools → Application → Local Storage.
3. Deve existir `eclipse_reads_saved_email`; **não** deve existir `eclipse_reads_saved_password`.

#### Para que serve

Sessão continua no Supabase; “Lembrar-me” só facilita o e-mail, sem risco de vazamento de senha.

---

### FIX-02 | Race condition no progresso de leitura (100% falso)

| | |
|---|---|
| **ID auditoria** | C-05 |
| **Severidade** | Crítica (integridade de dados) |
| **Tipo de teste** | Caixa preta (rede lenta) + caixa branca |
| **Arquivo** | `frontend/src/pages/Read.tsx` |

#### O que era o problema

Ao abrir um livro, o estado iniciava com `currentPage = 1` e `totalPages = 1`. Um `useEffect` salvava progresso após **1 segundo**. Se a API `getReadingProgress` demorasse, o app gravava **100%** (`1/1`) antes de carregar o progresso real.

#### Por que era grave

Usuário **perdia permanentemente** a posição de leitura no banco de dados.

#### Como foi corrigido

- Flag `progressLoaded`: só salva depois que o GET de progresso termina.
- Restaura também `total_pages` do servidor.
- Reseta `progressLoaded` ao trocar de livro/usuário.

#### Antes

```typescript
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

useEffect(() => {
  const loadProgress = async () => {
    if (!userId || !id || !token) return;
    try {
      const { progress } = await api.getReadingProgress(id, token);
      if (progress) setCurrentPage(progress.current_page || 1);
    } catch { /* ignore */ }
  };
  loadProgress();
}, [userId, id, token]);

useEffect(() => {
  const saveProgress = async () => {
    if (!userId || !id || !token) return;
    // salva mesmo com totalPages=1 antes do load terminar
    await api.saveReadingProgress(id, { current_page: currentPage, ... }, token);
  };
  const debounceTimer = setTimeout(saveProgress, 1000);
  return () => clearTimeout(debounceTimer);
}, [currentPage, userId, id, totalPages, token]);
```

#### Depois

```typescript
const [progressLoaded, setProgressLoaded] = useState(false);

useEffect(() => {
  setProgressLoaded(false);
  const loadProgress = async () => {
    if (!userId || !id || !token) {
      setProgressLoaded(true);
      return;
    }
    try {
      const { progress } = await api.getReadingProgress(id, token);
      if (progress) {
        setCurrentPage(progress.current_page || 1);
        if (progress.total_pages) setTotalPages(progress.total_pages);
      }
    } catch { /* ignore */ }
    finally {
      setProgressLoaded(true);
    }
  };
  loadProgress();
}, [userId, id, token]);

useEffect(() => {
  const saveProgress = async () => {
    if (!userId || !id || !token || !progressLoaded) return;
    await api.saveReadingProgress(id, { ... }, token);
  };
  const debounceTimer = setTimeout(saveProgress, 1000);
  return () => clearTimeout(debounceTimer);
}, [currentPage, userId, id, totalPages, token, progressLoaded]);
```

#### Como validar

DevTools → Network → **Slow 3G** → abrir livro com progresso salvo → conferir que o PUT não envia `progress_percentage: 100` antes do GET.

---

### FIX-03 | Download público de arquivos de livros

| | |
|---|---|
| **ID auditoria** | C-02 |
| **Severidade** | Crítica (segurança) |
| **Tipo de teste** | Caixa preta (curl/navegador) |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### O que era o problema

`GET /books/:id/file` era **público**. Quem soubesse o UUID baixava PDF/EPUB sem autenticação.

#### Como foi corrigido

1. Novo endpoint `GET /books/:id/file-access` → devolve token assinado (validade ~1h).
2. `GET /books/:id/file` exige query `?access=TOKEN`.
3. Frontend (`Read.tsx`) chama `getBookFileAccess` antes de montar a URL do leitor.

#### Antes

```typescript
// GET /books/:id/file — sem auth
app.get("/books/:id/file", async (req, res) => {
  const id = req.params.id;
  // download direto do storage...
});
```

#### Depois

```typescript
// Gera token
app.get("/books/:id/file-access", async (req, res) => {
  const access = signFileAccessToken(id);
  return res.json({ url, access, expiresIn: FILE_ACCESS_TTL_SEC });
});

// Exige token
app.get("/books/:id/file", async (req, res) => {
  const accessToken = String(req.query.access ?? "");
  if (!accessToken || !verifyFileAccessToken(id, accessToken)) {
    return res.status(401).json({ error: "Acesso ao arquivo negado ou token expirado." });
  }
  // download...
});
```

```typescript
// Read.tsx
const { access } = await api.getBookFileAccess(id);
setFileUrl(api.getBookFileUrl(id, access));
```

#### Como validar

- `GET http://localhost:4000/books/{uuid}/file` → **401**
- `GET .../file-access` → JSON com `access` → `GET .../file?access=...` → **200**

---

### FIX-04 | POST /books aberto e body inválido

| | |
|---|---|
| **ID auditoria** | C-01 |
| **Severidade** | Crítica (segurança) |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### O que era o problema

Qualquer pessoa podia chamar `POST /books` sem token. Body enviava campos inexistentes (`isbn`, `pages`) e omitia campos obrigatórios do schema.

#### Como foi corrigido

- Rota exige `requireAdmin`.
- Body alinhado: `title`, `author`, `category`, `file_path`, `file_type`.

#### Antes

```typescript
app.post("/books", async (req, res) => {
  const { title, author, description, isbn, pages } = req.body;
  const bookData = { title, author, ...(isbn && { isbn }), ...(pages && { pages }) };
  await supabase.from("books").insert([bookData]);
});
```

#### Depois

```typescript
app.post("/books", async (req, res) => {
  await requireAdmin(req);
  const title = String(req.body?.title ?? "").trim();
  const author = String(req.body?.author ?? "").trim();
  const category = String(req.body?.category ?? "").trim();
  const file_path = normalizeBookFilePath(String(req.body?.file_path ?? ""));
  // ...
  if (!title || !author || !category || !file_path) {
    return res.status(400).json({ error: "title, author, category and file_path are required" });
  }
  await supabase.from("books").insert({ title, author, category, file_path, file_type, ... });
});
```

#### Como validar

```bash
curl -X POST http://localhost:4000/books -H "Content-Type: application/json" -d "{\"title\":\"T\",\"author\":\"A\"}"
# Esperado: 401 (sem Bearer admin)
```

---

### FIX-05 | Dev quebrado — sem proxy Vite

| | |
|---|---|
| **ID auditoria** | C-06 |
| **Severidade** | Crítica (DX / dev local) |
| **Arquivo** | `frontend/vite.config.ts` |

#### O que era o problema

Em dev, o frontend chama `/api/books` e `/api/library`, mas o Vite não redirecionava para `:4000` e `:4200`. Sem `.env`, as chamadas retornavam HTML/404.

#### Antes

```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  // sem proxy
});
```

#### Depois

```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/books": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/books/, ""),
      },
      "/api/library": {
        target: "http://localhost:4200",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/library/, ""),
      },
    },
  },
});
```

#### Como validar

Subir backends + `npm run dev` no frontend **sem** `VITE_*` no `.env` → Home carrega livros.

---

### FIX-06 | LibraryContext atualizava UI mesmo com API falhando

| | |
|---|---|
| **ID auditoria** | A-06 |
| **Severidade** | Alta |
| **Arquivo** | `frontend/src/contexts/LibraryContext.tsx` |

#### O que era o problema

`addToFavorites`, `addToReading`, etc. alteravam o estado React **antes** ou **independente** de sucesso da API — sem try/catch nem rollback.

#### Antes

```typescript
const addToFavorites = async (bookId: string) => {
  if (userId && token) await api.addToLibrary("favoritos", bookId, token);
  setFavorites((prev) => [...prev, bookId]); // sempre atualiza
  return true;
};
```

#### Depois

```typescript
const addToFavorites = async (bookId: string) => {
  const prev = favorites;
  setFavorites((p) => [...p, bookId]);
  if (userId && token) {
    try {
      await api.addToLibrary("favoritos", bookId, token);
    } catch {
      setFavorites(prev); // rollback
      return false;
    }
  }
  return true;
};
```

Também: função `parseGuestList()` com try/catch para `JSON.parse` de dados guest no localStorage.

---

### FIX-07 | Conquistas zeravam após F5

| | |
|---|---|
| **ID auditoria** | A-07 |
| **Severidade** | Alta |
| **Arquivo** | `frontend/src/pages/Profile.tsx`, `library-service` |

#### O que era o problema

Profile só atualizava conquistas no clique (toggle). Após refresh, contador voltava a 0.

#### Depois

```typescript
// Profile.tsx — ao carregar
const { achievementIds } = await api.getMeAchievements(token);
setUserAchievementIds(achievementIds ?? []);
```

Backend: `GET /me/achievements` retorna `{ achievementIds: string[] }`.

---

### FIX-08 | Guest podia abrir Submit Book mas não enviar

| | |
|---|---|
| **ID auditoria** | A-08 |
| **Severidade** | Alta |
| **Arquivo** | `frontend/src/pages/SubmitBook.tsx` |

#### Antes

Rota acessível em modo convidado; submit falhava com mensagem genérica.

#### Depois

```typescript
useEffect(() => {
  if (authType === "guest" || !userId) {
    toast.error("Faça login para enviar um livro");
    navigate("/auth");
  }
}, [authType, userId, navigate]);
```

---

### FIX-09 | EPUB — sumário abria capítulo errado

| | |
|---|---|
| **ID auditoria** | A-09 |
| **Severidade** | Alta |
| **Arquivos** | `Read.tsx`, `BookViewer.tsx` |

#### O que era o problema

TOC usava `setCurrentPage(index + 1)`, mas EPUB usa **locations/href**, não índice do array.

#### Antes

```typescript
onClick={() => setCurrentPage(index + 1)}
```

#### Depois

```typescript
// Read.tsx
onClick={() => { if (item.href) setEpubTargetHref(item.href); }}

// BookViewer.tsx
useEffect(() => {
  if (epubBook?.rendition && epubTargetHref) {
    epubBook.rendition.display(epubTargetHref);
  }
}, [epubTargetHref, epubBook]);
```

---

### FIX-10 | AuthContext — duplo loadProfile e PUT automático

| | |
|---|---|
| **ID auditoria** | A-10, A-11 |
| **Severidade** | Alta |
| **Arquivo** | `frontend/src/contexts/AuthContext.tsx` |

#### O que era o problema

- `onAuthStateChange` **e** `getSession()` chamavam `loadProfile` → requisições duplicadas.
- Após carregar perfil, efeito disparava `saveProfile()` sem o usuário editar nada.

#### Depois

- `getSession()` só sincroniza sessão/guest — **não** chama `loadProfile`.
- `skipProfileSaveRef`: ignora o primeiro ciclo de save após hydrate.
- Save só quando `username`, `avatarImage` ou `bannerImage` mudam de fato.

---

### FIX-11 | Aprovação de submissão não transacional

| | |
|---|---|
| **ID auditoria** | A-03, A-04 |
| **Severidade** | Alta |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### O que era o problema

Submissão virava `approved` **antes** do insert em `books`. Duplo clique podia duplicar livros.

#### Antes

```typescript
await supabase.from("book_submissions").update({ status: "approved", ... });
await supabase.from("books").insert({ ... });
```

#### Depois

```typescript
// Checa se já existe livro para esta submissão
if (existingBook) return res.status(409).json({ error: "Submission already approved..." });

// 1) Insert livro
await supabase.from("books").insert({ ..., submission_id: submission.id });

// 2) Só então approved (com .eq("status", "pending"))
await supabase.from("book_submissions").update({ status: "approved", ... }).eq("status", "pending");

// Se update falhar → rollback delete do livro
```

Migration `20260522120000_audit_fixes.sql`: `UNIQUE(submission_id)` em `books`.

---

### FIX-12 | Rejeição sem validar submissão

| | |
|---|---|
| **ID auditoria** | A-05 |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### Antes

Update por ID sem checar existência → `{ ok: true }` mesmo com ID inválido.

#### Depois

Carrega submissão → 404 se não existe → 400 se não está `pending` → update com `.eq("status", "pending")`.

---

### FIX-13 | Path traversal no proxy de imagens

| | |
|---|---|
| **ID auditoria** | A-16 |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### Depois

Função `sanitizeStoragePath()` rejeita `..`, paths absolutos e segmentos inválidos antes de `storage.download()`.

---

### FIX-14 | Teste automatizado POST /books (mock)

| | |
|---|---|
| **Arquivo** | `tests/api/books-catalog.api.test.ts` |

#### O que era o problema

Dois POSTs no mesmo teste consumiam um único mock de auth → 2º request retornava 500.

#### Depois

```typescript
supabaseCreateClientMock
  .mockReturnValueOnce(mock)   // service client na inicialização
  .mockReturnValueOnce(auth)   // 1º POST admin
  .mockReturnValueOnce(auth);  // 2º POST admin
```

---

### FIX-15 | Migration — schema faltante

| | |
|---|---|
| **ID auditoria** | A-01, A-02, A-18 |
| **Arquivo** | `services/main-service/supabase/migrations/20260522120000_audit_fixes.sql` |

Cria:

- Tabelas `achievements`, `user_achievements`
- Coluna `new_books_notifications` em `user_settings`
- Índices `UNIQUE` em favorites/reading/read e `books.submission_id`
- Policy de storage restrita à pasta `{user_id}/`

**Aplicar no Supabase remoto** se ainda não foi feito.

---

## 3.2 Correções detalhadas — 2ª rodada (FIX-16 … FIX-30)

> Itens que estavam listados como pendentes na §4 antiga e foram **implementados no código** em maio/2026.

---

### FIX-16 | Build produção crashava sem variáveis `VITE_*`

| | |
|---|---|
| **ID auditoria** | C-07 |
| **Severidade** | Crítica (deploy) |
| **Tipo de teste** | Caixa branca (build) + caixa preta (Vercel sem env) |
| **Arquivo(s)** | `frontend/src/lib/apiBases.ts`, `frontend/src/components/ApiConfigBanner.tsx`, `frontend/src/App.tsx` |

#### O que era o problema

`resolveBooksBase()` e `resolveLibraryBase()` faziam **`throw new Error(...)`** no **import do módulo** quando `VITE_*` não existiam em produção. O bundle nem montava a UI — **tela branca total** antes de qualquer mensagem.

#### Por que era grave

Deploy mal configurado na Vercel (esquecer `VITE_BOOKS_API_URL`) derrubava o app inteiro sem explicação para o usuário ou para quem fez o deploy.

#### Como foi corrigido

- Removido o `throw` no import; em produção sem env retorna `""` e registra `console.warn`.
- Exportadas flags `PRODUCTION_API_MISCONFIGURED` e `PRODUCTION_API_CONFIG_MESSAGE`.
- Componente `ApiConfigBanner` exibe faixa vermelha no topo quando a config está incompleta.
- `api.getBooks()` valida base antes do fetch e lança erro legível.

#### Antes

```typescript
function resolveBooksBase(): string {
  // ...
  if (import.meta.env.DEV) return "/api/books";
  throw new Error(
    "Produção: defina VITE_BOOKS_API_URL ou VITE_API_URL no painel da Vercel..."
  );
}
export const BOOKS_API_BASE_URL = resolveBooksBase();
```

#### Depois

```typescript
export const PRODUCTION_API_MISCONFIGURED =
  !import.meta.env.DEV &&
  !import.meta.env.VITE_BOOKS_API_URL &&
  !import.meta.env.VITE_LIBRARY_API_URL &&
  !import.meta.env.VITE_API_URL;

function resolveBooksBase(): string {
  // ...
  if (import.meta.env.DEV) return "/api/books";
  if (PRODUCTION_API_MISCONFIGURED) {
    console.warn(`[Eclipse Reads] ${PRODUCTION_API_CONFIG_MESSAGE}`);
  }
  return "";
}
```

```tsx
// App.tsx
<BrowserRouter>
  <ApiConfigBanner />
  {/* rotas */}
</BrowserRouter>
```

#### Como validar

1. `cd frontend && npm run build` **sem** `VITE_*` → build **conclui** (não crasha no import).
2. Abrir o `dist` servido em modo produção sem env → banner vermelho no topo com instrução da Vercel.

#### Para que serve

Build e CI previsíveis; operador vê **o que falta configurar** em vez de tela em branco.

---

### FIX-17 | CI backend falhava com `npm ci` sem lockfile

| | |
|---|---|
| **ID auditoria** | C-09 |
| **Severidade** | Crítica (CI/CD) |
| **Tipo de teste** | Caixa branca (pipeline) |
| **Arquivo** | `.github/workflows/main.yml` |

#### O que era o problema

O job `backend` executava `npm ci` **dentro** de `services/backend/{service}`, mas só existem lockfiles na **raiz** e em `frontend/`. O GitHub Actions quebrava em todo PR para `main`.

#### Como foi corrigido

- Job `backend`: `npm ci` na **raiz** (workspaces npm incluem os 3 microserviços).
- Depois: `npm run build` apenas no serviço da matrix.
- Job `frontend`: build com `VITE_BOOKS_API_URL` e `VITE_LIBRARY_API_URL` dummy para CI passar.

#### Antes

```yaml
- name: Install dependencies
  run: |
    cd services/backend/${{ matrix.service }}
    npm ci
```

#### Depois

```yaml
- name: Install dependencies
  run: npm ci

- name: TypeScript check
  run: |
    cd services/backend/${{ matrix.service }}
    npm run build
```

#### Como validar

Simular localmente: `npm ci` na raiz → `cd services/backend/books-api && npm run build` → sem erro de lockfile.

---

### FIX-18 | Deploy Vercel ignorava `/api/auth`

| | |
|---|---|
| **ID auditoria** | A-12 |
| **Severidade** | Alta (infra/deploy) |
| **Tipo de teste** | Caixa preta (URL produção) |
| **Arquivo(s)** | `.github/workflows/main.yml`, `frontend/vercel.json`, `frontend/api/auth.ts`, `vercel.json` (raiz) |

#### O que era o problema

O CI fazia deploy com `working-directory: frontend` usando `frontend/vercel.json` **somente SPA** — rewrite `/(.*)` → `index.html`. A função serverless `api/auth.ts` (auth-proxy) **nunca era publicada**. Rotas `/api/auth/login`, `/validate`, etc. retornavam HTML do React.

#### Como foi corrigido

- Deploy passa a rodar na **raiz do repositório** (usa `vercel.json` raiz).
- `frontend/vercel.json` ganhou rewrites para `/api/auth`.
- Criado `frontend/api/auth.ts` reexportando o Express do auth-proxy (compatível se Root Directory = `frontend/`).
- Build de produção no job de deploy com secrets `VITE_*` e `SUPABASE_*`.

#### Antes (`frontend/vercel.json`)

```json
"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]
```

#### Depois

```json
"rewrites": [
  { "source": "/api/auth/:slug*", "destination": "/api/auth" },
  { "source": "/api/auth", "destination": "/api/auth" },
  { "source": "/(.*)", "destination": "/index.html" }
]
```

```typescript
// frontend/api/auth.ts
import app from "../../../services/backend/auth-proxy/src/index";
export default app;
```

#### Como validar

1. Após deploy: `GET https://seu-dominio.vercel.app/api/auth/health` → JSON `{ ok: true }` (não HTML).
2. No painel Vercel: Root Directory vazio **ou** `frontend/` com `frontend/api/` presente.

#### Para que serve

Auth-proxy disponível em produção para clientes que chamam `/api/auth/*` (além do Supabase direto no browser).

---

### FIX-19 | Docker healthcheck com `curl` inexistente no Alpine

| | |
|---|---|
| **ID auditoria** | A-14 |
| **Severidade** | Alta (DevOps) |
| **Tipo de teste** | Caixa preta (`docker compose ps`) |
| **Arquivo** | `services/backend/docker-compose.yml` |

#### O que era o problema

Healthchecks usavam `curl -f http://localhost:4000/health`, mas as imagens `node:20-alpine` **não incluem curl**. Containers ficavam permanentemente **`unhealthy`**.

#### Antes

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
```

#### Depois

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:4000/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
```

(Mesmo padrão para `:4100` e `:4200`.)

#### Como validar

```powershell
cd services\backend
docker compose up -d
docker compose ps
# STATUS deve ser "healthy" após alguns segundos
```

---

### FIX-20 | Playwright apontava porta errada (5173 vs 8080)

| | |
|---|---|
| **ID auditoria** | A-15, M-25 |
| **Severidade** | Alta (E2E) |
| **Arquivo** | `playwright.config.ts`, `frontend/vite.config.ts` |

#### O que era o problema

Playwright usava default `http://127.0.0.1:5173`, mas o Vite do projeto está configurado na porta **8080**. Testes E2E falhavam por timeout (nada escutando em 5173).

#### Antes

```typescript
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
```

#### Depois

```typescript
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";
```

#### Como validar

```powershell
# Terminal 1
cd frontend; npm run dev
# Terminal 2
npm run test:e2e
```

---

### FIX-21 | CORS aberto no auth-proxy

| | |
|---|---|
| **ID auditoria** | A-17 |
| **Severidade** | Alta (segurança) |
| **Tipo de teste** | Caixa preta (request de origem externa) |
| **Arquivo** | `services/backend/auth-proxy/src/index.ts` |

#### O que era o problema

`app.use(cors())` sem configuração aceitava **qualquer origem** em `:4100/login` — risco de abuso cross-origin em ambientes expostos.

#### Antes

```typescript
const app = express();
app.use(cors());
```

#### Depois

```typescript
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://eclipse-reads.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado pela política de CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);
```

#### Como validar

Request de origem não listada para `POST http://localhost:4100/login` → erro CORS no browser ou resposta bloqueada.

---

### FIX-22 | Home e Search sem tratamento de erro de API

| | |
|---|---|
| **ID auditoria** | M-01 |
| **Severidade** | Média (UX) |
| **Tipo de teste** | Caixa preta (backend offline) |
| **Arquivo(s)** | `frontend/src/pages/Home.tsx`, `frontend/src/pages/Search.tsx` |

#### O que era o problema

`api.getBooks()` era chamado sem `try/catch`. Se books-api estivesse offline, a promise rejeitava silenciosamente ou gerava erro não tratado — tela vazia sem feedback.

#### Antes

```typescript
const loadBooks = async () => {
  const response = await api.getBooks();
  if (response?.books) {
    setBooks(unique);
  }
};
loadBooks();
```

#### Depois

```typescript
const [loadError, setLoadError] = useState<string | null>(null);

const loadBooks = async () => {
  try {
    setLoadError(null);
    const response = await api.getBooks();
    // ...
  } catch {
    setLoadError("Não foi possível carregar os livros...");
    toast.error("Erro ao carregar catálogo");
  }
};
```

#### Como validar

Subir só o frontend (`npm run dev`) **sem** books-api → Home/Search mostram mensagem de erro em vermelho + toast.

---

### FIX-23 | Settings salvava automaticamente ao carregar

| | |
|---|---|
| **ID auditoria** | M-02 |
| **Severidade** | Média (dados/API) |
| **Arquivo** | `frontend/src/pages/Settings.tsx` |

#### O que era o problema

Dois `useEffect` encadeados: o primeiro carregava settings do servidor (`setTheme`, etc.); o segundo observava `theme` e chamava `saveSettings()` — disparando **PUT desnecessário** (e possível sobrescrita) logo após abrir a tela.

#### Antes

```typescript
useEffect(() => {
  loadSettings(); // setTheme(...)
}, [userId, token]);

useEffect(() => {
  setGlobalTheme(theme);
  if (userId) saveSettings(); // roda também após o load!
}, [theme, soundEnabled, newBooksNotifications, userId]);
```

#### Depois

```typescript
const settingsHydratedRef = useRef(false);

useEffect(() => {
  settingsHydratedRef.current = false;
  loadSettings().finally(() => {
    settingsHydratedRef.current = true;
  });
}, [userId, token]);

useEffect(() => {
  if (!settingsHydratedRef.current) return;
  setGlobalTheme(theme);
  if (userId) saveSettings();
}, [theme, soundEnabled, newBooksNotifications, userId]);
```

#### Como validar

DevTools → Network → abrir Settings → **não** deve haver `PUT /me/settings` imediatamente após o `GET`; só após alterar toggle ou tema.

---

### FIX-24 | BookDetail navegava antes do toggle “lendo” terminar

| | |
|---|---|
| **ID auditoria** | M-03 |
| **Severidade** | Média (integridade) |
| **Arquivo** | `frontend/src/pages/BookDetail.tsx` |

#### O que era o problema

Botão “Começar Leitura” chamava `handleToggleReading()` (async) e **`navigate()` na sequência**, sem `await`. A API podia falhar ou `Read.tsx` duplicava a chamada de “adicionar a lendo”.

#### Antes

```typescript
onClick={() => {
  handleToggleReading();
  navigate(`/read/${id}`);
}}
```

#### Depois

```typescript
const handleToggleReading = async (): Promise<boolean> => {
  const success = await toggleReading(id!, bookLimit);
  if (!success) {
    toastNeedLogin("Limite atingido!...", navigate);
    return false;
  }
  return true;
};

onClick={async () => {
  const ok = await handleToggleReading();
  if (ok) navigate(`/read/${id}`);
}}
```

#### Como validar

Network → clicar “Começar Leitura” → confirmar que POST biblioteca completa **antes** da navegação para `/read/:id`.

---

### FIX-25 | Checkbox de termos no signup não validado

| | |
|---|---|
| **ID auditoria** | M-06 |
| **Severidade** | Média (compliance/UX) |
| **Arquivo** | `frontend/src/pages/Auth.tsx` |

#### O que era o problema

Checkbox “Eu aceito os termos…” era **visual apenas** — sem estado `checked` e sem validação em `handleEmailSignup`. Usuário podia criar conta sem aceitar termos.

#### Antes

```tsx
<Checkbox id="terms" />
// handleEmailSignup — sem checagem de termos
```

#### Depois

```typescript
const [acceptedTerms, setAcceptedTerms] = useState(false);

// em handleEmailSignup:
if (!acceptedTerms) {
  toast.error("Aceite os termos de uso e a política de privacidade para continuar");
  return;
}
```

```tsx
<Checkbox
  id="terms"
  checked={acceptedTerms}
  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
/>
```

#### Como validar

Aba Cadastro → preencher campos → **não** marcar termos → Criar Conta → toast de erro; com checkbox marcado → fluxo normal.

---

### FIX-26 | Botão “MAIS LIVROS RECENTES” sem ação

| | |
|---|---|
| **ID auditoria** | M-07 |
| **Severidade** | Média (UX) |
| **Arquivo** | `frontend/src/pages/Search.tsx` |

#### O que era o problema

Botão renderizado sem `onClick` nem paginação — elemento morto na interface.

#### Como foi corrigido

Paginação **client-side**: `PAGE_SIZE = 24`, estado `visibleCount`, slice `filteredBooks.slice(0, visibleCount)`, botão incrementa `visibleCount` enquanto houver mais itens.

#### Depois

```typescript
const PAGE_SIZE = 24;
const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
const visibleBooks = filteredBooks.slice(0, visibleCount);
const hasMore = visibleCount < filteredBooks.length;

<Button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
  MAIS LIVROS RECENTES
</Button>
```

#### Como validar

Search com >24 resultados → botão aparece → clique revela mais cards → some quando todos visíveis.

---

### FIX-27 | Dois sistemas de toast simultâneos

| | |
|---|---|
| **ID auditoria** | M-10 |
| **Severidade** | Média (UX/consistência) |
| **Arquivo(s)** | `frontend/src/App.tsx`, `Settings.tsx`, `NotificationContext.tsx` |

#### O que era o problema

`App.tsx` montava **`<Toaster />` (shadcn)** e **`<Sonner />`** juntos. `Settings` e `NotificationContext` usavam `useToast()` shadcn; demais páginas usavam `sonner` — notificações duplicadas ou inconsistentes.

#### Antes

```tsx
// App.tsx
<Toaster />
<Sonner />

// Settings.tsx
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Erro ao salvar", variant: "destructive" });
```

#### Depois

```tsx
// App.tsx — só Sonner
<Sonner />

// Settings.tsx
import { toast } from "sonner";
toast.error("Não foi possível carregar suas configurações.");
```

#### Como validar

Abrir Settings, alterar tema, disparar notificação de novos livros → **apenas um** estilo de toast (Sonner) no canto da tela.

---

### FIX-28 | `console.log` de signup em produção

| | |
|---|---|
| **ID auditoria** | B-09 |
| **Severidade** | Baixa (segurança/polish) |
| **Arquivo** | `frontend/src/pages/Auth.tsx` |

#### O que era o problema

Logs de debug do fluxo `signUp` (`Resposta completa do Supabase signUp`) iam para o console **em produção**, podendo expor metadados sensíveis no DevTools.

#### Depois

```typescript
if (import.meta.env.DEV) {
  console.log("🚨 [Auth Debug] Resposta completa do Supabase signUp:", { signData, error });
}
```

#### Como validar

Build produção → cadastro → DevTools Console **sem** logs `[Auth Debug]`.

---

### FIX-29 | Import `Navigate` não usado

| | |
|---|---|
| **ID auditoria** | B-10 |
| **Severidade** | Baixa (lint) |
| **Arquivo** | `frontend/src/App.tsx` |

#### Antes

```typescript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
```

#### Depois

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
```

(`Navigate` continua usado em `ProtectedRoute.tsx` e `AdminRoute.tsx`.)

---

### FIX-30 | MySubmissions — loading infinito para guest

| | |
|---|---|
| **ID auditoria** | B-11 |
| **Severidade** | Baixa (UX) |
| **Arquivo** | `frontend/src/pages/MySubmissions.tsx` |

#### O que era o problema

Estado inicial `loading = true`. Para guest (`userId`/`token` null), `loadSubmissions` retornava cedo **sem** `setLoading(false)` → spinner eterno.

#### Antes

```typescript
const loadSubmissions = useCallback(async () => {
  if (!userId || !token) return;
  setLoading(true);
  // ...
  setLoading(false);
}, [userId, token]);
```

#### Depois

```typescript
const loadSubmissions = useCallback(async () => {
  if (!userId || !token) {
    setLoading(false);
    return;
  }
  // ...
}, [userId, token]);

if (!userId || !token || authType === "guest") {
  return (
    <Card>
      <h2>Login necessário</h2>
      <Button onClick={() => navigate("/auth")}>Ir para login</Button>
    </Card>
  );
}
```

#### Como validar

Modo convidado → `/my-submissions` → tela “Login necessário” (sem spinner infinito).

---

## 3.3 Correções detalhadas — 3ª rodada (FIX-31 … FIX-48)

> Fechamento do backlog **M/B implementável em código** (maio/2026).

---

### FIX-31 | Teclas do leitor invertidas / setas ausentes

| | |
|---|---|
| **ID auditoria** | M-04 |
| **Severidade** | Média (UX/acessibilidade) |
| **Arquivo** | `frontend/src/pages/Read.tsx` |

#### O que era o problema

A UI prometia navegação por setas, mas só **Home/End** existiam — e com semântica **invertida** (Home = página anterior, End = próxima). Setas ← → não funcionavam.

#### Depois

```typescript
if (e.key === "ArrowLeft" || e.key === "PageUp") handlePrevPage();
else if (e.key === "ArrowRight" || e.key === "PageDown") handleNextPage();
else if (e.key === "Home") setCurrentPage(1);
else if (e.key === "End") setCurrentPage(totalPages);
```

#### Como validar

Abrir leitor PDF → `←`/`→` mudam página; Home vai para 1; End vai para última.

---

### FIX-32 | Library re-fetcha catálogo inteiro

| | |
|---|---|
| **ID auditoria** | M-05 |
| **Arquivo(s)** | `LibraryContext.tsx`, `Library.tsx` |

#### O que era o problema

`LibraryContext` já recebia livros completos de `/library?type=...`, mas `Library.tsx` chamava `getBooks()` de novo e filtrava por ID — desperdício e livros removidos do catálogo sumiam da biblioteca.

#### Depois

- Context expõe `libraryBooks: { favoritos, lendo, lidos }` vindos da API de biblioteca.
- `Library.tsx` usa esses dados para usuários logados; guest continua com `getBooks()` + filtro local.

#### Como validar

Network → abrir Biblioteca logado → **sem** `GET /books`; apenas dados já carregados do library-service.

---

### FIX-33 | Admin stats stub no Profile

| | |
|---|---|
| **ID auditoria** | M-09 |
| **Arquivo** | `frontend/src/pages/Profile.tsx` |

#### O que era o problema

`loadAdminStats` estava vazio — cards de admin sempre **zero**.

#### Depois

```typescript
const [booksRes, subsRes] = await Promise.all([
  api.getBooks(),
  api.getAdminSubmissions(token),
]);
setAdminStatsData({
  totalBooks: books.length,
  pendingSubmissions: submissions.filter(s => s.status === "pending").length,
  // ...
});
```

---

### FIX-34 | Data hardcoded desatualizada no Plan

| | |
|---|---|
| **ID auditoria** | M-12 |
| **Arquivo** | `frontend/src/pages/Plan.tsx` |

#### Antes

```tsx
<span>Válido até novembro de 2025</span>
```

#### Depois

```tsx
<span>Sem vencimento — plano gratuito</span>
```

---

### FIX-35 | ReviewSection bypassa camada API

| | |
|---|---|
| **ID auditoria** | M-13 |
| **Arquivo(s)** | `frontend/src/lib/api.ts`, `ReviewSection.tsx` |

#### Depois

Métodos `getBookReviews` e `upsertBookReview` em `api.ts`; componente usa `api.*` em vez de `fetch` direto com `BOOKS_API_BASE_URL`.

---

### FIX-36 | Upload valida extensão, não conteúdo

| | |
|---|---|
| **ID auditoria** | M-14 |
| **Arquivo(s)** | `SubmitBook.tsx`, `bookFileValidation.ts`, `books-api/src/index.ts` |

#### Depois

- Frontend: `validateBookFileContent()` checa magic bytes (PDF `%PDF-`, EPUB ZIP, MOBI `BOOK`).
- Backend: `validateBookFileBuffer()` rejeita `400` se conteúdo não bate com extensão.

---

### FIX-37 | Inconsistência list vs detail do catálogo

| | |
|---|---|
| **ID auditoria** | M-16 |
| **Arquivo** | `services/backend/books-api/src/index.ts` |

#### Depois

`GET /books/:id` exige `file_path` não vazio (como `GET /books`); retorna **404** se livro sem arquivo importado.

---

### FIX-38 | Env loading frágil nos backends

| | |
|---|---|
| **ID auditoria** | M-21 |
| **Arquivo(s)** | `library-service/src/index.ts`, `auth-proxy/src/index.ts` |

#### Depois

Carregamento de `.env` via `fileURLToPath` + `resolve(__dirname, "../../envs/...")` — mesmo padrão do `books-api`.

---

### FIX-39 | CI ESLint ignorado

| | |
|---|---|
| **ID auditoria** | M-22 |
| **Arquivo** | `.github/workflows/main.yml` |

#### Antes

```yaml
npm run lint || true
```

#### Depois

```yaml
npm run lint
```

---

### FIX-40 | `/metrics` público

| | |
|---|---|
| **ID auditoria** | B-01 |
| **Arquivo** | `books-api/src/index.ts` |

#### Depois

Em `NODE_ENV === "production"`, `/metrics` exige `requireAdmin`.

---

### FIX-41 | Logs verbosos em produção

| | |
|---|---|
| **ID auditoria** | B-02 |
| **Arquivos** | books-api, library-service, auth-proxy |

#### Depois

Logs `[Vercel Proxy] ... Hit` só quando `NODE_ENV !== "production"`.

---

### FIX-42 | Reviews expõem `user_id`

| | |
|---|---|
| **ID auditoria** | B-03 |
| **Arquivo** | `books-api/src/index.ts` |

#### Depois

API retorna `author_name` (username do profile); **não** expõe `user_id` na resposta pública.

---

### FIX-43 | Profile aceita URLs arbitrárias

| | |
|---|---|
| **ID auditoria** | B-04 |
| **Arquivo** | `library-service/src/index.ts` |

#### Depois

`isAllowedProfileMediaUrl()` — aceita `data:image/`, `/images/avatars/` ou storage Supabase `/avatars/`.

---

### FIX-44 | Progresso sem validação de bounds

| | |
|---|---|
| **ID auditoria** | B-05 |
| **Arquivo** | `library-service/src/index.ts` |

#### Depois

Clamp: `current_page` 1…total, `total_pages` 1…10000, `progress_percentage` 0…100.

---

### FIX-45 | Toast delay extremo

| | |
|---|---|
| **ID auditoria** | B-08 |
| **Arquivo** | `frontend/src/components/ui/sonner.tsx` |

#### Depois

`duration={4000}` no `<Sonner />`.

---

### FIX-46 | `docker-compose` vs `docker compose`

| | |
|---|---|
| **ID auditoria** | B-13 |
| **Arquivo** | `package.json` (raiz) |

#### Depois

Scripts `test:docker*` usam `docker compose` (v2).

---

### FIX-47 | Erros genéricos mascaram 401

| | |
|---|---|
| **ID auditoria** | B-14 |
| **Arquivo** | `frontend/src/lib/api.ts` |

#### Depois

`handleResponse` trata **401** → “Sessão expirada…” e **403** → “Sem permissão…”.

---

### FIX-48 | Documentação env backends

| | |
|---|---|
| **ID auditoria** | M-23 (parcial) |
| **Arquivo** | `services/README.md` |

Nota sobre resolução de path `../../envs/` adicionada na seção Variáveis de Ambiente.

---

## 4. Itens ainda pendentes (após FIX-01 … FIX-48)

> **Corrigidos no código:** §3 + §3.2 + §3.3.  
> **Abaixo:** Supabase/Vercel manual + itens de baixo impacto ou risco alto (ex.: `strict: true`).

### 4.1 Supabase / deploy — ação manual

| ID | Item |
|----|------|
| INF-01 … INF-06 | Schema, OAuth, storage, Vercel, admin |
| C-03, A-01, A-02, A-18, FIX-15 | Migrations no Supabase remoto |

### 4.2 Backlog restante (código ou ops)

| ID | Motivo de permanecer aberto |
|----|----------------------------|
| M-11 | `strict: true` — breaking change amplo no frontend |
| M-15 | RLS `user_id IS NULL` — alteração de migration Supabase |
| M-17 | Admin auth — **já alinhado** (has_role + fallback `adm`); validar manual |
| M-18 | Edge functions — fora do fluxo principal |
| M-19 | `api/auth` raiz vs `frontend/api/auth` — manter ambos para deploy flexível |
| M-24 | Renomear testes — cosmético |
| B-07 | Achievement toggle — erros DB **já tratados** em toggle (verificar manual) |
| B-12 | Acessibilidade — revisão UX ampla |
| B-15 | Coverage enforced no CI — requer thresholds estáveis |

### 4.3 Índice — todas as correções no código

| Rodada | FIX | IDs principais |
|--------|-----|----------------|
| 1ª | FIX-01 … FIX-15 | C-01…C-06, A-03…A-16 |
| 2ª | FIX-16 … FIX-30 | C-07, C-09, A-12…A-17, M-01…M-10, B-09…B-11 |
| 3ª | FIX-31 … FIX-48 | M-04…M-14, M-16, M-21…M-23, B-01…B-05, B-08, B-13, B-14 |

**Testes após 3ª rodada:** `npm test` → **54/54** | `npm run build` → **OK**

---

## 5. Refatoração aplicada (2 técnicas)

### Técnica 1 — Extract Function (extrair função)

**Onde:** `LibraryContext.tsx` — parse de listas guest no localStorage.

**Antes:** `JSON.parse` repetido 3× sem proteção.

**Depois:**

```typescript
function parseGuestList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
```

**Para que serve:** um único lugar para tratar JSON inválido; evita crash do Provider.

---

### Técnica 2 — Guard Clause (retorno antecipado)

**Onde:** `Read.tsx` — save de progresso.

**Antes:** effect sempre agendava save após 1s.

**Depois:** `if (!progressLoaded) return;` no início do save.

**Para que serve:** impede efeitos colaterais quando pré-condição não está satisfeita.

---

## 6. Postman (Postman Web) — dados para montar manualmente

> Copie abaixo para o [Postman Web](https://web.postman.co/). **Não** é necessário importar JSON no repositório.

### 6.1 Environment — criar manualmente

Nome: `Eclipse Reads Local`

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `books_url` | `http://localhost:4000` | `http://localhost:4000` |
| `library_url` | `http://localhost:4200` | `http://localhost:4200` |
| `auth_url` | `http://localhost:4100` | `http://localhost:4100` |
| `token` | *(vazio)* | *(preencher após login)* |
| `book_id` | *(vazio)* | *(uuid de um livro do GET /books)* |

---

### 6.2 Collection — requests para criar uma a uma

#### Grupo: Health

| Nome | Método | URL |
|------|--------|-----|
| Books health | GET | `{{books_url}}/health` |
| Library health | GET | `{{library_url}}/health` |
| Auth health | GET | `{{auth_url}}/health` |

---

#### Grupo: Catálogo (público)

| Nome | Método | URL | Headers | Body |
|------|--------|-----|---------|------|
| Listar livros | GET | `{{books_url}}/books` | — | — |
| Detalhe livro | GET | `{{books_url}}/books/{{book_id}}` | — | — |
| Cotação do dia | GET | `{{books_url}}/quotes/today?rotate=1` | — | — |
| Token arquivo | GET | `{{books_url}}/books/{{book_id}}/file-access` | — | — |
| Baixar arquivo | GET | `{{books_url}}/books/{{book_id}}/file?access=COLE_ACCESS_AQUI` | — | — |

---

#### Grupo: Auth

| Nome | Método | URL | Headers | Body (raw JSON) |
|------|--------|-----|---------|-----------------|
| Login | POST | `{{auth_url}}/login` | `Content-Type: application/json` | `{"email":"seu@email.com","password":"suasenha"}` |

**Tests tab (Login)** — salvar token automaticamente:

```javascript
const json = pm.response.json();
if (json.access_token) {
  pm.environment.set("token", json.access_token);
}
```

| Nome | Método | URL | Headers |
|------|--------|-----|---------|
| Validar token | GET | `{{auth_url}}/validate` | `Authorization: Bearer {{token}}` |

---

#### Grupo: Biblioteca (autenticado)

| Nome | Método | URL | Headers | Body (raw JSON) |
|------|--------|-----|---------|-----------------|
| Favoritos | GET | `{{library_url}}/library?type=favoritos` | `Authorization: Bearer {{token}}` | — |
| Lendo | GET | `{{library_url}}/library?type=lendo` | idem | — |
| Lidos | GET | `{{library_url}}/library?type=lidos` | idem | — |
| Add favorito | POST | `{{library_url}}/library/favoritos` | idem | `{"bookId":"{{book_id}}"}` |
| Remove favorito | DELETE | `{{library_url}}/library/favoritos/{{book_id}}` | idem | — |
| Meu perfil | GET | `{{library_url}}/me/profile` | idem | — |
| Minhas settings | GET | `{{library_url}}/me/settings` | idem | — |
| Progresso leitura GET | GET | `{{library_url}}/reading-progress/{{book_id}}` | idem | — |
| Progresso leitura PUT | PUT | `{{library_url}}/reading-progress/{{book_id}}` | idem | `{"current_page":10,"total_pages":200,"progress_percentage":5}` |
| Conquistas | GET | `{{library_url}}/achievements` | — | — |
| Minhas conquistas | GET | `{{library_url}}/me/achievements` | `Authorization: Bearer {{token}}` | — |

---

#### Grupo: Submissões

| Nome | Método | URL | Headers | Body |
|------|--------|-----|---------|------|
| Enviar livro | POST | `{{books_url}}/submissions` | `Authorization: Bearer {{token}}` | **form-data** (ver tabela) |
| Minhas submissões | GET | `{{books_url}}/submissions/mine` | `Authorization: Bearer {{token}}` | — |

**Body form-data (Enviar livro):**

| Key | Type | Value |
|-----|------|-------|
| title | Text | Título do livro |
| author | Text | Nome do autor |
| description | Text | Descrição |
| category | Text | ficção |
| file | File | selecionar .pdf / .epub / .mobi |

---

#### Grupo: Admin (token de usuário admin)

| Nome | Método | URL | Headers | Body |
|------|--------|-----|---------|------|
| Listar submissões | GET | `{{books_url}}/admin/submissions` | `Authorization: Bearer {{token}}` | — |
| Aprovar | POST | `{{books_url}}/admin/submissions/SUBMISSION_ID/approve` | idem | — |
| Rejeitar | POST | `{{books_url}}/admin/submissions/SUBMISSION_ID/reject` | idem | `{"rejection_reason":"Motivo"}` |

---

### 6.3 Ordem sugerida de teste no Postman Web

1. Health dos 3 serviços  
2. GET `/books` → copiar um `id` para `book_id`  
3. POST `/login` → token salvo  
4. GET `/library?type=favoritos`  
5. POST `/library/favoritos` com `{ "bookId": "..." }`  
6. GET `/me/profile`  
7. GET `/books/{id}/file-access` → testar URL com `access`  
8. (Admin) GET `/admin/submissions`  

---

### 6.4 Pré-requisito — subir backends

```powershell
# Terminal 1
Set-Location services\backend\books-api
npm run dev

# Terminal 2
Set-Location services\backend\library-service
npm run dev

# Terminal 3 (opcional)
Set-Location services\backend\auth-proxy
npm run dev
```

Frontend (opcional para teste integrado):

```powershell
Set-Location frontend
npm run dev
# http://localhost:8080
```

---

## 7. Referências no repositório

| Documento | Conteúdo |
|-----------|----------|
| `AUDITORIA_ECLIPSE_READS.md` | Auditoria completa (67 achados) |
| `tests/README.md` | Como rodar testes |
| `services/backend/envs/*.env.example` | Templates de variáveis backend |

---

*Documento gerado para uso do grupo — maio/2026.*
