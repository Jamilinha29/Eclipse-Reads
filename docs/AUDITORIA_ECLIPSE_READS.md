# Auditoria Completa — Eclipse Reads

**Projeto:** Eclipse Reads  
**Data da auditoria:** 22 de maio de 2026  
**Última atualização:** 22 de maio de 2026 — sessão pós-auditoria (Supabase novo, storage `livros/`, env, logo, SQL consolidado)  
**Escopo:** Backend (Express), Frontend (React/Vite), Supabase (migrations), Testes, CI/CD, Docker, Deploy Vercel  
**Tipo:** Revisão estática de código — complementar a testes manuais em runtime

---

## Como usar este documento

Cada item contém:

| Campo | Significado |
|-------|-------------|
| **Problema** | O que está errado hoje |
| **Onde** | Arquivo(s) e trecho aproximado |
| **Por que corrigir** | Risco ou impacto se permanecer |
| **Para que servirá** | Benefício após a correção |
| **Como verificar** | Passo manual sugerido (quando aplicável) |

Para gerar PDF a partir deste arquivo:

```bash
# Opção 1 — VS Code / Cursor: extensão "Markdown PDF"
# Opção 2 — Pandoc (se instalado):
pandoc AUDITORIA_ECLIPSE_READS.md -o AUDITORIA_ECLIPSE_READS.pdf
```

---

## Resumo executivo

| Severidade | Quantidade | Áreas principais |
|------------|:----------:|--------------------|
| Crítico | 9 | Segurança, corrupção de dados, build/deploy quebrado |
| Alto | 18 | Schema vs API, features incompletas, CI, Docker |
| Médio | 22 | UX, validação, documentação, testes mal nomeados |
| Baixo | 15 | Logging, acessibilidade, código morto, polish |

### Arquitetura (referência)

```
Frontend (Vite :8080, React)
    ├── books-api (:4000)     → Supabase Postgres + Storage (books/livros/, books/covers/)
    ├── library-service (:4200) → Supabase Postgres + Storage (avatars)
    └── auth-proxy (:4100)    → Supabase Auth

Supabase (projeto atual): wnaymuusxwvawmbieukm
Schema: services/main-service/supabase/migrations/all_migrations_combined.sql
```

---

# CRÍTICO — corrigir com prioridade máxima

---

## C-01 — `POST /books` sem autenticação e body incompatível com o schema

**Onde:** `services/backend/books-api/src/index.ts` (~L850)

**Problema:** O endpoint `POST /books` aceita requisições sem token. O backend usa a **service role** do Supabase, ignorando RLS. Qualquer pessoa pode tentar inserir livros no catálogo. Além disso, o body envia campos inexistentes (`isbn`, `pages`) e omite campos obrigatórios (`category`, `file_path`, `file_type` — NOT NULL na migration `20251110010355_...sql`).

**Por que corrigir:** Risco de **poluição do catálogo**, integridade de dados comprometida e possível abuso em produção. Mesmo que o insert falhe no banco, expõe uma superfície de ataque desnecessária.

**Para que servirá:** Garantir que apenas administradores (ou fluxo de submissão/aprovação) alterem o catálogo; alinhar contrato API ↔ schema e eliminar vetor de escrita não autorizada.

**Como verificar:**
```bash
curl -X POST http://localhost:4000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","author":"Test"}'
```
Esperado após correção: `401` ou `403`, nunca `201` sem credencial admin.

---

## C-02 — Download público de arquivos de livros

**Onde:** `services/backend/books-api/src/index.ts` (~L248), endpoint `GET /books/:id/file`

**Problema:** Qualquer pessoa que conheça ou descubra o UUID de um livro pode baixar PDF/EPUB/MOBI sem autenticação. Os IDs aparecem em `GET /books`.

**Por que corrigir:** Violação de controle de acesso a conteúdo possivelmente protegido por direitos autorais ou política interna. UUIDs não são segredo — são identificadores públicos na API.

**Para que servirá:** Proteger o acervo digital; permitir leitura apenas a usuários autorizados ou via **URLs assinadas de curta duração** (compatíveis com iframes/PDF.js que não enviam `Authorization`).

**Como verificar:** Abrir `http://localhost:4000/books/{uuid}/file` em aba anônima sem token. Hoje retorna o arquivo; após correção deve retornar `401` ou exigir `?access=` assinado.

---

## C-03 — Política de storage permissiva no bucket `books`

**Onde:** `services/main-service/supabase/migrations/all_migrations_combined.sql` (policies bucket `books`; bloco audit + `livros/`)

**Problema:** Policy `INSERT` com condição apenas `bucket_id = 'books'` permite que **qualquer usuário autenticado** faça upload em **qualquer path** do bucket, sobrescrevendo a policy mais restritiva por pasta de usuário.

**Status (22/05/2026):** **Parcial no código/SQL.** SQL consolidado recria policy restrita a **`livros/{user_id}/`** (e legado `{user_id}/`). Backend usa **service role** nos fluxos admin/submissão. Aplicar SQL no Supabase novo e validar policies no painel.

**Por que corrigir:** Clientes Supabase diretos (fora do Express) podem enviar arquivos para paths arbitrários, incluindo paths de outros usuários ou pastas administrativas.

**Para que servirá:** Defesa em profundidade: uploads limitados à pasta do usuário em `livros/`, alinhado ao fluxo de submissões do backend.

**Como verificar:** No painel Supabase → Storage → Policies, revisar policies OR-combinadas no bucket `books`.

---

## C-04 — Senha em plaintext no `localStorage`

**Onde:** `frontend/src/pages/Auth.tsx` (L193–195), chave `AUTH_SAVED_PASSWORD_KEY` em `frontend/src/integrations/supabase/client.ts`

**Problema:** Ao marcar "Lembrar-me", a senha é gravada em `localStorage` em texto puro. O valor **nunca é relido** (só removido) — código morto e vulnerabilidade.

**Por que corrigir:** Qualquer XSS, extensão maliciosa ou acesso físico ao dispositivo expõe a credencial. Viola boas práticas OWASP e LGPD (dados sensíveis em storage persistente).

**Para que servirá:** "Lembrar-me" deve persistir apenas **e-mail** (opcional) e confiar na sessão Supabase (`persistSession`). Segurança do login sem funcionalidade falsa.

**Como verificar:** Login com checkbox marcado → DevTools → Application → Local Storage → procurar `eclipse_reads_saved_password`.

---

## C-05 — Race condition no progresso de leitura

**Onde:** `frontend/src/pages/Read.tsx` (L37–38, L76–109)

**Problema:** Estado inicial `currentPage=1`, `totalPages=1`. Um `useEffect` salva progresso após 1s. Se `getReadingProgress` demorar, grava **100%** (`1/1`) antes de carregar o progresso real.

**Por que corrigir:** Usuários **perdem permanentemente** a posição de leitura no banco — corrupção silenciosa de dados.

**Para que servirá:** Experiência confiável de "continuar de onde parou"; dados de `reading_progress` íntegros para estatísticas e metas.

**Como verificar:** Abrir livro com progresso salvo; DevTools → Network → Slow 3G; observar se PUT de progresso envia `current_page: 1` antes do GET retornar.

---

## C-06 — Dev quebrado: sem proxy Vite para `/api/*`

**Onde:** `frontend/vite.config.ts` vs `frontend/src/lib/apiBases.ts` (L10–11, L21–22)

**Problema:** Em desenvolvimento, o frontend chama `/api/books` e `/api/library`, mas o Vite **não faz proxy** para `:4000` e `:4200`. Sem `frontend/.env` preenchido, requisições batem no servidor Vite e retornam HTML/404.

**Por que corrigir:** Onboarding de novos devs falha; README promete `npm run dev` mas exige config extra não óbvia.

**Para que servirá:** Ambiente local funcional out-of-the-box; menos fricção na equipe e em avaliações acadêmicas.

**Como verificar:** Clone fresh → `npm run dev` no frontend **sem** `.env` → abrir Home → Network tab mostra 404/HTML em `/api/books`.

---

## C-07 — Build de produção crasha sem variáveis `VITE_*`

**Onde:** `frontend/src/lib/apiBases.ts` (L11–13, L22–24)

**Problema:** `resolveBooksBase()` e `resolveLibraryBase()` fazem `throw new Error(...)` no **import do módulo** quando env vars ausentes fora de `DEV`.

**Por que corrigir:** Deploy mal configurado na Vercel resulta em **tela branca total** — erro ocorre antes de qualquer UI de fallback.

**Para que servirá:** Build resiliente ou mensagem de erro amigável; CI previsível quando secrets não estão configurados.

**Como verificar:** `cd frontend && npm run build` sem `VITE_BOOKS_API_URL` / `VITE_LIBRARY_API_URL` no ambiente.

---

## C-08 — Asset `logo.png` ausente

**Onde:** `frontend/src/pages/Auth.tsx`, `Header.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `frontend/index.html` (favicon)

**Problema (original):** Imports `@/assets/logo.png` referenciaviam arquivo inexistente no repositório.

**Status (22/05/2026):** **Resolvido.** `frontend/src/assets/logo.png` existe e é usado na UI. `frontend/public/logo.svg` (placeholder da auditoria) foi **removido**. Favicon em `index.html` aponta para `/og-image.png` (mesma arte). `frontend/public/og-image.png` permanece para Open Graph.

**Como verificar:** `cd frontend && npm run build` — build deve concluir sem erro de asset de logo.

---

## C-09 — CI backend: `npm ci` sem lockfile por serviço

**Onde:** `.github/workflows/main.yml` (L88–91)

**Problema:** Job `backend` executa `npm ci` dentro de `services/backend/{service}`, mas lockfiles existem apenas na **raiz** e em `frontend/`.

**Por que corrigir:** Pipeline CI falha em todo PR/push para `main`, bloqueando merge e deploy.

**Para que servirá:** CI confiável; instalação via workspaces na root (`npm ci` + `npm run install:backends`) ou lockfiles por serviço.

**Como verificar:** Rodar localmente `cd services/backend/books-api && npm ci` — erro "package-lock.json missing".

---

# ALTO — impacto funcional significativo

---

## A-01 — Tabelas `achievements` e `user_achievements` inexistentes

**Onde:** `services/backend/library-service/src/index.ts` (~L747+); schema em `all_migrations_combined.sql`

**Problema (original):** Endpoints `/achievements`, `/me/achievements/:id/toggle`, `/admin/achievements` consultavam tabelas ausentes em DB fresh.

**Status (22/05/2026):** **Resolvido no SQL.** Tabelas incluídas no arquivo consolidado. Aplicar SQL no Supabase **`wnaymuusxwvawmbieukm`**.

**Como verificar:** Após aplicar SQL → `GET /achievements` → 200 (lista vazia ou com seed).

---

## A-02 — Coluna `new_books_notifications` ausente em `user_settings`

**Onde:** `library-service/src/index.ts` (~L512–533); incluída em `all_migrations_combined.sql`

**Problema (original):** Backend fazia upsert de `new_books_notifications`, mas a coluna não existia no schema migrado.

**Status (22/05/2026):** **Resolvido no SQL.** Coluna no arquivo consolidado.

**Como verificar:** Settings → toggle notificações de novos livros → sem erro 500 após aplicar SQL.

---

## A-03 — Aprovação de submissão não transacional

**Onde:** `services/backend/books-api/src/index.ts` (L459–484)

**Problema:** Submissão é marcada `approved` **antes** do insert em `books`. Se o insert falhar, fica aprovada sem livro no catálogo.

**Por que corrigir:** Estado inconsistente entre moderação e catálogo; re-aprovação bloqueada (`status !== "pending"`).

**Para que servirá:** Fluxo admin confiável; submissão só aprovada quando livro existir no catálogo (insert primeiro, ou transação/RPC).

**Como verificar:** Simular falha de insert (mock/regra DB) após update de status — submissão fica "approved" órfã.

---

## A-04 — Race de dupla aprovação (livros duplicados)

**Onde:** Mesmo trecho de aprovação; schema `books` sem `UNIQUE(submission_id)`

**Problema:** Dois cliques rápidos ou requisições concorrentes passam na checagem `pending` e inserem dois livros para uma submissão.

**Por que corrigir:** Catálogo com duplicatas; confusão para usuários e admins.

**Para que servirá:** Idempotência na aprovação; constraint `UNIQUE(submission_id)` + checagem de livro existente antes do insert.

---

## A-05 — Rejeição sem validar existência ou status pending

**Onde:** `services/backend/books-api/src/index.ts` (~L493–514)

**Problema:** `POST /admin/submissions/:id/reject` atualiza por ID sem verificar se existe ou está pending. Update em 0 linhas ainda retorna `{ ok: true }`.

**Por que corrigir:** API mente para o cliente; admins acreditam que rejeitaram algo inexistente ou já processado.

**Para que servirá:** Respostas HTTP corretas (`404`, `400`); UX admin previsível.

---

## A-06 — `LibraryContext` sem rollback em falha de API

**Onde:** `frontend/src/contexts/LibraryContext.tsx` (L86–156)

**Problema:** Métodos `addToFavorites`, `removeFromFavorites`, etc. atualizam estado React **antes** ou **independente** de sucesso da API, sem try/catch.

**Por que corrigir:** UI mostra livro na biblioteca enquanto servidor rejeitou (401, 500, limite).

**Para que servirá:** Estado local sincronizado com backend; usuário vê feedback correto em falhas de rede.

---

## A-07 — Conquistas não carregam após refresh

**Onde:** `frontend/src/pages/Profile.tsx` (~L98–118); backend sem `GET /me/achievements`

**Problema:** `userAchievementIds` inicia vazio; só atualiza no toggle manual. Após F5, contador mostra 0.

**Por que corrigir:** Feature de gamificação parece quebrada; usuário perde histórico visual.

**Para que servirá:** Endpoint `GET /me/achievements` + load no Profile; persistência percebida das conquistas.

---

## A-08 — Guest acessa Submit Book mas não pode enviar

**Onde:** `frontend/src/pages/SubmitBook.tsx` (L49); `ProtectedRoute.tsx` trata guest como logado

**Problema:** Rota `/submit-book` acessível em modo convidado, mas submit exige `userId && token` (ambos null).

**Por que corrigir:** UX frustrante: formulário preenchido → erro genérico "Preencha todos os campos".

**Para que servirá:** Redirect para login ou mensagem clara "Faça login para enviar"; menos abandono no fluxo.

---

## A-09 — Navegação EPUB pelo sumário incorreta

**Onde:** `frontend/src/pages/Read.tsx` (~L311–318)

**Problema:** Itens do TOC chamam `setCurrentPage(index + 1)`, mas paginação EPUB usa **locations** geradas, não índice do sumário.

**Por que corrigir:** Clicar capítulo abre seção errada ou nada — leitor EPUB essencialmente quebrado.

**Para que servirá:** Navegação por `href`/CFI do epub.js; leitura EPUB utilizável.

---

## A-10 — AuthContext salva perfil automaticamente após load

**Onde:** `frontend/src/contexts/AuthContext.tsx` (~L190–198)

**Problema:** Após `loadProfile`, efeito debounced dispara `PUT /me/profile` mesmo sem edição do usuário.

**Por que corrigir:** PUTs desnecessários; possível conflito com Settings; ruído em logs e debugging.

**Para que servirá:** Save apenas em edição explícita; menos carga no backend.

---

## A-11 — Dupla inicialização de auth (dois `loadProfile`)

**Onde:** `frontend/src/contexts/AuthContext.tsx` (~L99–155)

**Problema:** `onAuthStateChange` e `getSession()` ambos chamam `loadProfile` na inicialização.

**Por que corrigir:** Requisições duplicadas; flicker breve na UI; piora A-10.

**Para que servirá:** Uma única carga de perfil por sessão; startup mais rápido.

---

## A-12 — Deploy Vercel de `frontend/` ignora `/api/auth`

**Onde:** `.github/workflows/main.yml` (L168–170) vs root `vercel.json` + `api/auth.ts`

**Problema:** CI faz deploy com `working-directory: frontend`, usando `frontend/vercel.json` (SPA only). Root `api/auth.ts` e rewrites de auth **não sobem**.

**Por que corrigir:** Produção pode não ter `/api/auth/*` enquanto docs/clientes assumem que existe.

**Para que servirá:** Deploy alinhado à documentação; auth proxy serverless disponível se necessário.

---

## A-13 — Pasta `services/backend/envs/` inexistente

**Onde:** README, `docker-compose.yml`; `.gitignore` permite `*.env.example`

**Problema (original):** Clone fresh não tinha templates; dev precisava adivinhar variáveis.

**Status (22/05/2026):** **Resolvido (templates).** Existem `services/backend/envs/*.env.example`. Variáveis apontam para o **projeto Supabase novo** (`wnaymuusxwvawmbieukm`). Cópias locais `*.env` permanecem gitignored — cada dev/Vercel preenche os valores.

**Ainda necessário:** `frontend/.env` local (copiar de `frontend/.env.example`); variáveis `VITE_*` e `SUPABASE_*` na Vercel após redeploy.

---

## A-14 — Docker healthchecks com `curl` em Alpine

**Onde:** `services/backend/docker-compose.yml` (L11–41)

**Problema:** Imagens `node:20-alpine` não incluem `curl`; healthchecks falham continuamente.

**Por que corrigir:** `docker compose ps` mostra serviços unhealthy; orquestração/dependências quebram.

**Para que servirá:** Healthchecks com `wget -qO-` ou instalar curl nas imagens; monitoramento correto.

---

## A-15 — Playwright na porta errada

**Onde:** `playwright.config.ts` (baseURL `5173`); `frontend/vite.config.ts` (porta `8080`)

**Problema:** E2E smoke aponta para porta padrão do Vite antigo, não a do projeto.

**Por que corrigir:** Testes E2E falham silenciosamente ou testam servidor errado.

**Para que servirá:** E2E confiável quando `PLAYWRIGHT_RUN=1`; documentação alinhada.

---

## A-16 — Paths de storage não sanitizados

**Onde:** `books-api/src/index.ts` — proxy `/images/books/*` (~L755), download admin (~L551)

**Problema:** Path da URL passado direto ao storage; `../` pode permitir leitura cross-object.

**Por que corrigir:** Path traversal é classe clássica de vulnerabilidade em proxies de arquivo.

**Para que servirá:** Função `sanitizeStoragePath` rejeitando `..` e paths absolutos; leitura apenas de objetos válidos.

---

## A-17 — CORS aberto no auth-proxy

**Onde:** `services/backend/auth-proxy/src/index.ts` (L18): `app.use(cors())`

**Problema:** Qualquer origem pode chamar login/signup/validate do browser.

**Por que corrigir:** Facilita abuso cross-site, credential stuffing de sites maliciosos.

**Para que servirá:** Allowlist igual books-api/library-service; superfície de auth reduzida.

---

## A-18 — Duplicatas na biblioteca (sem UNIQUE)

**Onde:** Tabelas `favorites`, `reading`, `read`; `library-service` check-then-insert

**Problema:** Sem `UNIQUE(user_id, book_id)`, requisições concorrentes inserem duplicatas.

**Por que corrigir:** Listas com o mesmo livro repetido; contagem de limites errada.

**Para que servirá:** Índices únicos parciais + upsert ou tratamento de conflito 409.

---

# MÉDIO — UX, consistência, manutenção

---

## M-01 — Home/Search sem tratamento de erro de API

**Onde:** `frontend/src/pages/Home.tsx`, `Search.tsx`

**Problema:** `api.getBooks()` / `api.getQuoteOfDay()` sem try/catch; falha = promise rejection não tratada, UI vazia.

**Por que corrigir:** Usuário não sabe se não há livros ou se houve erro de rede.

**Para que servirá:** Toast ou mensagem "Erro ao carregar"; retry possível.

---

## M-02 — Settings auto-save no load inicial

**Onde:** `frontend/src/pages/Settings.tsx` (~L77–82)

**Problema:** Carregar settings dispara `setTheme` → effect chama `saveSettings()` imediatamente.

**Por que corrigir:** PUT desnecessário; possível loop ou sobrescrita em race com load.

**Para que servirá:** Save só após interação do usuário ou flag `hydrated`.

---

## M-03 — BookDetail navega sem await de toggle reading

**Onde:** `frontend/src/pages/BookDetail.tsx` (~L162–165)

**Problema:** `handleToggleReading()` async não awaited antes de `navigate('/read/...')`; Read também chama `addToReading` → duplicatas.

**Por que corrigir:** Chamadas API duplicadas; estado inconsistente.

**Para que servirá:** Um único add-to-reading por fluxo "Começar a ler".

---

## M-04 — Teclas do leitor invertidas / setas ausentes

**Onde:** `frontend/src/pages/Read.tsx` (~L144–151, L251–253)

**Problema:** UI promete setas; só Home/End implementados — e Home=anterior, End=próximo (semântica invertida).

**Por que corrigir:** Acessibilidade e UX enganosa.

**Para que servirá:** ArrowLeft/Right + Home/End com semântica padrão.

---

## M-05 — Library re-fetcha catálogo inteiro

**Onde:** `frontend/src/pages/Library.tsx` (~L22–35)

**Problema:** `LibraryContext` já traz livros via `/library?type=...`; página refaz `getBooks()` e filtra por ID.

**Por que corrigir:** Performance; livros removidos do catálogo somem da biblioteca do usuário na UI.

**Para que servirá:** Exibir dados já retornados pelo library-service; biblioteca fiel ao que o usuário salvou.

---

## M-06 — Checkbox de termos no signup não validado

**Onde:** `frontend/src/pages/Auth.tsx` (~L486–493)

**Problema:** Checkbox sem state; não checado em `handleEmailSignup`.

**Por que corrigir:** Requisito legal/UX ignorado; cadastro sem aceite de termos.

**Para que servirá:** Conformidade e consentimento explícito.

---

## M-07 — Botão "MAIS LIVROS RECENTES" sem ação

**Onde:** `frontend/src/pages/Search.tsx` (~L169–176)

**Problema:** Botão renderizado sem `onClick`.

**Por que corrigir:** UI morta; parece bug para o usuário.

**Para que servirá:** Paginação ou carregar mais resultados.

---

## M-08 — `JSON.parse` de guest library sem try/catch

**Onde:** `frontend/src/contexts/LibraryContext.tsx` (~L39–41)

**Problema:** `localStorage` corrompido lança exceção e derruba o Provider.

**Por que corrigir:** App inteiro quebra por dado local inválido.

**Para que servirá:** Fallback para arrays vazios; resiliência.

---

## M-09 — Admin stats stub em Profile

**Onde:** `frontend/src/pages/Profile.tsx` (~L76–85, L479–488)

**Problema:** `loadAdminStats` vazio; cards admin mostram zeros.

**Por que corrigir:** Seção admin enganosa; admins não veem métricas prometidas.

**Para que servirá:** Integração com APIs admin ou redirect para AdminPanel.

---

## M-10 — Dois sistemas de toast simultâneos

**Onde:** `frontend/src/App.tsx` (L38–39)

**Problema:** Radix `<Toaster />` e Sonner `<Sonner />` montados; páginas usam ambos.

**Por que corrigir:** Notificações inconsistentes (posição, duração, estilo).

**Para que servirá:** Um único sistema de feedback.

---

## M-11 — TypeScript `strict: false`

**Onde:** `frontend/tsconfig.app.json` (untracked no git)

**Problema:** `strictNullChecks`, `noImplicitAny` desligados; bugs de tipo passam despercebidos.

**Por que corrigir:** Muitos bugs da auditoria seriam pegos em compile time.

**Para que servirá:** Refatoração mais segura; menos null/token undefined em runtime.

---

## M-12 — Data hardcoded desatualizada em Plan

**Onde:** `frontend/src/pages/Plan.tsx` (~L70)

**Problema:** "Válido até novembro de 2025" — stale em maio/2026.

**Por que corrigir:** Conteúdo incorreto mina confiança.

**Para que servirá:** Data dinâmica ou copy genérico.

---

## M-13 — ReviewSection bypassa camada API

**Onde:** `frontend/src/components/ReviewSection.tsx` (~L27–31)

**Problema:** `fetch` direto sem `response.ok`; corpo não-JSON pode lançar exceção.

**Por que corrigir:** Falhas silenciosas; duplicação de lógica de `api.ts`.

**Para que servirá:** Tratamento uniforme de erros; manutenção centralizada.

---

## M-14 — Upload valida extensão, não conteúdo

**Onde:** `books-api/src/index.ts` (~L319–329)

**Problema:** Confia em extensão e `file.mimetype` do cliente.

**Por que corrigir:** Arquivo malicioso renomeado para `.pdf` passa.

**Para que servirá:** Magic bytes ou biblioteca de detecção MIME no servidor.

---

## M-15 — RLS com escape `user_id IS NULL`

**Onde:** Migration `20251031212951_...sql` (profiles, favorites, reading, etc.)

**Problema:** Policies `auth.uid() = user_id OR user_id IS NULL` permitem acesso a linhas órfãs via cliente Supabase direto.

**Por que corrigir:** Defense in depth fraca se alguém bypassar Express.

**Para que servirá:** Policies estritas; `user_id NOT NULL` onde aplicável.

---

## M-16 — Inconsistência catálogo list vs detail

**Onde:** `GET /books` filtra `file_path`; `GET /books/:id` não

**Problema:** Detalhe pode mostrar livro incompleto fora do catálogo público.

**Por que corrigir:** UX inconsistente; possível acesso a registros draft.

**Para que servirá:** Mesma regra de visibilidade em list e detail.

---

## M-17 — Admin auth inconsistente entre serviços

**Onde:** books-api (`has_role` RPC + alias `"adm"`) vs library-service (só `user_roles`)

**Problema:** Mesmo usuário admin em um serviço, não no outro.

**Por que corrigir:** Comportamento imprevisível para admins.

**Para que servirá:** Helper compartilhado ou RPC única em todos os serviços.

---

## M-18 — Edge functions Supabase desatualizadas

**Onde:** `services/main-service/supabase/functions/books/index.ts`

**Problema:** Contrato diferente do Express (sem filtro file_path, CORS `*`, env var diferente).

**Por que corrigir:** Se deployadas, clientes recebem API divergente e mais permissiva.

**Para que servirá:** Remover, atualizar ou documentar como deprecated.

---

## M-19 — Entrypoints Vercel órfãos

**Onde:** `api/books.ts`, `api/library.ts`

**Problema:** Existem mas não estão no roteamento do `vercel.json` efetivo.

**Por que corrigir:** Confusão operacional; falsa sensação de API serverless.

**Para que servirá:** Wire-up ou remoção; repo honesto sobre deploy.

---

## M-20 — Métodos mortos em `api.ts`

**Onde:** `frontend/src/lib/api.ts` — `createBook`, `updateBook`, `deleteBook`

**Problema:** Sem rotas autenticadas correspondentes; risco se wired acidentalmente.

**Por que corrigir:** Código morto aumenta superfície de erro.

**Para que servirá:** API client enxuta; ou métodos admin com token.

---

## M-21 — Env loading frágil (auth-proxy, library-service)

**Onde:** `path.join(process.cwd(), '../envs/...')` vs books-api com `__dirname`

**Problema:** Iniciar de diretório errado não carrega `.env`; exit silencioso ou misconfig.

**Por que corrigir:** Dev experience frágil; difícil debugar.

**Para que servirá:** Mesmo padrão `__dirname`-relativo em todos os serviços.

---

## M-22 — CI: ESLint ignorado, testes frontend no-op

**Onde:** `.github/workflows/main.yml` — `npm run lint || true`; step test sem script

**Problema:** Lint nunca falha CI; step "Run frontend tests" sempre no-op.

**Por que corrigir:** Regressões de qualidade passam undetected.

**Para que servirá:** CI que realmente protege o main branch.

---

## M-23 — Documentação desatualizada (services/README)

**Onde:** `services/README.md`

**Problema:** Limite 10MB vs 50MB no código; Node 18+ vs 20.x no package.json; `CORS_ORIGINS` documentado mas hardcoded.

**Por que corrigir:** Dev segue doc errada e perde tempo.

**Para que servirá:** README como fonte confiável de verdade.

---

## M-24 — Testes com nomes enganosos

**Onde:** `tests/upload/*`, `tests/cadastro/*`

**Problema:** Arquivos como `confirmacao-senha.test.ts` testam `POST /books`, não auth.

**Por que corrigir:** Manutenção confusa; falsa sensação de cobertura.

**Para que servirá:** Nomes alinhados ao comportamento; onboarding de testes claro.

---

## M-25 — OAuth test com porta stale

**Onde:** `tests/auth/oauth-google.contract.test.ts` (porta 5173)

**Problema:** Redirect example não bate com Vite 8080.

**Por que corrigir:** Teste de contrato documenta config errada.

**Para que servirá:** Exemplos corretos para configurar Supabase Auth redirects.

---

# BAIXO — polish e débito técnico

---

## B-01 — `/metrics` sem autenticação

**Onde:** `books-api/src/index.ts` (~L184)

**Problema:** Contador de requests público.

**Por que corrigir:** Information disclosure menor; scraping de métricas.

**Para que servirá:** Métricas internas ou protegidas; ou remover em produção.

---

## B-02 — Logs verbosos em produção

**Onde:** Todos os serviços backend (ex.: `[Vercel Proxy] Hit: ...` em cada request)

**Problema:** Ruído em logs; custo; possível leak de query strings futuras.

**Por que corrigir:** Observabilidade útil vs spam.

**Para que servirá:** Log level por `NODE_ENV`; structured logging.

---

## B-03 — Reviews expõem `user_id` bruto

**Onde:** `books-api` — `GET /books/:id/reviews`

**Problema:** UUID do autor visível publicamente.

**Por que corrigir:** Privacidade; pseudonimização desejável em reviews.

**Para que servirá:** Retornar `username` ou alias; ocultar UUID.

---

## B-04 — Profile aceita URLs arbitrárias para mídia

**Onde:** `library-service` — `PUT /me/profile`

**Problema:** `avatar_image`/`banner_image` aceitam qualquer string URL.

**Por que corrigir:** Tracking pixels, XSS se frontend renderizar HTML, hotlink abuse.

**Para que servirá:** Validar domínio Supabase storage ou upload-only.

---

## B-05 — Progresso sem validação de bounds

**Onde:** `library-service` — reading progress (~L684–696)

**Problema:** Aceita páginas negativas ou `progress_percentage > 100`.

**Por que corrigir:** Dados inválidos em estatísticas.

**Para que servirá:** Clamp 0–100; validar `current_page <= total_pages`.

---

## B-06 — Admin storage list só na raiz

**Onde:** `books-api` — `GET /admin/storage/books`

**Problema (original):** `list("", ...)` listava só a raiz do bucket; arquivos em subpastas não apareciam.

**Status (22/05/2026):** **Resolvido (por design).** Listagem passa a usar a pasta **`livros/`** (`BOOKS_FILES_DIR`). Admin importa PDF/EPUB/MOBI colocados manualmente em `Storage → books → livros/`. Submissões de usuários vão para `livros/{user_id}/...` e **não** aparecem na aba Importar (fluxo separado: Submissões).

**Regras de nome (Supabase Storage):** sem acentos (`José` → `Jose`); preferir hífen em vez de espaços. Upload manual no painel Supabase exige renomear; submissões via app sanitizam automaticamente (`sanitizeStorageFileName` no books-api).

---

## B-07 — Achievement toggle ignora erros de DB

**Onde:** `library-service` (~L776–781)

**Problema:** insert/delete sem checar `error`; sempre retorna `{ achieved: true/false }`.

**Por que corrigir:** Cliente acredita sucesso em falha 500.

**Para que servirá:** Propagar erro HTTP; UI pode mostrar toast.

---

## B-08 — Toast remove delay extremo

**Onde:** `frontend/src/hooks/use-toast.ts` (L6) — `TOAST_REMOVE_DELAY = 1000000`

**Problema:** Toasts ficam ~16 minutos na tela.

**Por que corrigir:** Provável typo do template shadcn.

**Para que servirá:** UX normal (~5s); Settings/Profile usáveis.

---

## B-09 — `console.log` de signup em produção

**Onde:** `frontend/src/pages/Auth.tsx` (~L246, L261)

**Problema:** Resposta Supabase logada no console.

**Por que corrigir:** Vazamento de info em devtools de usuário.

**Para que servirá:** Remover ou guard com `import.meta.env.DEV`.

---

## B-10 — Import `Navigate` não usado

**Onde:** `frontend/src/App.tsx` (L5)

**Problema:** Dead import; lint warning.

**Por que corrigir:** Código limpo.

**Para que servirá:** Bundle ligeiramente menor; lint verde.

---

## B-11 — MySubmissions loading infinito para guest

**Onde:** `frontend/src/pages/MySubmissions.tsx` (~L42–58)

**Problema:** Early return quando `!userId` mas `loading` permanece `true`.

**Por que corrigir:** Spinner eterno se guest acessar rota.

**Para que servirá:** Redirect ou `setLoading(false)` + mensagem.

---

## B-12 — Gaps de acessibilidade

**Onde:** `BookCard.tsx`, `ReviewSection.tsx`, `Header.tsx`, `ProtectedRoute.tsx`, `Profile.tsx`

**Problema:** Cards clicáveis sem teclado; estrelas sem `aria-label`; spinner sem `role="status"`.

**Por que corrigir:** WCAG; usuários de leitor de tela e teclado excluídos.

**Para que servirá:** App inclusivo; melhor SEO e conformidade.

---

## B-13 — `docker-compose` vs `docker compose` no package.json

**Onde:** Root `package.json` scripts

**Problema:** CLI legacy vs plugin v2.

**Por que corrigir:** Falha em ambientes só com Compose v2.

**Para que servirá:** Scripts portáveis.

---

## B-14 — Mensagens de erro genéricas mascaram 401

**Onde:** `books-api` — `POST /submissions` catch (~L358–361)

**Problema:** 401 retorna body genérico "Erro ao processar nova submissão."

**Por que corrigir:** Cliente não distingue auth vs validação.

**Para que servirá:** Mensagens específicas ou códigos de erro estruturados.

---

## B-15 — Coverage thresholds não enforced no CI

**Onde:** `vitest.config.ts` thresholds; CI não roda `test:coverage`

**Problema:** Limites de cobertura existem mas nunca falham pipeline.

**Por que corrigir:** Falsa sensação de qualidade.

**Para que servirá:** Cobertura mínima garantida em PRs.

---

# Pontos positivos (manter)

| Item | Onde |
|------|------|
| Submissões com auth e ownership | `POST/DELETE /submissions` |
| Rotas admin com `requireAdmin` | books-api |
| Limite Multer + middleware 413 | books-api, library-service |
| Security headers | books-api, library-service |
| Rollback storage em falha de insert | `POST /submissions` |
| Vitest setup coerente | `tests/`, mocks Supabase |
| Validação username alinhada | frontend + backend |
| Schema SQL consolidado | `migrations/all_migrations_combined.sql` |
| Pasta `livros/` para arquivos de livro | books-api + Storage |
| Sanitização de nomes de arquivo (ASCII) | `POST /submissions` |
| Verificação de arquivo no Storage antes do import admin | `POST /admin/books/import` |

---

# Plano de correção sugerido (ordem)

| Ordem | ID | Esforço | Impacto |
|:-----:|:--:|:-------:|:-------:|
| 1 | C-01, C-02, C-03, C-04 | Médio | Segurança |
| 2 | C-05 | Baixo | Integridade dados |
| 3 | A-01, A-02 | Baixo | Schema |
| 4 | A-03, A-04, A-05 | Médio | Fluxo admin |
| 5 | C-06, C-07, C-08, C-09 | Médio | DevOps |
| 6 | A-06 a A-11 | Médio | UX core |
| 7 | A-12 a A-18 | Médio | Infra |
| 8 | M-* | Variável | Polish |
| 9 | B-* | Baixo | Débito técnico |

---

# Checklist master de verificação manual

## Segurança
- [ ] C-01 POST /books sem token
- [ ] C-02 Download arquivo sem token
- [ ] C-04 localStorage após Lembrar-me
- [ ] C-03 Policies storage Supabase
- [ ] A-16 Path traversal em imagens
- [ ] A-17 CORS auth-proxy

## Dados e features
- [ ] C-05 Progresso leitura rede lenta
- [ ] A-03/A-04 Aprovação submissão
- [ ] A-02 Settings notificações
- [ ] A-07 Conquistas após F5
- [ ] A-08 Guest submit-book
- [ ] A-09 EPUB sumário

## Build e CI
- [ ] C-06 Dev sem .env
- [ ] C-07 Build sem VITE_*
- [x] C-08 Build logo *(resolvido — logo.png + og-image.png; logo.svg removido)*
- [ ] C-09 CI npm ci backend
- [ ] A-14 Docker healthchecks
- [ ] A-12 Vercel /api/auth
- [ ] INF-01 Schema aplicado no Supabase novo
- [ ] INF-02 URL Configuration Supabase (Site URL + Redirect URLs)
- [ ] INF-03 Google OAuth callback + provider
- [ ] INF-04 Upload livros em `books/livros/` (nomes ASCII)

---

# Complemento — Metodologia, cobertura do plano e status das verificações

*Adicionado como complemento ao relatório principal. Use esta seção para saber o que já foi analisado no código, o que ainda depende de teste manual seu e se algo já foi parcialmente alterado no repositório.*

---

## 1. Metodologia da auditoria

| Tipo | O que foi feito | O que **não** foi feito |
|------|-----------------|-------------------------|
| **Revisão estática** | Leitura de backend, frontend, migrations, testes, CI/CD, Docker, Vercel; grep e cruzamento docs ↔ código | — |
| **Teste manual (runtime)** | — | Subir servidores, curl ao localhost, login no browser, Docker, deploy Vercel, throttling de rede |
| **Correção de código** | — | Este documento é para **você** corrigir; ver §4 para alterações já presentes no repo |

**Conclusão:** Todos os achados do [plano de auditoria](c:\Users\USER\.cursor\plans\auditoria_eclipse_reads_ebe3a85a.plan.md) foram **identificados e documentados**. Os checklists abaixo marcam **confirmação no código** (análise estática) vs **pendente teste manual** (execução ao vivo).

---

## 2. Cobertura do plano original → este documento

| Plano (severidade) | Itens no plano | IDs neste doc | Entregue? |
|------------------|:--------------:|:-------------:|:---------:|
| Crítico | 9 (itens 1–9) | C-01 a C-09 | Sim |
| Alto | 18 (itens 10–27) | A-01 a A-18 | Sim |
| Médio | 22 | M-01 a M-25 | Sim |
| Baixo | 15 | B-01 a B-15 | Sim |
| Pontos positivos | 7 | § Pontos positivos | Sim |
| Prioridade correção | 10 passos | § Plano de correção | Sim |
| Checklist manual | 17 passos | § 3 + Checklist master | Sim (como roteiro) |

### To-dos do plano (5 grupos)

| To-do do plano | Achados relacionados | Confirmado no código? | Teste manual pendente? |
|----------------|---------------------|:---------------------:|:----------------------:|
| Segurança crítica | C-01, C-02, C-03, C-04 | Sim | Sim (curl, DevTools, painel Supabase) |
| Integridade de dados | C-05, A-03, A-04, A-18 | Sim | Sim (rede lenta, admin, concorrência) |
| Gaps de schema | A-01, A-02 | Sim | Sim (DB só com migrations) |
| Build / DevOps | C-06–C-09, A-12–A-14 | Sim | Sim (`npm run dev/build`, CI, Docker, Vercel) |
| UX frontend | A-06–A-11, A-08, A-09 | Sim | Sim (browser, guest, EPUB) |

---

## 3. Checklist detalhado — plano vs status

Legenda **Status código:**
- **Confirmado** — achado verificado lendo o código na data da auditoria
- **Parcial** — existe alteração incompleta no repo (ver §4)
- **Pendente runtime** — precisa executar o passo manual abaixo

Legenda **Teste manual:** marque `[x]` quando **você** executar e validar.

### Segurança

| ID | Checklist (plano) | Status código | Como testar manualmente | Teste manual |
|:--:|-------------------|:-------------:|-------------------------|:------------:|
| C-01 | POST /books sem token | Confirmado → **Parcial** (ver §4) | `curl -X POST http://localhost:4000/books -d '{"title":"T","author":"T"}'` → esperar 401/403 | [ ] |
| C-02 | Download só com UUID | Confirmado → **Parcial** (ver §4) | Abrir `/books/{id}/file` sem `?access=` → esperar 401 | [ ] |
| C-04 | localStorage após Lembrar-me | Confirmado | Login + checkbox → DevTools → Local Storage → sem chave de senha | [ ] |
| C-03 | Policies storage Supabase | Confirmado | Painel Supabase → Storage → Policies bucket `books` | [ ] |
| A-16 | Path traversal imagens | Confirmado → **Parcial** (ver §4) | Request `/images/books/../outro-path` | [ ] |
| A-17 | CORS auth-proxy | Confirmado | Request de origem não listada para `:4100/login` | [ ] |

### Funcionalidade core

| ID | Checklist (plano) | Status código | Como testar manualmente | Teste manual |
|:--:|-------------------|:-------------:|-------------------------|:------------:|
| C-05 | Progresso leitura rede lenta | Confirmado | DevTools Slow 3G → abrir livro com progresso salvo → conferir % no DB | [ ] |
| A-03/A-04 | Aprovação submissão / duplicata | Confirmado → **Parcial** (ver §4) | Admin aprovar; simular falha insert; duplo clique | [ ] |
| A-02 | Settings notificações | Confirmado → **Parcial** (ver §4) | Settings → toggle novos livros → sem erro 500 | [ ] |
| A-07 | Conquistas após F5 | Confirmado → **Parcial** (ver §4) | Profile → marcar conquista → F5 → contador mantido | [ ] |
| A-08 | Guest em submit / submissions | Confirmado | Modo convidado → `/submit-book`, `/my-submissions` | [ ] |
| A-09 | EPUB sumário | Confirmado | Livro EPUB → menu sumário → capítulo correto | [ ] |

### DevOps e build

| ID | Checklist (plano) | Status código | Como testar manualmente | Teste manual |
|:--:|-------------------|:-------------:|-------------------------|:------------:|
| C-06 | Dev sem `.env` | Confirmado | Clone/`frontend` sem `.env` → `npm run dev` → Network em `/api/books` | [ ] |
| C-07 | Build sem `VITE_*` | Confirmado | `cd frontend && npm run build` sem vars de API | [ ] |
| C-08 | Build `logo.png` | **Resolvido** | `npm run build` — sem erro de logo | [x] |
| C-09 | CI `npm ci` backend | Confirmado | `cd services/backend/books-api && npm ci` | [ ] |
| A-14 | Docker healthchecks | Confirmado | `docker compose up` → serviços unhealthy? | [ ] |
| A-12 | Vercel `/api/auth` | Confirmado | Produção: `GET /api/auth/health` ou login | [ ] |

### Build extra (plano)

| Item | Status código | Como testar | Teste manual |
|------|:-------------:|-------------|:------------:|
| Commitar `frontend/tsconfig.app.json` | Confirmado (untracked no git status inicial) | `git status frontend/tsconfig.app.json` | [ ] |

---

## 4. Alterações já presentes no repositório (pós-auditoria)

*Atualizado em 22/05/2026 após sessão de recuperação do Supabase, storage e DevOps.*

| ID | O que a auditoria apontou | Estado atual (22/05/2026) | Ainda falta? |
|:--:|---------------------------|---------------------------|--------------|
| **INF-01** | Projeto Supabase antigo (`vwipzzvyziqwtfwivhns`) deletado | Novo projeto **`wnaymuusxwvawmbieukm`**; `.env` local + `config.toml` atualizados | Aplicar `all_migrations_combined.sql` no SQL Editor; atualizar Vercel; recadastrar livros |
| **INF-02** | — | Migrações consolidadas em **`services/main-service/supabase/migrations/all_migrations_combined.sql`** (12 blocos); arquivos `.sql` separados removidos | Rodar SQL uma vez em projeto vazio; se DB já existia, rodar patches de MIME/policies |
| **INF-03** | — | Storage organizado: **`livros/`** (PDF/EPUB/MOBI), **`covers/`** (capas, auto no admin), bucket **`mensagem-diaria`** | Criar pasta `livros/` no painel; renomear arquivos sem acento |
| **INF-04** | — | MIME types ampliados no SQL (EPUB/MOBI/octet-stream); listagem admin tolera pasta ausente; erros Storage vs DB separados | `UPDATE storage.buckets` no Supabase se schema já aplicado antes da correção |
| C-01 | POST /books aberto | `POST /books` exige `requireAdmin` | Validar manualmente |
| C-02 | Download público | `GET /books/:id/file` exige `?access=` assinado; `/file-access` | Frontend deve usar `/file-access` |
| C-03 | Storage policy permissiva | SQL recria policy por pasta; paths **`livros/{user_id}/`** | Aplicar/atualizar policies no Supabase remoto |
| A-01 | Tabelas achievements | Incluído no SQL consolidado | Aplicar SQL; seed opcional |
| A-02 | Coluna `new_books_notifications` | Incluído no SQL consolidado | Aplicar SQL |
| A-04 / A-18 | Duplicatas | UNIQUE parcial no SQL consolidado | Aplicar SQL |
| A-03 / A-05 | Aprovação / rejeição | Insert livro antes de status; validação em reject | Testar fluxo admin |
| A-13 | Sem `.env.example` | **`*.env.example`** + **`frontend/.env.example`** | Copiar para `.env` local; Vercel |
| A-07 | Sem GET conquistas | `GET /me/achievements` em library-service | Profile carregar no frontend |
| **C-08** | logo ausente | **`frontend/src/assets/logo.png`** na UI; **`logo.svg` removido**; favicon → `og-image.png` | **Resolvido** |
| B-06 | Listagem storage raiz | Lista **`livros/`**; import valida arquivo no Storage | Upload manual com nomes ASCII |
| C-04 | Senha no localStorage | **Ainda presente** em `Auth.tsx` | Remover gravação de senha |
| C-05 | Race progresso leitura | **Ainda presente** em `Read.tsx` | Flag `progressLoaded` |
| C-06 | Sem proxy Vite | **Ainda ausente** em `vite.config.ts` | `.env` com URLs localhost ou proxy |
| A-06 | LibraryContext sem rollback | **Ainda presente** | try/catch + rollback |
| A-08–A-11, M-*, B-* | Vários UX/infra | Maioria **ainda pendente** | Seguir IDs neste documento |

> **Importante:** Projeto Supabase anterior foi **perdido** (DNS inexistente). Dados de livros/usuários antigos **não** voltam salvo backup do Supabase. Schema recria-se via SQL consolidado; conteúdo recadastra-se manualmente.

---

## 5. Mapa rápido — todos os itens numerados do plano

| # plano | ID doc | Confirmado código | Teste manual | Notas |
|:-------:|:------:|:-----------------:|:------------:|-------|
| 1 | C-01 | Parcial | [ ] | Admin required no backend |
| 2 | C-02 | Parcial | [ ] | Token assinado |
| 3 | C-03 | Confirmado | [ ] | Fix na migration nova |
| 4 | C-04 | Confirmado | [ ] | Senha ainda gravada |
| 5 | C-05 | Confirmado | [ ] | Race no Read.tsx |
| 6 | C-06 | Confirmado | [ ] | Sem proxy |
| 7 | C-07 | Confirmado | [ ] | throw no import |
| 8 | C-08 | **Resolvido** | [x] | logo.png + og-image; logo.svg removido |
| 9 | C-09 | Confirmado | [ ] | CI npm ci |
| 10 | A-01 | Parcial | [ ] | Migration criada |
| 11 | A-02 | Parcial | [ ] | Migration criada |
| 12 | A-03 | Parcial | [ ] | Ordem insert/status |
| 13 | A-04 | Parcial | [ ] | UNIQUE submission_id |
| 14 | A-05 | Parcial | [ ] | Validação reject |
| 15 | A-06 | Confirmado | [ ] | |
| 16 | A-07 | Parcial | [ ] | GET backend; Profile pendente |
| 17 | A-08 | Confirmado | [ ] | |
| 18 | A-09 | Confirmado | [ ] | |
| 19 | A-10 | Confirmado | [ ] | |
| 20 | A-11 | Confirmado | [ ] | |
| 21 | A-12 | Confirmado | [ ] | |
| 22 | A-13 | **Resolvido** | [ ] | .env.example + Supabase novo |
| 23 | A-14 | Confirmado | [ ] | |
| 24 | A-15 | Confirmado | [ ] | |
| 25 | A-16 | Parcial | [ ] | sanitizeStoragePath |
| 26 | A-17 | Confirmado | [ ] | |
| 27 | A-18 | Parcial | [ ] | UNIQUE library |
| 28–49 | M-01–M-25 | Confirmado | [ ] | Ver seções Médio |
| 50–64 | B-01–B-15 | Confirmado | [ ] | Ver seções Baixo |

---

## 6. Ordem sugerida para **sua** verificação manual

1. **Segurança (30 min):** C-01, C-02, C-04, C-03 — curl + DevTools + Supabase  
2. **Dados (45 min):** C-05, A-03, A-02, A-07 — browser + admin  
3. **Build/CI (30 min):** C-06, C-07, C-08, C-09 — terminal local  
4. **Infra (30 min):** A-14, A-12 — Docker + URL produção  
5. **UX (45 min):** A-08, A-09, A-06 — fluxos guest e leitor  

Registre resultados na coluna **Teste manual** da §3 ou no checklist master acima.

---

## 7. Registro de atualizações — sessão 22/05/2026

Correções e decisões aplicadas **após** a auditoria inicial. Use esta seção como changelog operacional.

### 7.1 Supabase e ambiente

| Item | Detalhe |
|------|---------|
| Projeto antigo | `vwipzzvyziqwtfwivhns` — deletado (DNS inexistente); dados perdidos |
| Projeto novo | `wnaymuusxwvawmbieukm` — URL `https://wnaymuusxwvawmbieukm.supabase.co` |
| Variáveis | `services/backend/envs/*.env`, `frontend/.env`, Vercel (`VITE_*`, `SUPABASE_*`) |
| Schema | Um arquivo: `migrations/all_migrations_combined.sql` — colar no SQL Editor **uma vez** |
| Google OAuth | Google Cloud: `…/auth/v1/callback`; Supabase Redirect URLs: `http://localhost:8080/**`, `https://eclipse-reads.vercel.app/**` |

### 7.2 Storage bucket `books`

```
books/
├── livros/              ← admin: upload manual (import no painel)
│   └── {user-id}/       ← submissões via app (automático)
├── covers/              ← capas (upload admin no painel → automático)
└── (raiz)               ← evitar arquivos soltos
```

| Regra | Detalhe |
|-------|---------|
| Nomes de arquivo | **Sem acentos** (`José` → `Jose`); sem espaços (usar hífen) |
| Erro típico | `File name is invalid` — renomear antes do upload no painel Supabase |
| MIME | PDF, EPUB, MOBI + `octet-stream` / `zip` para EPUB do painel |
| Tamanho máx. | 50 MB (bucket + Multer) |

### 7.3 Código alterado (books-api / admin)

| Alteração | Arquivo |
|-----------|---------|
| Constante `BOOKS_FILES_DIR = "livros"` | `books-api/src/index.ts` |
| `sanitizeStorageFileName` (ASCII) | submissões |
| Listagem admin em `livros/` | `GET /admin/storage/books` |
| Validação arquivo antes do import | `POST /admin/books/import` |
| Mensagens de erro Storage vs DB | vários endpoints |
| UI: dica de nomes ASCII | `AdminPanel.tsx` |
| Logo: removido `logo.svg` | favicon → `og-image.png` |

### 7.4 Novos IDs de infraestrutura (checklist)

| ID | Descrição | Teste manual |
|:--:|-----------|:------------:|
| INF-01 | Schema `all_migrations_combined.sql` aplicado no Supabase novo | [ ] |
| INF-02 | Site URL + Redirect URLs no Supabase Auth | [ ] |
| INF-03 | Google provider + callback no Google Cloud | [ ] |
| INF-04 | Livros em `books/livros/` com nomes ASCII | [ ] |
| INF-05 | Vercel: `VITE_*` + `SUPABASE_*` + redeploy | [ ] |
| INF-06 | Admin: `INSERT INTO user_roles … admin` após cadastro | [ ] |

### 7.5 SQL patch (projeto já criado antes das correções de MIME)

Se o bucket `books` já existia com MIME restrito, rodar no SQL Editor:

```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf', 'application/epub+zip', 'application/epub',
  'application/x-epub+zip', 'application/x-mobipocket-ebook',
  'application/x-mobi', 'application/vnd.amazon.ebook',
  'application/octet-stream', 'application/zip',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp'
]
WHERE id = 'books';
```

---

*Documento gerado para revisão manual. Não substitui pentest ou testes E2E automatizados.*
