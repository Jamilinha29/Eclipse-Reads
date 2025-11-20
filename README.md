# Bem-vindo ao projeto Eclipse Reads

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

# Passo 3: Instale as dependências necessárias.
npm install

# Passo 4: Inicie o servidor de desenvolvimento.
npm run dev
```

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

