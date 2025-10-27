import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
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
      // Dashboard - Acesso para administrador, colaborador e gerencia
      { name: 'Dashboard', href: '/dashboard', icon: Home, types: ['administrador', 'colaborador', 'gerencia'] },
      
      // Processar PDFs - Apenas administrador e colaborador (operacional)
      { name: 'Processar PDFs', href: '/processar', icon: Upload, types: ['administrador', 'colaborador'] },
      
      // Registros - Visualização para administrador, colaborador e gerencia
      { name: 'Registros', href: '/registros', icon: FileText, types: ['administrador', 'colaborador', 'gerencia'] },
      
      // Relatórios - Acesso para administrador, colaborador e gerencia
      { name: 'Relatórios', href: '/relatorios', icon: BarChart3, types: ['administrador', 'colaborador', 'gerencia'] },
      
      // Usuários - Apenas administrador (gestão de usuários)
      { name: 'Usuários', href: '/usuarios', icon: Users, types: ['administrador'] },
      
      // Perfil - Todos os usuários podem acessar seu próprio perfil
      { name: 'Perfil', href: '/perfil', icon: User, types: ['administrador', 'colaborador', 'fretista', 'gerencia', 'novo'] },
      
      // Configurações - Apenas administrador (configurações do sistema)
      { name: 'Configurações', href: '/configuracoes', icon: Settings, types: ['administrador'] }
    ]

    // Para usuário novo/pendente, mostrar apenas o perfil
    if (effectiveUserData?.tipo === 'novo' || effectiveUserData?.status === 'pendente') {
      return baseNav.filter(item => item.href === '/perfil')
    }

    // Para usuário fretista, mostrar apenas o perfil
    if (effectiveUserData?.tipo === 'fretista') {
      return baseNav.filter(item => item.href === '/perfil')
    }

    // Para usuário gerencia, acesso a dashboard, registros, relatórios e perfil (sem processar PDFs)
    if (effectiveUserData?.tipo === 'gerencia') {
      return baseNav.filter(item => 
        ['dashboard', 'registros', 'relatorios', 'perfil'].includes(item.href.replace('/', ''))
      )
    }

    return baseNav.filter(item => item.types.includes(effectiveUserData?.tipo))
  }

  const navigation = getNavigation()

  const isActive = (href) => {
    return location.pathname === href
  }

  const getUserTypeColor = (tipo) => {
    const colors = {
      'administrador': 'bg-red-100 text-red-800',
      'colaborador': 'bg-blue-100 text-blue-800',
      'gerencia': 'bg-purple-100 text-purple-800',
      'fretista': 'bg-green-100 text-green-800'
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col">
          <Card className="h-full rounded-none border-r shadow-xl">
            <div className="flex h-16 items-center justify-between px-6 border-b bg-gradient-to-r from-green-600 to-green-700">
              <div className="flex items-center">
                <img className="h-8 w-auto mr-3" src="/logocanhotos.png" alt="CHECKNF - GDM" />
                <div>
                  <h1 className="text-lg font-bold text-white">CHECKNF</h1>
                  <p className="text-xs text-green-100">GDM</p>
                </div>
              </div>
              <Button
                onClick={() => setSidebarOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-green-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <CardContent className="flex-1 p-4">
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-green-100 text-green-700 shadow-sm border border-green-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </CardContent>
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">
                      {effectiveUserData?.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{effectiveUserData?.nome}</p>
                  <Badge variant="secondary" className={`text-xs ${getUserTypeColor(effectiveUserData?.tipo)}`}>
                    {effectiveUserData?.tipo}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full hover:bg-red-50 hover:border-red-200 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <Card className="h-full rounded-none border-r shadow-xl">
          <div className="flex items-center h-16 px-6 border-b bg-gradient-to-r from-green-600 to-green-700">
            <img className="h-8 w-auto mr-3" src="/logocanhotos.png" alt="CHECKNF - GDM" />
            <div>
              <h1 className="text-lg font-bold text-white">CHECKNF</h1>
              <p className="text-xs text-green-100">GDM</p>
            </div>
          </div>
          <CardContent className="flex-1 p-4">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-green-100 text-green-700 shadow-sm border border-green-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </CardContent>
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">
                    {effectiveUserData?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-gray-900">{effectiveUserData?.nome}</p>
                <Badge variant="secondary" className={`text-xs ${getUserTypeColor(effectiveUserData?.tipo)}`}>
                  {effectiveUserData?.tipo}
                </Badge>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full hover:bg-red-50 hover:border-red-200 hover:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </Card>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar for mobile */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white/80 backdrop-blur-md border-b shadow-sm">
          <Button
            onClick={() => setSidebarOpen(true)}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center">
            <img className="h-8 w-auto mr-2" src="/logocanhotos.png" alt="CHECKNF - GDM" />
            <span className="text-lg font-bold text-green-800">CHECKNF</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout