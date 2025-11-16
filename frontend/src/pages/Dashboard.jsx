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
import { useTheme } from '../context/ThemeContext'
import PageHeader from '../components/PageHeader.jsx'
import { API_URL } from '../config/api'
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


const Dashboard = () => {
  const { theme } = useTheme()
  const cssVars = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const textColor = (cssVars?.getPropertyValue('--text') || (theme === 'dark' ? '#FFFFFF' : '#0f172a')).trim()
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
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
  const [systemStatus, setSystemStatus] = useState({
    api: 'offline',
    database: 'disconnected',
    sheets: 'no_connection',
    updatedAt: null
  })
  
  // Estado para opções de filtros dinâmicos
  const [filterOptions, setFilterOptions] = useState({
    periods: [
      { value: 'hoje', label: 'Hoje' },
      { value: 'ontem', label: 'Ontem' },
      { value: 'ultimos7dias', label: 'Últimos 7 dias' },
      { value: 'ultimos30dias', label: 'Últimos 30 dias' },
      { value: 'mesAtual', label: 'Mês atual' },
      { value: 'mesAnterior', label: 'Mês anterior' },
      { value: 'personalizado', label: 'Período personalizado' }
    ],
    fretistas: [],
    placas: [],
    clientes: [],
    redes: [],
    vendedores: [],
    ufs: [],
    status: [],
    situacoes: []
  })
  
  // Health check do sistema (API, banco, Google Sheets)
  useEffect(() => {
    let cancelled = false
    async function fetchHealth() {
      try {
        const resp = await fetch(`${API_URL}/api/health`)
        if (!resp.ok) throw new Error('Falha ao obter saúde do sistema')
        const json = await resp.json()
        if (!cancelled) {
          setSystemStatus({
            api: json.api === 'online' ? 'online' : 'offline',
            database: json.database === 'connected' ? 'connected' : 'disconnected',
            sheets: json.sheets === 'synced' ? 'synced' : 'no_connection',
            updatedAt: new Date()
          })
        }
      } catch (e) {
        if (!cancelled) {
          setSystemStatus({
            api: 'offline',
            database: 'disconnected',
            sheets: 'no_connection',
            updatedAt: new Date()
          })
        }
      }
    }
    fetchHealth()
    const id = setInterval(fetchHealth, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])
  
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
    searchText: '',
    dateRange: {
      start: '',
      end: ''
    }
  })



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

  // Fetch filter options from backend
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/filter-options`)
      const data = await response.json()
      
      setFilterOptions(prev => ({
        ...prev,
        fretistas: data.fretistas?.map(f => ({ value: f, label: f })) || [],
        placas: data.placas?.map(p => ({ value: p, label: p })) || [],
        clientes: data.clientes?.map(c => ({ value: c, label: c })) || [],
        redes: data.redes?.map(r => ({ value: r, label: r })) || [],
        vendedores: data.vendedores?.map(v => ({ value: v, label: v })) || [],
        ufs: data.ufs?.map(u => ({ value: u, label: u })) || [],
        status: data.status?.map(s => ({ value: s, label: s })) || [],
        situacoes: data.situacoes?.map(s => ({ value: s, label: s })) || []
      }))
    } catch (error) {
      console.error('Erro ao carregar opções de filtros:', error)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchChartData()
    fetchFilterOptions()
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
        evolutionData: evolution,
        statusDistribution: statusDistribution,
        topFretistas: topFretistas,
        topClients: topClients
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
      searchText: '',
      dateRange: {
        start: '',
        end: ''
      }
    })
  }

  // Helper para exibir badge de Situação padronizada (igual ao Registros)
  const renderSituacaoBadge = (situacaoRaw) => {
    const situacao = (situacaoRaw || 'PENDENTE').toString()
    switch (situacao.toLowerCase()) {
      case 'pendente':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">PENDENTE</Badge>
      case 'cancelada':
        return <Badge variant="destructive" className="text-xs">CANCELADA</Badge>
      case 'entregue':
        return <Badge variant="outline" className="text-xs text-green-700 border-green-200">ENTREGUE</Badge>
      case 'devolvida':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">DEVOLVIDA</Badge>
      default:
        return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">{situacao.toUpperCase()}</Badge>
    }
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
      case 'entregue': return 'bg-green-900 text-white-800 border-white-200'
      case 'pendente': return 'bg-red-900 text-white-800 border-white-500'
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
      case 'devolvido': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDiasGradientColor = (dias) => {
    if (dias === undefined || dias === null) return 'bg-gray-100 text-gray-800 border-gray-200'
    const d = Number(dias)
    if (isNaN(d)) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (d <= 0) return 'bg-red-900 text-white border-red-900'
    if (d <= 1) return 'bg-red-800 text-white border-red-800'
    if (d <= 3) return 'bg-red-700 text-white border-red-700'
    if (d <= 7) return 'bg-red-500 text-white border-red-500'
    if (d <= 14) return 'bg-red-300 text-red-800 border-red-300'
    return 'bg-red-100 text-red-800 border-red-100'
  }

  const calculateEfficiency = () => {
    const total = dashboardData.totalNotas || 0
    const entregues = dashboardData.notasEntregues || 0
    return total > 0 ? Math.round((entregues / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="card">
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
    <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      {/* Header banner */}
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do sistema de notas fiscais"
        icon={<PieChart className="h-6 w-6 text-green-600" />}
      />

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
       <Card className="card">
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
           {/* Primeira linha de filtros - Datas e Período */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

           {/* Segunda linha de filtros - Fretista, Placa, Cliente */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div>
               <label className="block text-sm font-medium mb-2">Fretista</label>
               <Select value={filters.fretista} onValueChange={(value) => updateFilter('fretista', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o fretista" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.fretistas.map((fretista) => (
                     <SelectItem key={fretista.value} value={fretista.value}>
                       {fretista.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">Placa</label>
               <Select value={filters.placa} onValueChange={(value) => updateFilter('placa', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a placa" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.placas.map((placa) => (
                     <SelectItem key={placa.value} value={placa.value}>
                       {placa.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">Cliente</label>
               <Select value={filters.cliente} onValueChange={(value) => updateFilter('cliente', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o cliente" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.clientes.map((cliente) => (
                     <SelectItem key={cliente.value} value={cliente.value}>
                       {cliente.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>

           {/* Terceira linha de filtros - Rede, Vendedor, UF */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div>
               <label className="block text-sm font-medium mb-2">Rede</label>
               <Select value={filters.rede} onValueChange={(value) => updateFilter('rede', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a rede" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.redes.map((rede) => (
                     <SelectItem key={rede.value} value={rede.value}>
                       {rede.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">Vendedor</label>
               <Select value={filters.vendedor} onValueChange={(value) => updateFilter('vendedor', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o vendedor" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.vendedores.map((vendedor) => (
                     <SelectItem key={vendedor.value} value={vendedor.value}>
                       {vendedor.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">UF</label>
               <Select value={filters.uf} onValueChange={(value) => updateFilter('uf', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a UF" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.ufs.map((uf) => (
                     <SelectItem key={uf.value} value={uf.value}>
                       {uf.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>

           {/* Quarta linha de filtros - Status, Situação, Busca */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div>
               <label className="block text-sm font-medium mb-2">Status</label>
               <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o status" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.status.map((status) => (
                     <SelectItem key={status.value} value={status.value}>
                       {status.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">Situação</label>
               <Select value={filters.situacao} onValueChange={(value) => updateFilter('situacao', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a situação" />
                 </SelectTrigger>
                 <SelectContent>
                   {filterOptions.situacoes.map((situacao) => (
                     <SelectItem key={situacao.value} value={situacao.value}>
                       {situacao.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <label className="block text-sm font-medium mb-2">Busca Livre</label>
               <Input
                 type="text"
                 placeholder="Digite para buscar..."
                 value={filters.searchText}
                 onChange={(e) => updateFilter('searchText', e.target.value)}
               />
             </div>
           </div>

           <div className="flex gap-2">
            <Button className="btn btn-green" onClick={fetchDashboardData}>Aplicar Filtros</Button>
            <Button className="btn btn-outline" variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
          </div>
         </CardContent>
       </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Notas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalNotas || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.crescimentoNotas || 0}% em relação ao mês anterior
            </p>
            <Progress value={dashboardData.totalNotas > 0 ? Math.min((dashboardData.totalNotas / 100) * 100, 100) : 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="card">
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

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardData.valorTotal || 0)}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.crescimentoValor || 0}% em relação ao mês anterior
            </p>
            <Progress value={dashboardData.crescimentoValor > 0 ? Math.min(dashboardData.crescimentoValor, 100) : 0} className="mt-2" />
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
            <Progress value={dashboardData.crescimentoClientes > 0 ? Math.min(dashboardData.crescimentoClientes * 10, 100) : 0} className="mt-2" />
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
            <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
            <TabsTrigger value="atrasos">Atrasos</TabsTrigger>
            <TabsTrigger value="acoes">Ações Rápidas</TabsTrigger>
          </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution Chart */}
            <Card className="shadow-2xl border dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução Temporal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.evolutionData ? (
                  <Bar
                    data={{
                      labels: chartData.evolutionData.labels || [],
                      datasets: [
                        {
                          label: 'Notas Fiscais',
                          data: chartData.evolutionData.data || [],
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
                          labels: { color: textColor },
                        },
                        title: {
                          display: true,
                          text: 'Evolução de Notas Fiscais por Período',
                          color: textColor,
                        },
                        tooltip: {
                          titleColor: textColor,
                          bodyColor: textColor,
                        },
                      },
                      scales: {
                        x: {
                          ticks: { color: textColor },
                          grid: { color: gridColor },
                        },
                        y: {
                          ticks: { color: textColor },
                          grid: { color: gridColor },
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
                          labels: { color: textColor },
                        },
                        title: {
                          display: true,
                          text: 'Status das Notas Fiscais',
                          color: textColor,
                        },
                        tooltip: {
                          titleColor: textColor,
                          bodyColor: textColor,
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

        <TabsContent value="atrasos">
          <Card className="card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Top 30 Maiores Atrasos
              </CardTitle>
              <CardDescription>
                Registros com situação diferente de "Dentro do Prazo"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="tabela-registros w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Nota Fiscal</th>
                      <th className="text-left p-2">Valor</th>
                      <th className="text-left p-2">Fretista</th>
                      <th className="text-left p-2">Data de Entrega</th>
                      <th className="text-left p-2">Emissão</th>
                      <th className="text-left p-2">Dias de Atraso</th>
                      <th className="text-left p-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.atrasosTop?.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{item.cliente}</td>
                        <td className="p-2">{item.numeroNota}</td>
                        <td className="p-2">{formatCurrency(item.valor)}</td>
                        <td className="p-2">{item.fretista || '-'}</td>
                        <td className="p-2">{item.dataEntrega || '-'}</td>
                        <td className="p-2">{item.emissao}</td>
                        <td className="p-2">
                          <Badge className={getDiasGradientColor(item.diasAtraso)}>
                            {item.diasAtraso} dias
                          </Badge>
                        </td>
                        <td className="p-2">
                          {renderSituacaoBadge(item.situacao)}
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-500">
                          Nenhum atraso encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimentos">
          <Card className="card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Top 30 Vencimentos Próximos
              </CardTitle>
              <CardDescription>
                Notas fiscais com vencimento nos próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="tabela-registros w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Nota Fiscal</th>
                      <th className="text-left p-2">Valor</th>
                      <th className="text-left p-2">Fretista</th>
                      <th className="text-left p-2">Data de Entrega</th>
                      <th className="text-left p-2">Vencimento</th>
                      <th className="text-left p-2">Dias Restantes</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.vencimentosProximos?.filter(v => (v.status || '').toUpperCase() === 'PENDENTE').map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{item.cliente}</td>
                        <td className="p-2">{item.numeroNota}</td>
                        <td className="p-2">{formatCurrency(item.valor)}</td>
                        <td className="p-2">{item.fretista || '-'}</td>
                        <td className="p-2">{item.dataEntrega || '-'}</td>
                        <td className="p-2">{item.vencimento}</td>
                        <td className="p-2">
                          <Badge className={getDiasGradientColor(item.diasRestantes)}>
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
                        <td colSpan="8" className="text-center py-8 text-gray-500">
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
                          <span className="text-sm font-medium block whitespace-normal break-words">{file.nome}</span>
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
                <Button variant="outline" size="sm" className="btn btn-outline w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Ver Todos os Registros
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="card">
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>
                  Acesso rápido às funcionalidades mais utilizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <Button className="btn btn-green h-16 flex items-center justify-start gap-3">
                    <FileText className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Processar PDF</div>
                      <div className="text-xs opacity-70">Upload e análise</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="btn btn-outline h-16 flex items-center justify-start gap-3">
                    <Download className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Exportar Excel</div>
                      <div className="text-xs opacity-70">Relatórios completos</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="btn btn-outline h-16 flex items-center justify-start gap-3">
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
                  <Badge className={`${systemStatus.api === 'online' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {systemStatus.api === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Banco de Dados</span>
                  <Badge className={`${systemStatus.database === 'connected' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {systemStatus.database === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Google Sheets</span>
                  <Badge className={`${systemStatus.sheets === 'synced' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {systemStatus.sheets === 'synced' ? 'Sincronizado' : 'Sem Conexão'}
                  </Badge>
                </div>
                <Separator />
                <div className="text-xs text-gray-500">
                  Última atualização: {systemStatus.updatedAt ? systemStatus.updatedAt.toLocaleString('pt-BR') : '—'}
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