import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/supabase'
import { Button } from './ui/button'
import { 
  Home, 
  FileText, 
  BarChart3, 
  Users, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Upload
} from 'lucide-react'

const Layout = ({ children }) => {
  const { user, userData } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Se não há dados do usuário na tabela usuarios, criar dados temporários
  let effectiveUserData = userData
  if (!userData && user) {
    effectiveUserData = {
      id: user.id,
      nome: user.email?.split('@')[0] || 'Usuário',
      email: user.email,
      tipo: 'administrador', // Tipo padrão para permitir acesso
      ativo: true
    }
  }

  // Definir navegação baseada no tipo de usuário
  const getNavigation = () => {
    const baseNav = [
      { name: 'Dashboard', href: '/dashboard', icon: Home, types: ['administrador', 'colaborador', 'gerencia'] },
      { name: 'Processar PDFs', href: '/processar', icon: Upload, types: ['administrador', 'colaborador'] },
      { name: 'Registros', href: '/registros', icon: FileText, types: ['administrador', 'colaborador', 'gerencia'] },
      { name: 'Relatórios', href: '/relatorios', icon: BarChart3, types: ['administrador', 'colaborador', 'gerencia'] },
      { name: 'Usuários', href: '/usuarios', icon: Users, types: ['administrador'] },
      { name: 'Perfil', href: '/perfil', icon: User, types: ['administrador', 'colaborador', 'fretista', 'gerencia'] },
      { name: 'Configurações', href: '/configuracoes', icon: Settings, types: ['administrador'] }
    ]

    return baseNav.filter(item => item.types.includes(effectiveUserData?.tipo))
  }

  const navigation = getNavigation()

  const isActive = (href) => {
    return location.pathname === href
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <img className="h-8 w-auto" src="/logocanhotos.png" alt="CHECKNF - GDM" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {effectiveUserData?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{effectiveUserData?.nome}</p>
                <p className="text-xs text-gray-500 capitalize">{effectiveUserData?.tipo}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b">
            <img className="h-8 w-auto mr-3" src="/logocanhotos.png" alt="CHECKNF - GDM" />
            <div>
              <h1 className="text-lg font-bold text-green-800">CHECKNF</h1>
              <p className="text-xs text-green-600">GDM</p>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {effectiveUserData?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{effectiveUserData?.nome}</p>
                <p className="text-xs text-gray-500 capitalize">{effectiveUserData?.tipo}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <img className="h-8 w-auto mr-2" src="/logocanhotos.png" alt="CHECKNF - GDM" />
            <span className="text-lg font-bold text-green-800">CHECKNF</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout