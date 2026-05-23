# Eclipse Reads

![CI status](https://github.com/Jamilinha29/Eclipse-Reads/actions/workflows/main.yml/badge.svg)

Plataforma web para **descoberta, leitura e gestão de livros digitais**, com frontend React, microserviços Node/Express e persistência no **Supabase** (auth, banco e storage).

## Apresentação e Contexto

Com o crescimento de bibliotecas digitais e submissões de obras por leitores, falta uma experiência unificada para explorar catálogo, ler online, organizar a biblioteca pessoal e moderar conteúdo. O Eclipse Reads centraliza autenticação, catálogo, progresso de leitura e perfil do usuário em uma interface responsiva, apoiada por APIs especializadas e testes automatizados.

### O que o projeto entrega

- Autenticação por e-mail/senha e fluxos Supabase (recuperação de senha, callback OAuth).
- Catálogo com busca, detalhes, resenhas e frase do dia.
- Submissão de livros (PDF/EPUB/MOBI) com validação e moderação administrativa.
- Leitor integrado com progresso de leitura e ajustes de leitura.
- Biblioteca pessoal (lendo, lidos, quero ler) e metas/estatísticas.
- Perfil, tema, mídia de avatar e configurações via **library-service**.
- Painel admin para aprovar/rejeitar submissões e gerenciar storage.
- CI com Vitest (contratos de API, auth, upload, perfil) e suporte a K6/Playwright/Docker.
- Deploy na Vercel: SPA + função serverless do **auth-proxy** (`/api/auth/*`).

## Arquitetura e Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn-ui, Radix UI |
| Estado / dados | `@tanstack/react-query`, `react-router-dom`, `react-hook-form`, `zod` |
| Backends | Node.js 20, Express, TypeScript (`tsx`), multer, CORS |
| Auth / dados | Supabase (`@supabase/supabase-js`) — Auth, PostgREST, Storage |
| Testes | Vitest, Supertest, Playwright (opt-in), K6 (carga) |
| Monorepo | npm workspaces (`frontend`, `auth-proxy`, `books-api`, `library-service`) |
| Deploy | Vercel (`vercel.json` na raiz), `api/auth.ts` serverless |

### Serviços e portas (desenvolvimento local)

| Serviço | Pasta | Porta padrão | Responsabilidade |
|---|---|---:|---|
| Frontend (Vite) | `frontend/` | 8080 | UI, rotas, cliente Supabase |
| books-api | `services/backend/books-api/` | 4000 | Catálogo, submissões, reviews, admin de livros |
| auth-proxy | `services/backend/auth-proxy/` | 4100 | Login, cadastro, validação de token |
| library-service | `services/backend/library-service/` | 4200 | Biblioteca, perfil, tema, metas, progresso |

## Estrutura do Projeto

```text
Eclipse-Reads/
├── api/
│   ├── auth.ts                 # Entrada serverless Vercel (auth-proxy)
│   └── books.ts                # Entrada opcional books-api na Vercel
├── frontend/
│   ├── src/
│   │   ├── pages/              # Home, Library, Read, Admin, Auth, ...
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/                # api.ts, apiBases.ts, políticas de senha
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── services/
│   ├── backend/
│   │   ├── auth-proxy/
│   │   ├── books-api/
│   │   ├── library-service/
│   │   ├── docker-compose.yml
│   │   └── envs/               # *.env locais (gitignored)
│   └── main-service/
│       └── supabase/
│           ├── bootstrap/all_migrations_combined.sql   # projeto NOVO (manual)
│           └── migrations/                           # incrementais (npm run db:push)
│           └── functions/
├── tests/
│   ├── api/
│   ├── auth/
│   ├── cadastro/
│   ├── upload/
│   ├── perfil/
│   ├── users/
│   ├── load/                   # Scripts K6
│   └── README.md
├── scripts/
│   ├── dev-all.mjs
│   └── run-tests-sequential.mjs
├── .github/workflows/main.yml
├── package.json                # Workspaces + scripts de teste
├── vercel.json
├── vitest.config.ts
├── VERCEL_DEPLOY.md
└── README.md
```

## Guia de Início Rápido

### Referência rápida — CMD vs PowerShell

| Ação | CMD | PowerShell |
|------|-----|------------|
| Entrar em pasta | `cd /d C:\pasta` | `Set-Location C:\pasta` |
| Instalar deps (raiz) | `npm install` | `npm.cmd install` |
| Instalar deps (frontend) | `cd frontend` + `npm install` | `Set-Location frontend` + `npm.cmd install` |
| Copiar arquivo | `copy origem destino` | `Copy-Item origem destino` |
| Continuar linha | `^` no fim da linha | `` ` `` no fim da linha |

### 1) Pré-requisitos

- **Node.js 20.x** (obrigatório — ver `engines` no `package.json`)
- **npm** (vem com o Node)
- Projeto **Supabase** (URL, chave anon e service role para backends)
- (Opcional) **Docker** para testes em container ou backends via Compose
- (Opcional) **k6** e **Playwright** para carga e E2E

### 2) Instalação

> Use **apenas** o bloco do terminal que você abriu. Não misture sintaxe de CMD com PowerShell.

**CMD (Prompt de Comando)**

```cmd
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
cd Eclipse-Reads
npm install
cd frontend
npm install
cd ..
```

**PowerShell**

```powershell
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
Set-Location Eclipse-Reads
npm.cmd install
Set-Location frontend
npm.cmd install
Set-Location ..
```

**Linux/macOS**

```bash
git clone https://github.com/Jamilinha29/Eclipse-Reads.git
cd Eclipse-Reads
npm install
cd frontend && npm install && cd ..
```

Instalação alternativa (todos os workspaces da raiz):

```bash
npm install
npm run install:all
```

### 3) Configuração

#### Frontend — `frontend/.env`

Se você **já tem** `frontend/.env`, mantenha o arquivo atual.

Se **não tem**, copie o template:

**CMD (na raiz do projeto):**

```cmd
copy frontend\.env.example frontend\.env
```

**PowerShell:**

```powershell
Copy-Item frontend\.env.example frontend\.env
```

Edite `frontend/.env` (valores mínimos para desenvolvimento local):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA

# URLs diretas dos microserviços (recomendado em dev — o Vite não faz proxy de /api/*)
VITE_BOOKS_API_URL=http://localhost:4000
VITE_LIBRARY_API_URL=http://localhost:4200

# Opcional: mesma origem para os dois backends
# VITE_API_URL=http://localhost:4000
```

Sem `VITE_SUPABASE_*`, o app falha ao iniciar o cliente Supabase. Sem URLs dos backends em produção, o bundle abre mas as chamadas HTTP não encontram os serviços.

#### Backends — `services/backend/envs/*.env`

Crie arquivos locais (não versionados) em `services/backend/envs/`:

**`books-api.env` e `library-service.env`** (mesmas chaves Supabase):

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
SUPABASE_SERVICE_KEY=SUA_SERVICE_ROLE_KEY
PORT=4000
```

Para `library-service.env`, use `PORT=4200`.

**`auth-proxy.env`:**

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
PORT=4100
```

> A **service role** fica somente nos backends. Nunca exponha no frontend.

Schema do banco:
- **Projeto novo (vazio):** `services/main-service/supabase/bootstrap/all_migrations_combined.sql` (SQL Editor, uma vez).
- **Alterações incrementais:** `services/main-service/supabase/migrations/` → `npm run db:push` (ver `services/main-service/supabase/README.md`).

### 4) Executar

> **CMD:** barras `\`, `npm`, `cd /d`.  
> **PowerShell:** `npm.cmd`, `Set-Location`.

#### Opção A — Um comando (vários serviços)

Na raiz, com variáveis e `envs/` configurados:

**CMD / PowerShell / bash:**

```bash
npm run dev:all
```

Isso sobe (se ainda não estiverem no ar) frontend (8080), books-api (4000), auth-proxy (4100) e library-service (4200). Aguarde alguns segundos e acesse `http://localhost:8080/`.

#### Opção B — Terminais separados (desenvolvimento)

**Terminal 1 — books-api**

```powershell
Set-Location services\backend\books-api
npm.cmd run dev
```

**Terminal 2 — library-service**

```powershell
Set-Location services\backend\library-service
npm.cmd run dev
```

**Terminal 3 — auth-proxy (opcional em dev; login também via Supabase no browser)**

```powershell
Set-Location services\backend\auth-proxy
npm.cmd run dev
```

**Terminal 4 — frontend**

```powershell
Set-Location frontend
npm.cmd run dev
```

#### Opção C — Docker (só backends)

```bash
cd services/backend
docker compose up --build
```

Requer arquivos em `services/backend/envs/` conforme o `docker-compose.yml`.

#### URLs locais

| Recurso | URL |
|---|---|
| App (Vite) | `http://localhost:8080/` |
| books-api health | `http://localhost:4000/health` |
| auth-proxy health | `http://localhost:4100/health` |
| library-service health | `http://localhost:4200/health` |

### Solução de problemas

| Sintoma | Causa provável | O que fazer |
|--------|----------------|-------------|
| Tela branca ao abrir o app | `VITE_SUPABASE_*` ausentes | Preencha `frontend/.env` e reinicie o Vite |
| Livros/perfil não carregam | Backends parados ou URL errada | Suba books-api e library-service; use `VITE_BOOKS_API_URL` / `VITE_LIBRARY_API_URL` com `http://localhost:...` |
| CORS bloqueado | Origem não listada no backend | Inclua sua URL em `allowedOrigins` nos serviços ou use `http://localhost:8080` |
| Backend encerra ao iniciar | Supabase sem service role / anon | Confira `services/backend/envs/*.env` |
| `npm` falha no PowerShell | Política bloqueia `npm.ps1` | Use `npm.cmd` |
| Variáveis Vercel sem efeito | `VITE_*` embutidas no build | Altere no painel e faça **Redeploy** |
| Testes de API falham | Deps dos backends não instaladas | `npm run install:backends` na raiz |

## Documentação de Uso

### Fluxos principais

- **Descoberta:** home com destaques, busca por título/autor/gênero, detalhe do livro e resenhas.
- **Leitura:** rota `/read/:id` com visualizador e sincronização de progresso (`library-service`).
- **Biblioteca:** listas pessoais e metas de leitura.
- **Contribuição:** envio de obra em `/submit-book` e acompanhamento em `/my-submissions`.
- **Admin:** moderação de submissões e ferramentas de storage (rota protegida `/admin`).

### Exemplo — health do books-api

**CMD:**

```cmd
curl http://localhost:4000/health
```

**PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/health"
```

### Exemplo — auth-proxy (local)

```powershell
Invoke-RestMethod -Uri "http://localhost:4100/health"
```

Na Vercel (mesmo domínio do site): `GET /api/auth/health`, `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/validate` (header `Authorization: Bearer …`).

### Regras de negócio (resumo)

- Formatos de submissão validados no upload (PDF/EPUB/MOBI).
- Limites de tamanho configuráveis: `BOOKS_SUBMISSION_MAX_BYTES` (padrão 50MB), `PROFILE_MEDIA_MAX_BYTES` (padrão 25MB).
- Rotas `/me/*` e biblioteca exigem token Supabase válido.
- Painel admin restrito a perfis autorizados no backend.

### Segurança implementada

- Chaves Supabase sensíveis apenas nos microserviços.
- CORS restrito a origens conhecidas (localhost + domínio Vercel).
- Cabeçalhos HTTP de endurecimento (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- Validação de senha e regras de cadastro espelhadas em testes (`tests/cadastro/`).
- `.env` e `services/backend/envs/*.env` no `.gitignore`.

## Testes

Na **raiz** do repositório:

**CMD:**

```cmd
cd /d C:\caminho\para\Eclipse-Reads
npm install
npm run install:backends
npm test
```

**PowerShell:**

```powershell
Set-Location C:\caminho\para\Eclipse-Reads
npm.cmd install
npm.cmd run install:backends
npm.cmd test
```

| Comando | Descrição |
|--------|-----------|
| `npm test` | Suíte Vitest completa |
| `npm run test:api` | Contratos HTTP (`tests/api/`) |
| `npm run test:auth` | Auth-proxy e contratos Supabase |
| `npm run test:cadastro` | Regras de cadastro/senha |
| `npm run test:upload` | Uploads e limites multer |
| `npm run test:perfil` | Avatar e mídia de perfil |
| `npm run test:coverage` | Cobertura v8 nos backends |
| `npm run test:one-by-one` | Um arquivo `.test.ts` por vez |
| `npm run test:docker` | Testes em container |
| `npm run test:load:books-api` | K6 (requer `k6` instalado) |
| `npm run test:e2e` | Playwright (`PLAYWRIGHT_RUN=1` + frontend rodando) |

Detalhes: [`tests/README.md`](tests/README.md).

## Deploy (Vercel)

Deploy recomendado na **raiz do repositório** (não só `frontend/`), para incluir a pasta **`api/`** na raiz (`api/auth.ts` + `vercel.json`). Não há `frontend/api/` — ver [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md).

| Campo no painel | Valor |
|----------------|--------|
| **Root Directory** | *(vazio — raiz)* |
| **Install Command** | `npm install` |
| **Build Command** | `cd frontend && npm run build` |
| **Output Directory** | `frontend/dist` |
| **Node.js** | 20.x |

### Variáveis obrigatórias

**Frontend (build — prefixo `VITE_`):**

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_BOOKS_API_URL=https://url-publica-do-books-api
VITE_LIBRARY_API_URL=https://url-publica-do-library-service
```

**Auth serverless (sem prefixo `VITE_`):**

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=MESMA_CHAVE_ANON_PUBLICA
```

`books-api` e `library-service` em produção precisam de host próprio (ou gateway) com **HTTPS** e CORS liberando o domínio Vercel.

Guia detalhado: [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md).

## Guia de Contribuição

1. Faça um fork do projeto.
2. Crie uma branch de feature ou correção.
3. Implemente com commits pequenos e objetivos.
4. Rode `npm test` (e suites específicas, se alterou auth/upload/API).
5. No PR, descreva motivação, impacto e passos para validar.

### Boas práticas

- Não versionar segredos (`.env`, `services/backend/envs/*.env`).
- Documentar novas variáveis em `frontend/.env.example` e neste README.
- Manter compatibilidade com workspaces npm e pipeline em `.github/workflows/main.yml`.

## Informações de Contato

### Repositório

- **GitHub:** [Jamilinha29/Eclipse-Reads](https://github.com/Jamilinha29/Eclipse-Reads)
- **Issues:** bugs, dúvidas de setup e melhorias via GitHub Issues.

Ao pedir ajuda com execução local, inclua sistema operacional, comando executado e saída completa do terminal.
