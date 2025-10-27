import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <CardTitle className="text-2xl text-red-600">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Entre em contato com o administrador do sistema se você acredita que deveria ter acesso a esta funcionalidade.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="w-full"
            >
              Voltar à Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Unauthorized