const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const { Parser } = require('json2csv');
const excel = require('exceljs');
const archiver = require('archiver');
const csv = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Configuração CORS mais robusta para web
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001',
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
    dataEmissao = `${dataMatch[1]}.${dataMatch[2]}.${dataMatch[3]}`;
  } else {
    // Tenta formato alternativo "DATA DA EMISSÃO\n20/10/2025"
    dataMatch = texto.match(/DATA DA EMISS[ÃA]O[\s\n]*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (dataMatch) {
      dataEmissao = `${dataMatch[1]}.${dataMatch[2]}.${dataMatch[3]}`;
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
  const horaEmissaoMatch = texto.match(/Hora (?:da )?(?:Sa[íi]da|Entrada|Emiss[aã]o)\s*:?\s*(\d{2}:\d{2}:\d{2})/i);
  const horaEmissao = horaEmissaoMatch ? horaEmissaoMatch[1] : '';

  // Data de Vencimento (Fatura/Duplicata) - corrigindo formato para DD.MM.YYYY
  const faturaSection = texto.match(/FATURA[\s\S]{0,200}|DUPLICATA[\s\S]{0,200}/i);
  let dataVencimento = '';
  if (faturaSection) {
    const vencMatch = faturaSection[0].match(/Venc\.?\s*:?\s*(\d{2})[\/-]?(\d{2})[\/-]?(\d{4})/i);
    if (vencMatch) {
      dataVencimento = `${vencMatch[1]}.${vencMatch[2]}.${vencMatch[3]}`;
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
        dataVencimento = `${match[1]}.${match[2]}.${match[3]}`;
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
    // Novos campos
    cnpjEmitente,
    nomeFantasiaEmitente,
    cnpjDestinatario,
    nomeFantasiaDestinatario,
    horaEmissao,
    dataVencimento,
    cnpjCpfDestinatario,
    valorTotal
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

// Função para buscar nome fantasia do cliente pelo CNPJ/CPF


// Novo endpoint para separar, extrair campos e renomear
app.post('/processar', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  const pdfPath = path.join(__dirname, 'uploads', req.file.filename);
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const numPages = pdfDoc.getPageCount();

  // Extrair texto de cada página e agrupar por NF
  const paginasPorNF = {};
  const textosPorNF = {};
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
    const novoPdf = await PDFDocument.create();
    const indices = paginasPorNF[numeroNF];
    const paginas = await novoPdf.copyPages(pdfDoc, indices);
    paginas.forEach(p => novoPdf.addPage(p));
    const novoPdfBytes = await novoPdf.save();

    // Extrair campos da nota (usa o texto da primeira página do grupo)
    const campos = extrairCamposNota(textosPorNF[numeroNF][0]);
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
    nomeArquivo = nomeArquivo.replace(/\s+/g, ' ').trim() + '.pdf';
    const caminhoArquivo = path.join(__dirname, 'uploads', nomeArquivo);
    fs.writeFileSync(caminhoArquivo, novoPdfBytes);
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
      'Hora Emissão': campos.horaEmissao,
      'Data Vencimento': campos.dataVencimento
    });
  }

  // Manter um registro dos últimos dados gerados para exportação
  fs.writeFileSync(path.join(__dirname, 'uploads', 'last_processed_data.json'), JSON.stringify(dadosCSV, null, 2));

  res.json({ arquivos: arquivosGerados, message: 'Processamento concluído!' });
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});