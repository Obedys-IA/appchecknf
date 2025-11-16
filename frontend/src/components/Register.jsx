import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signUp(
        formData.email, 
        formData.password, 
        {
          nome: formData.nome,
          tipo: 'novo' // Novo usuário sempre começa como 'novo'
        }
      )

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este email já está cadastrado')
        } else {
          setError('Erro ao criar conta. Tente novamente.')
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
      console.error('Erro no registro:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/backgroundlogin.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Conta Criada com Sucesso!</CardTitle>
            <CardDescription className="text-white/80">
              Sua conta foi criada e está aguardando aprovação do administrador.
              Você receberá um email quando sua conta for aprovada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/backgroundlogin.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logocanhotos.png" 
            alt="CHECKNF - GDM" 
            className="h-20 w-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white">CHECKNF - GDM</h1>
          <p className="text-white/80 mt-2">Criar Nova Conta</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Registrar-se</CardTitle>
            <CardDescription className="text-white/80">
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-2 text-white/90">
                  Nome do Usuário *
                </label>
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/90">
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-white/90">
                  Senha *
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-white/90">
                  Confirmar Senha *
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirme sua senha"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                  required
                />
              </div>

              {error && (
                <div className="text-red-300 text-sm bg-red-500/20 p-3 rounded-md border border-red-500/30">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold" 
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/70">
                Já tem uma conta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-orange-400 hover:text-orange-300 font-medium"
                >
                  Faça login aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-white/60 text-center">
          <p>* Campos obrigatórios</p>
          <p>Sua conta será criada com status "Novo" e precisará ser aprovada por um administrador.</p>
        </div>
      </div>
    </div>
  )
}

export default Register