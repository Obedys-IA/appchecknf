import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getCurrentUser, getUserData } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const handleUserRedirect = (userInfo) => {
    console.log('handleUserRedirect chamado com:', userInfo)
    if (!userInfo) {
      console.log('handleUserRedirect: userInfo é null/undefined')
      return
    }

    const currentPath = window.location.pathname
    const publicPaths = ['/login', '/register', '/unauthorized']
    
    console.log('handleUserRedirect: currentPath =', currentPath)
    console.log('handleUserRedirect: publicPaths =', publicPaths)
    console.log('handleUserRedirect: está em página pública?', publicPaths.includes(currentPath))
    
    // Só redirecionar se estivermos em uma página pública
    if (!publicPaths.includes(currentPath)) {
      console.log('handleUserRedirect: não está em página pública, não redirecionando')
      return
    }

    console.log('handleUserRedirect: tipo de usuário =', userInfo.tipo)
    
    // Redirecionar baseado no tipo de usuário
    switch (userInfo.tipo) {
      case 'administrador':
      case 'colaborador':
        console.log('handleUserRedirect: redirecionando para /registros')
        navigate('/registros')
        break
      case 'gerencia':
        console.log('handleUserRedirect: redirecionando para /dashboard')
        navigate('/dashboard')
        break
      case 'fretista':
        console.log('handleUserRedirect: redirecionando para /perfil')
        navigate('/perfil')
        break
      default:
        console.log('handleUserRedirect: tipo desconhecido, redirecionando para /dashboard')
        navigate('/dashboard')
    }
  }

  useEffect(() => {
    // Verificar usuário atual ao carregar
    const checkUser = async () => {
      try {
        console.log('AuthContext: Iniciando verificação de usuário...')
        const currentUser = await getCurrentUser()
        console.log('AuthContext: Usuário atual:', currentUser)
        
        if (currentUser) {
          setUser(currentUser)
          console.log('AuthContext: Buscando dados do usuário...')
          // Buscar dados adicionais do usuário na tabela usuarios
          const { data: userInfo, error } = await getUserData(currentUser.id)
          console.log('AuthContext: Dados do usuário:', userInfo, 'Erro:', error)
          
          // Preencher email do fallback se necessário
          if (userInfo && !userInfo.email) {
            userInfo.email = currentUser.email
          }
          
          setUserData(userInfo)
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
      } finally {
        console.log('AuthContext: Finalizando carregamento...')
        setLoading(false)
      }
    }

    checkUser()

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Mudança de estado de auth:', event, session)
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthContext: Usuário fez login, processando...')
          setUser(session.user)
          // Buscar dados adicionais do usuário
          const { data: userInfo, error } = await getUserData(session.user.id)
          console.log('AuthContext: Dados do usuário (auth change):', userInfo, 'Erro:', error)
          
          // Preencher email do fallback se necessário
          if (userInfo && !userInfo.email) {
            userInfo.email = session.user.email
          }
          
          setUserData(userInfo)
          
          // Redirecionar imediatamente se temos dados do usuário e estamos em uma página pública
          const currentPath = window.location.pathname
          const publicPaths = ['/login', '/register', '/unauthorized']
          console.log('AuthContext: Verificando redirecionamento...', {
            userInfo,
            currentPath,
            isPublicPath: publicPaths.includes(currentPath)
          })
          if (userInfo && publicPaths.includes(currentPath)) {
            console.log('AuthContext: Redirecionando usuário...')
            handleUserRedirect(userInfo)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: Usuário fez logout')
          setUser(null)
          setUserData(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const value = {
    user,
    userData,
    loading,
    setUserData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}