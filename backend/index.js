require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const excel = require('exceljs');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://nwkqdbonogfitjhkjjgh.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3FkYm9ub2dmaXRqaGtqamdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3OTA2MSwiZXhwIjoyMDc1OTU1MDYxfQ.fhRoAqj9XxI7c0HAzPYjs2t7FCIWVL3LBd2RaYh6Elc'
const supabase = createClient(supabaseUrl, supabaseKey)

const app = express();
const PORT = process.env.PORT || 3001;

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
function verificarDuplicata(numeroNF, cnpjEmitente, dataEmissao, fileHash) {
  const chaveNota = `${numeroNF}-${cnpjEmitente}-${dataEmissao}`;
  
  // Verifica se o arquivo já foi processado pelo hash
  if (processedFiles.has(fileHash)) {
    return {
      isDuplicata: true,
      tipo: 'arquivo',
      mensagem: 'Este arquivo já foi processado anteriormente'
    };
  }

  // Verifica se a nota fiscal já foi processada
  if (processedNotes.has(chaveNota)) {
    return {
      isDuplicata: true,
      tipo: 'nota',
      mensagem: `Nota fiscal ${numeroNF} do emitente ${cnpjEmitente} com data ${dataEmissao} já foi processada`
    };
  }

  return { isDuplicata: false };
}

// Função para registrar arquivo/nota processada
function registrarProcessamento(numeroNF, cnpjEmitente, dataEmissao, fileHash) {
  const chaveNota = `${numeroNF}-${cnpjEmitente}-${dataEmissao}`;
  
  processedFiles.set(fileHash, {
    timestamp: new Date(),
    chaveNota: chaveNota
  });
  
  processedNotes.add(chaveNota);
}

// Endpoint para limpar cache de duplicatas (apenas para admin)
app.post('/admin/limpar-cache-duplicatas', (req, res) => {
  try {
    processedFiles.clear();
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

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Endpoint para upload de PDF
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  res.json({ message: 'Arquivo recebido com sucesso!', filename: req.file.filename });
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
    // Tenta formato alternativo "DATA DA EMISSÃO\n20/10/2025"
    dataMatch = texto.match(/DATA DA EMISS[ÃA]O[\s\n]*(\d{2})\/(\d{2})\/(\d{4})/i);
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
    texto.match(/Hora (?:da )?Sa[íi]da\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:de )?Sa[íi]da\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:da )?Emiss[aã]o\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i),
    texto.match(/Hora (?:de )?Entrada\s*:?\s*(\d{2}:\d{2}(?::\d{2})?)/i)
  ];
  
  for (const match of horaSaidaMatches) {
    if (match) {
      horaSaida = match[1];
      break;
    }
  }

  // Data de Entrega
  let dataEntrega = '';
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

  // Rede (buscar em informações complementares ou dados adicionais)
  let rede = '';
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

  // Vendedor (buscar em informações complementares ou dados do vendedor)
  let vendedor = '';
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
      naturezaOperacao = match[1].trim().split(/\s+/).slice(0, 6).join(' '); // Limita a 6 palavras
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

  // Valor Total da Nota
  let valorTotal = '';
  // Busca por "V. TOTAL DA NOTA" seguido do valor
  const valorTotalMatch = texto.match(/V\.\s*TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9.,]+)/i);
  if (valorTotalMatch) {
    valorTotal = valorTotalMatch[1].trim();
  } else {
    // Busca alternativa por "VALOR TOTAL DA NOTA"
    const valorTotalAltMatch = texto.match(/VALOR\s+TOTAL\s+DA\s+NOTA\s*[\n\r\s]*([0-9.,]+)/i);
    if (valorTotalAltMatch) {
      valorTotal = valorTotalAltMatch[1].trim();
    }
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
    
    console.log('Arquivo recebido:', req.file.filename);
    const pdfPath = path.join(__dirname, 'uploads', req.file.filename);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(pdfPath)) {
      return res.status(400).json({ error: 'Arquivo não encontrado após upload.' });
    }
    
    const pdfBytes = fs.readFileSync(pdfPath);
  
  // Gerar hash do arquivo para verificação de duplicatas
  const fileHash = generateFileHash(pdfBytes);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
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
  const arquivosGerados = [];
  const dadosCSV = [];
  
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
    const dataEntregaCalculada = calcularDataEntrega(campos.dataEmissao);
    const diasAtraso = calcularDiasAtraso(campos.dataVencimento);
    const diasVencimento = calcularDiasVencimento(campos.dataVencimento);

    // Buscar fretista e nome fantasia antes de usar
    const fretista = buscarFretista(campos.placa);
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

    // Verificar duplicatas ANTES de salvar no Supabase
    const verificacaoDuplicata = verificarDuplicata(
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
      
      // Se for duplicata de arquivo, interrompe o processamento
      if (verificacaoDuplicata.tipo === 'arquivo') {
        return res.status(409).json({
          error: 'Arquivo duplicado',
          message: verificacaoDuplicata.mensagem,
          duplicatas: duplicatas
        });
      }
      
      // Se for duplicata de nota, pula para a próxima
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
      registroIndividual = {
        // Dados da nota fiscal
        numero_nf: campos.numeroNF,
        cnpj_emitente: campos.cnpjEmitente || '',
        razao_social_emitente: campos.nomeFantasiaEmitente || '',
        data_emissao: campos.dataEmissao,
        hora_emissao: campos.horaSaida || null,
        hora_saida: campos.horaSaida || null,
        data_entrega: dataEntregaCalculada,
        
        // Dados do cliente
        cnpj_cpf_destinatario: campos.cnpjCpfDestinatario || campos.cnpjDestinatario || '',
        nome_fantasia: nomeFantasiaCurto || '',
        razao_social: campos.razaoSocial || '',
        
        // Dados comerciais
        rede: campos.rede || '',
        uf: campos.uf || '',
        vendedor: campos.vendedor || '',
        valor_total: campos.valorTotal ? parseFloat(campos.valorTotal.replace(/[^\d,.-]/g, '').replace(',', '.')) || null : null,
        
        // Dados de transporte
        placa: campos.placa,
        fretista: fretista,
        
        // Dados fiscais
        data_vencimento: campos.dataVencimento || null,
        cfop: campos.cfop || '',
        natureza_operacao: campos.naturezaOperacao || '',
        
        // Status e controle
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
       }
     } catch (error) {
       console.error('Erro ao processar registro individual:', error);
     }
    
    // Validar CFOP se presente
    if (campos.cfop) {
      const validacaoCFOP = validarCFOP(campos.cfop);
      if (!validacaoCFOP.valido) {
        validacoes.push({
          numeroNF: campos.numeroNF,
          tipo: 'CFOP',
          erro: validacaoCFOP.erro,
          aviso: validacaoCFOP.aviso,
          valor: campos.cfop
        });
      }
    }
    
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
    
    // Gerar bytes do PDF individual
    const pdfIndividualBytes = await pdfIndividual.save();
    
    // Salvar arquivo PDF individual
    const caminhoArquivo = path.join(__dirname, 'uploads', nomeArquivo);
    fs.writeFileSync(caminhoArquivo, pdfIndividualBytes);
    arquivosGerados.push(nomeArquivo);

    // Adicionar dados para o arquivo de exportação
    dadosCSV.push({
      'Nº NF': campos.numeroNF,
      'Nome Fantasia': nomeFantasiaCurto || 'N/A', // Usa o nome fantasia consultado ou extraído
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
      'Nome Fantasia Consultado': nomeFantasiaCurto ? (campos.nomeFantasia && campos.nomeFantasia.trim() ? 'Extraído da Nota' : 'Consultado no clientes.json') : 'Não encontrado',
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
    const registrosParaSalvar = dadosCSV.map(item => ({
      numero_nf: item['Nº NF'],
      nome_fantasia: item['Nome Fantasia'] !== 'N/A' ? item['Nome Fantasia'] : null,
      data_emissao: item['Data de Emissão'] || null,
      placa: item['Placa'],
      fretista: item['Fretista'],
      razao_social: item['Razão Social'],
      valor_total: item['Valor Total'] !== 'N/A' ? parseFloat(item['Valor Total']?.replace(/[^\d,.-]/g, '').replace(',', '.')) || null : null,
      cnpj_emitente: item['CNPJ Emitente'],
      razao_social_emitente: item['Nome Fantasia Emitente'],
      cnpj_cpf_destinatario: item['CNPJ/CPF Destinatário'],
      hora_emissao: item['Hora Emissão'] || null,
      data_vencimento: item['Data Vencimento'] || null,
      hora_saida: item['Hora Saída'] || null,
      data_entrega: item['Data Entrega'] || null,
      rede: item['Rede'],
      uf: item['UF'],
      vendedor: item['Vendedor'],
      cfop: item['CFOP'],
      natureza_operacao: item['Natureza da Operação'],
      status: 'PENDENTE'
    }));

    if (registrosParaSalvar.length > 0) {
      console.log('Salvando registros em lote no Supabase:', registrosParaSalvar.length, 'registros');
      const { data, error } = await supabase
        .from('registros')
        .insert(registrosParaSalvar);

      if (error) {
        console.error('ERRO ao salvar em lote no Supabase:', error);
        // Não interrompe o processamento, apenas loga o erro
      } else {
        console.log(`✅ SUCESSO - ${registrosParaSalvar.length} registros salvos em lote no Supabase`);
      }
    }
  } catch (error) {
    console.error('Erro ao processar dados para Supabase:', error);
    // Não interrompe o processamento, apenas loga o erro
  }

  // Preparar resposta com validações e duplicatas
  const response = {
    arquivos: arquivosGerados,
    message: 'Processamento concluído!',
    totalProcessados: arquivosGerados.length,
    validacoes: validacoes.length > 0 ? validacoes : undefined,
    duplicatas: duplicatas.length > 0 ? duplicatas : undefined,
    resumo: {
      sucessos: arquivosGerados.length,
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

// Função para calcular data de entrega (3 dias úteis após emissão)
function calcularDataEntrega(dataEmissao) {
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
    
    let diasAdicionados = 0;
    let dataEntrega = new Date(emissao);
    
    while (diasAdicionados < 3) {
      dataEntrega.setDate(dataEntrega.getDate() + 1);
      
      // Verificar se é dia útil (segunda a sexta)
      const diaSemana = dataEntrega.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasAdicionados++;
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
      observacao
    } = req.body;

    // Validações obrigatórias
    if (!numero_nf || !cnpj_emitente || !data_emissao || !cnpj_cliente || !placa) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: número_nf, cnpj_emitente, data_emissao, cnpj_cliente, placa' 
      });
    }

    // Buscar fretista pela placa
    const fretista = buscarFretista(placa);

    // Buscar nome fantasia se não fornecido
    let nomeFantasiaFinal = nome_fantasia;
    if (!nomeFantasiaFinal && cnpj_cliente) {
      nomeFantasiaFinal = buscarNomeFantasiaCliente(cnpj_cliente);
    }

    // Calcular campos automáticos
    const dataEntregaCalculada = calcularDataEntrega(data_emissao);
    const diasAtraso = calcularDiasAtraso(data_vencimento);
    const diasVencimento = calcularDiasVencimento(data_vencimento);

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
      data_emissao,
      hora_emissao: hora_saida || null,
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
      valor_total: valor ? parseFloat(valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : null,
      
      // Dados de transporte
      placa,
      fretista,
      
      // Dados fiscais
      data_vencimento: data_vencimento || null,
      cfop: cfop || '',
      natureza_operacao: natureza_operacao || '',
      
      // Status e controle
      situacao: situacao || 'Pendente',
      status: status || 'Emitida',
      dias_atraso: diasAtraso,
      dias_vencimento: diasVencimento,
      observacao: observacao || ''
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

    res.json({
      success: true,
      message: 'Registro salvo com sucesso',
      data: data[0],
      calculados: {
        data_entrega: dataEntregaCalculada,
        dias_atraso: diasAtraso,
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
    // Buscar dados reais do Supabase
    const { data: registros, error: registrosError } = await supabase
      .from('registros')
      .select('*')
    
    if (registrosError) {
      console.error('Erro ao buscar registros:', registrosError)
      return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' })
    }

    // Calcular estatísticas baseadas nos requisitos do promptnew.txt
    const totalNotas = registros.length
    const notasEntregues = registros.filter(r => r.status === 'Entregue').length
    const notasPendentes = registros.filter(r => r.status === 'Pendente').length
    const notasCanceladas = registros.filter(r => r.status === 'Cancelada').length
    const notasDevolvidas = registros.filter(r => r.status === 'Devolvida').length
    
    // Calcular eficiência (% de canhotos recebidos)
    const eficiencia = totalNotas > 0 ? Math.round((notasEntregues / totalNotas) * 100) : 0
    
    // Valor pendente (soma dos valores das notas pendentes)
    const valorPendente = registros
      .filter(r => r.status === 'Pendente')
      .reduce((sum, registro) => sum + (parseFloat(registro.valor_total) || 0), 0)
    
    // Notas atrasadas (+7 dias)
    const hoje = new Date()
    const notasAtrasadas = registros.filter(registro => {
      if (registro.status !== 'Pendente' || !registro.data_emissao) return false
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
        nome: `NF ${registro.numero_nota}`,
        data: registro.data_emissao,
        status: registro.status || 'Pendente'
      }))
    
    // Calculate additional dashboard data
    const vencimentosProximos = await supabase
      .from('registros')
      .select('cliente, numero_nota, valor, vencimento, status')
      .not('vencimento', 'is', null)
      .order('vencimento', { ascending: true })
      .limit(20)

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
    const vencimentosProcessados = vencimentosProximos.data?.map(item => {
      const vencimento = new Date(item.vencimento)
      const hoje = new Date()
      const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))
      
      return {
        cliente: item.cliente,
        numeroNota: item.numero_nota,
        valor: parseFloat(item.valor) || 0,
        vencimento: item.vencimento,
        diasRestantes: diasRestantes,
        status: item.status
      }
    }) || []

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
    resumoMensal,
    alertas
  })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
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
    
    res.json(registros || [])
  } catch (error) {
    console.error('Erro ao buscar registros:', error)
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
      .order('created_at', { ascending: false })
    
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})