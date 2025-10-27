const fs = require('fs');
const path = require('path');
const { runAllTests: testSupabase } = require('./test-supabase-connection');
const { runTests: testExtraction } = require('./test-extraction');

console.log('='.repeat(80));
console.log('SISTEMA COMPLETO DE TESTES - APPNF');
console.log('='.repeat(80));
console.log('Este script irá testar:');
console.log('1. Conexão e operações com Supabase');
console.log('2. Extração de dados de PDF (se fornecido)');
console.log('3. Salvamento de dados extraídos');
console.log('='.repeat(80));

async function runCompleteTests() {
  const results = {
    supabase: false,
    extraction: false,
    overall: false
  };
  
  try {
    // 1. Testar Supabase
    console.log('\n🔍 FASE 1: TESTANDO SUPABASE...\n');
    const supabaseResults = await testSupabase();
    results.supabase = Object.values(supabaseResults).every(result => result);
    
    // 2. Testar extração de PDF (se arquivo fornecido)
    const pdfPath = process.argv[2];
    if (pdfPath) {
      console.log('\n🔍 FASE 2: TESTANDO EXTRAÇÃO DE PDF...\n');
      
      if (fs.existsSync(pdfPath)) {
        await testExtraction(pdfPath);
        results.extraction = true; // Assumir sucesso se não houve erro
      } else {
        console.error('❌ Arquivo PDF não encontrado:', pdfPath);
        results.extraction = false;
      }
    } else {
      console.log('\n⚠️ FASE 2: PULADA - Nenhum arquivo PDF fornecido');
      console.log('Para testar extração, use: node run-tests.js <caminho-para-pdf>');
      results.extraction = null; // Não testado
    }
    
    // 3. Resultado geral
    results.overall = results.supabase && (results.extraction !== false);
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    results.overall = false;
  }
  
  // Relatório final
  console.log('\n' + '='.repeat(80));
  console.log('RELATÓRIO FINAL DOS TESTES');
  console.log('='.repeat(80));
  
  console.log('📊 RESULTADOS:');
  console.log(`   Supabase: ${results.supabase ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  if (results.extraction === null) {
    console.log('   Extração PDF: ⚠️ NÃO TESTADO');
  } else {
    console.log(`   Extração PDF: ${results.extraction ? '✅ PASSOU' : '❌ FALHOU'}`);
  }
  
  console.log(`   Status Geral: ${results.overall ? '✅ SISTEMA FUNCIONANDO' : '❌ PROBLEMAS DETECTADOS'}`);
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  
  if (!results.supabase) {
    console.log('   • Verificar configurações do Supabase no arquivo .env');
    console.log('   • Verificar se as tabelas existem no banco de dados');
    console.log('   • Verificar permissões de acesso (RLS policies)');
  }
  
  if (results.extraction === false) {
    console.log('   • Verificar se o arquivo PDF existe e é válido');
    console.log('   • Verificar se a biblioteca pdf-parse está instalada');
    console.log('   • Testar com diferentes formatos de PDF');
  }
  
  if (results.overall) {
    console.log('   • ✅ Sistema pronto para uso!');
    console.log('   • Pode prosseguir com o upload de arquivos reais');
  }
  
  console.log('='.repeat(80));
  
  return results;
}

// Função para listar arquivos PDF disponíveis para teste
function listAvailablePDFs() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Diretório uploads não encontrado');
    return [];
  }
  
  const files = fs.readdirSync(uploadsDir)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(uploadsDir, file));
  
  if (files.length > 0) {
    console.log('\n📄 PDFs disponíveis para teste:');
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('\nPara testar com um destes arquivos, use:');
    console.log(`   node run-tests.js "${files[0]}"`);
  } else {
    console.log('📁 Nenhum arquivo PDF encontrado no diretório uploads');
  }
  
  return files;
}

// Executar se chamado diretamente
if (require.main === module) {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    listAvailablePDFs();
  }
  
  runCompleteTests().catch(console.error);
}

module.exports = {
  runCompleteTests,
  listAvailablePDFs
};