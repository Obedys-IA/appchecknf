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
      const isNetworkError =
        (typeof error?.message === 'string' && error.message.includes('Failed to fetch')) ||
        error?.name === 'TypeError'
      const message = isNetworkError
        ? 'Não foi possível conectar ao Supabase (possível problema de DNS/Internet). Verifique sua conexão, proxy/VPN e tente novamente.'
        : 'Erro interno do servidor. Tente novamente.'
      setError(message)
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url('/backgroundlogin.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay translúcido */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
            <img 
              src="/logocanhotos.png" 
              alt="CHECKNF - GDM" 
              className="relative h-20 w-20 mx-auto mb-4 rounded-full shadow-2xl border-4 border-white/20"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent drop-shadow-lg">
            CHECKNF
          </h1>
          <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm">
            Sistema de Gestão de Notas Fiscais
          </Badge>
        </div>

        {/* Card Principal - Mais translúcido */}
        <Card className="shadow-2xl border-0 bg-white/10 backdrop-blur-md border border-white/20">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-white drop-shadow-lg">
              {showForgotPassword ? 'Recuperar Senha' : 'Fazer Login'}
            </CardTitle>
            <CardDescription className="text-center text-white/80">
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
                  <label htmlFor="email" className="text-sm font-medium text-white/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-400 bg-white/20 border-white/30 text-white placeholder:text-white/60 backdrop-blur-sm"
                    required
                  />
                </div>

                {/* Campo Senha */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-white/90 flex items-center gap-2">
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
                      className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-green-400 bg-white/20 border-white/30 text-white placeholder:text-white/60 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold p-1 rounded transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <Alert variant="destructive" className="border-red-300/50 bg-red-500/20 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4 text-red-300" />
                    <AlertDescription className="text-red-100">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão de Login */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all duration-200 shadow-lg hover:shadow-xl" 
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
                    className="text-sm text-green-200 hover:text-white underline transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {/* Campo Email para Reset */}
                <div className="space-y-2">
                  <label htmlFor="resetEmail" className="text-sm font-medium text-white/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email para recuperação
                  </label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-400 bg-white/20 border-white/30 text-white placeholder:text-white/60 backdrop-blur-sm"
                    required
                  />
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <Alert variant="destructive" className="border-red-300/50 bg-red-500/20 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4 text-red-300" />
                    <AlertDescription className="text-red-100">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Mensagem de Sucesso */}
                {resetMessage && (
                  <Alert className="border-green-300/50 bg-green-500/20 backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <AlertDescription className="text-green-100">
                      {resetMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão Enviar */}
                <Button
                  type="submit"
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all duration-200 shadow-lg hover:shadow-xl" 
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
                  className="w-full h-11 border-white/30 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            )}

            <Separator className="my-6 bg-white/30" />

            {/* Link para Registro */}
            <div className="text-center">
              <p className="text-sm text-white/80">
                Não tem uma conta?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-green-200 hover:text-white font-medium underline transition-colors"
                >
                  Registre-se aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login