# Services - Eclipse Reads

Este diretório contém os microserviços backend do Eclipse Reads, organizados em uma arquitetura modular e escalável.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Microserviços](#microserviços)
- [Como Executar](#como-executar)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Healthchecks e Monitoramento](#healthchecks-e-monitoramento)

## 🎯 Visão Geral

A arquitetura de microserviços do Eclipse Reads foi projetada para separar responsabilidades e permitir escalabilidade independente de cada componente. Os serviços comunicam-se através de APIs REST e compartilham o Supabase como backend-as-a-service para autenticação, banco de dados e storage.

## 🏗️ Arquitetura

```
services/
├── backend/
│   ├── auth-proxy/          # Serviço de validação de autenticação
│   ├── books-api/           # API de gerenciamento de livros
│   ├── library-service/     # Serviço de biblioteca pessoal
│   ├── envs/                # Variáveis de ambiente
│   └── docker-compose.yml   # Orquestração dos serviços
└── main-service/
    └── supabase/            # Configurações do Supabase
```

## 🔧 Microserviços

### 1. Auth Proxy (Porta 4100)

**Responsabilidade:** Validação de tokens de autenticação e verificação de usuários.

**Endpoints principais:**
- `GET /health` - Health check do serviço
- `GET /validate` - Valida token JWT e retorna informações do usuário

**Tecnologias:**
- Express.js
- Supabase Auth Client
- TypeScript

**Características:**
- Valida tokens usando o Supabase Auth
- Retorna informações do usuário autenticado
- Healthcheck configurado com intervalo de 10s

### 2. Books API (Porta 4000)

**Responsabilidade:** CRUD de livros, upload de arquivos, busca e gerenciamento de submissões.

**Endpoints principais:**
- `GET /health` - Health check do serviço
- `GET /metrics` - Métricas de requisições e uptime
- Endpoints de livros (criar, listar, buscar, atualizar, deletar)
- Upload e download de arquivos PDF/EPUB/MOBI

**Tecnologias:**
- Express.js
- Supabase (Storage + Database)
- Morgan (logging)
- TypeScript

**Características:**
- Suporte a uploads de até 10MB
- CORS configurado para desenvolvimento e produção
- Service key do Supabase para operações administrativas
- Métricas de performance e uptime

### 3. Library Service (Porta 4200)

**Responsabilidade:** Gerenciamento da biblioteca pessoal dos usuários (favoritos, lendo, lidos).

**Endpoints principais:**
- `GET /health` - Health check do serviço
- `GET /library?type=favoritos` - Lista favoritos do usuário
- `GET /library?type=lendo` - Lista livros em leitura
- `GET /library?type=lidos` - Lista livros já lidos

**Tecnologias:**
- Express.js
- Supabase Client
- TypeScript

**Características:**
- Autenticação via Bearer token
- Acesso a tabelas: `favorites`, `reading`, `read`
- Healthcheck configurado com intervalo de 10s

## 🚀 Como Executar

### Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)
- Conta no Supabase configurada

### Executar com Docker Compose

1. Configure as variáveis de ambiente em `backend/envs/`:
   - `auth-proxy.env`
   - `books-api.env`
   - `library-service.env`

2. Inicie todos os serviços:

```powershell
cd services/backend
docker-compose up -d
```

3. Verifique o status dos serviços:

```powershell
docker-compose ps
```

4. Visualize os logs:

```powershell
docker-compose logs -f
```

### Executar Localmente (Desenvolvimento)

Para executar um serviço específico localmente:

```powershell
# Auth Proxy
cd services/backend/auth-proxy
npm install
npm run dev

# Books API
cd services/backend/books-api
npm install
npm run dev

# Library Service
cd services/backend/library-service
npm install
npm run dev
```

## 🔐 Variáveis de Ambiente

### auth-proxy.env

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
NODE_ENV=development
PORT=4100
```

### books-api.env

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key
NODE_ENV=development
PORT=4000
```

### library-service.env

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_KEY=sua-service-key
NODE_ENV=development
PORT=4200
```

## 🧪 Testes

Os testes estão localizados na pasta `tests/` na raiz do projeto:

### Testes de Tolerância a Falhas

```powershell
npm test tests/fault-tolerance/auth-proxy.test.ts
npm test tests/fault-tolerance/books-api.test.ts
npm test tests/fault-tolerance/library-service.test.ts
```

### Testes de Carga

```powershell
k6 run tests/load/teste-carga-completo.js
```

## 📊 Healthchecks e Monitoramento

Todos os serviços possuem healthchecks configurados:

- **Intervalo:** 10 segundos
- **Timeout:** 5 segundos
- **Retries:** 3 tentativas

### Verificar Health dos Serviços

```powershell
# Auth Proxy
curl http://localhost:4100/health

# Books API
curl http://localhost:4000/health

# Library Service
curl http://localhost:4200/health
```

### Métricas (Books API)

```powershell
curl http://localhost:4000/metrics
```

Retorna:
```json
{
  "requests": 1234,
  "uptime_ms": 3600000
}
```

## 🔄 Fluxo de Comunicação

```
Frontend (React)
    ↓
    ├─→ Auth Proxy (validação de token)
    ├─→ Books API (CRUD de livros)
    └─→ Library Service (biblioteca pessoal)
         ↓
    Supabase (Auth, Database, Storage)
```

## 📝 Notas de Desenvolvimento

- Cada serviço é independente e pode ser escalado separadamente
- Os serviços usam TypeScript para type safety
- Docker Compose facilita o desenvolvimento local com todos os serviços
- Healthchecks garantem disponibilidade e facilitam debugging
- CORS está configurado para permitir requests do frontend

## 🛠️ Manutenção

### Rebuild dos Containers

```powershell
docker-compose up -d --build
```

### Parar os Serviços

```powershell
docker-compose down
```

### Limpar Volumes e Dados

```powershell
docker-compose down -v
```

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Desenvolvido para Eclipse Reads** 🌙📚
