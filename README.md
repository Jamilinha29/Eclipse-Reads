# Bem-vindo ao projeto Eclipse Reads

![CI status](https://github.com/Jamilinha29/Eclipse-Reads/actions/workflows/ci.yml/badge.svg)

## Informações do Projeto

Repositório do frontend do Eclipse Reads.
 
### Objetivo do projeto

O objetivo deste projeto é fornecer uma aplicação web para descoberta, leitura e gerenciamento de livros digitais. A aplicação deve oferecer uma experiência simples e acessível para leitores e contribuidores, permitindo o envio de obras, leitura online e organização de uma biblioteca pessoal.

### O que o projeto deve alcançar

- Autenticação de usuários e gestão de perfis.
- Upload e submissão de livros (PDF/EPUB/MOBI) com validação de formatos.
- Leitor integrado para leitura online (suporte a navegação por capítulos, progresso de leitura e esconder/mostrar UI quando necessário).
- Biblioteca pessoal para salvar livros, marcar como lidos e gerenciar favoritos.
- Busca eficiente por título, autor e tags, com paginação.
- Painel administrativo para moderar submissões e gerenciar conteúdo.
- Integração com Supabase (auth, storage e banco de dados) para persistência e autenticação.
- Interface responsiva, acessível e otimizada para performance.
- Testes básicos e scripts de build/CI para garantir qualidade.


**Como fazer o clone git**

Siga estes passos:

```powershell
# Passo 1: Clone o repositório usando a URL Git do projeto.
git clone <SUA_URL_GIT>

# Passo 2: Navegue até o diretório do projeto.
cd <NOME_DO_SEU_PROJETO>

# Passo 3: Instale dependências do root (API, testes).
npm install

# Passo 4: Instale dependências do frontend (Vite/React).
cd frontend && npm install
```

### Rodando o projeto

- Rodar frontend em desenvolvimento:

```powershell
cd frontend
npm run dev
```

- Rodar testes do root (Vitest):

```powershell
npm test
```

- Alternativa (script já configurado no root):

```powershell
npm run dev      # redireciona para frontend.dev
git scripts do frontend
```

> Observação: o projeto tem duas árvores de dependências (`node_modules` em `./` e em `./frontend`). Essa divisão é intencional para separar backend/testes e frontend.

### Deploy na Vercel (variáveis de ambiente)

A config da Vercel fica em `frontend/vercel.json`; no painel, defina **Root Directory** como `frontend`. Configure **Environment Variables** (Production e, se quiser, Preview):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto no Supabase (Settings → API). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave anônima pública do Supabase (mesma tela). |
| `VITE_BOOKS_API_URL` | Sim em produção | URL pública do **books-api** (livros, frase do dia, reviews). |
| `VITE_LIBRARY_API_URL` | Sim em produção | URL pública do **library-service** (perfil, tema, listas da biblioteca, `/me/*`). |
| `VITE_API_URL` | Não | Se books e library forem servidos na **mesma origem**, pode usar só esta como fallback para os dois. |

Sem as `VITE_SUPABASE_*`, o bundle falha ao iniciar (tela vazia). Sem as URLs dos backends, o app abre mas chamadas caem em `localhost` no navegador e dados não carregam. Depois de alterar variáveis, faça **Redeploy**.

Modelo local: copie `frontend/.env.example` para `frontend/.env` e preencha.

## Quais tecnologias e frarramentas são ultilizadas neste projeto?


Principais

- Node.js / npm (runtime e gerenciador de pacotes)
- Vite (bundler / dev server)
- React (biblioteca de UI)
- TypeScript (tipagem estática)

UI e componentes

- Tailwind CSS (estilização utilitária)
- shadcn-ui (conjunto de componentes baseado em Radix + Tailwind)
- Radix UI (@radix-ui/react-*) para primitives acessíveis
- lucide-react (ícones)

Estado, dados e backend

- @supabase/supabase-js (integração com Supabase: auth, storage, banco de dados)
- @tanstack/react-query (cache/consulta de dados)

Roteamento, formulários e validação

- react-router-dom (roteamento)
- react-hook-form (forms)
- zod (validação de schemas)

Gráficos e UI auxiliar

- recharts (gráficos)
- embla-carousel-react (carrossel)
- sonner (toasts)

Utilitários

- clsx (concatenação condicional de classes)
- date-fns (manipulação de datas)
- uuid (geração de ids)
- tailwind-merge (mescla segura de classes Tailwind)
- class-variance-authority (CVA - variantes de classes)

Ferramentas de desenvolvimento e build

- Vite (dev server & build)
- @vitejs/plugin-react-swc (plugin React para Vite)
- TypeScript
- ESLint (linting)
- PostCSS e Autoprefixer
- Tailwind CSS e plugins (e.g., @tailwindcss/typography, tailwindcss-animate)

Observações

- A lista acima foi extraída das dependências e devDependencies presentes no `package.json` e das estruturas de pastas do projeto. Ela cobre as ferramentas principais usadas para desenvolvimento, build, UI e integração com serviços (por exemplo, Supabase).

