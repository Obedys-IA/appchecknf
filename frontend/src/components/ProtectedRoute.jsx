import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const { user, userData, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Se não há dados do usuário na tabela usuarios, criar dados temporários
  let effectiveUserData = userData
  if (!userData && user) {
    effectiveUserData = {
      id: user.id,
      nome: user.email?.split('@')[0] || 'Usuário',
      email: user.email,
      tipo: 'novo', // Fallback padrão: usuário aguardando aprovação
      ativo: true
    }
  }

  if (!effectiveUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar dados do usuário</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const normalizedTipo = (effectiveUserData.tipo || '').toLowerCase()

  // Verificar se o usuário está aprovado
  if (normalizedTipo === 'novo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-yellow-500 text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Aguardando Aprovação</h2>
          <p className="text-gray-600 mb-6">
            Sua conta foi criada com sucesso, mas ainda está aguardando aprovação do administrador.
            Você receberá um email quando sua conta for aprovada.
          </p>
          <button
            onClick={() => {
              // Implementar logout
              window.location.href = '/login'
            }}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    )
  }

  // Verificar se o tipo de usuário tem permissão para acessar a rota
  if (allowedTypes.length > 0 && !allowedTypes.includes(normalizedTipo)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute