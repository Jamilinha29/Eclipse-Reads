# Eclipse Reads

> Plataforma web para **descoberta, leitura e gestão de livros digitais** — frontend React, microserviços Node/Express e persistência no **Supabase**.

---

## Índice

1. [Sobre o projeto](#sobre-o-projeto)
2. [Funcionalidades](#funcionalidades)
3. [Tecnologias](#tecnologias)
4. [Arquitetura](#arquitetura)
5. [Estrutura do projeto](#estrutura-do-projeto)
6. [Pré-requisitos](#pré-requisitos)
7. [Instalação](#instalação)
8. [Configuração de ambiente](#configuração-de-ambiente)
9. [Execução](#execução)
10. [Testes](#testes)
11. [Deploy](#deploy)
12. [Solução de problemas](#solução-de-problemas)
13. [Contribuição](#contribuição)
14. [Autor](#autor)
15. [Links úteis](#links-úteis)

---

## Sobre o projeto

**Eclipse Reads** centraliza o acesso a livros digitais gratuitos e de domínio público em uma interface moderna e responsiva. O projeto resolve a dispersão de fontes na web — quando o leitor precisa consultar vários sites e formatos — reunindo catálogo, leitura online, biblioteca pessoal e moderação de conteúdo em um único ambiente acessível pelo navegador.

A solução integra autenticação (e-mail, Google OAuth e modo convidado), busca e leitura de obras (PDF/EPUB), listas e progresso sincronizados na nuvem, submissão de livros com validação e painel administrativo, apoiada por APIs especializadas e testes automatizados.

---

## Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Catálogo** | Busca por título, autor ou categoria; detalhes, resenhas e frase do dia |
| **Leitura online** | Visualizador PDF/EPUB com progresso salvo (`/read/:id`) |
| **Biblioteca pessoal** | Listas *lendo*, *lidos*, *quero ler*, favoritos e metas |
| **Autenticação** | E-mail/senha, Google (OAuth), recuperação de senha e modo convidado |
| **Submissão de obras** | Upload PDF/EPUB/MOBI com validação de magic bytes e moderação admin |
| **Perfil** | Avatar, tema, estatísticas e configurações |
| **Admin** | Aprovar/rejeitar submissões e gerenciar storage (`/admin`) |
| **CI / qualidade** | Vitest (API, auth, upload, perfil), K6, Playwright e Docker |

---

## Tecnologias

### Frontend

- React 18, TypeScript, Vite
- Tailwind CSS, shadcn-ui, Radix UI
- `@tanstack/react-query`, `react-router-dom`, `react-hook-form`, `zod`

### Backend

- Node.js 20, Express, TypeScript (`tsx`)
- Microserviços: `books-api`, `auth-proxy`, `library-service`
- Pacote compartilhado: `@eclipse-reads/shared`

### Dados e infraestrutura

- **Supabase** — Auth, PostgreSQL (PostgREST), Storage
- **Monorepo** — npm workspaces
- **Deploy** — Vercel (SPA + `api/auth.ts` serverless); backends em host dedicado (ex.: Render)

### Testes e DevOps

- Vitest, Supertest, Playwright (opt-in), K6 (carga)
- Docker Compose (backends e suíte de testes)
- GitHub Actions (`.github/workflows/main.yml`)

---

## Arquitetura

Monorepo com frontend React consumindo três microserviços Express; autenticação, banco e arquivos ficam no **Supabase**.

```
                    ┌─────────────────────────────────┐
                    │   Frontend (React + Vite :8080) │
                    └───────────────┬─────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   books-api (:4000)          auth-proxy (:4100)      library-service (:4200)
   catálogo · submissões     login · signup ·        biblioteca · perfil
   reviews · admin           validate · refresh      progresso · settings
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Supabase (Auth · DB · Storage) │
                    └─────────────────────────────────┘

@eclipse-reads/shared — validação de upload (PDF/EPUB/MOBI) e limites de tamanho
```

| Serviço | Pasta | Porta | Responsabilidade |
|---------|-------|------:|------------------|
| Frontend (Vite) | `frontend/` | 8080 | UI, rotas, cliente Supabase |
| books-api | `services/backend/books-api/` | 4000 | Catálogo, submissões, reviews, admin |
| auth-proxy | `services/backend/auth-proxy/` | 4100 | Login, cadastro, validação de token |
| library-service | `services/backend/library-service/` | 4200 | Biblioteca, perfil, tema, metas, progresso |

**Produção:** frontend na Vercel; `books-api` e `library-service` em host com HTTPS e CORS; auth via Supabase no browser e `/api/auth/*` serverless.

---

## Estrutura do projeto

```text
Eclipse-Reads/
├── api/                              # Entradas serverless Vercel
│   ├── auth.ts                       # Auth-proxy (/api/auth/*)
│   ├── books.ts                      # Entrada opcional books-api
│   └── library.ts                    # Entrada opcional library-service
├── frontend/
│   ├── src/
│   │   ├── pages/                    # Home, Library, Read, Admin, Auth, ...
│   │   ├── components/               # UI, BookViewer, rotas protegidas
│   │   ├── contexts/                 # Auth, Library, Notification
│   │   ├── lib/                      # api.ts, validação, políticas
│   │   └── hooks/
│   ├── .env.example
│   ├── vite.config.ts
│   └── package.json
├── services/
│   ├── backend/
│   │   ├── auth-proxy/               # Microserviço de autenticação
│   │   ├── books-api/                # Catálogo e submissões
│   │   ├── library-service/          # Biblioteca e perfil
│   │   ├── shared/                   # @eclipse-reads/shared
│   │   ├── envs/                     # *.env locais (gitignored)
│   │   └── docker-compose.yml
│   ├── main-service/
│   │   └── supabase/
│   │       ├── bootstrap/            # SQL completo (projeto novo)
│   │       ├── migrations/           # Incrementais (npm run db:push)
│   │       └── functions/
│   └── README.md                     # Manual dos backends
├── tests/
│   ├── api/                          # Contratos HTTP
│   ├── auth/                         # Login, validate, guest
│   ├── cadastro/                     # Regras de senha e cadastro
│   ├── upload/                       # Limites e formatos
│   ├── perfil/                       # Avatar e mídia
│   ├── users/                        # Validação de username
│   ├── load/                         # Scripts K6
│   └── README.md                     # Manual de testes
├── scripts/
│   ├── dev-all.mjs                   # Sobe todos os serviços em dev
│   └── run-tests-sequential.mjs
├── e2e/                              # Playwright (opt-in)
├── .github/workflows/main.yml        # CI
├── package.json                      # Workspaces + scripts raiz
├── vercel.json
├── vitest.config.ts
├── docker-compose.tests.yml
└── README.md
```

---

## Pré-requisitos

- **Node.js 20.x** (obrigatório — ver `engines` no `package.json`)
- **npm** (incluso no Node)
- Projeto **Supabase** (URL, chave anon e service role para backends)
- **(Opcional)** Docker Desktop — backends em container ou testes em container
- **(Opcional)** k6 e Playwright — carga e E2E

### Referência por terminal

Use **apenas** o bloco do terminal que você abriu. Comandos `npm` abaixo funcionam em CMD, PowerShell e bash.

| Ação | CMD | PowerShell | bash / Linux / macOS |
|------|-----|------------|----------------------|
| Entrar em pasta | `cd services\backend` | `Set-Location services\backend` | `cd services/backend` |
| Copiar arquivo | `copy origem destino` | `Copy-Item origem destino` | `cp origem destino` |
| npm | `npm install` | `npm install` (ou `npm.cmd` se bloqueado) | `npm install` |
| Health check | `curl http://localhost:4000/health` | `Invoke-RestMethod http://localhost:4000/health` | `curl http://localhost:4000/health` |

---

## Instalação

**CMD**

```cmd
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
cd Eclipse-Reads
npm install
npm run install:all
```

**PowerShell**

```powershell
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
Set-Location Eclipse-Reads
npm install
npm run install:all
```

**bash / Linux / macOS**

```bash
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
cd Eclipse-Reads
npm install
npm run install:all
```

---

## Configuração de ambiente

### Frontend — `frontend/.env`

| Terminal | Comando |
|----------|---------|
| CMD | `copy frontend\.env.example frontend\.env` |
| PowerShell | `Copy-Item frontend\.env.example frontend\.env` |
| bash | `cp frontend/.env.example frontend/.env` |

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_BOOKS_API_URL=http://localhost:4000
VITE_LIBRARY_API_URL=http://localhost:4200
```

Sem `VITE_SUPABASE_*`, o app não inicia o cliente Supabase. Em produção, as URLs dos backends devem apontar para hosts públicos com HTTPS.

### Backends — `services/backend/envs/*.env`

Entre em `services/backend/envs/` e copie os três templates (`auth-proxy`, `books-api`, `library-service`) para arquivos `.env` sem o sufixo `.example`.

Preencha URL e chaves Supabase em cada arquivo. Guia detalhado: [services/backend/envs/README.md](services/backend/envs/README.md).

**`books-api.env`** — inclua `FILE_ACCESS_SECRET` (obrigatório em produção):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> A **service role** fica somente nos backends. Nunca exponha no frontend nem em variáveis `VITE_*`.

### Banco de dados (Supabase)

| Cenário | Ação |
|---------|------|
| Projeto novo | SQL Editor → `services/main-service/supabase/bootstrap/all_migrations_combined.sql` |
| Migrations incrementais | `npm run db:push` na raiz |

---

## Execução

### Opção A — Tudo junto (recomendado)

Na raiz, com `.env` e `envs/` configurados:

```bash
npm run dev:all
```

Aguarde alguns segundos e abra **http://localhost:8080/**.

### Opção B — Terminais separados

Um terminal por serviço (ajuste `cd` conforme a tabela acima):

```bash
# Terminal 1 — books-api
cd services/backend/books-api && npm run dev

# Terminal 2 — library-service
cd services/backend/library-service && npm run dev

# Terminal 3 — auth-proxy (opcional em dev)
cd services/backend/auth-proxy && npm run dev

# Terminal 4 — frontend
cd frontend && npm run dev
```

### Opção C — Docker (só backends)

```bash
cd services/backend
docker compose up --build -d
docker compose ps
docker compose down
```

O frontend continua fora do Docker:

```bash
cd frontend && npm run dev
```

### URLs locais

| Recurso | URL |
|---------|-----|
| App | http://localhost:8080/ |
| books-api | http://localhost:4000/health |
| auth-proxy | http://localhost:4100/health |
| library-service | http://localhost:4200/health |

```bash
curl http://localhost:4000/health
```

Guia completo de backends e Docker: [services/README.md](services/README.md).

---

## Testes

Na raiz do repositório:

```bash
npm run install:backends
npm test
```

| Comando | Descrição |
|---------|-----------|
| `npm test` | Suíte Vitest completa |
| `npm run test:api` | Contratos HTTP |
| `npm run test:auth` | Auth-proxy e JWT |
| `npm run test:cadastro` | Regras de cadastro/senha |
| `npm run test:upload` | Uploads e limites multer |
| `npm run test:perfil` | Avatar e mídia de perfil |
| `npm run test:coverage` | Cobertura nos backends |
| `npm run test:docker` | Testes em container |
| `npm run test:e2e` | Playwright (opt-in) |

Manual detalhado: [tests/README.md](tests/README.md).

---

## Deploy

Deploy na **raiz do repositório** (não só `frontend/`), para incluir `api/auth.ts` + `vercel.json`.

| Campo | Valor |
|-------|--------|
| Root Directory | *(vazio)* |
| Build Command | `cd frontend && npm run build` |
| Output Directory | `frontend/dist` |
| Node.js | 20.x |

**Frontend (`VITE_*`):**

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_BOOKS_API_URL=https://url-publica-do-books-api
VITE_LIBRARY_API_URL=https://url-publica-do-library-service
```

**Auth serverless (`api/auth.ts`):**

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=MESMA_CHAVE_ANON_PUBLICA
```

`books-api` e `library-service` em produção ficam em host próprio com **HTTPS** e CORS liberando o domínio Vercel.

Validar após deploy:

```bash
curl https://seu-projeto.vercel.app/api/auth/health
```

---

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| Tela branca | `VITE_SUPABASE_*` ausentes | Preencha `frontend/.env` e reinicie o Vite |
| Livros/perfil não carregam | Backends parados ou URL errada | Suba books-api e library-service; confira `VITE_*_API_URL` |
| CORS bloqueado | Origem não listada | Use `http://localhost:8080` ou configure `ALLOWED_ORIGINS` |
| Backend encerra ao iniciar | Supabase mal configurado | Revise `services/backend/envs/*.env` |
| `npm` bloqueado no PowerShell | Política bloqueia `npm.ps1` | Use `npm.cmd` no lugar de `npm` |
| Variáveis Vercel sem efeito | `VITE_*` embutidas no build | Altere no painel e faça redeploy |
| Testes de API falham | Deps dos backends ausentes | `npm run install:backends` |

---

## Contribuição

Contribuições são bem-vindas. Para colaborar:

1. Faça **fork** do repositório e crie uma branch (`feature/nome` ou `fix/nome`).
2. Implemente a alteração com commits claros e objetivos.
3. Execute `npm test` (e suites específicas se alterou API, auth ou upload).
4. Abra um **Pull Request** descrevendo motivação, impacto e passos para validar.

**Boas práticas:**

- Não versionar `.env` nem `services/backend/envs/*.env`.
- Documentar novas variáveis em `*.env.example`.
- Manter compatibilidade com npm workspaces e o pipeline em `.github/workflows/main.yml`.

---

## Autor

Desenvolvido por **[Jamilinha29](https://github.com/Jamilinha29)**.

- **Repositório:** [Jamilinha29/Eclipse-Reads](https://github.com/Jamilinha29/Eclipse-Reads)
- **Issues:** bugs, dúvidas de setup e melhorias

Ao pedir ajuda, inclua SO, comando executado e saída completa do terminal.

---

## Links úteis

| Documento | Conteúdo |
|-----------|----------|
| [services/README.md](services/README.md) | Microserviços, Docker, healthchecks |
| [tests/README.md](tests/README.md) | Suítes Vitest, K6, Playwright |
| [services/backend/envs/README.md](services/backend/envs/README.md) | Variáveis locais dos backends |
