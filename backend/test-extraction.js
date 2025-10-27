const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para extrair texto do PDF usando pdf-parse
async function extractTextFromPDF(pdfPath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    return null;
  }
}

// Função para extrair dados específicos da NF
function extractNFData(text) {
  const data = {};
  
  // Teste campo por campo
  console.log('\n=== TESTE DE EXTRAÇÃO CAMPO POR CAMPO ===\n');
  
  // 1. Número da NF
  const numeroNFRegex = /(?:N[ºo°]?\s*|NÚMERO\s*|NUM\s*)?(\d{9})/i;
  const numeroNFMatch = text.match(numeroNFRegex);
  data.numero_nf = numeroNFMatch ? numeroNFMatch[1] : null;
  console.log('1. Número NF:', data.numero_nf || 'NÃO ENCONTRADO');
  
  // 2. CNPJ do Emitente
  const cnpjEmitenteRegex = /CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i;
  const cnpjEmitenteMatch = text.match(cnpjEmitenteRegex);
  data.cnpj_emitente = cnpjEmitenteMatch ? cnpjEmitenteMatch[1] : null;
  console.log('2. CNPJ Emitente:', data.cnpj_emitente || 'NÃO ENCONTRADO');
  
  // 3. Nome do Emitente
  const nomeEmitenteRegex = /(?:RAZÃO SOCIAL|NOME)[:\s]*([A-Z\s&.-]+)/i;
  const nomeEmitenteMatch = text.match(nomeEmitenteRegex);
  data.nome_emitente = nomeEmitenteMatch ? nomeEmitenteMatch[1].trim() : null;
  console.log('3. Nome Emitente:', data.nome_emitente || 'NÃO ENCONTRADO');
  
  // 4. CNPJ do Destinatário
  const cnpjDestRegex = /DESTINATÁRIO[\s\S]*?CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i;
  const cnpjDestMatch = text.match(cnpjDestRegex);
  data.cnpj_destinatario = cnpjDestMatch ? cnpjDestMatch[1] : null;
  console.log('4. CNPJ Destinatário:', data.cnpj_destinatario || 'NÃO ENCONTRADO');
  
  // 5. Nome do Destinatário
  const nomeDestRegex = /DESTINATÁRIO[\s\S]*?(?:RAZÃO SOCIAL|NOME)[:\s]*([A-Z\s&.-]+)/i;
  const nomeDestMatch = text.match(nomeDestRegex);
  data.nome_destinatario = nomeDestMatch ? nomeDestMatch[1].trim() : null;
  console.log('5. Nome Destinatário:', data.nome_destinatario || 'NÃO ENCONTRADO');
  
  // 6. Data de Emissão
  const dataEmissaoRegex = /(?:DATA DE EMISSÃO|EMISSÃO)[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
  const dataEmissaoMatch = text.match(dataEmissaoRegex);
  data.data_emissao = dataEmissaoMatch ? dataEmissaoMatch[1] : null;
  console.log('6. Data Emissão:', data.data_emissao || 'NÃO ENCONTRADO');
  
  // 7. Valor Total
  const valorTotalRegex = /(?:VALOR TOTAL|TOTAL GERAL|TOTAL)[:\s]*R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const valorTotalMatch = text.match(valorTotalRegex);
  data.valor_total = valorTotalMatch ? valorTotalMatch[1] : null;
  console.log('7. Valor Total:', data.valor_total || 'NÃO ENCONTRADO');
  
  // 8. Chave de Acesso
  const chaveAcessoRegex = /(\d{44})/;
  const chaveAcessoMatch = text.match(chaveAcessoRegex);
  data.chave_acesso = chaveAcessoMatch ? chaveAcessoMatch[1] : null;
  console.log('8. Chave Acesso:', data.chave_acesso || 'NÃO ENCONTRADO');
  
  console.log('\n=== RESUMO DA EXTRAÇÃO ===');
  const camposEncontrados = Object.values(data).filter(v => v !== null).length;
  const totalCampos = Object.keys(data).length;
  console.log(`Campos extraídos: ${camposEncontrados}/${totalCampos}`);
  
  return data;
}

// Função para testar salvamento no Supabase
async function testSupabaseSave(data) {
  console.log('\n=== TESTE DE SALVAMENTO NO SUPABASE ===\n');
  
  try {
    // Preparar dados para inserção
    const registroData = {
      numero_nf: data.numero_nf,
      cnpj_emitente: data.cnpj_emitente,
      razao_social_emitente: data.nome_emitente,
      cnpj_cpf_destinatario: data.cnpj_destinatario,
      razao_social: data.nome_destinatario,
      data_emissao: data.data_emissao ? data.data_emissao.split('/').reverse().join('-') : null,
      valor_total: data.valor_total ? parseFloat(data.valor_total.replace(/\./g, '').replace(',', '.')) : null,
      placa: 'TESTE123', // Valor padrão para teste
      fretista: 'TESTE FRETISTA', // Valor padrão para teste
      status: 'PENDENTE',
      created_at: new Date().toISOString()
    };
    
    console.log('Dados preparados para inserção:', registroData);
    
    // Testar inserção
    const { data: result, error } = await supabase
      .from('registros')
      .insert([registroData])
      .select();
    
    if (error) {
      console.error('❌ ERRO no salvamento:', error);
      return false;
    } else {
      console.log('✅ SUCESSO no salvamento:', result);
      return true;
    }
  } catch (error) {
    console.error('❌ ERRO GERAL no teste de salvamento:', error);
    return false;
  }
}

// Função principal de teste
async function runTests(pdfPath) {
  console.log('='.repeat(60));
  console.log('INICIANDO TESTES DE EXTRAÇÃO E SALVAMENTO');
  console.log('='.repeat(60));
  console.log('Arquivo:', pdfPath);
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Arquivo não encontrado:', pdfPath);
    return;
  }
  
  // Extrair texto do PDF
  console.log('\n1. Extraindo texto do PDF...');
  const text = await extractTextFromPDF(pdfPath);
  
  if (!text) {
    console.error('❌ Falha na extração de texto do PDF');
    return;
  }
  
  console.log('✅ Texto extraído com sucesso');
  console.log('Tamanho do texto:', text.length, 'caracteres');
  
  // Extrair dados específicos
  console.log('\n2. Extraindo dados específicos...');
  const extractedData = extractNFData(text);
  
  // Testar salvamento no Supabase
  console.log('\n3. Testando salvamento no Supabase...');
  const saveSuccess = await testSupabaseSave(extractedData);
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO FINAL DOS TESTES');
  console.log('='.repeat(60));
  console.log('Extração de texto:', '✅ SUCESSO');
  console.log('Extração de dados:', extractedData ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Salvamento Supabase:', saveSuccess ? '✅ SUCESSO' : '❌ FALHA');
  console.log('='.repeat(60));
}

// Exportar funções para uso em outros módulos
module.exports = {
  extractTextFromPDF,
  extractNFData,
  testSupabaseSave,
  runTests
};

// Se executado diretamente, rodar testes com arquivo de exemplo
if (require.main === module) {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.log('Uso: node test-extraction.js <caminho-para-pdf>');
    console.log('Exemplo: node test-extraction.js uploads/exemplo.pdf');
    process.exit(1);
  }
  
  runTests(pdfPath).catch(console.error);
}