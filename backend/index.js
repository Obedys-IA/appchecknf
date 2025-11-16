require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const excel = require('exceljs');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js')
const csv = require('csv-parser')
const https = require('https')
const { google } = require('googleapis')

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://nwkqdbonogfitjhkjjgh.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3FkYm9ub2dmaXRqaGtqamdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3OTA2MSwiZXhwIjoyMDc1OTU1MDYxfQ.fhRoAqj9XxI7c0HAzPYjs2t7FCIWVL3LBd2RaYh6Elc'
const supabase = createClient(supabaseUrl, supabaseKey)

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Utilitário: adicionar linha ao Google Sheets
async function appendRowToGoogleSheets(rowObject) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const range = process.env.GOOGLE_SHEETS_RANGE || 'Registros!A:Z'

  if (!spreadsheetId || !clientEmail || !privateKeyRaw) {
    throw new Error('Credenciais do Google Sheets ausentes nas variáveis de ambiente')
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Buscar cabeçalho para mapear colunas dinamicamente
  const sheetName = range.includes('!') ? range.split('!')[0] : 'Registros'
  const headerRange = `${sheetName}!1:1`
  const headerResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: headerRange })
  const headers = headerResp.data.values?.[0] || []

  // Montar valores na ordem do cabeçalho; se vazio, usar todas as chaves do objeto
  const keys = headers.length > 0 ? headers : Object.keys(rowObject)
  const rowValues = keys.map((k) => {
    const v = rowObject[k]
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  })

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [rowValues] }
  })
}

// Atualiza uma linha existente em uma planilha com base em uma chave única
async function updateRowInGoogleSheets(rowObject) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY
  const range = process.env.GOOGLE_SHEETS_RANGE || 'Registros!A:Z'

  if (!spreadsheetId || !clientEmail || !privateKeyRaw) {
    throw new Error('Credenciais do Google Sheets ausentes nas variáveis de ambiente')
  }

  // Alguns provedores armazenam a chave com "\\n" em vez de quebras reais.
  const privateKey = privateKeyRaw.includes('\\n')
    ? privateKeyRaw.replace(/\\n/g, '\n')
    : privateKeyRaw

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const sheetName = range.includes('!') ? range.split('!')[0] : 'Registros'
  const headerRange = `${sheetName}!1:1`
  const headerResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: headerRange })
  const headers = headerResp.data.values?.[0] || []

  if (headers.length === 0) {
    throw new Error('Cabeçalho da planilha não encontrado para mapeamento de atualização')
  }

  // Determina a chave de correspondência: prioridade para registro_id, depois numero_nf, depois id
  let matchKey = null
  if (headers.includes('registro_id') && rowObject.registro_id) matchKey = 'registro_id'
  else if (headers.includes('numero_nf') && rowObject.numero_nf) matchKey = 'numero_nf'
  else if (headers.includes('id') && rowObject.id) matchKey = 'id'

  if (!matchKey) {
    throw new Error('Não foi possível determinar a chave de correspondência para atualização (registro_id/numero_nf/id ausente)')
  }

  const matchColIndex = headers.indexOf(matchKey)

  // Helper para converter índice de coluna (0-based) para A1 (A, B, ..., AA, AB, ...)
  const colToA1 = (n) => {
    let s = ''
    n += 1 // 1-based
    while (n > 0) {
      const mod = (n - 1) % 26
      s = String.fromCharCode(65 + mod) + s
      n = Math.floor((n - 1) / 26)
    }
    return s
  }

  // Buscar todas as linhas de dados com o último cabeçalho real (suporta além de Z)
  const lastDataColLetter = colToA1(headers.length - 1)
  const dataRange = `${sheetName}!A2:${lastDataColLetter}`
  const dataResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: dataRange })
  const rows = dataResp.data.values || []

  // Encontrar índice da linha cujo valor da coluna de match corresponde
  let foundRowNumber = null // número absoluto na planilha (inclui cabeçalho)
  let foundRowIndex = null   // índice no array "rows" (0-based)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cellVal = (row[matchColIndex] || '').toString()
    if (cellVal === String(rowObject[matchKey])) {
      foundRowNumber = i + 2 // +2 porque dados começam na linha 2
      foundRowIndex = i
      break
    }
  }

  if (!foundRowNumber) {
    throw new Error(`Linha não encontrada para ${matchKey}=${rowObject[matchKey]}`)
  }

  // Mesclar os valores existentes com os enviados para não apagar campos não presentes
  const existingRow = foundRowIndex != null ? rows[foundRowIndex] || [] : []
  const rowValues = headers.map((k, idx) => {
    const incoming = rowObject[k]
    const chosen = incoming !== undefined && incoming !== null ? incoming : (existingRow[idx] ?? '')
    if (typeof chosen === 'object') return JSON.stringify(chosen)
    return String(chosen)
  })

  const lastColLetter = colToA1(headers.length - 1)
  const updateRange = `${sheetName}!A${foundRowNumber}:${lastColLetter}${foundRowNumber}`

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [rowValues] }
  })
}

// Carregar dados de emitentes e clientes
let emitentesData = [];
let clientesData = [];

// Função para carregar dados dos JSONs
function carregarDadosJSON() {
  try {
    // Carregar emitentes
    const emitentesPath = path.join(__dirname, '..', 'emitentes.json');
    if (fs.existsSync(emitentesPath)) {
      emitentesData = JSON.parse(fs.readFileSync(emitentesPath, 'utf8'));
      console.log(`Carregados ${emitentesData.length} emitentes`);
    }
    
    // Carregar clientes
    const clientesPath = path.join(__dirname, '..', 'clientes.json');
    if (fs.existsSync(clientesPath)) {
      clientesData = JSON.parse(fs.readFileSync(clientesPath, 'utf8'));
      console.log(`Carregados ${clientesData.length} clientes`);
    }
  } catch (error) {
    console.error('Erro ao carregar dados JSON:', error);
  }
}

// Função para buscar nome fantasia do emitente por CNPJ
function buscarNomeFantasiaEmitente(cnpj) {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  const emitente = emitentesData.find(e => e.cnpj.replace(/[^\d]/g, '') === cnpjLimpo);
  return emitente ? emitente.nome_fantasia : '';
}

// Função para buscar razão social do emitente por CNPJ
function buscarRazaoSocialEmitente(cnpj) {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  const emitente = emitentesData.find(e => e.cnpj.replace(/[^\d]/g, '') === cnpjLimpo);
  return emitente ? emitente.razao_social : '';
}

// Função para buscar nome fantasia do cliente por CNPJ/CPF
function buscarNomeFantasiaCliente(cnpjCpf) {
  try {
    const cnpjCpfLimpo = cnpjCpf.replace(/[^\d]/g, '');
    const cliente = clientesData.find(c => c.cnpj.replace(/[^\d]/g, '') === cnpjCpfLimpo);
    return cliente ? cliente.nome_fantasia : '';
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return '';
  }
}

// Preferencial: buscar nome fantasia a partir da tabela 'clientes' no Supabase
async function buscarNomeFantasiaClienteDB(cnpjCpf) {
  try {
    if (!cnpjCpf) return ''
    const cnpjLimpo = cnpjCpf.replace(/[^\d]/g, '')
    // Tentar correspondência direta no Supabase com CNPJ/CPF limpo
    const { data, error } = await supabase
      .from('clientes')
      .select('nome_fantasia, cnpj')
      .eq('cnpj', cnpjLimpo)
      .limit(1)

    if (!error && data && data.length > 0) {
      return data[0].nome_fantasia || ''
    }

    // Fallback: comparar pelo CNPJ/CPF na base JSON local
    return buscarNomeFantasiaCliente(cnpjCpf)
  } catch (error) {
    console.error('Erro ao consultar nome fantasia no Supabase:', error)
    return buscarNomeFantasiaCliente(cnpjCpf)
  }
}

// ===== FUNÇÕES ALTERNATIVAS USANDO SUPABASE =====
// Função para buscar emitente no Supabase por CNPJ
async function buscarEmitenteSupabase(cnpj) {
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    const { data, error } = await supabase
      .from('emitentes')
      .select('cnpj, razao_social, nome_fantasia')
      .eq('cnpj', cnpjLimpo)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar emitente no Supabase:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar emitente no Supabase:', error);
    return null;
  }
}

// Função para buscar cliente no Supabase por CNPJ/CPF
async function buscarClienteSupabase(cnpjCpf) {
  try {
    const cnpjCpfLimpo = cnpjCpf.replace(/[^\d]/g, '');
    const { data, error } = await supabase
      .from('clientes')
      .select('cnpj, razao_social, nome_fantasia, rede, uf, vendedor')
      .eq('cnpj', cnpjCpfLimpo)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar cliente no Supabase:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar cliente no Supabase:', error);
    return null;
  }
}

// Função para buscar fretista no Supabase por placa
async function buscarFretistaSupabase(placa) {
  try {
    const { data, error } = await supabase
      .from('fretistas')
      .select('placa, nome')
      .eq('placa', placa.toUpperCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar fretista no Supabase:', error);
      return null;
    }
    
    return data ? data.nome : '';
  } catch (error) {
    console.error('Erro ao buscar fretista no Supabase:', error);
    return '';
  }
}

// Carregar dados na inicialização
carregarDadosJSON();

// Sistema de prevenção de duplicatas
let processedFiles = new Map(); // Armazena hash dos arquivos processados
let processedNotes = new Set(); // Armazena números de NF já processados

// Função para gerar hash de arquivo
function generateFileHash(buffer) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Função para validar CFOP
function validarCFOP(cfop) {
  if (!cfop || typeof cfop !== 'string') {
    return { valido: false, erro: 'CFOP não informado' };
  }

  const cfopLimpo = cfop.replace(/\D/g, '');
  
  if (cfopLimpo.length !== 4) {
    return { valido: false, erro: 'CFOP deve ter 4 dígitos' };
  }

  const cfopNum = parseInt(cfopLimpo);
  
  // Validações básicas de CFOP
  const primeiroDigito = Math.floor(cfopNum / 1000);
  
  // CFOPs válidos começam com 1, 2, 3, 5, 6 ou 7
  if (![1, 2, 3, 5, 6, 7].includes(primeiroDigito)) {
    return { valido: false, erro: 'CFOP inválido - primeiro dígito deve ser 1, 2, 3, 5, 6 ou 7' };
  }

  // Validações específicas por categoria
  if (primeiroDigito === 1) {
    // Operações dentro do estado
    if (cfopNum < 1000 || cfopNum > 1999) {
      return { valido: false, erro: 'CFOP de operação dentro do estado inválido' };
    }
  } else if (primeiroDigito === 2) {
    // Operações interestaduais
    if (cfopNum < 2000 || cfopNum > 2999) {
      return { valido: false, erro: 'CFOP de operação interestadual inválido' };
    }
  } else if (primeiroDigito === 3) {
    // Operações com exterior
    if (cfopNum < 3000 || cfopNum > 3999) {
      return { valido: false, erro: 'CFOP de operação com exterior inválido' };
    }
  }

  // Lista de CFOPs válidos conforme especificação do promptnew.txt
  const cfopsValidos = [
    5100, 5101, 5102, 5103, 5104, 5105, 5106, 5107, 5108,
    6100, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108,
    5400, 5401, 5402, 5403, 5404, 5405
  ];

  if (!cfopsValidos.includes(cfopNum)) {
    return { 
      valido: false, 
      erro: `CFOP ${cfopLimpo} não está na lista de CFOPs válidos conhecidos`,
      aviso: 'Este CFOP pode ser válido mas não está em nossa base de dados'
    };
  }

  return { valido: true, cfop: cfopLimpo };
}

// Função para verificar duplicatas
async function verificarDuplicata(numeroNF, cnpjEmitente, dataEmissao, fileHash) {
  // Verifica se a nota fiscal já foi processada consultando o banco de dados
  try {
    const { data: notaExistente, error } = await supabase
      .from('registros')
      .select('numero_nf')
      .eq('numero_nf', numeroNF)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar duplicata no banco:', error);
      // Em caso de erro, continua com verificação local
      const chaveNota = `${numeroNF}-${cnpjEmitente}-${dataEmissao}`;
      if (processedNotes.has(chaveNota)) {
        return {
          isDuplicata: true,
          tipo: 'nota',
          mensagem: `Nota fiscal ${numeroNF} já foi processada (verificação local)`
        };
      }
    } else if (notaExistente && notaExistente.length > 0) {
      return {
        isDuplicata: true,
        tipo: 'nota',
        mensagem: `Nota fiscal ${numeroNF} já existe no sistema`
      };
    }
  } catch (error) {
    console.error('Erro na consulta de duplicata:', error);
    // Fallback para verificação local em caso de erro
    const chaveNota = `${numeroNF}-${cnpjEmitente}-${dataEmissao}`;
    if (processedNotes.has(chaveNota)) {
      return {
        isDuplicata: true,
        tipo: 'nota',
        mensagem: `Nota fiscal ${numeroNF} já foi processada (verificação local)`
      };
    }
  }

  return { isDuplicata: false };
}

// Função para registrar arquivo/nota processada
function registrarProcessamento(numeroNF, cnpjEmitente, dataEmissao, fileHash) {
  const chaveNota = `${numeroNF}-${cnpjEmitente}-${dataEmissao}`;
  
  processedNotes.add(chaveNota);
}

// Endpoint para limpar cache de duplicatas (apenas para admin)
app.post('/admin/limpar-cache-duplicatas', (req, res) => {
  try {
    processedNotes.clear();
    res.json({ 
      success: true, 
      message: 'Cache de duplicatas limpo com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint para verificar status do cache
app.get('/admin/status-cache', (req, res) => {
  res.json({
    arquivosProcessados: processedFiles.size,
    notasProcessadas: processedNotes.size,
    ultimaLimpeza: new Date().toISOString()
  });
});

// Configuração CORS mais robusta para web
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001',
  'http://192.168.10.199:3000',
  'http://192.168.1.68:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: Postman, apps mobile) ou da lista de permissões
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuração do multer para upload (apenas em memória, sem salvar arquivos)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Endpoint para upload de PDF
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  res.json({ message: 'Arquivo recebido com sucesso!', filename: req.file.originalname });
});

// Função para extrair o número da NF do texto da página
function extrairNumeroNF(texto) {
  // Procura por padrões comuns de número de NF incluindo formato com pontos
  // Ex: NF 53666, Nº 53666, DANFE 53666, Nº. 000.060.556
  const match = texto.match(/(?:NF|N[º°]?\.?)\s*:?\s*([\d\.]+)/i);
  if (match) {
    // Remove todos os caracteres não numéricos (pontos, espaços, etc.)
    return match[1].replace(/\D/g, '');
  }
  // Se não encontrar, retorna null
  return null;
}

// Função para extrair campos da nota fiscal
function extrairCamposNota(texto) {
  // Nº da NF (DANFE) - Regex melhorada para capturar diferentes formatos
  let numeroNF = '';
  // Primeiro tenta o formato "Nº. 000.060.556"
  let nfMatch = texto.match(/N[º°]?\.?\s*([\d\.]+)/i);
  if (nfMatch) {
    numeroNF = nfMatch[1].replace(/\D/g, '');
  }
  // Se não encontrou, tenta outros padrões
  if (!numeroNF) {
    nfMatch = texto.match(/(?:NF|DANFE)\s*:?\s*(\d+)/i);
    numeroNF = nfMatch ? nfMatch[1] : '';
  }

  // Razão Social (duas primeiras palavras após 'Razão Social' ou 'Destinatário')
  let razaoMatch = texto.match(/Raz[aã]o Social\s*:?\s*([\w\s]+)/i);
  if (!razaoMatch) razaoMatch = texto.match(/Destinat[aá]rio\s*:?\s*([\w\s]+)/i);
  let razaoSocial = razaoMatch ? razaoMatch[1].trim().split(/\s+/).slice(0,2).join(' ') : '';

  // Data de Emissão - Melhorada para capturar diferentes formatos
  let dataEmissao = '';
  // Primeiro tenta o formato padrão "Data de Emissão: 20/10/2025"
  let dataMatch = texto.match(/Data (?:de |da )?Emiss[aã]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (dataMatch) {
    // Converte para formato ISO (YYYY-MM-DD)
    dataEmissao = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
  } else {
    // Tenta formatos alternativos em caixa alta, com quebra de linha: "DATA DA EMISSÃO" ou "DATA DE EMISSÃO"
    dataMatch = texto.match(/DATA\s+(?:DA|DE)\s+EMISS[ÃA]O[\s\n]*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (dataMatch) {
      // Converte para formato ISO (YYYY-MM-DD)
      dataEmissao = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }
  }

  // Placa do Veículo
  const placaMatch = texto.match(/Placa\s*:?\s*([A-Z0-9]{6,8})/i);
  const placa = placaMatch ? placaMatch[1] : 'OUTRA';

  // Nome Fantasia (em Informações Complementares)
  let nomeFantasia = '';
  const infoCompMatch = texto.match(/Informações Complementares[\s\S]{0,100}?(Nome Fantasia\s*:?\s*([\w\s]+))/i);
  if (infoCompMatch) {
    nomeFantasia = infoCompMatch[2].trim();
  } else {
    // Busca alternativa
    const nomeMatch = texto.match(/Nome Fantasia\s*:?\s*([\w\s]+)/i);
    nomeFantasia = nomeMatch ? nomeMatch[1].trim() : '';
  }

  // NOVOS CAMPOS SOLICITADOS:
  
  // CNPJ do Emitente (buscar na seção do emitente/identificação)
  let cnpjEmitente = '';
  let nomeFantasiaEmitente = '';
  
  // Primeiro, busca na seção do emitente
  const emitenteSection = texto.match(/(?:EMITENTE|IDENTIFICA[ÇC][ÃA]O DO EMITENTE)[\s\S]{0,800}/i);
  if (emitenteSection) {
    const cnpjEmitenteMatch = emitenteSection[0].match(/CNPJ\s*:?\s*([\d\.\-\/]+)/i);
    cnpjEmitente = cnpjEmitenteMatch ? cnpjEmitenteMatch[1] : '';
  }

  // CNPJ/CPF do Destinatário (cliente) - buscar especificamente o campo que fica ao lado da DATA DA EMISSÃO
  let cnpjCpfDestinatario = '';
  
  // Busca na seção do destinatário/remetente
  const destinatarioSection = texto.match(/(?:DESTINAT[ÁA]RIO|REMETENTE)[\s\S]{0,800}/i);
  if (destinatarioSection) {
    // Busca especificamente por "CNPJ / CPF" seguido do valor na próxima linha ou próximo
    let cnpjMatch = destinatarioSection[0].match(/CNPJ\s*\/\s*CPF[\s\n\r]*([0-9\.\-\/]+)/i);
    if (!cnpjMatch) {
      // Tenta formato alternativo "CNPJ/CPF"
      cnpjMatch = destinatarioSection[0].match(/CNPJ\/CPF[\s\n\r]*([0-9\.\-\/]+)/i);
    }
    if (!cnpjMatch) {
      // Tenta formato com dois pontos "CNPJ / CPF:"
      cnpjMatch = destinatarioSection[0].match(/CNPJ\s*\/\s*CPF\s*:[\s\n\r]*([0-9\.\-\/]+)/i);
    }
    if (!cnpjMatch) {
      // Busca por CNPJ isolado na seção
      cnpjMatch = destinatarioSection[0].match(/CNPJ[\s\n\r]*([0-9\.\-\/]+)/i);
    }
    if (!cnpjMatch) {
      // Busca por CPF isolado na seção
      cnpjMatch = destinatarioSection[0].match(/CPF[\s\n\r]*([0-9\.\-\/]+)/i);
    }
    cnpjCpfDestinatario = cnpjMatch ? cnpjMatch[1] : '';
  }
  
  // Se não encontrou na seção específica, busca em todo o texto pelo padrão específico
  if (!cnpjCpfDestinatario) {
    // Busca por "CNPJ / CPF" seguido do valor, especialmente próximo à DATA DA EMISSÃO
    const cnpjCpfMatch = texto.match(/CNPJ\s*\/\s*CPF[\s\n\r]*([0-9\.\-\/]+)[\s\S]{0,200}DATA\s+DA\s+EMISS[ÃA]O/i);
    if (cnpjCpfMatch) {
      cnpjCpfDestinatario = cnpjCpfMatch[1];
    } else {
      // Busca alternativa por qualquer CNPJ/CPF no formato correto
      const altMatch = texto.match(/CNPJ\s*\/\s*CPF[\s\n\r]*([0-9\.\-\/]+)/i);
      cnpjCpfDestinatario = altMatch ? altMatch[1] : '';
    }
  }
  
  // Se não encontrou, busca por padrões mais específicos no documento
  if (!cnpjEmitente) {
    // Busca por CNPJ seguido de números no formato brasileiro
    const cnpjMatches = texto.match(/CNPJ\s*:?\s*([\d\.\-\/]{14,18})/gi);
    if (cnpjMatches && cnpjMatches.length > 0) {
      // Pega o primeiro CNPJ encontrado
      const match = cnpjMatches[0].match(/CNPJ\s*:?\s*([\d\.\-\/]+)/i);
      cnpjEmitente = match ? match[1] : '';
    }
  }
  
  // Se ainda não encontrou, busca por qualquer sequência de CNPJ no início do documento
  if (!cnpjEmitente) {
    const cnpjMatch = texto.match(/^[\s\S]{0,2000}CNPJ\s*:?\s*([\d\.\-\/]+)/i);
    cnpjEmitente = cnpjMatch ? cnpjMatch[1] : '';
  }
  
  nomeFantasiaEmitente = cnpjEmitente ? buscarNomeFantasiaEmitente(cnpjEmitente) : '';

  // CNPJ/CPF do Destinatário/Remetente
  const destinatarioSectionOld = texto.match(/DESTINAT[AÁ]RIO[\s\S]{0,300}/i);
  let cnpjDestinatario = '';
  let nomeFantasiaDestinatario = '';
  if (destinatarioSectionOld) {
    const cnpjDestMatch = destinatarioSectionOld[0].match(/(?:CNPJ|CPF)\s*:?\s*([\d\.\-\/]+)/i);
    cnpjDestinatario = cnpjDestMatch ? cnpjDestMatch[1] : '';
    nomeFantasiaDestinatario = cnpjDestinatario ? buscarNomeFantasiaCliente(cnpjDestinatario) : '';
  }

  // Hora da Saída/Entrada (Hora da Emissão)
  let horaSaida = '';
  const horaSaidaMatches = [
    // Variações em caixa alta com ordem invertida
    texto.match(/HORA\s+ENTRADA\/SA[ÍI]DA[\s\n]*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/HORA\s+DA\s+ENTRADA\/SA[ÍI]DA[\s\n]*(\d{2}:\d{2}(?::\d{2})?)/i),
    // Variação original
    texto.match(/HORA\s+DA\s+SA[ÍI]DA\/ENTRADA[\s\n]*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:da )?Sa[íi]da\/Entrada\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:da )?Sa[íi]da\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:de )?Sa[íi]da\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:da )?Emiss[aã]o\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:de )?Entrada\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i)
  ];
  
  for (const match of horaSaidaMatches) {
    if (match) {
      horaSaida = match[1];
      // Garantir formato HH:MM:SS
      if (horaSaida.length === 5) {
        horaSaida += ':00';
      }
      break;
    }
  }

  // Data de Entrega - Calcular baseado na regra de hora da saída
  let dataEntrega = '';
  
  // Se temos data de emissão e hora da saída, calcular data de entrega
  if (dataEmissao && horaSaida) {
    try {
      // Converter data de emissão para objeto Date
      const [dia, mes, ano] = dataEmissao.split('.');
      const dataEmissaoObj = new Date(ano, mes - 1, dia);
      
      // Extrair hora da saída
      const [horas, minutos] = horaSaida.split(':').map(Number);
      
      // Aplicar regra: 00:00-16:59 = mesma data, 17:00-23:59 = dia seguinte
      if (horas >= 17 && horas <= 23) {
        // Adicionar 1 dia (dia seguinte)
        dataEmissaoObj.setDate(dataEmissaoObj.getDate() + 1);
      }
      // Se horas >= 0 && horas <= 16, mantém a mesma data (não adiciona nada)
      
      // Formatar data de entrega
      const diaEntrega = String(dataEmissaoObj.getDate()).padStart(2, '0');
      const mesEntrega = String(dataEmissaoObj.getMonth() + 1).padStart(2, '0');
      const anoEntrega = dataEmissaoObj.getFullYear();
      dataEntrega = `${diaEntrega}.${mesEntrega}.${anoEntrega}`;
      
    } catch (error) {
      console.error('Erro ao calcular data de entrega:', error);
      // Fallback: tentar extrair da nota
      const dataEntregaMatches = [
        texto.match(/Data (?:de |da )?Entrega\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
        texto.match(/Data (?:de |da )?Recebimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
        texto.match(/Entrega\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
        texto.match(/Recebimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i)
      ];
      
      for (const match of dataEntregaMatches) {
        if (match) {
          dataEntrega = `${match[1]}.${match[2]}.${match[3]}`;
          break;
        }
      }
    }
  } else {
    // Fallback: tentar extrair da nota
    const dataEntregaMatches = [
      texto.match(/Data (?:de |da )?Entrega\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      texto.match(/Data (?:de |da )?Recebimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      texto.match(/Entrega\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      texto.match(/Recebimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i)
    ];
    
    for (const match of dataEntregaMatches) {
      if (match) {
        dataEntrega = `${match[1]}.${match[2]}.${match[3]}`;
        break;
      }
    }
  }

  // Rede - buscar no clientes.json usando CNPJ/CPF do destinatário
  let rede = '';
  if (cnpjCpfDestinatario) {
    const cliente = buscarClientePorCNPJ(cnpjCpfDestinatario);
    if (cliente && cliente.rede) {
      rede = cliente.rede;
    }
  }
  
  // Se não encontrou no clientes.json, tentar extrair da nota
  if (!rede) {
    const redeMatches = [
      texto.match(/Rede\s*:?\s*([A-Za-z\s]+)/i),
      texto.match(/Rede\s+([A-Za-z\s]+)/i),
      texto.match(/REDE\s*:?\s*([A-Za-z\s]+)/i)
    ];
    
    for (const match of redeMatches) {
      if (match) {
        rede = match[1].trim().split(/\s+/).slice(0, 3).join(' '); // Limita a 3 palavras
        break;
      }
    }
  }

  // UF (Estado) - buscar no endereço do destinatário ou emitente
  let uf = '';
  const ufMatches = [
    texto.match(/UF\s*:?\s*([A-Z]{2})/i),
    texto.match(/Estado\s*:?\s*([A-Z]{2})/i),
    texto.match(/\b([A-Z]{2})\s*CEP/i), // UF antes do CEP
    texto.match(/CEP\s*[\d\.\-]+\s*([A-Z]{2})/i), // UF depois do CEP
    texto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)
  ];
  
  for (const match of ufMatches) {
    if (match) {
      uf = match[1].toUpperCase();
      break;
    }
  }

  // Vendedor - buscar no clientes.json usando CNPJ/CPF do destinatário
  let vendedor = '';
  if (cnpjCpfDestinatario) {
    const cliente = buscarClientePorCNPJ(cnpjCpfDestinatario);
    if (cliente && cliente.vendedor) {
      vendedor = cliente.vendedor;
    }
  }
  
  // Se não encontrou no clientes.json, tentar extrair da nota
  if (!vendedor) {
    const vendedorMatches = [
      texto.match(/Vendedor\s*:?\s*([A-Za-z\s]+)/i),
      texto.match(/Representante\s*:?\s*([A-Za-z\s]+)/i),
      texto.match(/Resp\.?\s*Vendas?\s*:?\s*([A-Za-z\s]+)/i),
      texto.match(/VENDEDOR\s*:?\s*([A-Za-z\s]+)/i)
    ];
    
    for (const match of vendedorMatches) {
      if (match) {
        vendedor = match[1].trim().split(/\s+/).slice(0, 3).join(' '); // Limita a 3 palavras
        break;
      }
    }
  }

  // CFOP (Código Fiscal de Operações e Prestações)
  let cfop = '';
  const cfopMatches = [
    texto.match(/CFOP\s*:?\s*(\d{4})/i),
    texto.match(/C\.F\.O\.P\.?\s*:?\s*(\d{4})/i),
    texto.match(/Código\s+Fiscal\s*:?\s*(\d{4})/i),
    texto.match(/\bCFOP\s+(\d{4})\b/i)
  ];
  
  for (const match of cfopMatches) {
    if (match) {
      cfop = match[1];
      break;
    }
  }

  // Natureza da Operação
  let naturezaOperacao = '';
  const naturezaMatches = [
    texto.match(/Natureza (?:da |de )?Opera[çc][aã]o\s*:?\s*([A-Za-z\s\-\/]+)/i),
    texto.match(/NATUREZA (?:DA |DE )?OPERA[ÇC][ÃA]O\s*:?\s*([A-Za-z\s\-\/]+)/i),
    texto.match(/Nat\.?\s*Opera[çc][aã]o\s*:?\s*([A-Za-z\s\-\/]+)/i),
    texto.match(/Opera[çc][aã]o\s*:?\s*([A-Za-z\s\-\/]+)/i)
  ];
  
  for (const match of naturezaMatches) {
    if (match) {
      naturezaOperacao = match[1].trim().split(/\s+/).slice(0, 2).join(' '); // Limita a 2 palavras conforme solicitado
      break;
    }
  }

  // Data de Vencimento (Fatura/Duplicata) - corrigindo formato para ISO (YYYY-MM-DD)
  const faturaSection = texto.match(/FATURA[\s\S]{0,200}|DUPLICATA[\s\S]{0,200}/i);
  let dataVencimento = '';
  if (faturaSection) {
    const vencMatch = faturaSection[0].match(/Venc\.?\s*:?\s*(\d{2})[\/-]?(\d{2})[\/-]?(\d{4})/i);
    if (vencMatch) {
      dataVencimento = `${vencMatch[3]}-${vencMatch[2]}-${vencMatch[1]}`;
    } else {
      // Fallback: procurar qualquer data dentro do bloco FATURA/DUPLICATA
      const anyDate = faturaSection[0].match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
      if (anyDate) {
        dataVencimento = `${anyDate[3]}-${anyDate[2]}-${anyDate[1]}`;
      }
    }
  }
  
  // Se não encontrou na seção de fatura, busca por padrões de vencimento no documento
  if (!dataVencimento) {
    // Busca por "Venc" seguido de data em vários formatos
    const vencMatches = [
      texto.match(/Venc\.?\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      texto.match(/Vencimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      texto.match(/Data\s+(?:de\s+)?Vencimento\s*:?\s*(\d{2})[\/-](\d{2})[\/-](\d{4})/i),
      // Formato sem separadores
      texto.match(/Venc\.?\s*:?\s*(\d{2})(\d{2})(\d{4})/i),
      texto.match(/Vencimento\s*:?\s*(\d{2})(\d{2})(\d{4})/i)
    ];
    
    for (const match of vencMatches) {
      if (match) {
        dataVencimento = `${match[3]}-${match[2]}-${match[1]}`;
        break;
      }
    }
  }

  // Se não encontrou Nome Fantasia na nota, busca no clientes.json usando o CNPJ/CPF
  if (!nomeFantasia && cnpjCpfDestinatario) {
    nomeFantasia = buscarNomeFantasiaCliente(cnpjCpfDestinatario);
  }

  // Valor Total da Nota - Melhorado para capturar diferentes formatos
  let valorTotal = '';
  
  // Array de padrões de busca para valor total, ordenados por prioridade
  const padroesBusca = [
    // Padrões específicos mais comuns
    /V\.\s*TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /VALOR\s+TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /V\.\s*TOTAL\s*[\n\r\s]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /VALOR\s+TOTAL\s*[\n\r\s]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    
    // Padrões mais genéricos
    /(?:TOTAL|V\.\s*TOTAL)\s*[:\-]?\s*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /(?:TOTAL|V\.\s*TOTAL)[^\d]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    
    // Padrões para formatos alternativos (sem pontos nos milhares)
    /V\.\s*TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]+,\d{2})/i,
    /VALOR\s+TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]+,\d{2})/i,
    /TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]+,\d{2})/i,
    
    // Padrões para valores com formato americano (ponto como decimal)
    /V\.\s*TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]{1,3}(?:,[0-9]{3})*\.\d{2})/i,
    /VALOR\s+TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9]{1,3}(?:,[0-9]{3})*\.\d{2})/i,
    
    // Padrões mais flexíveis para capturar valores em contextos diferentes
    /(?:TOTAL|VALOR).*?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i,
    /([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}).*?(?:TOTAL|VALOR)/i
  ];
  
  // Tenta cada padrão até encontrar um match
  for (const padrao of padroesBusca) {
    const match = texto.match(padrao);
    if (match && match[1]) {
      valorTotal = match[1].trim();
      console.log(`Valor total encontrado com padrão: ${padrao.source} -> ${valorTotal}`);
      break;
    }
  }
  
  // Se ainda não encontrou, tenta uma busca mais ampla por valores monetários
  if (!valorTotal) {
    // Busca por valores monetários próximos a palavras-chave relacionadas a total
    const textoLimpo = texto.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const segmentos = textoLimpo.split(/(?:TOTAL|VALOR|V\.)/i);
    
    for (let i = 1; i < segmentos.length; i++) {
      const segmento = segmentos[i];
      const valorMatch = segmento.match(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/);
      if (valorMatch) {
        valorTotal = valorMatch[1].trim();
        console.log(`Valor total encontrado por segmentação: ${valorTotal}`);
        break;
      }
    }
  }
  
  // Log para debug
  if (valorTotal) {
    console.log(`✅ Valor total extraído: ${valorTotal}`);
  } else {
    console.log('⚠️ Valor total não encontrado - verificar formato da nota fiscal');
    // Mostra uma amostra do texto para debug
    const amostra = texto.substring(0, 500).replace(/\n/g, ' ').replace(/\s+/g, ' ');
    console.log(`Amostra do texto: ${amostra}...`);
  }

  return { 
    numeroNF, 
    razaoSocial, 
    dataEmissao, 
    placa, 
    nomeFantasia,
    // Campos existentes
    cnpjEmitente,
    nomeFantasiaEmitente,
    cnpjDestinatario,
    nomeFantasiaDestinatario,
    cnpjCpfDestinatario,
    valorTotal,
    dataVencimento,
    // Novos campos solicitados
    horaSaida,
    dataEntrega,
    rede,
    uf,
    vendedor,
    cfop,
    naturezaOperacao
  };
}

// Função para buscar fretista pela placa
function buscarFretista(placa) {
  const fretistas = JSON.parse(fs.readFileSync(path.join(__dirname, 'fretistas.json')));
  const encontrado = fretistas.find(f => f.placa === placa);
  if (encontrado) return encontrado.fretista;
  const outro = fretistas.find(f => f.placa === 'OUTRA');
  return outro ? outro.fretista : 'TERCEIRO';
}

// Função para buscar cliente por CNPJ/CPF
function buscarClientePorCNPJ(cnpjCpf) {
  try {
    const cnpjCpfLimpo = cnpjCpf.replace(/[^\d]/g, '');
    const cliente = clientesData.find(c => c.cnpj.replace(/[^\d]/g, '') === cnpjCpfLimpo);
    return cliente || null;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }
}

// Novo endpoint para separar, extrair campos e renomear
app.post('/processar', upload.single('file'), async (req, res) => {
  try {
    console.log('=== INICIANDO PROCESSAMENTO DE PDF ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    
    console.log('Arquivo recebido:', req.file.originalname);
    
    // Usar o buffer do arquivo em memória
    const pdfBytes = req.file.buffer;
    const mime = (req.file.mimetype || '').toLowerCase()
    const header = pdfBytes && pdfBytes.slice(0, 5).toString()

    // Validação rápida de PDF
    if (!pdfBytes || !pdfBytes.length) {
      return res.status(400).json({ error: 'Arquivo vazio', details: 'O arquivo enviado não contém dados.' })
    }
    if (!mime.includes('pdf') || !String(header || '').includes('%PDF')) {
      return res.status(400).json({ error: 'Arquivo inválido', details: 'O arquivo enviado não parece ser um PDF válido.' })
    }
  
  // Gerar hash do arquivo para verificação de duplicatas
  const fileHash = generateFileHash(pdfBytes);
  
  let pdfDoc
  try {
    pdfDoc = await PDFDocument.load(pdfBytes)
  } catch (e) {
    console.error('Falha ao carregar PDF:', e)
    return res.status(400).json({ error: 'Falha ao interpretar PDF', details: e.message })
  }
  const numPages = pdfDoc.getPageCount();

  // Extrair texto de cada página e agrupar por NF
  const paginasPorNF = {};
  const textosPorNF = {};
  const validacoes = [];
  const duplicatas = [];
  
  for (let i = 0; i < numPages; i++) {
    const tempPdf = await PDFDocument.create();
    const [pagina] = await tempPdf.copyPages(pdfDoc, [i]);
    tempPdf.addPage(pagina);
    const tempPdfBytes = await tempPdf.save();
    const tempData = await pdfParse(tempPdfBytes);
    const texto = tempData.text;
    const numeroNF = extrairNumeroNF(texto) || `SEMNF_${i+1}`;
    if (!paginasPorNF[numeroNF]) {
      paginasPorNF[numeroNF] = [];
      textosPorNF[numeroNF] = [];
    }
    paginasPorNF[numeroNF].push(i);
    textosPorNF[numeroNF].push(texto);
  }

  // Gerar PDFs agrupados por NF, extrair campos e renomear
  const dadosCSV = [];
  let registrosSalvos = 0;
  
  for (const numeroNF in paginasPorNF) {
    try {
      const novoPdf = await PDFDocument.create();
      const indices = paginasPorNF[numeroNF];
      
      // Verificar se os índices são válidos
      const validIndices = indices.filter(index => index >= 0 && index < numPages);
      if (validIndices.length === 0) {
        console.warn(`Nenhum índice válido para NF ${numeroNF}`);
        continue;
      }
      
      const paginas = await novoPdf.copyPages(pdfDoc, validIndices);
      paginas.forEach(p => {
        if (p) {
          novoPdf.addPage(p);
        }
      });
      
      const novoPdfBytes = await novoPdf.save();

    // Extrair campos da nota (usa o texto da primeira página do grupo)
    const campos = extrairCamposNota(textosPorNF[numeroNF][0]);
    
    // Calcular campos automáticos
    const dataEntregaCalculada = calcularDataEntrega(campos.dataEmissao, campos.horaSaida);
    const diasAtraso = calcularDiasAtraso(campos.dataVencimento);
    const diasVencimento = calcularDiasVencimento(campos.dataVencimento);

    // Buscar fretista e nome fantasia antes de usar (Supabase com fallback)
    let fretista = '';
    try {
      fretista = await buscarFretistaSupabase(campos.placa);
    } catch (e) {
      console.error('Erro ao consultar fretista no Supabase em /processar:', e);
    }
    if (!fretista) {
      fretista = buscarFretista(campos.placa);
    }
    let nomeFantasiaCurto = '';
    
    // Primeiro tenta usar o nome fantasia extraído da nota
    if (campos.nomeFantasia && campos.nomeFantasia.trim()) {
      nomeFantasiaCurto = campos.nomeFantasia.split(/\s+/).slice(0,2).join(' ');
    }
    
    // Se não encontrou nome fantasia na nota, busca pelo CNPJ/CPF do destinatário
    if (!nomeFantasiaCurto && campos.cnpjCpfDestinatario) {
      console.log('Buscando nome fantasia para CNPJ/CPF:', campos.cnpjCpfDestinatario);
      const nomeFantasiaCliente = buscarNomeFantasiaCliente(campos.cnpjCpfDestinatario);
      console.log('Nome fantasia encontrado:', nomeFantasiaCliente);
      if (nomeFantasiaCliente) {
        nomeFantasiaCurto = nomeFantasiaCliente.split(/\s+/).slice(0,2).join(' ');
      }
    }

    // Consultar nome fantasia oficial no Supabase (preferencial)
    let nomeFantasiaOficial = '';
    if (campos.cnpjCpfDestinatario) {
      try {
        console.log('Consultando nome fantasia oficial no Supabase:', campos.cnpjCpfDestinatario);
        nomeFantasiaOficial = await buscarNomeFantasiaClienteDB(campos.cnpjCpfDestinatario);
      } catch (e) {
        console.error('Erro ao consultar nome fantasia no Supabase:', e.message);
      }
    }

    // Verificar duplicatas ANTES de salvar no Supabase
    const verificacaoDuplicata = await verificarDuplicata(
      campos.numeroNF,
      campos.cnpjEmitente,
      campos.dataEmissao,
      fileHash
    );

    if (verificacaoDuplicata.isDuplicata) {
      duplicatas.push({
        numeroNF: campos.numeroNF,
        tipo: verificacaoDuplicata.tipo,
        mensagem: verificacaoDuplicata.mensagem
      });

      console.log(`⚠️ Duplicata encontrada - NF ${campos.numeroNF}: ${verificacaoDuplicata.mensagem}`);
      
      // Se for duplicata de nota, apenas pula esta nota e continua com as demais
      continue;
    }

    // Registrar processamento se não for duplicata
    registrarProcessamento(
      campos.numeroNF, 
      campos.cnpjEmitente, 
      campos.dataEmissao, 
      fileHash
    );

    // Salvar registro individual no Supabase para cada nota
    let registroIndividual;
    try {
      // Calcular situação baseada na data de vencimento
      let situacao = 'Dentro do Prazo';
      if (campos.dataVencimento) {
        try {
          const [dia, mes, ano] = campos.dataVencimento.split('/');
          const dataVencimento = new Date(ano, mes - 1, dia);
          const hoje = new Date();
          const diffTime = dataVencimento - hoje;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 10 && diffDays >= 0) {
            situacao = 'Vencimento Próximo';
          }
        } catch (error) {
          console.error('Erro ao calcular situação:', error);
        }
      }

      registroIndividual = {
        // Dados da nota fiscal
        numero_nf: campos.numeroNF,
        cnpj_emitente: campos.cnpjEmitente || '',
        nome_fantasia_emitente: campos.nomeFantasiaEmitente || '',
        razao_social_emitente: buscarRazaoSocialEmitente(campos.cnpjEmitente || ''),
        data_emissao: campos.dataEmissao,
        hora_saida: campos.horaSaida || null,
        data_entrega: dataEntregaCalculada,
        
        // Dados do cliente
        cnpj_cpf_destinatario: campos.cnpjCpfDestinatario || campos.cnpjDestinatario || '',
        nome_fantasia: nomeFantasiaOficial || nomeFantasiaCurto || '',
        razao_social: campos.razaoSocial || '',
        
        // Dados comerciais
        rede: campos.rede || '',
        uf: campos.uf || '',
        vendedor: campos.vendedor || '',
        valor_total: campos.valorTotal ? parseFloat(campos.valorTotal.replace(/\./g, '').replace(',', '.')) || null : null,
        
        // Dados de transporte
        placa: campos.placa,
        fretista: fretista,
        
        // Dados fiscais
        data_vencimento: campos.dataVencimento || null,
        cfop: campos.cfop || '',
        natureza_operacao: campos.naturezaOperacao || '',
        
        // Status e controle
        situacao: situacao,
        status: 'PENDENTE'
      };

      // Inserir registro individual no Supabase
       console.log('Inserindo registro no Supabase...');
       const { data: registroSalvo, error: erroRegistro } = await supabase
         .from('registros')
         .insert([registroIndividual])
         .select();

       if (erroRegistro) {
         console.error('ERRO ao salvar registro individual no Supabase:', erroRegistro);
       } else {
         console.log(`✅ SUCESSO - Registro individual salvo para NF ${campos.numeroNF}:`, registroSalvo);
         
         // Salvar o ID do registro para atualizar o nome do arquivo depois
         registroIndividual.registro_id = registroSalvo[0]?.id;
         registrosSalvos++;

         // Acrescentar linha ao Google Sheets com os dados principais
         try {
           const sheetRow = {
             registro_id: registroIndividual.registro_id,
             usuario_id: 'dc580b23-da54-473e-9d4f-7741e0ba4378',
             numero_nf: registroIndividual.numero_nf,
             data_emissao: registroIndividual.data_emissao,
             data_vencimento: registroIndividual.data_vencimento,
             valor_total: registroIndividual.valor_total,
             cnpj_cpf_destinatario: registroIndividual.cnpj_cpf_destinatario,
             razao_social: registroIndividual.razao_social,
             nome_fantasia: registroIndividual.nome_fantasia,
             vendedor: registroIndividual.vendedor,
             rede: registroIndividual.rede,
             placa: registroIndividual.placa,
             fretista: registroIndividual.fretista,
             hora_saida: registroIndividual.hora_saida,
             data_entrega: registroIndividual.data_entrega,
             cfop: registroIndividual.cfop,
             natureza_operacao: registroIndividual.natureza_operacao,
             uf: registroIndividual.uf,
             cnpj_emitente: registroIndividual.cnpj_emitente,
             razao_social_emitente: registroIndividual.razao_social_emitente,
             nome_fantasia_emitente: registroIndividual.nome_fantasia_emitente,
             status: registroIndividual.status,
             situacao: registroIndividual.situacao,
             observacoes: 'Upload via /processar',
             created_at: new Date().toISOString(),
             url_upload: req.file?.originalname || ''
           }
           await appendRowToGoogleSheets(sheetRow)
           console.log('Linha adicionada ao Google Sheets para NF', registroIndividual.numero_nf)
         } catch (sheetsError) {
           console.error('Falha ao enviar linha ao Google Sheets (processar):', sheetsError)
         }
       }
     } catch (error) {
       console.error('Erro ao processar registro individual:', error);
     }
    
    // Validar natureza da operação - REJEITAR REGISTRO SE NÃO CONTÉM REVENDA OU VENDA
    if (!campos.naturezaOperacao || 
        (!campos.naturezaOperacao.toUpperCase().includes('REVENDA') && 
         !campos.naturezaOperacao.toUpperCase().includes('VENDA'))) {
      console.error(`❌ NATUREZA DA OPERAÇÃO INVÁLIDA - NF ${campos.numeroNF}: ${campos.naturezaOperacao || 'não encontrada'}`);
      validacoes.push({
        numeroNF: campos.numeroNF,
        tipo: 'NATUREZA_REJEITADA',
        erro: `Natureza da operação "${campos.naturezaOperacao || 'não encontrada'}" não contém REVENDA ou VENDA. Favor verificar a NF ${campos.numeroNF}.`,
        valor: campos.naturezaOperacao || 'não encontrada'
      });
      // Pular este registro - não processar
      continue;
    }
    
    // Validar CFOP se presente - REJEITAR REGISTRO SE INVÁLIDO
    if (campos.cfop) {
      const validacaoCFOP = validarCFOP(campos.cfop);
      if (!validacaoCFOP.valido) {
        console.error(`❌ CFOP INVÁLIDO - NF ${campos.numeroNF}: ${validacaoCFOP.erro}`);
        validacoes.push({
          numeroNF: campos.numeroNF,
          tipo: 'CFOP_REJEITADO',
          erro: `CFOP ${campos.cfop} não refere-se a uma nota fiscal de venda. ${validacaoCFOP.erro}. Favor verificar a NF ${campos.numeroNF}.`,
          valor: campos.cfop
        });
        // Pular este registro - não processar
        continue;
      }
    }
    // Se não tem CFOP, continua processando (CFOP é opcional)
    
    // Nome do arquivo com a nova ordem solicitada
    // Formato: NF - [Número] - [Emitente] - Emiss [Data] - [Nome Fantasia] - [Razão Social] - [Valor] - [Placa] - [Fretista] - Venc [Data]
    let nomeArquivo = `NF`;
    
    // 1. Adicionar número da NF
    nomeArquivo += ` - ${campos.numeroNF}`;
    
    // 2. Adicionar nome fantasia do emitente se disponível
    if (campos.nomeFantasiaEmitente) {
      nomeArquivo += ` - ${campos.nomeFantasiaEmitente}`;
    } else {
      nomeArquivo += ` - EXPORTACAO`;
    }
    
    // 3. Adicionar data de emissão se disponível
    if (campos.dataEmissao) {
      nomeArquivo += ` - Emiss ${campos.dataEmissao}`;
    }
    
    // 4. Adicionar nome fantasia (do destinatário/cliente)
    if (nomeFantasiaCurto) {
      nomeArquivo += ` - ${nomeFantasiaCurto}`;
    }
    
    // 5. Adicionar razão social
    nomeArquivo += ` - ${campos.razaoSocial}`;
    
    // 6. Adicionar valor total da nota
    if (campos.valorTotal) {
      nomeArquivo += ` - ${campos.valorTotal}`;
    }
    
  // 7. Adicionar placa e fretista
  nomeArquivo += ` - ${campos.placa} - ${fretista}`;
    
    // 8. Adicionar data de vencimento se disponível
    if (campos.dataVencimento) {
      nomeArquivo += ` - Venc ${campos.dataVencimento}`;
    }
    
    // Limpar caracteres inválidos e adicionar extensão
    nomeArquivo = nomeArquivo.replace(/[\\/:*?"<>|]/g, '');
    nomeArquivo = nomeArquivo.replace(/\s+/g, ' ').trim();
    
    // Adicionar ID do registro se foi salvo no Supabase
    if (registroIndividual.registro_id) {
      nomeArquivo += ` - ID${registroIndividual.registro_id}`;
    }
    
    nomeArquivo += '.pdf';
    
    // Criar PDF individual para esta nota fiscal específica
    const pdfIndividual = await PDFDocument.create();
    
    // Copiar apenas as páginas desta nota fiscal específica
    const paginasNota = paginasPorNF[numeroNF];
    
    // Verificar se temos páginas válidas
    if (!paginasNota || paginasNota.length === 0) {
      console.warn(`Nenhuma página encontrada para NF ${numeroNF}`);
      continue;
    }
    
    // Verificar se o pdfDoc ainda está válido
    if (!pdfDoc || pdfDoc.getPageCount() === 0) {
      console.error(`PDF documento inválido ou sem páginas`);
      continue;
    }
    
    for (const numeroPagina of paginasNota) {
      try {
        // Verificar se o número da página é válido (baseado em 0)
        if (numeroPagina < 0 || numeroPagina >= pdfDoc.getPageCount()) {
          console.warn(`Número de página inválido: ${numeroPagina} (total: ${pdfDoc.getPageCount()})`);
          continue;
        }
        
        const [paginaCopiada] = await pdfIndividual.copyPages(pdfDoc, [numeroPagina]);
        if (paginaCopiada) {
          pdfIndividual.addPage(paginaCopiada);
        }
      } catch (pageError) {
        console.error(`Erro ao copiar página ${numeroPagina}:`, pageError.message);
        continue;
      }
    }
    
    // Verificar se o PDF individual tem páginas antes de salvar
    if (pdfIndividual.getPageCount() === 0) {
      console.warn(`PDF individual para NF ${numeroNF} não tem páginas válidas, pulando...`);
      validacoes.push({
        numeroNF: numeroNF,
        tipo: 'ERRO_PROCESSAMENTO',
        erro: 'PDF individual não tem páginas válidas',
        aviso: 'Esta NF foi pulada devido a erro no processamento'
      });
      continue;
    }
    
    // Gerar bytes do PDF individual (apenas para dados CSV, não salvar arquivo)
    const pdfIndividualBytes = await pdfIndividual.save();

    // Salvar o PDF individual em disco para permitir download em ZIP
    try {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const outputPath = path.join(uploadDir, nomeArquivo);
      fs.writeFileSync(outputPath, pdfIndividualBytes);
    } catch (saveErr) {
      console.error('Erro ao salvar PDF individual em uploads:', saveErr);
      // Continua processamento; apenas impacta o ZIP
    }

    // Adicionar dados para o arquivo de exportação
    dadosCSV.push({
      'Nº NF': campos.numeroNF,
      'Nome Fantasia': nomeFantasiaOficial || nomeFantasiaCurto || 'N/A',
      'Data de Emissão': campos.dataEmissao,
      'Placa': campos.placa,
      'Fretista': fretista,
      'Razão Social': campos.razaoSocial,
      'Valor Total': campos.valorTotal || 'N/A',
      'Arquivo Gerado': nomeArquivo,
      // Novos campos solicitados
      'CNPJ Emitente': campos.cnpjEmitente,
      'Nome Fantasia Emitente': campos.nomeFantasiaEmitente,
      'CNPJ/CPF Destinatário': campos.cnpjDestinatario || campos.cnpjCpfDestinatario,
      'Nome Fantasia Destinatário': campos.nomeFantasiaDestinatario,
      'Nome Fantasia Consultado': (nomeFantasiaOficial && nomeFantasiaOficial.trim())
        ? 'Consultado no Supabase'
        : (nomeFantasiaCurto
           ? (campos.nomeFantasia && campos.nomeFantasia.trim() ? 'Extraído da Nota' : 'Consultado no clientes.json')
           : 'Não encontrado'),
      'Hora Emissão': campos.horaSaida,
      'Data Vencimento': campos.dataVencimento,
      'Hora Saída': campos.horaSaida,
      'Data Entrega': campos.dataEntrega,
      'Rede': campos.rede,
      'UF': campos.uf,
      'Vendedor': campos.vendedor,
      'CFOP': campos.cfop,
      'Natureza da Operação': campos.naturezaOperacao
    });
    
    } catch (error) {
      console.error(`Erro ao processar NF ${numeroNF}:`, error);
      // Continua processando as outras NFs mesmo se uma falhar
      validacoes.push({
        numeroNF: numeroNF,
        tipo: 'ERRO_PROCESSAMENTO',
        erro: `Erro ao processar NF: ${error.message}`,
        aviso: 'Esta NF foi pulada devido a erro no processamento'
      });
    }
  }

  // Manter um registro dos últimos dados gerados para exportação
  fs.writeFileSync(path.join(__dirname, 'uploads', 'last_processed_data.json'), JSON.stringify(dadosCSV, null, 2));

  // Salvar registros no Supabase
  try {
    const registrosParaSalvar = dadosCSV.map(item => {
      // Calcular situação baseada na data de vencimento
      let situacao = 'Dentro do Prazo';
      if (item['Data Vencimento']) {
        try {
          const [dia, mes, ano] = item['Data Vencimento'].split('.');
          const dataVencimento = new Date(ano, mes - 1, dia);
          const hoje = new Date();
          const diffTime = dataVencimento - hoje;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 10 && diffDays >= 0) {
            situacao = 'Vencimento Próximo';
          }
        } catch (error) {
          console.error('Erro ao calcular situação:', error);
        }
      }

      return {
         numero_nf: item['Nº NF'],
         nome_fantasia: item['Nome Fantasia'] !== 'N/A' ? item['Nome Fantasia'] : null,
         data_emissao: item['Data de Emissão'] || null,
         placa: item['Placa'],
         fretista: item['Fretista'],
         razao_social: item['Razão Social'],
         valor_total: item['Valor Total'] !== 'N/A' ? parseFloat(item['Valor Total']?.replace(/\./g, '').replace(',', '.')) || null : null,
         cnpj_emitente: item['CNPJ Emitente'],
         nome_fantasia_emitente: item['Nome Fantasia Emitente'],
         razao_social_emitente: buscarRazaoSocialEmitente(item['CNPJ Emitente'] || ''),
         cnpj_cpf_destinatario: item['CNPJ/CPF Destinatário'],
         data_vencimento: item['Data Vencimento'] || null,
         hora_saida: item['Hora Saída'] || null,
         data_entrega: (item['Data Entrega'] && item['Data Entrega'] !== 'NaN.NaN.NaN' && !item['Data Entrega'].includes('NaN')) ? 
           (() => {
             try {
               const [dia, mes, ano] = item['Data Entrega'].split('.');
               return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
             } catch (error) {
               console.error('Erro ao converter data_entrega:', error);
               return null;
             }
           })() : null,
         rede: item['Rede'],
         uf: item['UF'],
         vendedor: item['Vendedor'],
         cfop: item['CFOP'],
         natureza_operacao: item['Natureza da Operação'],
         situacao: situacao,
         usuario_id: 'dc580b23-da54-473e-9d4f-7741e0ba4378', // ID do usuário da tabela usuarios
         status: 'PENDENTE'
       };
    });

    if (registrosParaSalvar.length > 0) {
      console.log('Salvando registros em lote no Supabase:', registrosParaSalvar.length, 'registros');
      
      // Verificar duplicatas antes de inserir em lote (apenas por número da NF)
      const duplicatasEncontradas = [];
      const registrosUnicos = [];
      
      for (const registro of registrosParaSalvar) {
        const { data: notaExistente } = await supabase
          .from('registros')
          .select('numero_nf')
          .eq('numero_nf', registro.numero_nf)
          .single();
          
        if (notaExistente) {
          duplicatasEncontradas.push({
            numeroNF: registro.numero_nf,
            mensagem: `Nota fiscal ${registro.numero_nf} já foi registrada`
          });
        } else {
          registrosUnicos.push(registro);
        }
      }
      
      // Inserir apenas registros únicos
      if (registrosUnicos.length > 0) {
        const { data, error } = await supabase
          .from('registros')
          .insert(registrosUnicos);
          
        if (error) {
          console.error('Erro ao salvar no Supabase:', error);
          return res.status(500).json({ error: 'Erro ao salvar dados' });
        }
        
        console.log('Registros salvos com sucesso:', registrosUnicos.length);
      }
      
      // Retornar informações sobre duplicatas se houver
      if (duplicatasEncontradas.length > 0) {
        return res.json({
          message: `Processamento concluído. ${registrosUnicos.length} registros salvos, ${duplicatasEncontradas.length} duplicatas ignoradas.`,
          registrosSalvos: registrosUnicos.length,
          duplicatas: duplicatasEncontradas
        });
      }

    } else {
      console.log('Nenhum registro para salvar no Supabase');
    }
  } catch (error) {
    console.error('Erro ao processar dados para Supabase:', error);
    // Não interrompe o processamento, apenas loga o erro
  }

  // Preparar resposta com validações e duplicatas
  const response = {
    message: 'Processamento concluído!',
    totalProcessados: registrosSalvos,
    validacoes: validacoes.length > 0 ? validacoes : undefined,
    duplicatas: duplicatas.length > 0 ? duplicatas : undefined,
    resumo: {
      sucessos: registrosSalvos,
      validacoes: validacoes.length,
      duplicatas: duplicatas.length
    }
  };

  res.json(response);
} catch (error) {
  console.error('Erro no processamento:', error);
  
  // Limpar arquivo temporário se existir
  if (req.file && req.file.path) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.error('Erro ao remover arquivo temporário:', unlinkError);
    }
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor durante o processamento',
    details: error.message 
  });
}
});

// Novo endpoint: processar múltiplos PDFs em lote
app.post('/processar-multiplos', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
    }

    let totalRegistrosSalvos = 0
    let totalDuplicatas = 0
    let totalValidacoes = 0
    const resultados = []
    const dadosCSV = []

    for (const file of req.files) {
      const originalname = file.originalname || 'arquivo.pdf'
      const pdfBytes = file.buffer
      const mime = (file.mimetype || '').toLowerCase()
      const header = pdfBytes && pdfBytes.slice(0,5).toString()

      // Validações básicas do PDF
      if (!pdfBytes || !pdfBytes.length) {
        resultados.push({ arquivo: originalname, erro: 'Arquivo vazio', registrosSalvos: 0, duplicatas: [], validacoes: [] })
        continue
      }
      if (!mime.includes('pdf') || !String(header || '').includes('%PDF')) {
        resultados.push({ arquivo: originalname, erro: 'Arquivo inválido (não é PDF)', registrosSalvos: 0, duplicatas: [], validacoes: [] })
        continue
      }

      const fileHash = generateFileHash(pdfBytes)
      let pdfDoc
      try {
        pdfDoc = await PDFDocument.load(pdfBytes)
      } catch (e) {
        resultados.push({ arquivo: originalname, erro: `Falha ao interpretar PDF: ${e.message}` , registrosSalvos: 0, duplicatas: [], validacoes: [] })
        continue
      }

      const numPages = pdfDoc.getPageCount()
      const paginasPorNF = {}
      const textosPorNF = {}
      const validacoes = []
      const duplicatas = []
      let registrosSalvos = 0

      // Extrair texto por página e agrupar por NF
      for (let i = 0; i < numPages; i++) {
        const tempPdf = await PDFDocument.create()
        const [pagina] = await tempPdf.copyPages(pdfDoc, [i])
        tempPdf.addPage(pagina)
        const tempPdfBytes = await tempPdf.save()
        const tempData = await pdfParse(tempPdfBytes)
        const texto = tempData.text
        const numeroNF = extrairNumeroNF(texto) || `SEMNF_${i+1}`
        if (!paginasPorNF[numeroNF]) {
          paginasPorNF[numeroNF] = []
          textosPorNF[numeroNF] = []
        }
        paginasPorNF[numeroNF].push(i)
        textosPorNF[numeroNF].push(texto)
      }

      // Processar por NF (salvar registros individuais no Supabase)
      for (const numeroNF in paginasPorNF) {
        try {
          const campos = extrairCamposNota(textosPorNF[numeroNF][0])

          const dataEntregaCalculada = calcularDataEntrega(campos.dataEmissao, campos.horaSaida)
          // Dias de atraso/vencimento calculados se necessário
          calcularDiasAtraso(campos.dataVencimento)
          calcularDiasVencimento(campos.dataVencimento)

          // Buscar fretista e nome fantasia
          let fretista = ''
          try {
            fretista = await buscarFretistaSupabase(campos.placa)
          } catch (e) {
            console.error('Erro ao consultar fretista no Supabase em /processar-multiplos:', e)
          }
          if (!fretista) {
            fretista = buscarFretista(campos.placa)
          }

          let nomeFantasiaCurto = ''
          if (campos.nomeFantasia && campos.nomeFantasia.trim()) {
            nomeFantasiaCurto = campos.nomeFantasia.split(/\s+/).slice(0,2).join(' ')
          }
          if (!nomeFantasiaCurto && campos.cnpjCpfDestinatario) {
            const nomeFantasiaCliente = buscarNomeFantasiaCliente(campos.cnpjCpfDestinatario)
            if (nomeFantasiaCliente) {
              nomeFantasiaCurto = nomeFantasiaCliente.split(/\s+/).slice(0,2).join(' ')
            }
          }

          let nomeFantasiaOficial = ''
          if (campos.cnpjCpfDestinatario) {
            try {
              nomeFantasiaOficial = await buscarNomeFantasiaClienteDB(campos.cnpjCpfDestinatario)
            } catch (e) {
              console.error('Erro ao consultar nome fantasia no Supabase:', e.message)
            }
          }

          // Verificar duplicatas ANTES de salvar no Supabase
          const verificacaoDuplicata = await verificarDuplicata(
            campos.numeroNF,
            campos.cnpjEmitente,
            campos.dataEmissao,
            fileHash
          )

          if (verificacaoDuplicata.isDuplicata) {
            duplicatas.push({
              numeroNF: campos.numeroNF,
              tipo: verificacaoDuplicata.tipo,
              mensagem: verificacaoDuplicata.mensagem
            })
            console.log(`⚠️ Duplicata encontrada - NF ${campos.numeroNF}: ${verificacaoDuplicata.mensagem}`)
            continue
          }

          // Registrar processamento
          registrarProcessamento(
            campos.numeroNF,
            campos.cnpjEmitente,
            campos.dataEmissao,
            fileHash
          )

          // Montar registro individual
          try {
            let situacao = 'Dentro do Prazo'
            if (campos.dataVencimento) {
              try {
                const [dia, mes, ano] = campos.dataVencimento.split('/')
                const dataVenc = new Date(ano, mes - 1, dia)
                const hoje = new Date()
                const diffTime = dataVenc - hoje
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (diffDays <= 10 && diffDays >= 0) situacao = 'Vencimento Próximo'
              } catch (error) {
                console.error('Erro ao calcular situação:', error)
              }
            }

            const registroIndividual = {
              numero_nf: campos.numeroNF,
              cnpj_emitente: campos.cnpjEmitente || '',
              nome_fantasia_emitente: campos.nomeFantasiaEmitente || '',
              razao_social_emitente: buscarRazaoSocialEmitente(campos.cnpjEmitente || ''),
              data_emissao: campos.dataEmissao,
              hora_saida: campos.horaSaida || null,
              data_entrega: dataEntregaCalculada,
              cnpj_cpf_destinatario: campos.cnpjCpfDestinatario || campos.cnpjDestinatario || '',
              nome_fantasia: nomeFantasiaOficial || nomeFantasiaCurto || '',
              razao_social: campos.razaoSocial || '',
              rede: campos.rede || '',
              uf: campos.uf || '',
              vendedor: campos.vendedor || '',
              valor_total: campos.valorTotal ? parseFloat(campos.valorTotal.replace(/\./g, '').replace(',', '.')) || null : null,
              placa: campos.placa,
              fretista: fretista,
              data_vencimento: campos.dataVencimento || null,
              cfop: campos.cfop || '',
              natureza_operacao: campos.naturezaOperacao || '',
              situacao: situacao,
              status: 'PENDENTE'
            }

            const { data: registroSalvo, error: erroRegistro } = await supabase
              .from('registros')
              .insert([registroIndividual])
              .select()

            if (erroRegistro) {
              console.error('ERRO ao salvar registro individual no Supabase:', erroRegistro)
            } else {
              registrosSalvos++
              // Acrescentar linha ao Google Sheets
              try {
                const sheetRow = {
                  registro_id: registroSalvo[0]?.id,
                  usuario_id: 'dc580b23-da54-473e-9d4f-7741e0ba4378',
                  numero_nf: registroIndividual.numero_nf,
                  data_emissao: registroIndividual.data_emissao,
                  data_vencimento: registroIndividual.data_vencimento,
                  valor_total: registroIndividual.valor_total,
                  cnpj_cpf_destinatario: registroIndividual.cnpj_cpf_destinatario,
                  razao_social: registroIndividual.razao_social,
                  nome_fantasia: registroIndividual.nome_fantasia,
                  vendedor: registroIndividual.vendedor,
                  rede: registroIndividual.rede,
                  placa: registroIndividual.placa,
                  fretista: registroIndividual.fretista,
                  hora_saida: registroIndividual.hora_saida,
                  data_entrega: registroIndividual.data_entrega,
                  cfop: registroIndividual.cfop,
                  natureza_operacao: registroIndividual.natureza_operacao,
                  uf: registroIndividual.uf,
                  cnpj_emitente: registroIndividual.cnpj_emitente,
                  razao_social_emitente: registroIndividual.razao_social_emitente,
                  nome_fantasia_emitente: registroIndividual.nome_fantasia_emitente,
                  status: registroIndividual.status,
                  situacao: registroIndividual.situacao,
                  observacoes: 'Upload via /processar-multiplos',
                  created_at: new Date().toISOString(),
                  url_upload: originalname
                }
                await appendRowToGoogleSheets(sheetRow)
              } catch (sheetsError) {
                console.error('Falha ao enviar linha ao Google Sheets (processar-multiplos):', sheetsError)
              }
            }
          } catch (error) {
            console.error('Erro ao processar registro individual:', error)
          }

          // Validações (mesmo padrão do /processar)
          if (!campos.naturezaOperacao || (!campos.naturezaOperacao.toUpperCase().includes('REVENDA') && !campos.naturezaOperacao.toUpperCase().includes('VENDA'))) {
            validacoes.push({
              numeroNF: campos.numeroNF,
              tipo: 'NATUREZA_REJEITADA',
              erro: `Natureza da operação "${campos.naturezaOperacao || 'não encontrada'}" não contém REVENDA ou VENDA. Favor verificar a NF ${campos.numeroNF}.`,
              valor: campos.naturezaOperacao || 'não encontrada'
            })
            continue
          }
          if (campos.cfop) {
            const validacaoCFOP = validarCFOP(campos.cfop)
            if (!validacaoCFOP.valido) {
              validacoes.push({
                numeroNF: campos.numeroNF,
                tipo: 'CFOP_REJEITADO',
                erro: `CFOP ${campos.cfop} não refere-se a uma nota fiscal de venda. ${validacaoCFOP.erro}. Favor verificar a NF ${campos.numeroNF}.`,
                valor: campos.cfop
              })
              continue
            }
          }

          // Construir nome do arquivo, replicando lógica do endpoint único
          let nomeArquivo = `NF`
          nomeArquivo += ` - ${campos.numeroNF}`
          if (campos.nomeFantasiaEmitente) {
            nomeArquivo += ` - ${campos.nomeFantasiaEmitente}`
          } else {
            nomeArquivo += ` - EXPORTACAO`
          }
          if (campos.dataEmissao) {
            nomeArquivo += ` - Emiss ${campos.dataEmissao}`
          }
          if (nomeFantasiaCurto) {
            nomeArquivo += ` - ${nomeFantasiaCurto}`
          }
          nomeArquivo += ` - ${campos.razaoSocial}`
          if (campos.valorTotal) {
            nomeArquivo += ` - ${campos.valorTotal}`
          }
          nomeArquivo += ` - ${campos.placa} - ${fretista}`
          if (campos.dataVencimento) {
            nomeArquivo += ` - Venc ${campos.dataVencimento}`
          }
          nomeArquivo = nomeArquivo.replace(/[\\/:*?"<>|]/g, '')
          nomeArquivo = nomeArquivo.replace(/\s+/g, ' ').trim()
          nomeArquivo += '.pdf'

          // Criar e salvar PDF individual para esta NF
          const pdfIndividual = await PDFDocument.create()
          const paginasNota = paginasPorNF[numeroNF]
          if (paginasNota && paginasNota.length > 0) {
            for (const numeroPagina of paginasNota) {
              try {
                const [paginaCopiada] = await pdfIndividual.copyPages(pdfDoc, [numeroPagina])
                if (paginaCopiada) pdfIndividual.addPage(paginaCopiada)
              } catch (pageErr) {
                console.error(`Erro ao copiar página ${numeroPagina}:`, pageErr.message)
              }
            }
          }
          if (pdfIndividual.getPageCount() > 0) {
            try {
              const pdfBytesInd = await pdfIndividual.save()
              const uploadDir = path.join(__dirname, 'uploads')
              if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
              fs.writeFileSync(path.join(uploadDir, nomeArquivo), pdfBytesInd)
            } catch (saveErr) {
              console.error('Erro ao salvar PDF individual (processar-multiplos):', saveErr)
            }
          } else {
            console.warn(`PDF individual para NF ${numeroNF} não tem páginas válidas, pulando...`)
          }

          // Adicionar linha para exportação (Excel/ZIP)
          dadosCSV.push({
            'Nº NF': campos.numeroNF,
            'Nome Fantasia': nomeFantasiaOficial || nomeFantasiaCurto || 'N/A',
            'Data de Emissão': campos.dataEmissao,
            'Placa': campos.placa,
            'Fretista': fretista,
            'Razão Social': campos.razaoSocial,
            'Valor Total': campos.valorTotal || 'N/A',
            'Arquivo Gerado': nomeArquivo,
            'CNPJ Emitente': campos.cnpjEmitente,
            'Nome Fantasia Emitente': campos.nomeFantasiaEmitente,
            'CNPJ/CPF Destinatário': campos.cnpjDestinatario || campos.cnpjCpfDestinatario,
            'Nome Fantasia Destinatário': campos.nomeFantasiaDestinatario,
            'Nome Fantasia Consultado': (nomeFantasiaOficial && nomeFantasiaOficial.trim())
              ? 'Consultado no Supabase'
              : (nomeFantasiaCurto
                 ? (campos.nomeFantasia && campos.nomeFantasia.trim() ? 'Extraído da Nota' : 'Consultado no clientes.json')
                 : 'Não encontrado'),
            'Hora Emissão': campos.horaSaida,
            'Data Vencimento': campos.dataVencimento,
            'Hora Saída': campos.horaSaida,
            'Data Entrega': campos.dataEntrega,
            'Rede': campos.rede,
            'UF': campos.uf,
            'Vendedor': campos.vendedor,
            'CFOP': campos.cfop,
            'Natureza da Operação': campos.naturezaOperacao
          })
        } catch (error) {
          console.error(`Erro ao processar NF ${numeroNF}:`, error)
          validacoes.push({
            numeroNF: numeroNF,
            tipo: 'ERRO_PROCESSAMENTO',
            erro: `Erro ao processar NF: ${error.message}`,
            aviso: 'Esta NF foi pulada devido a erro no processamento'
          })
        }
      }

      resultados.push({
        arquivo: originalname,
        registrosSalvos,
        duplicatas,
        validacoes
      })
      totalRegistrosSalvos += registrosSalvos
      totalDuplicatas += duplicatas.length
      totalValidacoes += validacoes.length
    }

    // Persistir últimos dados processados para permitir downloads
    try {
      const uploadDir = path.join(__dirname, 'uploads')
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
      fs.writeFileSync(path.join(uploadDir, 'last_processed_data.json'), JSON.stringify(dadosCSV, null, 2))
    } catch (persistErr) {
      console.error('Erro ao salvar last_processed_data.json (processar-multiplos):', persistErr)
    }

    return res.json({
      message: 'Processamento concluído!',
      totalArquivos: req.files.length,
      totalRegistrosSalvos,
      totalDuplicatas,
      totalValidacoes,
      resultados
    })
  } catch (error) {
    console.error('Erro no processamento em lote:', error)
    return res.status(500).json({ error: 'Erro interno do servidor durante o processamento em lote', details: error.message })
  }
})

// Endpoint para buscar fretista pela placa
app.get('/fretista/:placa', (req, res) => {
  const placa = req.params.placa.toUpperCase();
  const fretistas = JSON.parse(fs.readFileSync(path.join(__dirname, 'fretistas.json')));
  const encontrado = fretistas.find(f => f.placa === placa);
  if (encontrado) {
    res.json({ fretista: encontrado.fretista });
  } else {
    const outro = fretistas.find(f => f.placa === 'OUTRA');
    res.json({ fretista: outro ? outro.fretista : 'TERCEIRO' });
  }
});

// Função para calcular dias de atraso
function calcularDiasAtraso(dataVencimento) {
  if (!dataVencimento) return 0;
  
  try {
    // Converter formato DD.MM.YYYY para Date
    const [dia, mes, ano] = dataVencimento.split('.');
    const vencimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    
    // Zerar horas para comparação apenas de datas
    vencimento.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = hoje - vencimento;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    console.error('Erro ao calcular dias de atraso:', error);
    return 0;
  }
}

// Função para calcular dias até vencimento
function calcularDiasVencimento(dataVencimento) {
  if (!dataVencimento) return 0;
  
  try {
    // Converter formato DD.MM.YYYY para Date
    const [dia, mes, ano] = dataVencimento.split('.');
    const vencimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    
    // Zerar horas para comparação apenas de datas
    vencimento.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    console.error('Erro ao calcular dias até vencimento:', error);
    return 0;
  }
}

// Função para calcular dias desde a emissão (atraso por emissão)
function calcularDiasAtrasoPorEmissao(dataEmissao) {
  if (!dataEmissao) return 0
  try {
    let emissao
    if (dataEmissao.includes('-')) {
      // Formato ISO (YYYY-MM-DD)
      emissao = new Date(dataEmissao)
    } else if (dataEmissao.includes('/')) {
      // Formato BR (DD/MM/YYYY)
      const [dia, mes, ano] = dataEmissao.split('/')
      emissao = new Date(ano, mes - 1, dia)
    } else if (dataEmissao.includes('.')) {
      // Formato antigo (DD.MM.YYYY)
      const [dia, mes, ano] = dataEmissao.split('.')
      emissao = new Date(ano, mes - 1, dia)
    } else {
      emissao = new Date(dataEmissao)
    }

    const hoje = new Date()
    emissao.setHours(0,0,0,0)
    hoje.setHours(0,0,0,0)
    const diffTime = hoje - emissao
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  } catch (error) {
    console.error('Erro ao calcular dias por emissão:', error)
    return 0
  }
}

// Função para calcular data de entrega baseada na hora de saída
function calcularDataEntrega(dataEmissao, horaSaida) {
  if (!dataEmissao) return '';
  
  try {
    // Verificar se a data está no formato ISO (YYYY-MM-DD) ou no formato antigo (DD.MM.YYYY)
    let emissao;
    if (dataEmissao.includes('-')) {
      // Formato ISO (YYYY-MM-DD)
      emissao = new Date(dataEmissao);
    } else {
      // Formato antigo (DD.MM.YYYY)
      const [dia, mes, ano] = dataEmissao.split('.');
      emissao = new Date(ano, mes - 1, dia);
    }
    
    let dataEntrega = new Date(emissao);
    
    // Se temos hora de saída, aplicar a regra específica
    if (horaSaida) {
      const [horas] = horaSaida.split(':').map(Number);
      
      // Regra: 00:00-16:59 = mesma data, 17:00-23:59 = dia seguinte
      if (horas >= 17 && horas <= 23) {
        dataEntrega.setDate(dataEntrega.getDate() + 1);
      }
      // Se horas >= 0 && horas <= 16, mantém a mesma data
    } else {
      // Se não tem hora de saída, usar regra padrão (3 dias úteis)
      let diasAdicionados = 0;
      while (diasAdicionados < 3) {
        dataEntrega.setDate(dataEntrega.getDate() + 1);
        
        // Verificar se é dia útil (segunda a sexta)
        const diaSemana = dataEntrega.getDay();
        if (diaSemana >= 1 && diaSemana <= 5) {
          diasAdicionados++;
        }
      }
    }
    
    // Retornar no formato ISO (YYYY-MM-DD)
    return dataEntrega.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao calcular data de entrega:', error);
    return '';
  }
}

// Endpoint para registro individual de nota fiscal
app.post('/registrar-nota', async (req, res) => {
  try {
    const {
      // Campos obrigatórios conforme promptnew.txt
      nome_usuario,
      email_usuario,
      tipo_usuario,
      numero_nf,
      cnpj_emitente,
      nome_emitente,
      data_emissao,
      hora_saida,
      cnpj_cliente,
      nome_fantasia,
      razao_social,
      rede,
      uf,
      vendedor,
      valor,
      placa,
      data_vencimento,
      cfop,
      natureza_operacao,
      situacao,
      status,
      observacao,
      pefin
    } = req.body;

    // Validações obrigatórias
    if (!numero_nf || !cnpj_emitente || !data_emissao || !cnpj_cliente || !placa) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: número_nf, cnpj_emitente, data_emissao, cnpj_cliente, placa' 
      });
    }

    // Verificar se a nota fiscal já existe no banco de dados (apenas por número da NF)
    const { data: notaExistente, error: errorVerificacao } = await supabase
      .from('registros')
      .select('numero_nf')
      .eq('numero_nf', numero_nf)
      .single();

    if (notaExistente) {
      return res.status(409).json({
        error: 'Nota fiscal duplicada',
        message: `A nota fiscal ${numero_nf} já foi registrada e não pode ser duplicada.`
      });
    }

    // Ignorar erro se não encontrar registro (é o comportamento esperado para notas novas)
    if (errorVerificacao && errorVerificacao.code !== 'PGRST116') {
      console.error('Erro ao verificar duplicata:', errorVerificacao);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Buscar fretista pela placa (prioriza Supabase, fallback para arquivo local)
    let fretista = '';
    try {
      fretista = await buscarFretistaSupabase(placa);
    } catch (e) {
      console.error('Falha ao consultar fretista no Supabase, tentando fallback local:', e);
    }
    if (!fretista) {
      fretista = buscarFretista(placa);
    }

    // Buscar nome fantasia padronizado na tabela 'clientes' do Supabase
    let nomeFantasiaFinal = '';
    if (cnpj_cliente) {
      nomeFantasiaFinal = await buscarNomeFantasiaClienteDB(cnpj_cliente);
    }
    // Se ainda não encontrar, usar o que veio no payload
    if (!nomeFantasiaFinal) {
      nomeFantasiaFinal = nome_fantasia || '';
    }

    // Calcular campos automáticos
    const dataEntregaCalculada = calcularDataEntrega(data_emissao, hora_saida);
    const diasAtrasoEmissao = calcularDiasAtrasoPorEmissao(data_emissao);
    const diasVencimento = calcularDiasVencimento(data_vencimento);

    // Calcular situação baseada na data de emissão conforme regra
    let situacaoCalculada = 'Dentro do Prazo';
    if (diasAtrasoEmissao >= 7) {
      situacaoCalculada = `${diasAtrasoEmissao} Dias de Atraso`;
    }

    // Preparar dados para inserção
    const registro = {
      // Identificação do usuário
      nome_usuario: nome_usuario || 'Sistema',
      email_usuario: email_usuario || 'sistema@app.com',
      tipo_usuario: tipo_usuario || 'Operador',
      
      // Dados da nota fiscal
      numero_nf,
      cnpj_emitente,
      nome_emitente: nome_emitente || '',
      nome_fantasia_emitente: nome_emitente || '',
      razao_social_emitente: buscarRazaoSocialEmitente(cnpj_emitente || ''),
      data_emissao,
      hora_saida: hora_saida || null,
      data_entrega: dataEntregaCalculada,
      
      // Dados do cliente
      cnpj_cpf_destinatario: cnpj_cliente,
      nome_fantasia: nomeFantasiaFinal || '',
      razao_social: razao_social || '',
      
      // Dados comerciais
      rede: rede || '',
      uf: uf || '',
      vendedor: vendedor || '',
      valor_total: valor ? parseFloat(valor.toString().replace(/\./g, '').replace(',', '.')) : null,
      
      // Dados de transporte
      placa,
      fretista,
      
      // Dados fiscais
      data_vencimento: data_vencimento || null,
      cfop: cfop || '',
      natureza_operacao: natureza_operacao || '',
      
      // Status e controle
      situacao: situacaoCalculada,
      status: status || 'Emitida',
      dias_atraso: diasAtrasoEmissao,
      dias_vencimento: diasVencimento,
      observacao: observacao || ''
      ,
      // Campo financeiro/pefin
      pefin: pefin || null
    };

    // Inserir no Supabase
    const { data, error } = await supabase
      .from('registros')
      .insert([registro])
      .select();

    if (error) {
      console.error('Erro ao salvar registro no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar registro no banco de dados',
        details: error.message 
      });
    }

    // Enviar linha ao Google Sheets (não bloquear resposta em caso de falha)
    try {
      const sheetRow = {
        registro_id: data?.[0]?.id,
        usuario_id: 'dc580b23-da54-473e-9d4f-7741e0ba4378',
        numero_nf: registro.numero_nf,
        data_emissao: registro.data_emissao,
        data_vencimento: registro.data_vencimento,
        valor_total: registro.valor_total,
        cnpj_cpf_destinatario: registro.cnpj_cpf_destinatario,
        razao_social: registro.razao_social,
        nome_fantasia: registro.nome_fantasia,
        vendedor: registro.vendedor,
        rede: registro.rede,
        placa: registro.placa,
        fretista: registro.fretista,
        hora_saida: registro.hora_saida,
        data_entrega: registro.data_entrega,
        cfop: registro.cfop,
        natureza_operacao: registro.natureza_operacao,
        uf: registro.uf,
        cnpj_emitente: registro.cnpj_emitente,
        razao_social_emitente: registro.razao_social_emitente,
        nome_fantasia_emitente: registro.nome_fantasia_emitente,
        status: registro.status,
        situacao: registro.situacao,
        observacoes: registro.observacao || '',
        created_at: new Date().toISOString()
      }
      await appendRowToGoogleSheets(sheetRow)
      console.log('Linha adicionada ao Google Sheets para NF', registro.numero_nf)
    } catch (sheetsError) {
      console.error('Falha ao enviar linha ao Google Sheets:', sheetsError)
    }

    res.json({
      success: true,
      message: 'Registro salvo com sucesso',
      data: data[0],
      calculados: {
        data_entrega: dataEntregaCalculada,
        dias_atraso: diasAtrasoEmissao,
        dias_vencimento: diasVencimento,
        fretista: fretista,
        nome_fantasia_consultado: nomeFantasiaFinal !== nome_fantasia
      }
    });

  } catch (error) {
    console.error('Erro no endpoint registrar-nota:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint para download do CSV
app.get('/download-csv', (req, res) => {
  const csvPath = path.join(__dirname, 'uploads', 'notas_extraidas.csv');
  if (fs.existsSync(csvPath)) {
    res.download(csvPath);
  } else {
    res.status(404).json({ error: 'Arquivo CSV não encontrado.' });
  }
});

// Novo endpoint para download do EXCEL
app.get('/download-excel', async (req, res) => {
  const dataPath = path.join(__dirname, 'uploads', 'last_processed_data.json');
  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ error: 'Nenhum dado processado encontrado. Processe um arquivo primeiro.' });
  }

  const data = JSON.parse(fs.readFileSync(dataPath));
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Notas Fiscais');

  worksheet.columns = [
    { header: 'Nº NF', key: 'Nº NF', width: 15 },
    { header: 'Nome Fantasia', key: 'Nome Fantasia', width: 30 },
    { header: 'Data de Emissão', key: 'Data de Emissão', width: 20 },
    { header: 'Placa', key: 'Placa', width: 15 },
    { header: 'Fretista', key: 'Fretista', width: 20 },
    { header: 'Razão Social', key: 'Razão Social', width: 30 },
    { header: 'Arquivo Gerado', key: 'Arquivo Gerado', width: 50 },
    // Novas colunas
    { header: 'CNPJ Emitente', key: 'CNPJ Emitente', width: 20 },
    { header: 'Nome Fantasia Emitente', key: 'Nome Fantasia Emitente', width: 30 },
    { header: 'CNPJ/CPF Destinatário', key: 'CNPJ/CPF Destinatário', width: 20 },
    { header: 'Nome Fantasia Destinatário', key: 'Nome Fantasia Destinatário', width: 30 },
    { header: 'Hora Emissão', key: 'Hora Emissão', width: 15 },
    { header: 'Data Vencimento', key: 'Data Vencimento', width: 20 },
    { header: 'Hora Saída', key: 'Hora Saída', width: 15 },
    { header: 'Data Entrega', key: 'Data Entrega', width: 20 },
    { header: 'Rede', key: 'Rede', width: 20 },
    { header: 'UF', key: 'UF', width: 10 },
    { header: 'Vendedor', key: 'Vendedor', width: 25 },
    { header: 'CFOP', key: 'CFOP', width: 15 },
    { header: 'Natureza da Operação', key: 'Natureza da Operação', width: 35 },
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern:'solid',
    fgColor:{argb:'1A472A'}
  };

  worksheet.addRows(data);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=' + 'Relatorio_Notas_Fiscais.xlsx');
  
  await workbook.xlsx.write(res);
  res.end();
});

// Endpoint para download do ZIP
app.get('/download-zip', (req, res) => {
  const dataPath = path.join(__dirname, 'uploads', 'last_processed_data.json');
  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ error: 'Nenhum dado processado encontrado. Processe um arquivo primeiro.' });
  }

  const data = JSON.parse(fs.readFileSync(dataPath));
  const filesToZip = data.map(item => item['Arquivo Gerado']);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=Notas_Fiscais.zip');

  const archive = archiver('zip', {
    zlib: { level: 9 } // Nível máximo de compressão
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  filesToZip.forEach(filename => {
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filename });
    }
  });

  archive.finalize();
});

// Endpoint para dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    // Extrair filtros da query string
    const {
      dateFrom,
      dateTo,
      period,
      fretista,
      placa,
      cliente,
      rede,
      vendedor,
      uf,
      status,
      situacao,
      searchText
    } = req.query

    // Construir query base
    let query = supabase.from('registros').select('*')
    
    // Aplicar filtros
    if (dateFrom) {
      query = query.gte('data_emissao', dateFrom)
    }
    if (dateTo) {
      query = query.lte('data_emissao', dateTo)
    }
    if (fretista) {
      query = query.eq('fretista', fretista)
    }
    if (placa) {
      query = query.eq('placa', placa)
    }
    if (cliente) {
      query = query.eq('nome_fantasia', cliente)
    }
    if (rede) {
      query = query.eq('rede', rede)
    }
    if (vendedor) {
      query = query.eq('vendedor', vendedor)
    }
    if (uf) {
      query = query.eq('uf', uf)
    }
    if (status) {
      query = query.eq('status', status.toUpperCase())
    }
    if (situacao) {
      query = query.eq('situacao', situacao)
    }
    
    // Filtro de texto livre (busca em múltiplos campos)
    if (searchText) {
      query = query.or(`numero_nf.ilike.%${searchText}%,nome_fantasia.ilike.%${searchText}%,razao_social.ilike.%${searchText}%,fretista.ilike.%${searchText}%,placa.ilike.%${searchText}%,vendedor.ilike.%${searchText}%`)
    }
    
    // Buscar dados reais do Supabase
    const { data: registros, error: registrosError } = await query
    
    if (registrosError) {
      console.error('Erro ao buscar registros:', registrosError)
      return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' })
    }

    // Calcular estatísticas baseadas nos requisitos do promptnew.txt
    const totalNotas = registros.length
    const notasEntregues = registros.filter(r => r.status === 'ENTREGUE').length
    const notasPendentes = registros.filter(r => r.status === 'PENDENTE').length
    const notasCanceladas = registros.filter(r => r.status === 'CANCELADA').length
    const notasDevolvidas = registros.filter(r => r.status === 'DEVOLVIDA').length
    
    // Calcular eficiência conforme solicitado: PENDENTE / total de notas emitidas
    const eficiencia = totalNotas > 0 ? Math.round((notasPendentes / totalNotas) * 100) : 0
    
    // Valor pendente (soma dos valores das notas pendentes)
    const valorPendente = registros
      .filter(r => r.status === 'PENDENTE')
      .reduce((sum, registro) => sum + (parseFloat(registro.valor_total) || 0), 0)
    
    // Notas atrasadas (+7 dias)
    const hoje = new Date()
    const notasAtrasadas = registros.filter(registro => {
      if (registro.status !== 'PENDENTE' || !registro.data_emissao) return false
      const dataEmissao = new Date(registro.data_emissao)
      const diasAtraso = Math.floor((hoje - dataEmissao) / (1000 * 60 * 60 * 24))
      return diasAtraso > 7
    }).length

    // Notas de hoje
    const notasHoje = registros.filter(registro => {
      const hojeStr = hoje.toISOString().split('T')[0]
      return registro.data_emissao && registro.data_emissao.startsWith(hojeStr)
    }).length

    // Buscar fretistas únicos ativos
    const fretistasUnicos = [...new Set(registros.map(r => r.fretista).filter(Boolean))]
    const fretistasAtivos = fretistasUnicos.length

    // Arquivos recentes (últimos 10 registros)
    const recentFiles = registros
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(registro => ({
        id: registro.id,
        nome: `NF ${registro.numero_nf}`,
        data: registro.data_emissao,
        status: registro.status || 'PENDENTE'
      }))
    
    // Calculate additional dashboard data
    const vencimentosProximos = await supabase
      .from('registros')
      .select('nome_fantasia, numero_nf, valor_total, fretista, placa, data_emissao, hora_saida, data_entrega, data_vencimento, status')
      .eq('status', 'PENDENTE')
      .not('data_vencimento', 'is', null)
      .order('data_vencimento', { ascending: true })
      .limit(30)

    const resumoMensal = {
      notasProcessadas: totalNotas,
      valorTotal: valorPendente,
      taxaEntrega: totalNotas > 0 ? Math.round((notasEntregues / totalNotas) * 100) : 0,
      fretistasAtivos: fretistasAtivos
    }

    const alertas = []
    if (notasAtrasadas > 0) {
      alertas.push({
        tipo: 'aviso',
        titulo: 'Notas Atrasadas',
        mensagem: `${notasAtrasadas} notas estão atrasadas há mais de 7 dias`
      })
    }
    if (notasPendentes > totalNotas * 0.8) {
      alertas.push({
        tipo: 'erro',
        titulo: 'Alto Volume Pendente',
        mensagem: 'Mais de 80% das notas estão pendentes'
      })
    }

    // Process vencimentos próximos data
    const vencimentosProcessados = vencimentosProximos.data ? await Promise.all(
      vencimentosProximos.data.map(async (item) => {
        const vencimento = new Date(item.data_vencimento)
        const hojeLocal = new Date()
        const diasRestantes = Math.ceil((vencimento - hojeLocal) / (1000 * 60 * 60 * 24))

        let fretistaFinal = item.fretista || ''
        if (!fretistaFinal && item.placa) {
          try {
            fretistaFinal = await buscarFretistaSupabase(item.placa)
          } catch (e) {
            fretistaFinal = ''
          }
          if (!fretistaFinal) {
            fretistaFinal = buscarFretista(item.placa) || ''
          }
        }

        const dataEntregaFinal = item.data_entrega || calcularDataEntrega(item.data_emissao, item.hora_saida)

        return {
          cliente: item.nome_fantasia,
          numeroNota: item.numero_nf,
          valor: parseFloat(item.valor_total) || 0,
          fretista: fretistaFinal,
          dataEntrega: dataEntregaFinal || '',
          vencimento: item.data_vencimento,
          diasRestantes: diasRestantes,
          status: item.status
        }
      })
    ) : []

    // Top 30 Maiores Atrasos (por emissão)
    const { data: registrosParaAtrasos, error: errosAtrasos } = await supabase
      .from('registros')
      .select('nome_fantasia, numero_nf, valor_total, fretista, placa, data_entrega, data_emissao, hora_saida, status')

    if (errosAtrasos) {
      console.error('Erro ao buscar registros para atrasos:', errosAtrasos)
    }

    const atrasosTop = (registrosParaAtrasos || [])
      .map((item) => {
        const diasAtraso = calcularDiasAtrasoPorEmissao(item.data_emissao)
        const situacaoItem = diasAtraso >= 7 ? `${diasAtraso} Dias de Atraso` : 'Dentro do Prazo'

        let fretistaFinal = item.fretista || ''
        if (!fretistaFinal && item.placa) {
          try {
            fretistaFinal = buscarFretista(item.placa) || ''
          } catch { /* noop */ }
        }

        const dataEntregaFinal = item.data_entrega || calcularDataEntrega(item.data_emissao, item.hora_saida)

        return {
          cliente: item.nome_fantasia,
          numeroNota: item.numero_nf,
          valor: parseFloat(item.valor_total) || 0,
          fretista: fretistaFinal,
          dataEntrega: dataEntregaFinal || '',
          emissao: item.data_emissao,
          diasAtraso,
          situacao: situacaoItem,
          status: item.status || 'PENDENTE'
        }
      })
      .filter(r => r.diasAtraso >= 7)
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 30)

    res.json({
    totalNotas,
    notasEntregues,
    notasPendentes,
    notasCanceladas,
    notasDevolvidas,
    eficiencia,
    valorPendente,
    notasAtrasadas,
    fretistasAtivos,
    notasHoje,
    vencimentosProximos: vencimentosProcessados,
    atrasosTop,
    resumoMensal,
    alertas
  })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para opções de filtros dinâmicos
app.get('/api/dashboard/filter-options', async (req, res) => {
  try {
    // Buscar todas as opções únicas para os filtros
    const { data: registros, error } = await supabase
      .from('registros')
      .select('fretista, placa, nome_fantasia, rede, vendedor, uf, status, situacao')
    
    if (error) {
      console.error('Erro ao buscar opções de filtros:', error)
      return res.status(500).json({ error: 'Erro ao buscar opções de filtros' })
    }

    // Extrair valores únicos para cada filtro
    const fretistas = [...new Set(registros.map(r => r.fretista).filter(Boolean))].sort()
    const placas = [...new Set(registros.map(r => r.placa).filter(Boolean))].sort()
    const clientes = [...new Set(registros.map(r => r.nome_fantasia).filter(Boolean))].sort()
    const redes = [...new Set(registros.map(r => r.rede).filter(Boolean))].sort()
    const vendedores = [...new Set(registros.map(r => r.vendedor).filter(Boolean))].sort()
    const ufs = [...new Set(registros.map(r => r.uf).filter(Boolean))].sort()
    const statusList = [...new Set(registros.map(r => r.status).filter(Boolean))].sort()
    const situacoes = [...new Set(registros.map(r => r.situacao).filter(Boolean))].sort()

    res.json({
      fretistas,
      placas,
      clientes,
      redes,
      vendedores,
      ufs,
      status: statusList,
      situacoes
    })
  } catch (error) {
    console.error('Erro ao buscar opções de filtros:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para registros
app.get('/api/registros', async (req, res) => {
  try {
    // Buscar registros reais do Supabase
    const { data: registros, error } = await supabase
      .from('registros')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar registros:', error)
      return res.status(500).json({ error: 'Erro ao buscar registros' })
    }
    // Preencher/normalizar nome_fantasia a partir da tabela clientes (join por CNPJ)
    const registrosArr = Array.isArray(registros) ? registros : []
    const cnpjsSet = new Set(
      registrosArr
        .map(r => (r.cnpj_cpf_destinatario || '').replace(/[^\d]/g, ''))
        .filter(Boolean)
    )

    if (cnpjsSet.size > 0) {
      const cnpjs = Array.from(cnpjsSet)
      const { data: clientesJoin, error: joinError } = await supabase
        .from('clientes')
        .select('cnpj, nome_fantasia, razao_social')
        .in('cnpj', cnpjs)

      if (joinError) {
        console.error('Erro ao buscar clientes para join:', joinError)
      } else {
        const clientesMap = new Map(
          (clientesJoin || []).map(c => [String(c.cnpj).replace(/[^\d]/g, ''), c])
        )

        for (const r of registrosArr) {
          const cnpjKey = (r.cnpj_cpf_destinatario || '').replace(/[^\d]/g, '')
          const cli = clientesMap.get(cnpjKey)
          if (cli) {
            // Preferir nome_fantasia do clientes; fallback para o existente ou razão social
            r.nome_fantasia = cli.nome_fantasia || r.nome_fantasia || cli.razao_social || r.razao_social || r.nome_fantasia
            // Opcional: garantir campo auxiliar 'cliente' para relatórios existentes
            if (!r.cliente) {
              r.cliente = r.nome_fantasia || cli.razao_social || ''
            }
          }
        }
      }
    }

    res.json(registrosArr)
  } catch (error) {
    console.error('Erro ao buscar registros:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para sincronizar campo pefin baseado no vencimento quando vazio
app.post('/api/registros/sync-pefin', async (req, res) => {
  try {
    const { data: registros, error } = await supabase
      .from('registros')
      .select('id, pefin, data_vencimento')

    if (error) {
      console.error('Erro ao listar registros para sincronização:', error)
      return res.status(500).json({ error: 'Falha ao listar registros', details: error.message })
    }

    const hoje = new Date()
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const msPerDay = 24 * 60 * 60 * 1000

    let atualizados = 0
    for (const r of registros || []) {
      const atual = r.pefin && String(r.pefin).trim()
      if (atual) continue

      let novoPefin = null
      if (r.data_vencimento) {
        try {
          let dv
          if (typeof r.data_vencimento === 'string' && r.data_vencimento.includes('/')) {
            const [dia, mes, ano] = r.data_vencimento.split('/')
            dv = new Date(ano, mes - 1, dia)
          } else {
            dv = new Date(r.data_vencimento)
          }
          const diffDays = Math.floor((startOfDay(dv) - startOfDay(hoje)) / msPerDay)
          if (diffDays < 0) novoPefin = 'Vencido'
          else if (diffDays === 0) novoPefin = 'Vence hoje'
          else if (diffDays <= 7) novoPefin = `Vence em ${diffDays}d`
          else novoPefin = 'Em dia'
        } catch (e) {
          // ignora erros de parse
        }
      }

      if (novoPefin) {
        const { error: upErr } = await supabase
          .from('registros')
          .update({ pefin: novoPefin })
          .eq('id', r.id)
        if (!upErr) atualizados++
      }
    }

    return res.json({ message: 'Sincronização concluída', atualizados })
  } catch (e) {
    console.error('Erro ao sincronizar pefin:', e)
    return res.status(500).json({ error: 'Erro ao sincronizar pefin', details: e.message })
  }
})

// Endpoint para atualizar um registro
app.put('/api/registros/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Campos permitidos para edição
    const allowed = [
      'status',
      'situacao',
      'pefin',
      'data_entrega',
      'valor_total',
      'fretista',
      'placa',
      'observacoes'
    ]

    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    )

    // Normaliza o status para valores permitidos pelo banco
    if (typeof updateData.status === 'string') {
      const STATUS_MAP_DB = {
        'Pendente': 'PENDENTE',
        'pendente': 'PENDENTE',
        'PENDENTE': 'PENDENTE',
        'Entregue': 'ENTREGUE',
        'entregue': 'ENTREGUE',
        'ENTREGUE': 'ENTREGUE',
        'Cancelada': 'CANCELADO',
        'cancelada': 'CANCELADO',
        'CANCELADA': 'CANCELADO',
        'Cancelado': 'CANCELADO',
        'cancelado': 'CANCELADO',
        'CANCELADO': 'CANCELADO',
        'Processado': 'PROCESSADO',
        'processado': 'PROCESSADO',
        'PROCESSADO': 'PROCESSADO'
      }

      const originalStatus = updateData.status
      const normalized = STATUS_MAP_DB[originalStatus] || 'PROCESSADO'
      updateData.status = normalized

      // Se o status original não for suportado, registra observação para rastreio
      if (!STATUS_MAP_DB[originalStatus]) {
        const stamp = new Date().toISOString()
        const prevObs = updateData.observacoes || ''
        const prefix = prevObs ? prevObs + '\n' : ''
        updateData.observacoes = `${prefix}[${stamp}] status_custom: ${originalStatus}`
      }
    }

    // Buscar o registro atual para obter a placa se necessário
    const { data: existing, error: fetchErr } = await supabase
      .from('registros')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.error('Erro ao obter registro existente:', fetchErr)
      return res.status(500).json({ error: 'Falha ao ler registro existente' })
    }

    // Se houver alteração ou presença de placa, resolver fretista pela tabela 'fretistas'
    const placaFinal = updateData.placa || existing?.placa
    if (placaFinal) {
      try {
        const nomeFretista = await buscarFretistaSupabase(placaFinal)
        if (nomeFretista) {
          updateData.fretista = nomeFretista
        }
      } catch (e) {
        console.error('Falha ao resolver fretista via Supabase durante update:', e)
      }
    }

    // Marcar atualização
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('registros')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar registro:', error)
      return res.status(500).json({ error: 'Erro ao atualizar registro', details: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Registro não encontrado' })
    }

    res.json({ success: true, data })
  } catch (error) {
    console.error('Erro no endpoint de atualização de registro:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para estatísticas de relatórios
app.get('/api/relatorios/estatisticas', async (req, res) => {
  try {
    // Buscar dados de registros para estatísticas
    const { data: registros, error } = await supabase
      .from('registros')
      .select('*')
    
    if (error) {
      console.error('Erro ao buscar dados para estatísticas:', error)
      return res.status(500).json({ error: 'Erro ao buscar dados de estatísticas' })
    }

    // Calcular estatísticas
    const totalRegistros = registros.length
    const valorTotal = registros.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0)
    const entregasCompletas = registros.filter(r => r.status === 'Entregue').length
    const entregasPendentes = registros.filter(r => r.status === 'Pendente').length
    
    // Estatísticas por fretista
    const fretistas = [...new Set(registros.map(r => r.fretista).filter(Boolean))]
    
    const estatisticas = {
      vendas: {
        total: valorTotal,
        variacao: 12.5, // Calcular baseado em período anterior
        meta: valorTotal * 1.2,
        pedidos: totalRegistros
      },
      entregas: {
        total: totalRegistros,
        concluidas: entregasCompletas,
        pendentes: entregasPendentes,
        taxa_sucesso: totalRegistros > 0 ? Math.round((entregasCompletas / totalRegistros) * 100) : 0
      },
      financeiro: {
        receita: valorTotal,
        custos: valorTotal * 0.7,
        lucro: valorTotal * 0.3,
        margem: 30
      },
      usuarios: {
        ativos: fretistas.length,
        novos: Math.floor(fretistas.length * 0.15),
        fretistas: fretistas.length,
        empresas: [...new Set(registros.map(r => r.nome_fantasia).filter(Boolean))].length
      }
    }
    
    res.json(estatisticas)
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para dados de vendas por período
app.get('/api/relatorios/vendas', async (req, res) => {
  try {
    const { inicio, fim } = req.query
    
    let query = supabase.from('registros').select('*')
    
    if (inicio && fim) {
      query = query.gte('data_emissao', inicio).lte('data_emissao', fim)
    }
    
    const { data: registros, error } = await query
    
    if (error) {
      console.error('Erro ao buscar dados de vendas:', error)
      return res.status(500).json({ error: 'Erro ao buscar dados de vendas' })
    }

    // Agrupar por mês
    const vendasPorMes = registros.reduce((acc, registro) => {
      const mes = registro.data_emissao ? registro.data_emissao.substring(0, 7) : 'Sem data'
      if (!acc[mes]) {
        acc[mes] = { valor: 0, pedidos: 0 }
      }
      acc[mes].valor += parseFloat(registro.valor_total) || 0
      acc[mes].pedidos++
      return acc
    }, {})
    
    // Converter para array ordenado
    const vendas = Object.entries(vendasPorMes)
      .map(([mes, dados]) => ({
        mes: mes,
        valor: dados.valor,
        pedidos: dados.pedidos
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
    
    res.json(vendas)
  } catch (error) {
    console.error('Erro ao buscar dados de vendas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para gerar relatório personalizado
app.post('/api/relatorios/gerar', async (req, res) => {
  try {
    const { tipo, dataInicio, dataFim, formato } = req.body
    
    let query = supabase.from('registros').select('*')
    
    if (dataInicio && dataFim) {
      query = query.gte('data_emissao', dataInicio).lte('data_emissao', dataFim)
    }
    
    const { data: registros, error } = await query
    
    if (error) {
      console.error('Erro ao gerar relatório:', error)
      return res.status(500).json({ error: 'Erro ao gerar relatório' })
    }

    let relatorio = {}
    
    switch (tipo) {
      case 'vendas':
        relatorio = {
          tipo: 'vendas',
          periodo: { inicio: dataInicio, fim: dataFim },
          dados: registros.map(r => ({
            numero_nf: r.numero_nf,
            cliente: r.nome_fantasia,
            valor_total: r.valor_total,
            data_emissao: r.data_emissao,
            status: r.status
          })),
          resumo: {
            total_registros: registros.length,
            valor_total: registros.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0),
            media_valor: registros.length > 0 ? registros.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0) / registros.length : 0
          }
        }
        break
      
      case 'entregas':
        relatorio = {
          tipo: 'entregas',
          periodo: { inicio: dataInicio, fim: dataFim },
          dados: registros.map(r => ({
            numero_nf: r.numero_nf,
            fretista: r.fretista,
            cliente: r.nome_fantasia,
            status: r.status,
            data_entrega: r.data_entrega,
            dias_atraso: r.dias_atraso
          })),
          resumo: {
            total_entregas: registros.length,
            entregues: registros.filter(r => r.status === 'Entregue').length,
            pendentes: registros.filter(r => r.status === 'Pendente').length,
            atrasadas: registros.filter(r => r.dias_atraso > 0).length
          }
        }
        break
      
      default:
        relatorio = {
          tipo: 'geral',
          periodo: { inicio: dataInicio, fim: dataFim },
          dados: registros,
          resumo: {
            total_registros: registros.length,
            valor_total: registros.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0),
            por_status: registros.reduce((acc, r) => {
              acc[r.status] = (acc[r.status] || 0) + 1
              return acc
            }, {})
          }
        }
    }
    
    res.json(relatorio)
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para exportar relatório
app.post('/api/relatorios/exportar', async (req, res) => {
  try {
    const { tipo, dataInicio, dataFim, formato, fretista, placa, cliente, status, ordenacao } = req.body
    
    let query = supabase.from('registros').select('*')
    
    if (dataInicio && dataFim) {
      query = query.gte('data_emissao', dataInicio).lte('data_emissao', dataFim)
    }

    // Filtros adicionais opcionais para refletir a visualização do frontend
    if (fretista) {
      query = query.eq('fretista', fretista)
    }
    if (placa) {
      query = query.eq('placa', placa)
    }
    if (cliente) {
      query = query.eq('nome_fantasia', cliente)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Ordenação opcional (padrão por nome_fantasia e numero_nf)
    const ordens = String(ordenacao || 'nome_fantasia,numero_nf').split(',').map(s => s.trim()).filter(Boolean)
    for (const campo of ordens) {
      query = query.order(campo, { ascending: true })
    }

    const { data: registros, error } = await query
    
    if (error) {
      console.error('Erro ao exportar relatório:', error)
      return res.status(500).json({ error: 'Erro ao exportar relatório' })
    }

    if (formato === 'csv') {
      // Gerar CSV
      const csvHeaders = 'Numero NF,Cliente,Fretista,Valor Total,Data Emissao,Status,Data Entrega,Dias Atraso\n'
      const csvData = registros.map(r => 
        `${r.numero_nf || ''},${r.nome_fantasia || ''},${r.fretista || ''},${r.valor_total || ''},${r.data_emissao || ''},${r.status || ''},${r.data_entrega || ''},${r.dias_atraso || ''}`
      ).join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csvHeaders + csvData)
      
    } else if (formato === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.json`)
      res.json(registros)
      
    } else if (formato === 'pdf') {
      // Gerar PDF simples com lista de registros
      try {
        const pdfDoc = await PDFDocument.create()
        let page = pdfDoc.addPage([595, 842]) // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const { width, height } = page.getSize()
        const marginX = 40
        let cursorY = height - 50

        // Cabeçalho
        const titulo = `Relatório ${tipo || ''}`.trim()
        page.drawText(titulo || 'Relatório', { x: marginX, y: cursorY, size: 14, font, color: rgb(0, 0.4, 0) })
        cursorY -= 18
        const periodoTxt = `Período: ${dataInicio || '-'} até ${dataFim || '-'}`
        page.drawText(periodoTxt, { x: marginX, y: cursorY, size: 10, font })
        cursorY -= 22

        // Colunas
        const headers = ['NF', 'Cliente', 'Fretista', 'Valor', 'Emissão', 'Status']
        const colX = [marginX, marginX + 70, marginX + 250, marginX + 420, marginX + 480, marginX + 520]
        headers.forEach((h, i) => page.drawText(h, { x: colX[i], y: cursorY, size: 9, font }))
        cursorY -= 12
        page.drawText(''.padEnd(540, '—'), { x: marginX, y: cursorY, size: 9, font })
        cursorY -= 12

        const fmt = (v) => (v == null ? '' : String(v))
        for (const r of registros) {
          const line = [
            fmt(r.numero_nf),
            fmt(r.nome_fantasia || r.cliente),
            fmt(r.fretista),
            fmt(r.valor_total),
            fmt(r.data_emissao),
            fmt(r.status || r.situacao)
          ]

          // Nova página quando necessário
          if (cursorY < 60) {
            page = pdfDoc.addPage([595, 842])
            cursorY = height - 50
          }

          line.forEach((text, i) => {
            const clipped = text.length > 28 && i === 1 ? text.slice(0, 28) + '…' : text
            page.drawText(clipped, { x: colX[i], y: cursorY, size: 9, font })
          })
          cursorY -= 12
        }

        const pdfBytes = await pdfDoc.save()
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo || 'geral'}_${new Date().toISOString().split('T')[0]}.pdf`)
        return res.send(Buffer.from(pdfBytes))
      } catch (errPdf) {
        console.error('Erro ao gerar PDF:', errPdf)
        return res.status(500).json({ error: 'Falha ao gerar PDF' })
      }
    } else {
      // Para Excel (ou outros), retornar dados JSON para processamento no frontend
      res.json({
        dados: registros,
        formato: formato,
        tipo: tipo,
        periodo: { inicio: dataInicio, fim: dataFim }
      })
    }
    
  } catch (error) {
    console.error('Erro ao exportar relatório:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para relatórios
app.get('/api/relatorios', async (req, res) => {
  try {
    // Buscar dados de registros para gerar relatórios
    const { data: registros, error } = await supabase
      .from('registros')
      .select('*')
    
    if (error) {
      console.error('Erro ao buscar dados para relatórios:', error)
      return res.status(500).json({ error: 'Erro ao buscar dados de relatórios' })
    }

    // Processar dados para relatórios
    const relatorios = {
      porPeriodo: registros.reduce((acc, registro) => {
        const mes = registro.data_emissao ? registro.data_emissao.substring(0, 7) : 'Sem data'
        if (!acc[mes]) acc[mes] = { count: 0, valor: 0 }
        acc[mes].count++
        acc[mes].valor += parseFloat(registro.valor_total) || 0
        return acc
      }, {}),
      porFretista: registros.reduce((acc, registro) => {
        const fretista = registro.fretista || 'Sem fretista'
        if (!acc[fretista]) acc[fretista] = { count: 0, valor: 0 }
        acc[fretista].count++
        acc[fretista].valor += parseFloat(registro.valor_total) || 0
        return acc
      }, {}),
      porCliente: registros.reduce((acc, registro) => {
        const cliente = registro.cliente || 'Sem cliente'
        if (!acc[cliente]) acc[cliente] = { count: 0, valor: 0 }
        acc[cliente].count++
        acc[cliente].valor += parseFloat(registro.valor_total) || 0
        return acc
      }, {})
    }
    
    res.json(relatorios)
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    // Buscar usuários reais do Supabase
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('data_criacao', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar usuários:', error)
      return res.status(500).json({ error: 'Erro ao buscar usuários' })
    }
    
    res.json(usuarios || [])
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para importar clientes via CSV e fazer upsert por CNPJ
// Body esperado: { "path": "C:\\Users\\BAMG\\Desktop\\appnf\\listaclientesatualizada.csv" }
app.post('/api/clientes/import', async (req, res) => {
  try {
    const { path: csvPath } = req.body || {}

    if (!csvPath) {
      return res.status(400).json({ error: 'Informe o caminho do arquivo CSV em "path".' })
    }

    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: `Arquivo CSV não encontrado em: ${csvPath}` })
    }

    // Função para normalizar cabeçalhos
    const normalizeKey = (str) =>
      String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')

    const KEY_MAP = {
      cnpj: 'cnpj',
      cnpj_cpf: 'cnpj',
      cpf: 'cnpj',
      razao_social: 'razao_social',
      nome_fantasia: 'nome_fantasia',
      rede: 'rede',
      uf: 'uf',
      vendedor: 'vendedor',
      codigo: 'codigo',
      loja: 'loja',
      endereco: 'endereco',
      bairro: 'bairro',
      municipio: 'municipio',
      municipio_cidade: 'municipio',
      cidade: 'municipio',
      cep: 'cep'
    }

    const batchSize = 500
    let currentBatchMap = new Map() // cnpj -> cliente
    let totalRows = 0
    let insertedOrUpdated = 0
    let skipped = 0
    let firstError = null

    const flushBatch = async () => {
      const currentBatch = Array.from(currentBatchMap.values())
      if (currentBatch.length === 0) return
      const { error } = await supabase
        .from('clientes')
        .upsert(currentBatch, { onConflict: 'cnpj' })
      if (error) {
        console.error('Erro ao upsert lote de clientes:', error)
        if (!firstError) firstError = error
        throw error
      }
      insertedOrUpdated += currentBatch.length
      currentBatchMap.clear()
    }

    // Stream do CSV com delimitador ;
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvPath).pipe(csv({ separator: ';', mapHeaders: ({ header }) => normalizeKey(header) }))
        .on('data', (row) => {
          try {
            totalRows++
            // Mapear para chaves esperadas
            const mapped = {}
            for (const [rawKey, value] of Object.entries(row)) {
              const key = KEY_MAP[rawKey] || rawKey
              mapped[key] = typeof value === 'string' ? value.trim() : value
            }

            // Limpar CNPJ/CPF
            const cnpj = (mapped.cnpj || '').replace(/[^\d]/g, '')
            if (!cnpj) {
              skipped++
              return
            }

            const cliente = {
              cnpj,
              razao_social: mapped.razao_social || null,
              nome_fantasia: mapped.nome_fantasia || null,
              rede: mapped.rede || null,
              uf: mapped.uf || null,
              vendedor: mapped.vendedor || null,
              codigo: mapped.codigo || null,
              loja: mapped.loja || null,
              endereco: mapped.endereco || null,
              bairro: mapped.bairro || null,
              municipio: mapped.municipio || null,
              cep: mapped.cep || null
            }

            // Em caso de duplicatas no mesmo lote, mantenha o último registro
            currentBatchMap.set(cnpj, cliente)
            if (currentBatchMap.size >= batchSize) {
              // Pausar stream e flush
              stream.pause()
              flushBatch()
                .then(() => stream.resume())
                .catch(reject)
            }
          } catch (err) {
            console.error('Erro ao processar linha do CSV:', err)
            if (!firstError) firstError = err
          }
        })
        .on('end', async () => {
          try {
            await flushBatch()
            resolve()
          } catch (err) {
            reject(err)
          }
        })
        .on('error', (err) => {
          reject(err)
        })
    })

    res.json({
      success: true,
      message: 'Importação concluída com upsert por CNPJ',
      arquivo: csvPath,
      total_linhas: totalRows,
      inseridos_atualizados: insertedOrUpdated,
      ignorados_sem_cnpj: skipped,
      primeiro_erro: firstError ? firstError.message : null
    })
  } catch (error) {
    console.error('Erro no endpoint de importação de clientes:', error)
    res.status(500).json({ error: 'Falha na importação de clientes', details: error.message })
  }
})

// Dashboard chart endpoints
app.get('/api/dashboard/evolution', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('created_at')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by month for evolution chart
    const monthlyData = {}
    data.forEach(record => {
      const date = new Date(record.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
    })

    const labels = Object.keys(monthlyData).sort()
    const chartData = labels.map(label => monthlyData[label])

    res.json({
      labels: labels.map(label => {
        const [year, month] = label.split('-')
        return `${month}/${year}`
      }),
      data: chartData
    })
  } catch (error) {
    console.error('Error fetching evolution data:', error)
    res.status(500).json({ error: 'Failed to fetch evolution data' })
  }
})

app.get('/api/dashboard/status-distribution', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('status')

    if (error) throw error

    // Count by status
    const statusCounts = {}
    data.forEach(record => {
      const status = record.status || 'Pendente'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const labels = Object.keys(statusCounts)
    const chartData = Object.values(statusCounts)

    res.json({
      labels,
      data: chartData
    })
  } catch (error) {
    console.error('Error fetching status distribution:', error)
    res.status(500).json({ error: 'Failed to fetch status distribution' })
  }
})

app.get('/api/dashboard/top-fretistas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('fretista, status')
      .eq('status', 'Pendente')

    if (error) throw error

    // Count pending notes by fretista
    const fretistaCounts = {}
    data.forEach(record => {
      const fretista = record.fretista || 'Não informado'
      fretistaCounts[fretista] = (fretistaCounts[fretista] || 0) + 1
    })

    // Get top 10
    const sortedFretistas = Object.entries(fretistaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    const labels = sortedFretistas.map(([name]) => name)
    const chartData = sortedFretistas.map(([,count]) => count)

    res.json({
      labels,
      data: chartData
    })
  } catch (error) {
    console.error('Error fetching top fretistas:', error)
    res.status(500).json({ error: 'Failed to fetch top fretistas' })
  }
})

app.get('/api/dashboard/top-clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('registros')
      .select('cliente, status')
      .eq('status', 'Pendente')

    if (error) throw error

    // Count pending notes by client
    const clientCounts = {}
    data.forEach(record => {
      const cliente = record.cliente || 'Não informado'
      clientCounts[cliente] = (clientCounts[cliente] || 0) + 1
    })

    // Get top 10
    const sortedClients = Object.entries(clientCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    const labels = sortedClients.map(([name]) => name)
    const chartData = sortedClients.map(([,count]) => count)

    res.json({
      labels,
      data: chartData
    })
  } catch (error) {
    console.error('Error fetching top clients:', error)
    res.status(500).json({ error: 'Failed to fetch top clients' })
  }
})

// Endpoint de saúde do sistema: API, Banco de Dados e Google Sheets
function checkGoogleSheets(sheetId) {
  return new Promise((resolve) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      const req = https.get(url, (res) => {
        const ok = res.statusCode >= 200 && res.statusCode < 300
        resolve(ok)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(5000, () => {
        try { req.destroy() } catch (e) {}
        resolve(false)
      })
    } catch (e) {
      resolve(false)
    }
  })
}

app.get('/api/health', async (req, res) => {
  const result = {
    api: 'offline',
    database: 'disconnected',
    sheets: 'no_connection',
    timestamp: new Date().toISOString()
  }

  // Verificar conexão com o banco (Supabase)
  try {
    const { error } = await supabase
      .from('registros')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    result.database = error ? 'disconnected' : 'connected'
  } catch (e) {
    result.database = 'disconnected'
  }

  // A API só é considerada online se estiver conseguindo conexão com o Supabase
  result.api = result.database === 'connected' ? 'online' : 'offline'

  // Verificar acesso à Google Sheets (pública ou com permissão)
  const sheetId = process.env.GOOGLE_SHEETS_ID || '1c9DWogDs9ZC0BIrI8TN3ptuWTA_q21oL65tn44BDcaI'
  try {
    const ok = await checkGoogleSheets(sheetId)
    result.sheets = ok ? 'synced' : 'no_connection'
  } catch (e) {
    result.sheets = 'no_connection'
  }

  res.json(result)
})

// Endpoint para adicionar linha ao Google Sheets
app.post('/add-row', async (req, res) => {
  try {
    const payload = req.body
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ error: 'Payload inválido. Esperado um objeto.' })
    }

    await appendRowToGoogleSheets(payload)
    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao adicionar linha ao Google Sheets:', error)
    res.status(500).json({ error: 'Falha ao enviar ao Google Sheets', details: error.message })
  }
})

// Endpoint para atualizar linha existente no Google Sheets
app.post('/update-row', async (req, res) => {
  try {
    const payload = req.body
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ error: 'Payload inválido. Esperado um objeto.' })
    }

    await updateRowInGoogleSheets(payload)
    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar linha no Google Sheets:', error)
    res.status(500).json({ error: 'Falha ao atualizar no Google Sheets', details: error.message })
  }
})

// Endpoint de diagnóstico para testar append no Google Sheets
app.get('/api/test-sheets', async (req, res) => {
  try {
    const testPayload = {
      numero_nf: 'TEST-123',
      status: 'TEST',
      observacoes: 'Diagnostic from /api/test-sheets',
      timestamp: new Date().toISOString()
    }

    await appendRowToGoogleSheets(testPayload)
    res.json({ success: true, payload: testPayload })
  } catch (error) {
    console.error('Diagnóstico: falha ao adicionar linha ao Google Sheets:', error)
    res.status(500).json({ error: 'Falha no diagnóstico do Google Sheets', details: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
