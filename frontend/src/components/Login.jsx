import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, resetPassword, createAdminUser } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.')
        } else {
          setError(error.message)
        }
        return
      }

      if (data?.user) {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      setError('Erro interno do servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setError('')
    setResetMessage('')

    try {
      const { error } = await resetPassword(resetEmail)
      
      if (error) {
        setError(error.message)
      } else {
        setResetMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
      }
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error)
      setError('Erro ao enviar email de recuperação. Tente novamente.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    try {
      const result = await createAdminUser()
      if (result.success) {
        alert('Usuário administrador criado com sucesso!')
      } else {
        alert('Erro: ' + result.error)
      }
    } catch (error) {
      console.error('Erro ao criar admin:', error)
      alert('Erro ao criar usuário administrador')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-4">
      <div className="w-full max-w-md">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
            <img 
              src="/logocanhotos.png" 
              alt="CHECKNF - GDM" 
              className="relative h-20 w-20 mx-auto mb-4 rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
            CHECKNF
          </h1>
          <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">
            Sistema de Gestão de Notas Fiscais
          </Badge>
        </div>

        {/* Card Principal */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-800">
              {showForgotPassword ? 'Recuperar Senha' : 'Fazer Login'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {showForgotPassword 
                ? 'Digite seu email para receber as instruções de recuperação'
                : 'Entre com suas credenciais para acessar o sistema'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!showForgotPassword ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Campo Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Campo Senha */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-green-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão de Login */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Entrando...
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                {/* Link Esqueceu Senha */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-green-600 hover:text-green-800 underline transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {/* Campo Email para Reset */}
                <div className="space-y-2">
                  <label htmlFor="resetEmail" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email para recuperação
                  </label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Mensagem de Sucesso */}
                {resetMessage && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {resetMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão Enviar */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </div>
                  ) : (
                    'Enviar Email de Recuperação'
                  )}
                </Button>

                {/* Voltar ao Login */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail('')
                    setResetMessage('')
                    setError('')
                  }}
                  className="w-full h-11 border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            )}

            <Separator className="my-6" />

            {/* Link para Registro */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-green-600 hover:text-green-800 font-medium underline transition-colors"
                >
                  Registre-se aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações dos Tipos de Usuário */}
        <Card className="mt-6 bg-white/60 backdrop-blur-sm border-gray-200">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Tipos de Usuário</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center bg-blue-50 text-blue-700 border-blue-200">
                  Administrador
                </Badge>
                <p className="text-gray-600 text-center">Acesso completo</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200">
                  Colaborador
                </Badge>
                <p className="text-gray-600 text-center">Registros e relatórios</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center bg-orange-50 text-orange-700 border-orange-200">
                  Fretista
                </Badge>
                <p className="text-gray-600 text-center">Próprio perfil</p>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center bg-purple-50 text-purple-700 border-purple-200">
                  Gerência
                </Badge>
                <p className="text-gray-600 text-center">Dashboards</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Admin (apenas para desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <Button
              onClick={handleCreateAdmin}
              variant="outline"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Criar Admin (Dev)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login