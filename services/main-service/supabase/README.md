# Supabase — Eclipse Reads

O **project ref** do Supabase (ex.: `abcdefghijklmnop` em `https://abcdefghijklmnop.supabase.co`) **não deve** aparecer neste repositório. Cada desenvolvedor usa o ref do próprio projeto via `supabase link` ou variável de ambiente.

## Pastas

| Pasta | Uso |
|-------|-----|
| `bootstrap/all_migrations_combined.sql` | Schema **completo** — só projeto **novo e vazio** (SQL Editor manual) |
| `migrations/*.sql` | Migrações **incrementais** — aplicadas automaticamente pelo CLI |

## Setup (uma vez por máquina)

```powershell
npm install
npx supabase login

Set-Location services\main-service
npx supabase link --project-ref SEU_PROJECT_REF
Set-Location ..\..\..
```

Se você **já colou** o `all_migrations_combined.sql` no Supabase (banco não vazio):

```powershell
npm run db:baseline
```

Isso marca `20260525180000_baseline_combined_applied` como aplicada **sem rodar SQL de novo**.

## Dia a dia — alterar o banco

```powershell
# 1) Criar arquivo novo
npm run db:new -- descricao_curta

# 2) Editar o .sql gerado em migrations/

# 3) Aplicar no Supabase remoto
npm run db:push

# 4) Conferir
npm run audit:supabase
```

## CI automático (GitHub)

Job `supabase-migrate` em `.github/workflows/main.yml` (roda antes do deploy em push para `main`).

Secrets necessários no repositório:

| Secret | Onde obter |
|--------|------------|
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID (20 caracteres) |

A cada **push em `main`** que altere `services/main-service/supabase/migrations/**`, o CI roda `supabase db push`.

## Comandos npm

| Comando | Ação |
|---------|------|
| `npm run db:new -- nome` | Cria migração incremental |
| `npm run db:push` | Aplica pendentes no remoto |
| `npm run db:baseline` | Marca baseline (banco já migrado manualmente) |
| `npm run db:status` | Lista migrações local vs remoto |
| `npm run audit:supabase` | Audita tabelas/colunas/buckets |

## Regras importantes

1. **Nunca** edite migração já aplicada no remoto — crie arquivo **novo**.
2. **Não** coloque o `all_migrations_combined.sql` de volta em `migrations/`.
3. Prefira SQL idempotente: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.
