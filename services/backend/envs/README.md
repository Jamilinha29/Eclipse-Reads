# Variáveis locais dos backends

Esta pasta guarda configuração **por máquina**. No GitHub ficam apenas os ficheiros `*.env.example`.

## Setup (primeira vez ou clone novo)

```bash
cp auth-proxy.env.example auth-proxy.env
cp books-api.env.example books-api.env
cp library-service.env.example library-service.env
```

Edite cada `.env` com URL e chaves do [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

| Ficheiro | Porta local | Uso |
|----------|-------------|-----|
| `auth-proxy.env` | 4100 | Login/validate (serverless local) |
| `books-api.env` | 4000 | Catálogo, submissões, admin livros |
| `library-service.env` | 4200 | Biblioteca, perfil, settings |

## O que vai para o Git

| Ficheiro | Git |
|----------|-----|
| `*.env.example` | Sim (modelo sem segredos) |
| `*.env` | **Não** (ignorado pelo `.gitignore`) |

Se os `.env` já estiveram no repositório antes, o próximo commit remove-os do tracking; **rotacione as chaves** no Supabase se o repo foi público.

## Segurança das chaves Supabase

| Chave | Onde usar | Pode ir no Git / browser? |
|-------|-----------|---------------------------|
| **anon / publishable** | `frontend/.env` → `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim no browser (header `apikey` é esperado) |
| **service_role** | `books-api.env`, `library-service.env` | **Nunca** no frontend nem no Git |

- No DevTools você verá `Accept-Profile: public` e `apikey` — comportamento normal do Supabase/PostgREST.
- A proteção de dados é **RLS** (políticas no SQL), não esconder a chave anon.
- Na Vercel: `SUPABASE_SERVICE_KEY` só nas funções serverless (`api/*`), **sem** prefixo `VITE_`.
