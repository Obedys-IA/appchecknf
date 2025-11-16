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
    
    // Verificar se é usuário novo (aguardando aprovação)
    if (userInfo.tipo === 'novo' || userInfo.status === 'pendente') {
      console.log('handleUserRedirect: usuário novo/pendente, redirecionando para /perfil')
      navigate('/perfil')
      return
    }
    
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
        console.log('handleUserRedirect: tipo desconhecido, redirecionando para /perfil')
        navigate('/perfil')
    }
  }

  useEffect(() => {
    let isMounted = true

    // Função para processar usuário autenticado
    const processAuthenticatedUser = async (authUser) => {
      if (!isMounted) return
      
      console.log('AuthContext: Processando usuário autenticado:', authUser.id)
      setUser(authUser)
      
      try {
        // Buscar dados adicionais do usuário na tabela usuarios
        const { data: userInfo, error } = await getUserData(authUser.id)
        console.log('AuthContext: Dados do usuário:', userInfo, 'Erro:', error)
        
        if (!isMounted) return
        
        if (userInfo) {
          // Preencher email se necessário
          if (!userInfo.email) {
            userInfo.email = authUser.email
          }
          setUserData(userInfo)
          
          // Redirecionar se estamos em uma página pública
          const currentPath = window.location.pathname
          const publicPaths = ['/login', '/register', '/unauthorized']
          console.log('AuthContext: Verificando redirecionamento...', {
            userInfo,
            currentPath,
            isPublicPath: publicPaths.includes(currentPath)
          })
          if (publicPaths.includes(currentPath)) {
            console.log('AuthContext: Redirecionando usuário...')
            handleUserRedirect(userInfo)
          }
        } else {
          console.error('AuthContext: Não foi possível carregar dados do usuário')
          setUserData(null)
        }
      } catch (error) {
        console.error('Erro ao processar usuário:', error)
        if (isMounted) {
          setUserData(null)
        }
      }
    }

    // Verificar usuário atual ao carregar (apenas uma vez)
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Iniciando verificação inicial de usuário...')
        const currentUser = await getCurrentUser()
        
        if (!isMounted) return
        
        if (currentUser) {
          // Processar dados adicionais do usuário em segundo plano
          // para não bloquear a liberação do estado de carregamento.
          processAuthenticatedUser(currentUser)
        } else {
          console.log('AuthContext: Nenhum usuário autenticado')
          setUser(null)
          setUserData(null)
        }
      } catch (error) {
        console.error('Erro na verificação inicial:', error)
        if (isMounted) {
          setUser(null)
          setUserData(null)
        }
      } finally {
        if (isMounted) {
          console.log('AuthContext: Finalizando carregamento inicial...')
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log('AuthContext: Mudança de estado de auth:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthContext: Usuário fez login, processando...')
          // Não aguardar para não bloquear a UI
          processAuthenticatedUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: Usuário fez logout')
          setUser(null)
          setUserData(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
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