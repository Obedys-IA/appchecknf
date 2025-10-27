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
    confirmPassword: '',
    telefone: '',
    empresa: ''
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
          telefone: formData.telefone,
          empresa: formData.empresa,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Conta Criada com Sucesso!</CardTitle>
            <CardDescription>
              Sua conta foi criada e está aguardando aprovação do administrador.
              Você receberá um email quando sua conta for aprovada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
          <p className="text-green-600 mt-2">Criar Nova Conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrar-se</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium mb-2">
                  Nome Completo *
                </label>
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium mb-2">
                  Telefone
                </label>
                <Input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label htmlFor="empresa" className="block text-sm font-medium mb-2">
                  Empresa
                </label>
                <Input
                  id="empresa"
                  name="empresa"
                  type="text"
                  value={formData.empresa}
                  onChange={handleChange}
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Senha *
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirmar Senha *
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirme sua senha"
                  required
                />
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
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  Faça login aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>* Campos obrigatórios</p>
          <p>Sua conta será criada com status "Novo" e precisará ser aprovada por um administrador.</p>
        </div>
      </div>
    </div>
  )
}

export default Register