git ## Deploy: Backend (Render) e Frontend (Vercel)

Este guia explica como publicar o backend no Render e o frontend na Vercel, configurando variáveis de ambiente e validando o funcionamento.

---

### 1) Pré-requisitos
- Repositório atualizado no GitHub sem segredos em arquivos `.json`.
- Variáveis do backend documentadas em `backend/.env.example`.
- Frontend com `vercel.json` criado na raiz para build do CRA.

---

### 2) Backend no Render (Express)

1. Acesse o Render e conecte sua conta ao GitHub.
2. Crie um novo **Web Service** selecionando o repositório.
3. Configurações principais:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Auto Deploy**: habilitado
4. Configure variáveis de ambiente (Settings → Environment):
   - `SUPABASE_URL` → URL do seu projeto Supabase (ex: `https://<project>.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` → Chave Service Role do Supabase
   - `GOOGLE_SHEETS_ID` → ID da planilha
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` → E-mail da Service Account
   - `GOOGLE_PRIVATE_KEY` → Chave privada
     - Você pode colar com quebras de linha reais ou usar o formato com `\n`. O backend trata ambos.
   - `GOOGLE_SHEETS_RANGE` → opcional (ex: `Registros!A:Z`)
   - `CORS_ALLOWED_ORIGINS` → seu(s) domínio(s) do frontend (ex: `https://seu-app.vercel.app`)
5. Faça o deploy e aguarde o status **Healthy**.
6. Valide o endpoint de saúde: `GET https://<seu-servico>.onrender.com/api/health`.

Notas:
- O Render define `PORT` automaticamente; o backend usa `process.env.PORT`.
- Em planos gratuitos, o serviço pode hibernar. Considere plano pago para evitar cold start.
- Armazenamento local é efêmero; para uploads persistentes use Storage (ex.: Supabase Storage ou S3).

---

### 3) Frontend na Vercel (React CRA)

1. Acesse a Vercel, conecte-se ao GitHub e importe o repositório.
2. Raiz do projeto:
   - Opção A: deixar como **root** e usar `vercel.json` (já presente) com `@vercel/static-build`.
   - Opção B: definir **Root Directory** como `frontend` nas configurações do projeto.
3. Configure variáveis de ambiente (Settings → Environment Variables):
   - `REACT_APP_SUPABASE_URL` → URL do Supabase
   - `REACT_APP_SUPABASE_ANON_KEY` → Anon key do Supabase
   - `REACT_APP_API_URL` → URL do backend no Render (ex: `https://<seu-servico>.onrender.com`)
4. Inicie um build.
5. Acesse o preview gerado e valide chamadas ao backend.

---

### 4) CORS e segurança
- O backend aceita qualquer subdomínio `*.vercel.app` e domínios listados em `CORS_ALLOWED_ORIGINS`.
- Por segurança, mantenha `CORS_ALLOWED_ORIGINS` com seu domínio específico (ex.: `https://seu-app.vercel.app`).
- Nunca commite arquivos `.json` de credenciais; use variáveis de ambiente.

---

### 5) Testes rápidos pós-deploy
- Backend:
  - `GET /api/health` deve retornar conexão com Supabase e Sheets OK (se configurado).
  - Teste `POST /add-row` e `POST /update-row` com payload simples para validar a planilha.
- Frontend:
  - Verifique páginas que fazem chamadas ao backend (ex.: processamento de PDF, dashboards, usuários).
  - Confirme `REACT_APP_API_URL` apontando para o Render.

---

### 6) Problemas comuns
- `Not allowed by CORS`: ajuste `CORS_ALLOWED_ORIGINS` com o domínio correto.
- `SUPABASE_URL/SERVICE_ROLE_KEY ausentes`: verifique se as variáveis estão criadas no Render.
- `GOOGLE_PRIVATE_KEY inválida`: garanta o formato com quebras de linha (ou `\n`).
- Upload falhando: limite de tamanho/armazenamento efêmero; considere Storage externo.

---

### 7) Referências rápidas
- Backend env (`backend/.env.example`)
- Build frontend via `vercel.json` na raiz
- Health check do backend: `/api/health`