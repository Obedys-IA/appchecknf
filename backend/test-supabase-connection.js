const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('='.repeat(60));
console.log('TESTE DE CONEXÃO E OPERAÇÕES SUPABASE');
console.log('='.repeat(60));

// Verificar variáveis de ambiente
console.log('\n1. Verificando configurações...');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Configurado' : '❌ Não configurado');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configurações do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('\n2. Testando conexão com Supabase...');
  
  try {
    // Teste básico de conexão
    const { data, error } = await supabase
      .from('registros')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }
    
    console.log('✅ Conexão estabelecida com sucesso');
    console.log('Total de registros na tabela:', data);
    return true;
  } catch (error) {
    console.error('❌ Erro geral na conexão:', error);
    return false;
  }
}

async function testTableStructure() {
  console.log('\n3. Verificando estrutura da tabela registros...');
  
  try {
    // Tentar buscar um registro para ver a estrutura
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar estrutura:', error);
      return false;
    }
    
    console.log('✅ Estrutura da tabela acessível');
    if (data && data.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(data[0]));
    } else {
      console.log('Tabela vazia - não é possível verificar colunas');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro geral na verificação:', error);
    return false;
  }
}

async function testInsert() {
  console.log('\n4. Testando inserção de dados...');
  
  const testData = {
    numero_nf: '999999999',
    cnpj_emitente: '00.000.000/0001-00',
    razao_social_emitente: 'TESTE EMPRESA LTDA',
    cnpj_cpf_destinatario: '11.111.111/0001-11',
    razao_social: 'TESTE DESTINATARIO LTDA',
    data_emissao: '2024-01-01',
    valor_total: 100.00,
    placa: 'ABC1234',
    fretista: 'TESTE FRETISTA',
    status: 'PENDENTE',
    created_at: new Date().toISOString()
  };
  
  try {
    console.log('Dados de teste:', testData);
    
    const { data, error } = await supabase
      .from('registros')
      .insert([testData])
      .select();
    
    if (error) {
      console.error('❌ Erro na inserção:', error);
      return false;
    }
    
    console.log('✅ Inserção realizada com sucesso');
    console.log('Dados inseridos:', data);
    
    // Limpar dados de teste
    if (data && data.length > 0) {
      const { error: deleteError } = await supabase
        .from('registros')
        .delete()
        .eq('id', data[0].id);
      
      if (deleteError) {
        console.warn('⚠️ Aviso: Não foi possível limpar dados de teste:', deleteError);
      } else {
        console.log('✅ Dados de teste removidos');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro geral na inserção:', error);
    return false;
  }
}

async function testUsersTable() {
  console.log('\n5. Testando acesso à tabela usuarios...');
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela usuarios:', error);
      return false;
    }
    
    console.log('✅ Acesso à tabela usuarios funcionando');
    if (data && data.length > 0) {
      console.log('Colunas da tabela usuarios:', Object.keys(data[0]));
    }
    return true;
  } catch (error) {
    console.error('❌ Erro geral no acesso à tabela usuarios:', error);
    return false;
  }
}

async function runAllTests() {
  const results = {
    connection: false,
    structure: false,
    insert: false,
    users: false
  };
  
  results.connection = await testConnection();
  
  if (results.connection) {
    results.structure = await testTableStructure();
    results.insert = await testInsert();
    results.users = await testUsersTable();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log('Conexão Supabase:', results.connection ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Estrutura da tabela:', results.structure ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Inserção de dados:', results.insert ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Acesso tabela usuarios:', results.users ? '✅ SUCESSO' : '❌ FALHA');
  console.log('='.repeat(60));
  
  const allPassed = Object.values(results).every(result => result);
  console.log('\nStatus geral:', allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM');
  
  return results;
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConnection,
  testTableStructure,
  testInsert,
  testUsersTable,
  runAllTests
};