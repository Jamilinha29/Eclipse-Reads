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
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_SUPABASE_PUBLISHABLE_KEY_AQUI
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID_AQUI
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