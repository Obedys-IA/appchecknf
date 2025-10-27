import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, resetPassword, createAdminUser } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Eye, EyeOff } from 'lucide-react'

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
      // Verificar se é o email do administrador
      if (email === 'obedys.ia@gmail.com') {
        console.log('Tentativa de login do administrador')
        
        // Tentar fazer login diretamente
        const { data: loginData, error: loginError } = await signIn(email, password)
        
        if (loginError) {
          console.log('Erro no login, tentando criar usuário administrador...')
          
          // Tentar criar o usuário administrador
          const { data: createData, error: createError } = await createAdminUser(email, password)
          
          if (createError) {
            console.error('Erro ao criar usuário administrador:', createError)
            if (createError.message.includes('User already registered')) {
              setError('Usuário já existe. Verifique sua senha.')
            } else {
              setError('Erro ao criar usuário administrador: ' + createError.message)
            }
            return
          }
          
          if (createData && createData.user) {
            console.log('Usuário administrador criado com sucesso')
            // Aguardar um pouco e tentar login novamente
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const { data: secondLoginData, error: secondLoginError } = await signIn(email, password)
            
            if (secondLoginError) {
              console.error('Erro no segundo login:', secondLoginError)
              setError('Usuário criado, mas erro no login: ' + secondLoginError.message)
              return
            }
            
            if (secondLoginData.user) {
              console.log('Login do administrador bem-sucedido após criação')
              return
            }
          }
        } else if (loginData.user) {
          // Login bem-sucedido na primeira tentativa
          console.log('Login do administrador bem-sucedido')
          return
        }
      }

      // Para usuários não administradores, fazer login normal
      const { data, error } = await signIn(email, password)
      
      if (error) {
        console.error('Erro no login:', error)
        setError('Email ou senha incorretos')
        return
      }

      if (data.user) {
        console.log('Login bem-sucedido')
      }
    } catch (error) {
      console.error('Erro inesperado no login:', error)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')
    setError('')

    try {
      const { error } = await resetPassword(resetEmail)
      
      if (error) {
        setError('Erro ao enviar email de recuperação. Verifique o email informado.')
        return
      }

      setResetMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetMessage('')
        setResetEmail('')
      }, 3000)
    } catch (err) {
      setError('Erro ao enviar email de recuperação. Tente novamente.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logocanhotos.png" 
            alt="CHECKNF - GDM" 
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-green-800">CHECKNF - GDM</h1>
          <p className="text-green-600 mt-2">Sistema de Gestão de Notas Fiscais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fazer Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForgotPassword ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-green-600 hover:text-green-800 underline"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium mb-2">
                    Email para recuperação
                  </label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {resetMessage && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                    {resetMessage}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Enviando...' : 'Enviar Email de Recuperação'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetEmail('')
                      setResetMessage('')
                      setError('')
                    }}
                    className="text-sm text-green-600 hover:text-green-800 underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  Registre-se aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Tipos de usuário:</p>
          <p><strong>Administrador:</strong> Acesso completo ao sistema</p>
          <p><strong>Colaborador:</strong> Acesso a registros e relatórios</p>
          <p><strong>Fretista:</strong> Acesso apenas ao próprio perfil</p>
          <p><strong>Gerência:</strong> Acesso a dashboards e relatórios</p>
        </div>
      </div>
    </div>
  )
}

export default Login