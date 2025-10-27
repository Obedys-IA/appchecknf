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