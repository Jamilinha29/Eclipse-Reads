# Auditoria — Eclipse Reads

**Projeto:** Eclipse Reads  
**Última atualização:** 23 de maio de 2026  
**Escopo:** Backend (Express ×3), Frontend (React/Vite), Supabase, Testes, CI/CD, Docker, Vercel  
**Verificação:** revisão estática + `npm test` + `npm run build` + `npm run audit:supabase`

---

## Documentos relacionados

| Documento | Uso |
|-----------|-----|
| [CORRECOES_CRITICAS_20260523.md](./CORRECOES_CRITICAS_20260523.md) | **Como** cada item foi corrigido (antes/depois, arquivos, linhas) |
| [CI_SECRETS.md](./CI_SECRETS.md) | Secrets GitHub Actions e variáveis de ambiente |
| [README - correção bug,erros,falhas encontrados.md](./README%20-%20corre%C3%A7%C3%A3o%20bug,erros,falhas%20encontrados.md) | Índice legado → aponta para estes docs |

---

## Resumo executivo

| Status | Quantidade | Descrição |
|--------|:----------:|-----------|
| **Corrigido** | ~58 | Código + migrations `20260525230000` e `20260525240000` |
| **Manual** | 0 | INF-01…INF-04 concluídos no painel Supabase/Vercel |
| **Aberto** | 2 | D-01 (design aceito), D-12 (WCAG — revisão contínua) |

### Arquitetura

```
Frontend (Vite :8080)
  ├── books-api (:4000)
  ├── library-service (:4200)
  └── auth-proxy (:4100)
Supabase: wnaymuusxwvawmbieukm
Migrations: services/main-service/supabase/migrations/
```

---

## Legenda de status

| Status | Significado |
|--------|-------------|
| **Corrigido** | Implementado no código; validado por testes ou auditoria remota |
| **Manual** | Ação no painel Supabase/Vercel, fora do Git |
| **Aberto** | Pendente ou aceito como limitação conhecida |
| **Design** | Decisão arquitetural documentada; mitigação parcial |

---

# Itens corrigidos (consolidado)

## Crítico

| ID | Título | Onde |
|:--:|--------|------|
| C-01 | RLS `user_id IS NULL` removido | migration `20260525230000` |
| C-02 | `file_path` oculto em SELECT direto | GRANT colunar `books` |
| C-03 | Storage: só `covers/` via cliente | policy storage |
| C-04 | Download livros exige token + auth | `books-api` `/file`, `/file-access` |
| C-05 | Edge function `books` com JWT, sem service role público | `functions/books`, `config.toml` |
| C-06 | Dockerfiles restaurados (CI Linux) | `services/backend/*/Dockerfile` |

## Alto (seleção)

| ID | Título |
|:--:|--------|
| A-01 | `FILE_ACCESS_SECRET` obrigatório em produção |
| A-03 | `GET /library` sem `file_path` |
| A-04 | Sanitização proxy avatars |
| A-06 | Conquistas não auto-concedidas |
| A-07 | Rate limiting auth-proxy login/signup |
| A-08 | Auth-proxy: `/refresh`, `/logout`, security headers |
| A-09 | `POST /books` valida Storage |
| A-10 | Erros DB genéricos em produção (`safeDbError`) |
| A-14 | Aprovação valida arquivo no Storage |
| A-16 | Guest não consome slot antes do login |
| A-17 | AdminPanel sem loading infinito |
| A-19 | Profile metas com try/catch |

## Médio / Baixo / CI (seleção)

| ID | Título |
|:--:|--------|
| M-01 | Notificações falsas no 1º login |
| M-02 | Settings sem auto-save no mount |
| M-03 | Reviews atualizam `books.rating` |
| M-04 | Review exige livro existente |
| M-05 | `age_rating` validado no admin PUT |
| M-06 | Rejeição submissão remove arquivo Storage |
| M-07 | Library `?type=` inválido → 400 |
| M-08 | Profile bloqueia URLs `data:` |
| M-FE-06 | EPUB: locations geradas uma vez |
| M-FE-07 | PDF.js worker local (sem CDN) |
| M-FE-10 | EPUB respeita tema escuro |
| M-FE-20 | Save progresso com toast de erro |
| B-01 | `/metrics` exige admin sempre |
| B-02 | `morgan` só fora de produção |
| B-03 | SIGTERM com `server.close()` (books-api) |
| CI-01 | Dockerfiles CI |
| CI-02 | `docs/CI_SECRETS.md` |
| CI-03 | Supabase CLI pinado `2.101.0` |
| CI-04 | `tsc --noEmit` no CI frontend |
| CI-05 | OAuth test porta 8080 |

Detalhes antes/depois: **[CORRECOES_CRITICAS_20260523.md](./CORRECOES_CRITICAS_20260523.md)**

---

# Backlog código/design (D-01…D-12)

| ID | Status | Título | Onde |
|:--:|:------:|--------|------|
| **D-01** | Design | Service role em todos os backends | Documentado em `services/backend/envs/README.md` |
| **D-02** | Corrigido | Token de arquivo em query string | Header `X-File-Access` + blob URL em `Read.tsx` |
| **D-03** | Corrigido | Guest mode spoofável | `sessionStorage` + `AuthenticatedRoute` + clamp 7 livros |
| **D-04** | Corrigido | Aprovação não transacional | RPC `approve_book_submission` |
| **D-05** | Corrigido | `book_id TEXT` sem FK | Migration `20260525240000` + validação POST `/library` |
| **D-06** | Parcial | TypeScript `strict: false` | `strictNullChecks: true` habilitado |
| **D-07** | Corrigido | E2E Playwright opt-in | Job `e2e-playwright` com `vars.PLAYWRIGHT_RUN=1` |
| **D-08** | Corrigido | Deploy Vercel sem `--prebuilt` | `vercel build` + `vercel deploy --prebuilt` |
| **D-09** | Corrigido | MOBI upload vs leitor | Mensagem + link de download em `BookViewer` |
| **D-10** | Corrigido | Coverage no CI | `npm run test:coverage` em `root-tests` |
| **D-11** | Corrigido | Links termos/privacidade | `/termos`, `/privacidade` + links em `Auth.tsx` |
| **D-12** | Aberto | WCAG / acessibilidade | `aria-label`/`aria-current` no Header; revisão UX pendente |

---

## Manual (operacional) — concluído

| ID | Ação | Status |
|:--:|------|:------:|
| **INF-01** | Importar PDFs → tabela `books` | Feito |
| **INF-02** | Site URL + Redirect URLs (Auth) | Feito |
| **INF-03** | Google OAuth callback | Feito |
| **INF-04** | `FILE_ACCESS_SECRET` + env Vercel produção | Feito |

---

## Verificação automatizada (23/05/2026)

```powershell
npm test                    # suite completa
npm run test:coverage       # backends Express
cd frontend; npm run build  # OK
npm run db:push             # migration 20260525240000
npm run audit:supabase
```

---

## Metodologia

1. Revisão estática backend, frontend, SQL, workflows  
2. Execução Vitest + build frontend  
3. `db:push` migrations no remoto  
4. `audit:supabase` schema remoto  

Não inclui pentest, E2E browser contínuo ou teste de carga em produção.

---

## Changelog do documento

| Data | Alteração |
|------|-----------|
| 22/05/2026 | Auditoria inicial |
| 23/05/2026 | Reescrita: status atual, links para CORRECOES, backlog reduzido |
| 23/05/2026 | Backlog D-01…D-12 implementado; INF manual marcado concluído |
