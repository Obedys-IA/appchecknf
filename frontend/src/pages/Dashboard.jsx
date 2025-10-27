import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  Download, 
  X, 
  Filter, 
  Building, 
  PieChart,
  Calendar,
  Activity,
  Truck,
  Package,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { Separator } from '../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

const Dashboard = () => {
  // State management
  const [stats, setStats] = useState({
    totalNotas: 0,
    notasEntregues: 0,
    notasPendentes: 0,
    notasCanceladas: 0,
    notasDevolvidas: 0,
    eficiencia: 0,
    valorPendente: 0,
    notasAtrasadas: 0,
    notasHoje: 0
  })
  
  const [dashboardData, setDashboardData] = useState({})
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState({
    evolution: null,
    statusDistribution: null,
    topFretistas: null,
    topClients: null
  })
  
  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    period: '',
    fretista: '',
    placa: '',
    cliente: '',
    rede: '',
    vendedor: '',
    uf: '',
    status: '',
    situacao: '',
    dateRange: {
      start: '',
      end: ''
    }
  })

  const filterOptions = {
    periods: [
      { value: 'hoje', label: 'Hoje' },
      { value: 'ontem', label: 'Ontem' },
      { value: 'ultimos7dias', label: 'Últimos 7 dias' },
      { value: 'ultimos30dias', label: 'Últimos 30 dias' },
      { value: 'mesAtual', label: 'Mês atual' },
      { value: 'mesAnterior', label: 'Mês anterior' },
      { value: 'personalizado', label: 'Período personalizado' }
    ],
    ufs: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'],
    status: [
      { value: 'pendente', label: 'Pendente' },
      { value: 'entregue', label: 'Entregue' },
      { value: 'cancelado', label: 'Cancelado' },
      { value: 'devolvido', label: 'Devolvido' }
    ],
    situacao: [
      { value: 'normal', label: 'Normal' },
      { value: 'atrasado', label: 'Atrasado' },
      { value: 'urgente', label: 'Urgente' }
    ]
  }

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'dateRange') {
          queryParams.append(key, value)
        }
      })
      
      if (filters.dateRange.start) queryParams.append('dateStart', filters.dateRange.start)
      if (filters.dateRange.end) queryParams.append('dateEnd', filters.dateRange.end)
      
      const response = await fetch(`${API_URL}/api/dashboard?${queryParams}`)
      const data = await response.json()
      
      setStats(data)
      setDashboardData(data)
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchChartData()
  }, [])

  const fetchChartData = async () => {
    try {
      const [evolutionRes, statusRes, fretistasRes, clientsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/evolution`),
        fetch(`${API_URL}/api/dashboard/status-distribution`),
        fetch(`${API_URL}/api/dashboard/top-fretistas`),
        fetch(`${API_URL}/api/dashboard/top-clients`)
      ])

      const [evolution, statusDistribution, topFretistas, topClients] = await Promise.all([
        evolutionRes.json(),
        statusRes.json(),
        fretistasRes.json(),
        clientsRes.json()
      ])

      setChartData({
        evolution,
        statusDistribution,
        topFretistas,
        topClients
      })
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error)
    }
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      period: '',
      fretista: '',
      placa: '',
      cliente: '',
      rede: '',
      vendedor: '',
      uf: '',
      status: '',
      situacao: '',
      dateRange: {
        start: '',
        end: ''
      }
    })
  }

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleDateFilter = () => {
    fetchDashboardData()
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'entregue': return 'bg-green-100 text-green-800 border-green-200'
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
      case 'devolvido': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const calculateEfficiency = () => {
    const total = dashboardData.totalNotas || 0
    const entregues = dashboardData.notasEntregues || 0
    return total > 0 ? Math.round((entregues / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral do sistema de notas fiscais</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {dashboardData.notasAtrasadas > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção!</AlertTitle>
          <AlertDescription>
            Você tem {dashboardData.notasAtrasadas} notas fiscais em atraso que precisam de atenção.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os dados do dashboard por período e outros critérios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Início</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Fim</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Período</label>
              <Select value={filters.period} onValueChange={(value) => updateFilter('period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchDashboardData}>Aplicar Filtros</Button>
            <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Notas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalNotas || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.crescimentoNotas || 0}% em relação ao mês anterior
            </p>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.notasEntregues || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.percentualEntregues || 0}% do total
            </p>
            <Progress value={calculateEfficiency()} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardData.valorTotal || 0)}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.crescimentoValor || 0}% em relação ao mês anterior
            </p>
            <Progress value={60} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{dashboardData.clientesAtivos || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.crescimentoClientes || 0} novos este mês
            </p>
            <Progress value={85} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboardData.notasPendentes || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.notasCanceladas || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Devolvidas</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.notasDevolvidas || 0}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eficiência</p>
                <p className="text-2xl font-bold text-blue-600">{calculateEfficiency()}%</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
          <TabsTrigger value="acoes">Ações Rápidas</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução Temporal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.evolution ? (
                  <Bar
                    data={{
                      labels: chartData.evolution.labels || [],
                      datasets: [
                        {
                          label: 'Notas Fiscais',
                          data: chartData.evolution.data || [],
                          backgroundColor: 'rgba(59, 130, 246, 0.5)',
                          borderColor: 'rgba(59, 130, 246, 1)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Evolução de Notas Fiscais por Período',
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Carregando dados do gráfico...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.statusDistribution ? (
                  <Doughnut
                    data={{
                      labels: chartData.statusDistribution.labels || [],
                      datasets: [
                        {
                          data: chartData.statusDistribution.data || [],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(59, 130, 246, 1)',
                          ],
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                        title: {
                          display: true,
                          text: 'Status das Notas Fiscais',
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Carregando dados do gráfico...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vencimentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Top 20 Vencimentos Próximos
              </CardTitle>
              <CardDescription>
                Notas fiscais com vencimento nos próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Nota Fiscal</th>
                      <th className="text-left p-2">Valor</th>
                      <th className="text-left p-2">Vencimento</th>
                      <th className="text-left p-2">Dias Restantes</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.vencimentosProximos?.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{item.cliente}</td>
                        <td className="p-2">{item.numeroNota}</td>
                        <td className="p-2">{formatCurrency(item.valor)}</td>
                        <td className="p-2">{item.vencimento}</td>
                        <td className="p-2">
                          <Badge variant={item.diasRestantes <= 3 ? "destructive" : item.diasRestantes <= 7 ? "secondary" : "default"}>
                            {item.diasRestantes} dias
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          Nenhum vencimento próximo encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acoes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Recent Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Arquivos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentFiles.length > 0 ? (
                    recentFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{file.nome}</span>
                          <span className="text-xs text-gray-500">{file.data} - {file.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum arquivo processado ainda</p>
                    </div>
                  )}
                </div>
                <Separator className="my-4" />
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Ver Todos os Registros
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>
                  Acesso rápido às funcionalidades mais utilizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <Button className="h-16 flex items-center justify-start gap-3">
                    <FileText className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Processar PDF</div>
                      <div className="text-xs opacity-70">Upload e análise</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-16 flex items-center justify-start gap-3">
                    <Download className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Exportar Excel</div>
                      <div className="text-xs opacity-70">Relatórios completos</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-16 flex items-center justify-start gap-3">
                    <Users className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Gerenciar Usuários</div>
                      <div className="text-xs opacity-70">Controle de acesso</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Backend</span>
                  <Badge className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Banco de Dados</span>
                  <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Google Sheets</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Sincronizando</Badge>
                </div>
                <Separator />
                <div className="text-xs text-gray-500">
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard