# Eclipse Reads - Deploy na Vercel

## 🚀 Configuração para Deploy

### Configurações no Painel da Vercel:

**Framework Preset:** `Vite`
**Root Directory:** `frontend`
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`
**Node.js Version:** `18.x`

### 📋 Variáveis de Ambiente Obrigatórias:

No painel da Vercel, adicione estas variáveis de ambiente:

```
VITE_SUPABASE_URL=https://vwipzzvyziqwtfwivhns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3aXB6enZ5emlxd3Rmd2l2aG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTc1MDEsImV4cCI6MjA3NzE3MzUwMX0.g8aeCqgF3_UjKrL6EEMdU_AfS3i8UZF6Cve1vicGnkU
VITE_SUPABASE_PROJECT_ID=vwipzzvyziqwtfwivhns
```

### 🔧 Estrutura do Projeto:

- **Frontend:** React + Vite + TypeScript (pasta `frontend/`)
- **Backend:** Node.js APIs (pasta `services/backend/`)
- **Database:** Supabase

### 📝 Passos para Deploy:

1. Conecte o repositório GitHub na Vercel
2. Configure o Root Directory como `frontend`
3. Adicione as variáveis de ambiente
4. Deploy!

### 🌐 URLs dos Serviços:

- **Frontend:** Será deployado na Vercel
- **Auth Proxy:** Porta 4100 (local)
- **Books API:** Porta 4101 (local)  
- **Library Service:** Porta 4200 (local)

### 📚 Comandos Úteis:

```bash
# Frontend
cd frontend
npm install
npm run dev
npm run build

# Backend services
cd services/backend/auth-proxy
npm run dev

cd services/backend/books-api  
npm run dev

cd services/backend/library-service
npm run dev
```