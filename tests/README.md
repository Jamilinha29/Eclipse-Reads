# Tests - Eclipse Reads

Este diretório contém a suíte completa de testes do Eclipse Reads, incluindo testes de tolerância a falhas e testes de carga para garantir a qualidade, resiliência e performance da aplicação.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Testes](#estrutura-de-testes)
- [Configuração](#configuração)
- [Testes de Tolerância a Falhas](#testes-de-tolerância-a-falhas)
- [Testes de Carga](#testes-de-carga)
- [Como Executar](#como-executar)
- [Cobertura de Código](#cobertura-de-código)
- [Boas Práticas](#boas-práticas)

## 🎯 Visão Geral

A estratégia de testes do Eclipse Reads foi projetada para garantir:

- ✅ **Resiliência**: Os serviços continuam funcionando mesmo quando dependências falham
- ✅ **Performance**: A aplicação suporta alta carga de requisições simultâneas
- ✅ **Confiabilidade**: Os endpoints respondem corretamente em cenários de erro
- ✅ **Manutenibilidade**: Testes bem estruturados e fáceis de entender

## 🏗️ Estrutura de Testes

```
tests/
├── setup.ts                          # Configuração global dos testes
├── fault-tolerance/                  # Testes de tolerância a falhas
│   ├── auth-proxy.test.ts           # Testes do Auth Proxy
│   ├── books-api.test.ts            # Testes do Books API
│   └── library-service.test.ts      # Testes do Library Service
└── load/                             # Testes de carga
    └── teste-carga-completo.js      # Teste de carga com K6
```

## ⚙️ Configuração

### Setup Global (`setup.ts`)

Configuração automática do ambiente de testes:

```typescript
process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_KEY = "service-role-key";
process.env.PORT = "0";
```

### Vitest Config (`vitest.config.ts`)

Configuração do framework de testes:

- **Environment**: Node.js
- **Globals**: Habilitado
- **Setup Files**: `tests/setup.ts`
- **Include**: `tests/**/*.test.ts`
- **Coverage**: Text e HTML reporters

## 🛡️ Testes de Tolerância a Falhas

Os testes de tolerância a falhas garantem que os microserviços permaneçam disponíveis e respondam adequadamente mesmo quando dependências (como o Supabase) apresentam problemas.

### Auth Proxy Tests

**Arquivo**: `tests/fault-tolerance/auth-proxy.test.ts`

**Cenários testados:**

1. **Supabase retorna erro de autenticação**
   - Verifica resposta 401 com mensagem de erro apropriada
   - Confirma que o serviço continua saudável (`/health` retorna 200)

2. **Exceção ao validar usuário**
   - Testa comportamento quando `auth.getUser()` lança exceção
   - Verifica resposta 500 com mensagem de erro
   - Confirma que o endpoint `/health` continua funcionando

**Técnicas utilizadas:**
- Mock do `@supabase/supabase-js`
- Simulação de diferentes estados de erro
- Validação de respostas HTTP e body

### Books API Tests

**Arquivo**: `tests/fault-tolerance/books-api.test.ts`

**Cenários testados:**

1. **Falha no banco de dados ao listar livros**
   - Simula erro "db unreachable"
   - Verifica resposta 500 sem derrubar o servidor
   - Confirma que métricas continuam disponíveis

2. **Timeout de rede**
   - Testa exceção inesperada (network timeout)
   - Verifica que o serviço permanece operacional
   - Valida que healthcheck e métricas funcionam

**Recursos testados:**
- Listagem de livros (`GET /books`)
- Endpoint de métricas (`GET /metrics`)
- Healthcheck (`GET /health`)

### Library Service Tests

**Arquivo**: `tests/fault-tolerance/library-service.test.ts`

**Cenários testados:**

1. **Falha na tabela relacional (favoritos/lendo/lidos)**
   - Simula erro "relationship down"
   - Verifica resposta 500 com mensagem apropriada
   - Confirma que o processo permanece vivo

2. **Erro ao buscar dados de livros**
   - Testa falha na segunda query (busca de livros)
   - Valida tratamento de erros em cascata

**Endpoints testados:**
- `GET /library?type=favoritos`
- `GET /library?type=lendo`
- `GET /library?type=lidos`

## ⚡ Testes de Carga

**Arquivo**: `tests/load/teste-carga-completo.js`

### Framework: K6

Ferramenta de testes de carga moderna e eficiente para APIs REST.

### Configuração do Teste

**Stages (Rampa de Carga):**
1. **30s → 10 VUs**: Aquecimento inicial
2. **30s → 50 VUs**: Carga moderada
3. **30s → 100 VUs**: Carga alta
4. **30s → 1000 VUs**: Carga de pico (stress test)

**Thresholds (Limites):**
- `http_req_duration`: 95% das requisições devem completar em < 4 segundos
- `http_req_failed`: Taxa de falha < 1%

### Endpoint Testado

```javascript
GET /rest/v1/books?select=*
```

**Headers:**
- `apikey`: Chave anônima do Supabase
- `Authorization`: Bearer token

**Validações:**
- Status 200 (OK)
- Recebeu dados no body

## 🚀 Como Executar

### Pré-requisitos

**Para testes de tolerância a falhas:**
```powershell
npm install
```

**Para testes de carga:**
```powershell
# Instalar K6
choco install k6
# ou baixar de https://k6.io/docs/get-started/installation/
```

### Executar Todos os Testes

```powershell
npm test
```

### Executar em Modo Watch

```powershell
npm run test:watch
```

### Executar Testes Específicos

```powershell
# Auth Proxy
npm test tests/fault-tolerance/auth-proxy.test.ts

# Books API
npm test tests/fault-tolerance/books-api.test.ts

# Library Service
npm test tests/fault-tolerance/library-service.test.ts
```

### Executar Teste de Carga

```powershell
cd tests/load
k6 run teste-carga-completo.js
```

**Com opções adicionais:**

```powershell
# Salvar resultados em JSON
k6 run --out json=results.json teste-carga-completo.js

# Executar com VUs customizados
k6 run --vus 50 --duration 60s teste-carga-completo.js

# Gerar relatório HTML (com extensão)
k6 run --out html=report.html teste-carga-completo.js
```

## 📊 Cobertura de Código

### Gerar Relatório de Cobertura

```powershell
npm test -- --coverage
```

### Visualizar Relatório HTML

```powershell
# O relatório será gerado em coverage/index.html
start coverage/index.html
```

### Configuração de Cobertura

Definida em `vitest.config.ts`:
- **Reporters**: Text (console) e HTML
- **Arquivos incluídos**: `tests/**/*.test.ts`

## ✅ Boas Práticas

### 1. Estrutura de Testes

```typescript
describe("nome-do-serviço fault tolerance", () => {
  it("descreve o cenário de erro claramente", async () => {
    // Arrange: Configurar mocks e estado inicial
    const mock = createMock({ ... });
    
    // Act: Executar ação
    const response = await request(app).get("/endpoint");
    
    // Assert: Verificar resultados
    expect(response.status).toBe(expectedStatus);
    expect(response.body.error).toContain("mensagem");
  });
});
```

### 2. Mocking com Vitest

- Use `vi.mock()` para substituir módulos externos
- Implemente `beforeEach()` para resetar mocks
- Crie factory functions para mocks reutilizáveis

### 3. Testes de Carga

- Defina thresholds realistas baseados em SLAs
- Use stages progressivos para identificar breaking points
- Valide não apenas status codes, mas também body e latência

### 4. Mensagens de Erro

- Sempre verifique que erros retornam mensagens claras
- Teste que o serviço não vaza informações sensíveis
- Valide códigos HTTP apropriados (401, 500, etc.)

## 📈 Métricas e Resultados

### Testes de Tolerância a Falhas

Todos os testes devem passar (100% success rate):

```
✓ auth-proxy fault tolerance (2 tests)
✓ books-api fault tolerance (2 tests)
✓ library-service fault tolerance (2 tests)

Test Files: 3 passed (3)
Tests: 6 passed (6)
```

### Testes de Carga

Exemplo de saída esperada:

```
scenarios: (100.00%) 1 scenario, 1000 max VUs

✓ status é 200 (OK)
✓ recebeu dados

http_req_duration..............: avg=1.2s  p(95)=3.5s
http_req_failed................: 0.23%
http_reqs......................: 45000
iteration_duration.............: avg=2.2s
vus............................: 1000
```

## 🔧 Troubleshooting

### Testes Falhando

1. **Verifique variáveis de ambiente**:
   ```powershell
   echo $env:NODE_ENV
   ```

2. **Limpe cache do Vitest**:
   ```powershell
   rm -rf node_modules/.vitest
   npm test
   ```

3. **Verifique versões de dependências**:
   ```powershell
   npm list vitest supertest
   ```

### K6 Não Encontrado

```powershell
# Windows (chocolatey)
choco install k6

# Verificar instalação
k6 version
```

### Erro de CORS em Testes

- Verifique que `cors()` está habilitado nos serviços
- Confirme headers no teste de carga

## 📝 Adicionando Novos Testes

### Template para Teste de Tolerância a Falhas

```typescript
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args)
}));

describe("novo-servico fault tolerance", () => {
  it("trata erro de [cenário] sem derrubar o servidor", async () => {
    // Setup mock
    const mock = createMock({ /* configuração */ });
    createClientMock.mockReturnValue(mock);
    
    // Carregar aplicação
    const app = await loadApp();
    
    // Testar endpoint
    const response = await request(app).get("/endpoint");
    
    // Validações
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    
    // Confirmar healthcheck
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });
});
```

### Template para Teste de Carga K6

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
  ],
  thresholds: {
    "http_req_duration": ["p(95)<2000"],
  },
};

export default function () {
  const res = http.get("http://localhost:4000/endpoint");
  
  check(res, {
    'status é 200': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

## 📚 Recursos Adicionais

- [Documentação do Vitest](https://vitest.dev/)
- [Guia do K6](https://k6.io/docs/)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Mocking com Vitest](https://vitest.dev/guide/mocking.html)


