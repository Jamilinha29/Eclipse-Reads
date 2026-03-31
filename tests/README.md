# Tests - Eclipse Reads

Este diretório contém testes organizados por funcionalidade em arquivos independentes, para facilitar rastreabilidade, manutenção e execução isolada.

## Estrutura modular

```
tests/
├── auth/
│   ├── login-email.test.ts
│   ├── login-google.test.ts
│   └── guest-access.test.ts
├── cadastro/
│   ├── cadastro-email.test.ts
│   ├── senha.test.ts
│   └── confirmacao-senha.test.ts
├── upload/
│   ├── upload-valido.test.ts
│   ├── upload-invalido.test.ts
│   └── formato.test.ts
├── perfil/
│   ├── avatar.test.ts
│   └── exibicao-dados.test.ts
├── helpers/
│   ├── loadApps.ts
│   └── supabaseFactories.ts
├── mocks/
│   ├── supabase-js-test-shim.ts
│   └── supabaseRegistry.ts
├── setup-env.ts
├── setup.ts
└── load/
    └── teste-carga-completo.js
```

## Princípios adotados

- Um arquivo por cenário (execução independente).
- Agrupamento por domínio funcional.
- Helpers compartilhados para evitar duplicação.
- Isolamento de falhas por caso de teste.

## Execução local

```powershell
npm install
npm test
```

Executar por funcionalidade:

```powershell
npm run test:auth
npm run test:cadastro
npm run test:upload
npm run test:perfil
```

Executar todos os testes um por vez:

```powershell
npm run test:one-by-one
```

## Execução no Docker

Com a configuração adicionada em `Dockerfile.tests` e `docker-compose.tests.yml`:

```powershell
npm run test:docker
```

Executar no Docker um por vez:

```powershell
npm run test:docker:one-by-one
```

Encerrar e limpar:

```powershell
npm run test:docker:down
```

## Observações

- O `vitest.config.ts` continua com `include: ["tests/**/*.test.ts"]`.
- A suíte mantém compatibilidade com os mocks já usados para `@supabase/supabase-js`.
- Os testes de carga (`tests/load`) continuam separados e opcionais.
