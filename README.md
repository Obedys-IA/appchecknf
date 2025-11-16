# GDM - SeparadorPDF

Aplicativo web para separação e processamento automático de notas fiscais em PDF.

## Funcionalidades

- **Upload de PDF**: Aceita arquivos PDF com múltiplas notas fiscais
- **Separação Automática**: Identifica e separa cada nota fiscal em arquivos individuais
- **Agrupamento Inteligente**: Agrupa páginas da mesma nota fiscal automaticamente
- **Extração de Dados**: Extrai informações como número da NF, data, placa, etc.
- **Renomeação Automática**: Renomeia arquivos seguindo padrão específico
- **Exportação**: Gera relatórios em Excel e permite download em ZIP
- **Interface Moderna**: Design responsivo e intuitivo

## Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- pdf-lib (manipulação de PDF)
- pdf-parse (extração de texto)
- exceljs (geração de Excel)
- archiver (compressão ZIP)

### Frontend
- React.js
- CSS3 com design responsivo

## Segurança e Credenciais

Para integrar com o Google Sheets, o backend utiliza variáveis de ambiente. Nunca faça commit de chaves privadas ou arquivos de credenciais no repositório.

- Use o arquivo `backend/.env.example` como referência e crie um arquivo `backend/.env` localmente com:
  - `GOOGLE_SHEETS_ID`: ID da planilha (da URL do Google Sheets)
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: e-mail da conta de serviço
  - `GOOGLE_PRIVATE_KEY`: chave privada da conta de serviço (substitua quebras de linha por `\n` quando necessário)
  - `GOOGLE_SHEETS_RANGE` (opcional): ex. `Registros!A:Z`

O frontend comunica-se com o backend pelos endpoints `/add-row` e `/update-row`; configure `REACT_APP_API_URL` em `frontend/.env` se for usar uma URL pública.

## Estrutura do Projeto

```
note separator/
├── backend/           # Servidor Node.js
│   ├── index.js      # Servidor principal
│   ├── fretistas.json # Tabela de fretistas
│   └── package.json  # Dependências do backend
├── frontend/          # Aplicação React
│   ├── src/
│   │   ├── App.js    # Componente principal
│   │   ├── App.css   # Estilos
│   │   └── logodoapp.png # Logo da aplicação
│   └── package.json  # Dependências do frontend
└── README.md         # Documentação
```

## Como Usar

### Desenvolvimento Local

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend**:
  ```bash
  cd frontend
  npm install
  npm start
  ```

3. Acesse `http://localhost:3000`

### Configuração do Google Sheets

1. No Google Cloud, crie uma Conta de Serviço com permissão para Google Sheets API e gere uma chave.
2. Compartilhe a planilha com o e-mail da conta de serviço (como Editor).
3. Preencha o `backend/.env` usando o modelo `backend/.env.example`.
4. Reinicie o backend.

> Importante: Evite armazenar arquivos `.json` de credenciais no projeto. O `.gitignore` já bloqueia padrões como `app-sheets-service-*.json` e `*service-account*.json`.

### Deploy na Web

O aplicativo está configurado para deploy em plataformas como Render, Vercel, etc.

Para um passo a passo detalhado de publicação do backend no Render e do frontend na Vercel, incluindo variáveis de ambiente e validações pós-deploy, consulte o arquivo `DEPLOY.md` na raiz do projeto.

## Padrão de Nomeação

Os arquivos são renomeados seguindo o padrão:
```
NF [NÚMERO] - [NOME FANTASIA] - [DATA] - [PLACA] - [FRETISTA] - [RAZÃO SOCIAL].pdf
```

Exemplo: `NF 53669 - SUPERMERCADO NUNES - 13.05.2025 - JOP0D95 - EDERSON - MERCADO BRASIL.pdf`

## Campos Extraídos

- **Nº da NF**: Número da nota fiscal
- **Nome Fantasia**: Nome fantasia da empresa (máximo 2 palavras)
- **Data de Emissão**: Data formatada (dd.mm.aaaa)
- **Placa**: Placa do veículo
- **Fretista**: Nome do fretista (baseado na tabela de placas)
- **Razão Social**: Razão social (primeiras 2 palavras)

## Autor

GDM - SeparadorPDF