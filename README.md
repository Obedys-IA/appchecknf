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

### Deploy na Web

O aplicativo está configurado para deploy em plataformas como Render, Vercel, etc.

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