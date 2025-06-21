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

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração CORS mais robusta para web
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001',
  'https://gdm-frontend.onrender.com', // Exemplo do Render
  'https://gdm-separador-pdf.vercel.app', // Exemplo do Vercel
  'https://tiny-axolotl-6a8f46.netlify.app' // SEU SITE NO NETLIFY
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
  // Procura por padrões comuns de número de NF (ex: NF 53666, Nº 53666, DANFE 53666)
  const match = texto.match(/(?:NF|N\s*º|DANFE)\s*:?\s*(\d{4,})/i);
  if (match) {
    return match[1];
  }
  // Se não encontrar, retorna null
  return null;
}

// Função para extrair campos da nota fiscal
function extrairCamposNota(texto) {
  // Nº da NF (DANFE) - Regex ajustada para o formato "N. 99999"
  const nfMatch = texto.match(/N[º°\.]\s*([\d\.]+)/i);
  const numeroNF = nfMatch ? nfMatch[1].replace(/\D/g, '') : '';

  // Razão Social (duas primeiras palavras após 'Razão Social' ou 'Destinatário')
  let razaoMatch = texto.match(/Raz[aã]o Social\s*:?\s*([\w\s]+)/i);
  if (!razaoMatch) razaoMatch = texto.match(/Destinat[aá]rio\s*:?\s*([\w\s]+)/i);
  let razaoSocial = razaoMatch ? razaoMatch[1].trim().split(/\s+/).slice(0,2).join(' ') : '';

  // Data de Emissão - Garantindo o formato com pontos
  const dataMatch = texto.match(/Data (?:de )?Emiss[aã]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const dataEmissao = dataMatch ? `${dataMatch[1]}.${dataMatch[2]}.${dataMatch[3]}` : '';

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

  return { numeroNF, razaoSocial, dataEmissao, placa, nomeFantasia };
}

// Função para buscar fretista pela placa
function buscarFretista(placa) {
  const fretistas = JSON.parse(fs.readFileSync(path.join(__dirname, 'fretistas.json')));
  const encontrado = fretistas.find(f => f.placa === placa);
  if (encontrado) return encontrado.fretista;
  const outro = fretistas.find(f => f.placa === 'OUTRA');
  return outro ? outro.fretista : 'TERCEIRO';
}

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
    let nomeFantasiaCurto = campos.nomeFantasia.split(/\s+/).slice(0,2).join(' ');
    let nomeArquivo = `NF ${campos.numeroNF} - ${nomeFantasiaCurto} - ${campos.dataEmissao} - ${campos.placa} - ${fretista} - ${campos.razaoSocial}`;
    nomeArquivo = nomeArquivo.replace(/[\\/:*?"<>|]/g, '');
    nomeArquivo = nomeArquivo.replace(/\s+/g, ' ').trim() + '.pdf';
    const caminhoArquivo = path.join(__dirname, 'uploads', nomeArquivo);
    fs.writeFileSync(caminhoArquivo, novoPdfBytes);
    arquivosGerados.push(nomeArquivo);

    // Adicionar dados para o arquivo de exportação
    dadosCSV.push({
      'Nº NF': campos.numeroNF,
      'Nome Fantasia': nomeFantasiaCurto,
      'Data de Emissão': campos.dataEmissao,
      'Placa': campos.placa,
      'Fretista': fretista,
      'Razão Social': campos.razaoSocial,
      'Arquivo Gerado': nomeArquivo
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