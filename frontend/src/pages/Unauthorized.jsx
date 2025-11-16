import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import PageHeader from '../components/PageHeader'
import { AlertTriangle } from 'lucide-react'

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Acesso Negado"
          subtitle="Você não tem permissão para acessar esta página."
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        />
  <Card className="card">
          <CardContent className="text-center space-y-4 p-6">
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
    </div>
  )
}

export default Unauthorized