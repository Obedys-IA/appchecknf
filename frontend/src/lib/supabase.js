import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função para verificar se o usuário está autenticado
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Função para fazer login
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// Função para fazer logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Função para registrar usuário
export const signUp = async (email, password, userData) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  return { data, error }
}

// Função para buscar dados do usuário na tabela usuarios
export const getUserData = async (userId) => {
  try {
    // Primeiro, tentar buscar pelo ID do auth
    let { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    
    // Se não encontrar pelo ID, tentar buscar pelo email
    if (error && error.code === 'PGRST116') {
      console.log('Usuário não encontrado pelo ID, tentando buscar pelo email...')
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const result = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', user.email)
          .single()
        
        data = result.data
        error = result.error
      }
    }
    
    if (error) {
      console.error('Erro ao buscar dados do usuário:', error)
      return { data: null, error }
    }
    
    // Buscar dados de autenticação do Supabase Auth para obter último acesso
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      // Adicionar informações de autenticação aos dados do usuário
      data = {
        ...data,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at
      }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erro na função getUserData:', err)
    return { data: null, error: err }
  }
}

// Função para atualizar dados do usuário
export const updateUserData = async (userId, userData) => {
  const { data, error } = await supabase
    .from('usuarios')
    .update(userData)
    .eq('id', userId)
    .select()
  
  return { data, error }
}

// Função para recuperação de senha
export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { data, error }
}

// Função para atualizar senha
export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  return { data, error }
}

// Função para verificar se usuário existe no auth
export const checkUserExists = async (email) => {
  try {
    // Usar a API de admin do Supabase para verificar se o usuário existe
    // Como não temos acesso direto à API de admin no frontend, 
    // vamos assumir que o usuário não existe e tentar criar
    // Se a criação falhar porque já existe, trataremos o erro
    return { exists: false, error: null }
  } catch (err) {
    console.error('Erro ao verificar usuário:', err)
    return { exists: false, error: err }
  }
}

// Função para criar usuário administrador se não existir
export const createAdminUser = async (email, password) => {
  try {
    // Criar o usuário no Supabase Auth com metadados
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // Desabilitar confirmação por email
        data: {
          nome: 'Administrador',
          senha: password,
          tipo: 'administrador'
        }
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      return { data: null, error: authError }
    }

    if (authData.user) {
      // O trigger handle_new_user irá inserir automaticamente na tabela usuarios
      return { data: authData.user, error: null }
    }

    return { data: null, error: new Error('Usuário não foi criado') }
  } catch (err) {
    console.error('Erro geral ao criar usuário administrador:', err)
    return { data: null, error: err }
  }
}

// Função para buscar estatísticas do sistema
export const getSystemStats = async () => {
  try {
    // Buscar quantidade total de usuários
    const { count: totalUsers, error: usersError } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
    
    if (usersError) {
      console.error('Erro ao buscar quantidade de usuários:', usersError)
    }

    // Buscar informações de storage (espaço utilizado)
    const { data: storageData, error: storageError } = await supabase.storage
      .from('uploads')
      .list()
    
    let storageUsed = 0
    if (storageData && !storageError) {
      // Calcular tamanho total dos arquivos
      storageUsed = storageData.reduce((total, file) => total + (file.metadata?.size || 0), 0)
    }

    return {
      totalUsers: totalUsers || 0,
      storageUsed: storageUsed,
      storageLimit: 1024 * 1024 * 1024, // 1GB limite padrão
      error: null
    }
  } catch (err) {
    console.error('Erro ao buscar estatísticas do sistema:', err)
    return {
      totalUsers: 0,
      storageUsed: 0,
      storageLimit: 1024 * 1024 * 1024,
      error: err
    }
  }
}

// Função para buscar dados de emitentes
export const getEmitentes = async () => {
  try {
    const { data, error } = await supabase
      .from('emitentes')
      .select('*')
    
    return { data: data || [], error }
  } catch (err) {
    console.error('Erro ao buscar emitentes:', err)
    return { data: [], error: err }
  }
}

// Função para buscar dados de clientes
export const getClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
    
    return { data: data || [], error }
  } catch (err) {
    console.error('Erro ao buscar clientes:', err)
    return { data: [], error: err }
  }
}

// Função para exportar emitentes para o Supabase
export const exportEmitentesToSupabase = async (emitentes = null) => {
  try {
    let dataToExport = emitentes;
    
    // Se não foram fornecidos emitentes, buscar do localStorage ou outra fonte
    if (!dataToExport) {
      const localEmitentes = JSON.parse(localStorage.getItem('emitentes') || '[]');
      dataToExport = localEmitentes;
    }

    if (!dataToExport || dataToExport.length === 0) {
      return { success: false, error: 'Nenhum emitente encontrado para exportar', count: 0 };
    }

    const { data, error } = await supabase
      .from('emitentes')
      .upsert(dataToExport, { onConflict: 'cnpj' });
    
    if (error) {
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, data, error: null, count: dataToExport.length };
  } catch (err) {
    console.error('Erro ao exportar emitentes:', err);
    return { success: false, error: err.message, count: 0 };
  }
}

// Função para exportar clientes para o Supabase
export const exportClientesToSupabase = async (clientes = null) => {
  try {
    let dataToExport = clientes;
    
    // Se não foram fornecidos clientes, buscar do localStorage ou outra fonte
    if (!dataToExport) {
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      dataToExport = localClientes;
    }

    if (!dataToExport || dataToExport.length === 0) {
      return { success: false, error: 'Nenhum cliente encontrado para exportar', count: 0 };
    }

    const { data, error } = await supabase
      .from('clientes')
      .upsert(dataToExport, { onConflict: 'cnpj' });
    
    if (error) {
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, data, error: null, count: dataToExport.length };
  } catch (err) {
    console.error('Erro ao exportar clientes:', err);
    return { success: false, error: err.message, count: 0 };
  }
}

// Função para buscar todos os usuários
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      // Alguns ambientes não possuem a coluna created_at na tabela usuarios.
      // Ordenar por nome para garantir estabilidade sem erro.
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar usuários:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.error('Erro ao buscar usuários:', err)
    return { data: [], error: err }
  }
}

// Função para atualizar usuário
export const updateUser = async (userId, userData) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update(userData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err)
    return { data: null, error: err }
  }
}

// Função para deletar usuário
export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Erro ao deletar usuário:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Erro ao deletar usuário:', err)
    return { success: false, error: err }
  }
}

// Função para contar usuários ativos (logados nas últimas 24 horas)
export const getActiveUsersCount = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { count, error } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', twentyFourHoursAgo)
      .eq('status', 'ativo')
    
    if (error) {
      console.error('Erro ao buscar usuários ativos:', error)
      return { count: 0, error }
    }
    
    return { count: count || 0, error: null }
  } catch (err) {
    console.error('Erro na função getActiveUsersCount:', err)
    return { count: 0, error: err }
  }
}

// Função para buscar usuários logados recentemente (últimas 2 horas)
export const getRecentlyActiveUsers = async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, last_sign_in_at')
      .gte('last_sign_in_at', twoHoursAgo)
      .eq('status', 'ativo')
      .order('last_sign_in_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar usuários recentemente ativos:', error)
      return { data: [], error }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Erro na função getRecentlyActiveUsers:', err)
    return { data: [], error: err }
  }
}

// Função para fazer backup dos dados
export const createBackup = async () => {
  try {
    // Buscar todos os dados principais
    const [usuarios, registros, emitentes, clientes] = await Promise.all([
      supabase.from('usuarios').select('*'),
      supabase.from('registros').select('*'),
      supabase.from('emitentes').select('*'),
      supabase.from('clientes').select('*')
    ])

    const backupData = {
      timestamp: new Date().toISOString(),
      usuarios: usuarios.data || [],
      registros: registros.data || [],
      emitentes: emitentes.data || [],
      clientes: clientes.data || []
    }

    // Criar arquivo de backup
    const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    })

    // Upload do backup para o storage
    const fileName = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
    const { data, error } = await supabase.storage
      .from('backups')
      .upload(fileName, backupBlob)

    if (error) {
      return { success: false, error: error.message, filename: null }
    }

    return { success: true, data, error: null, filename: fileName }
  } catch (err) {
    console.error('Erro ao criar backup:', err)
    return { success: false, error: err.message, filename: null }
  }
}

// Função para buscar registros com filtros
export const getRegistrosWithFilters = async (filtros = {}) => {
  try {
    let query = supabase.from('registros').select('*')
    
    // Aplicar filtros de data
    if (filtros.dataInicio) {
      query = query.gte('data_emissao', filtros.dataInicio)
    }
    if (filtros.dataFim) {
      query = query.lte('data_emissao', filtros.dataFim)
    }
    
    // Aplicar filtros específicos
    if (filtros.fretista) {
      query = query.eq('fretista', filtros.fretista)
    }
    if (filtros.placa) {
      query = query.eq('placa', filtros.placa)
    }
    if (filtros.cliente) {
      query = query.ilike('nome_fantasia', `%${filtros.cliente}%`)
    }
    if (filtros.rede) {
      query = query.eq('rede', filtros.rede)
    }
    if (filtros.vendedor) {
      query = query.eq('vendedor', filtros.vendedor)
    }
    if (filtros.uf) {
      query = query.eq('uf', filtros.uf)
    }
    if (filtros.status) {
      query = query.eq('status', filtros.status.toUpperCase())
    }
    if (filtros.situacao) {
      query = query.eq('situacao', filtros.situacao)
    }
    
    // Filtro de busca livre (busca em múltiplos campos)
    if (filtros.busca) {
      query = query.or(`numero_nf.ilike.%${filtros.busca}%,nome_fantasia.ilike.%${filtros.busca}%,razao_social.ilike.%${filtros.busca}%,fretista.ilike.%${filtros.busca}%,placa.ilike.%${filtros.busca}%,vendedor.ilike.%${filtros.busca}%`)
    }
    
    // Ordenar por data de emissão (mais recentes primeiro)
    query = query.order('data_emissao', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error('Erro ao buscar registros com filtros:', error)
      return { data: [], error }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Erro na função getRegistrosWithFilters:', err)
    return { data: [], error: err }
  }
}

// Função para buscar estatísticas de relatórios
export const getRelatoriosStatistics = async (filtros = {}) => {
  try {
    // Buscar registros com filtros aplicados
    const { data: registros, error } = await getRegistrosWithFilters(filtros)
    
    if (error) {
      return { data: null, error }
    }
    
    // Calcular estatísticas
    const totalRegistros = registros.length
    const registrosEntregues = registros.filter(r => r.status === 'ENTREGUE').length
    const registrosPendentes = registros.filter(r => r.status === 'PENDENTE').length
    const registrosCancelados = registros.filter(r => r.status === 'CANCELADA').length
    const registrosDevolvidos = registros.filter(r => r.status === 'DEVOLVIDA').length
    
    // Calcular valores financeiros
    const valorTotal = registros.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0)
    const valorEntregue = registros
      .filter(r => r.status === 'ENTREGUE')
      .reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0)
    const valorPendente = registros
      .filter(r => r.status === 'PENDENTE')
      .reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0)
    
    // Calcular taxa de sucesso
    const taxaSucesso = totalRegistros > 0 ? (registrosEntregues / totalRegistros) * 100 : 0
    
    // Agrupar por fretista (top 5)
    const fretistasStats = registros.reduce((acc, registro) => {
      const fretista = registro.fretista || 'Sem fretista'
      if (!acc[fretista]) {
        acc[fretista] = { nome: fretista, entregas: 0, receita: 0 }
      }
      if (registro.status === 'ENTREGUE') {
        acc[fretista].entregas++
        acc[fretista].receita += parseFloat(registro.valor_total) || 0
      }
      return acc
    }, {})
    
    const topFretistas = Object.values(fretistasStats)
      .sort((a, b) => b.entregas - a.entregas)
      .slice(0, 5)
      .map(f => ({ ...f, avaliacao: 4.5 + Math.random() * 0.5 })) // Simulando avaliação
    
    // Agrupar por região/UF
    const regioesStats = registros.reduce((acc, registro) => {
      const uf = registro.uf || 'Sem UF'
      if (!acc[uf]) {
        acc[uf] = { nome: uf, entregas: 0, receita: 0 }
      }
      if (registro.status === 'ENTREGUE') {
        acc[uf].entregas++
        acc[uf].receita += parseFloat(registro.valor_total) || 0
      }
      return acc
    }, {})
    
    const topRegioes = Object.values(regioesStats)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)
      .map(r => ({ ...r, crescimento: (Math.random() - 0.5) * 30 })) // Simulando crescimento
    
    // Dados para gráficos (últimos 6 meses)
    const dadosGrafico = []
    for (let i = 5; i >= 0; i--) {
      const data = new Date()
      data.setMonth(data.getMonth() - i)
      const mesAno = data.toISOString().substring(0, 7)
      
      const registrosMes = registros.filter(r => 
        r.data_emissao && r.data_emissao.startsWith(mesAno)
      )
      
      dadosGrafico.push({
        mes: data.toLocaleDateString('pt-BR', { month: 'short' }),
        valor: registrosMes.reduce((sum, r) => sum + (parseFloat(r.valor_total) || 0), 0),
        pedidos: registrosMes.length
      })
    }
    
    const estatisticas = {
      vendas: {
        total: valorTotal,
        variacao: Math.random() * 20 - 10, // Simulando variação
        meta: valorTotal * 1.2,
        pedidos: totalRegistros
      },
      entregas: {
        total: totalRegistros,
        concluidas: registrosEntregues,
        pendentes: registrosPendentes,
        taxa_sucesso: taxaSucesso
      },
      financeiro: {
        receita: valorEntregue,
        custos: valorEntregue * 0.7, // Simulando 70% de custos
        lucro: valorEntregue * 0.3,
        margem: 30
      },
      usuarios: {
        ativos: 156, // Manter simulado por enquanto
        novos: 23,
        fretistas: new Set(registros.map(r => r.fretista).filter(Boolean)).size,
        empresas: new Set(registros.map(r => r.razao_social).filter(Boolean)).size
      }
    }
    
    return {
      data: {
        estatisticas,
        dadosGrafico,
        topFretistas,
        topRegioes,
        registros
      },
      error: null
    }
  } catch (err) {
    console.error('Erro na função getRelatoriosStatistics:', err)
    return { data: null, error: err }
  }
}

// Função para buscar opções de filtros (valores únicos dos campos)
export const getFilterOptions = async () => {
  try {
    const { data: registros, error } = await supabase
      .from('registros')
      .select('fretista, placa, nome_fantasia, rede, vendedor, uf, status, situacao')
    
    if (error) {
      console.error('Erro ao buscar opções de filtros:', error)
      return { data: null, error }
    }
    
    // Extrair valores únicos para cada campo
    const fretistas = [...new Set(registros.map(r => r.fretista).filter(Boolean))].sort()
    const placas = [...new Set(registros.map(r => r.placa).filter(Boolean))].sort()
    const clientes = [...new Set(registros.map(r => r.nome_fantasia).filter(Boolean))].sort()
    const redes = [...new Set(registros.map(r => r.rede).filter(Boolean))].sort()
    const vendedores = [...new Set(registros.map(r => r.vendedor).filter(Boolean))].sort()
    const ufs = [...new Set(registros.map(r => r.uf).filter(Boolean))].sort()
    const statusList = [...new Set(registros.map(r => r.status).filter(Boolean))].sort()
    const situacoes = [...new Set(registros.map(r => r.situacao).filter(Boolean))].sort()
    
    return {
      data: {
        fretistas,
        placas,
        clientes,
        redes,
        vendedores,
        ufs,
        status: statusList,
        situacoes
      },
      error: null
    }
  } catch (err) {
    console.error('Erro na função getFilterOptions:', err)
    return { data: null, error: err }
  }
}