import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Separator } from '../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import ModalIncluirRegistro from '../components/ModalIncluirRegistro'
import ModalEditarRegistro from '../components/ModalEditarRegistro'
import { addRowToSheet, updateRowInSheet } from '../services/googleSheets'
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download, 
  Share, 
  Eye,
  Calendar,
  FileText,
  MessageCircle,
  Plus,
  MoreHorizontal,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  XCircle,
  RotateCcw,
  SortAsc,
  SortDesc,
  List,
  Grid3X3
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'

const Registros = () => {
  const [registros, setRegistros] = useState([])
  const [filteredRegistros, setFilteredRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filtros padronizados igual ao Dashboard
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

  const [selectedRegistros, setSelectedRegistros] = useState([])
  const [modalIncluirOpen, setModalIncluirOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [registroEditando, setRegistroEditando] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'table' ou 'cards'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  // Estados do modal de status personalizado
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusModalRegistro, setStatusModalRegistro] = useState(null)
  const [statusCustomText, setStatusCustomText] = useState('')
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  // Estados para filtros dos cabeçalhos da tabela
  const [headerFilters, setHeaderFilters] = useState({
    cliente: '',
    fretista: '',
    status: '',
    situacao: '',
    pefin: ''
  })

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

  useEffect(() => {
    loadRegistros()
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    filterRegistros()
  }, [searchTerm, filters, registros])

  // Função para atualizar filtros
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Função para limpar filtros
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
    setSearchTerm('')
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

  const loadRegistros = async () => {
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
      
      const response = await fetch(`${API_URL}/api/registros?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setRegistros(data)
      } else {
        console.error('Erro ao carregar registros da API')
        setRegistros([])
      }
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
      setRegistros([])
      setLoading(false)
    }
  }

  const filterRegistros = () => {
    let filtered = registros

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(registro =>
        (registro.numero_nf || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (registro.nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (registro.fretista || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (registro.placa || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtros específicos
    if (filters.dataInicio) {
      filtered = filtered.filter(registro => registro.data_emissao >= filters.dataInicio)
    }
    if (filters.dataFim) {
      filtered = filtered.filter(registro => registro.data_emissao <= filters.dataFim)
    }
    if (filters.fretista) {
      filtered = filtered.filter(registro => registro.fretista === filters.fretista)
    }
    if (filters.placa) {
      filtered = filtered.filter(registro => registro.placa === filters.placa)
    }
    if (filters.cliente) {
      filtered = filtered.filter(registro => registro.nome_fantasia === filters.cliente)
    }
    if (filters.status) {
      filtered = filtered.filter(registro => registro.status === filters.status)
    }
    if (filters.situacao) {
      filtered = filtered.filter(registro => registro.situacao === filters.situacao)
    }

  // Filtros dos cabeçalhos da tabela
  if (headerFilters.cliente) {
    filtered = filtered.filter(registro => 
      (registro.nome_fantasia || '').toLowerCase().includes(headerFilters.cliente.toLowerCase())
    )
  }
  if (headerFilters.fretista) {
    filtered = filtered.filter(registro => 
      (registro.fretista || '').toLowerCase().includes(headerFilters.fretista.toLowerCase())
    )
  }
  if (headerFilters.status) {
    filtered = filtered.filter(registro => 
      (registro.status || '').toLowerCase().includes(headerFilters.status.toLowerCase())
    )
  }
  if (headerFilters.situacao) {
    filtered = filtered.filter(registro => 
      (registro.situacao || '').toLowerCase().includes(headerFilters.situacao.toLowerCase())
    )
  }
  if (headerFilters.pefin) {
    filtered = filtered.filter(registro => 
      (registro.pefin || '').toLowerCase().includes(headerFilters.pefin.toLowerCase())
    )
  }

    // Aplicar ordenação
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]
        
        if (sortConfig.key === 'valor_total') {
          aValue = parseFloat(aValue) || 0
          bValue = parseFloat(bValue) || 0
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    setFilteredRegistros(filtered)
    setCurrentPage(1) // Reset para primeira página quando filtros mudam
  }

  // Função para atualizar filtros dos cabeçalhos
  const updateHeaderFilter = (key, value) => {
    setHeaderFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Função para limpar filtros dos cabeçalhos
  const clearHeaderFilters = () => {
    setHeaderFilters({
      cliente: '',
      fretista: '',
      status: '',
      situacao: '',
      pefin: ''
    })
  }

  // Funções de paginação
  const totalPages = Math.ceil(filteredRegistros.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRegistros = filteredRegistros.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToFirstPage = () => setCurrentPage(1)
  const goToLastPage = () => setCurrentPage(totalPages)
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1))

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })

    const sorted = [...filteredRegistros].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
      return 0
    })
    setFilteredRegistros(sorted)
  }

  const handleEdit = (registro) => {
    setRegistroEditando(registro)
    setModalEditarOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      // Aqui deveria fazer uma chamada para a API para deletar o registro
      // Por enquanto, apenas remove da lista local
      setRegistros(registros.filter(r => r.id !== id))
      alert('Registro excluído com sucesso!')
    }
  }

  const handleShare = (registro) => {
    const message = `*Nota Fiscal ${registro.numero_nf}*\n\n` +
      `Cliente: ${registro.nome_fantasia}\n` +
      `Data Emissão: ${new Date(registro.data_emissao).toLocaleDateString('pt-BR')}\n` +
      `Data Entrega: ${registro.data_entrega ? new Date(registro.data_entrega).toLocaleDateString('pt-BR') : 'Não informada'}\n` +
      `Valor: ${formatCurrency(parseFloat(registro.valor_total || 0))}\n` +
      `Fretista: ${registro.fretista}\n` +
      `Placa: ${registro.placa}\n` +
      `Status: ${registro.status || 'Em dia'}\n` +
      `Situação: ${registro.situacao || 'PENDENTE'}\n` +
      `Vencimento: ${new Date(registro.data_vencimento).toLocaleDateString('pt-BR')}`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleBulkShare = async () => {
    if (selectedRegistros.length === 0) {
      alert('Selecione pelo menos um registro para compartilhar')
      return
    }
    
    try {
      const registrosParaCompartilhar = filteredRegistros.filter(r => selectedRegistros.includes(r.id))
      
      // Criar texto para compartilhamento
      const texto = registrosParaCompartilhar.map(registro => 
        `NF: ${registro.numero_nf}\nCliente: ${registro.nome_fantasia}\nFretista: ${registro.fretista}\nValor: ${formatCurrency(parseFloat(registro.valor_total || 0))}\nStatus: ${registro.status}\n---`
      ).join('\n')
      
      if (navigator.share) {
        await navigator.share({
          title: `Registros Selecionados (${selectedRegistros.length})`,
          text: texto
        })
      } else {
        // Fallback para WhatsApp se Web Share API não estiver disponível
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`
        window.open(whatsappUrl, '_blank')
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
      // Fallback para WhatsApp em caso de erro
      const registrosParaCompartilhar = filteredRegistros.filter(r => selectedRegistros.includes(r.id))
      let message = '*Relatório de Notas Fiscais*\n\n'
      registrosParaCompartilhar.forEach(registro => {
        message += `NF ${registro.numero_nf} - ${registro.nome_fantasia} - ${formatCurrency(parseFloat(registro.valor_total || 0))}\n`
      })
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    }
  }







  // Função para incluir novo registro
  const handleIncluirRegistro = async (novoRegistro) => {
    try {
      const response = await fetch(`${API_URL}/api/registros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoRegistro),
      })

      if (response.ok) {
        const created = await response.json().catch(() => ({}))
        await loadRegistros()
        // Enviar para Google Sheets de forma assíncrona; não bloquear o usuário
        try {
          const payload = created?.data || novoRegistro
          addRowToSheet(payload)
        } catch (gsErr) {
          console.error('Erro ao enviar novo registro ao Google Sheets:', gsErr)
        }
        setModalIncluirOpen(false)
      } else {
        console.error('Erro ao incluir registro')
      }
    } catch (error) {
      console.error('Erro ao incluir registro:', error)
    }
  }

  // Função para atualizar dados
  const handleRefresh = async () => {
    setLoading(true)
    await loadRegistros()
    await fetchFilterOptions()
    setLoading(false)
  }

  // Função para exportar registros
  const handleExport = () => {
    if (selectedRegistros.length === 0) return
    
    try {
      const registrosParaExportar = filteredRegistros.filter(r => selectedRegistros.includes(r.id))
      
      // Criar CSV
      const headers = ['NF', 'Cliente', 'Data Emissão', 'Data Entrega', 'Valor', 'Fretista', 'Placa', 'Status', 'Situação', 'PeFin']
      const csvContent = [
        headers.join(','),
        ...registrosParaExportar.map(registro => [
          registro.numero_nf,
          `"${registro.nome_fantasia}"`,
          registro.data_emissao,
          registro.data_entrega || '',
          registro.valor_total,
          `"${registro.fretista}"`,
          registro.placa,
          registro.status,
          registro.situacao,
          registro.pefin || ''
        ].join(','))
      ].join('\n')
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `registros_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar registros')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const toggleSelectRegistro = (id) => {
    setSelectedRegistros(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }

  const selectAllRegistros = () => {
    if (selectedRegistros.length === filteredRegistros.length) {
      setSelectedRegistros([])
    } else {
      setSelectedRegistros(filteredRegistros.map(r => r.id))
    }
  }



  const STATUS_ORDER = [
    'Pendente',
    'Entregue',
    'Cancelada',
    'Devolvida',
    'Reenviada',
    'Paga',
    'Outro (digitar)'
  ]

  const getStatusColorClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pendente': return 'bg-red-600 text-white'
      case 'entregue': return 'bg-green-600 text-white'
      case 'cancelada': return 'bg-black text-white'
      case 'devolvida': return 'bg-purple-600 text-white'
      case 'reenviada': return 'bg-yellow-500 text-black'
      case 'paga': return 'bg-blue-900 text-white'
      case 'processado': return 'bg-blue-600 text-white'
      case 'outro (digitar)': return 'bg-gray-500 text-white'
      default: return 'bg-gray-300 text-black'
    }
  }

  const displayStatusLabel = (rawStatus) => {
    const key = (rawStatus || '').toLowerCase()
    const map = {
      'pendente': 'Pendente',
      'entregue': 'Entregue',
      'cancelado': 'Cancelada',
      'cancelada': 'Cancelada',
      'processado': 'Processado',
      'devolvida': 'Devolvida',
      'reenviada': 'Reenviada',
      'paga': 'Paga',
      'outro (digitar)': 'Outro (digitar)'
    }
    return map[key] || 'Pendente'
  }

  const getStatusBadge = (registro) => {
    const label = displayStatusLabel(registro.status || 'Pendente')
    return (
      <Button
        onClick={() => handleToggleStatus(registro)}
        className={`text-xs px-2 py-1 h-7 ${getStatusColorClass(label)}`}
      >
        {label}
      </Button>
    )
  }

  const applyStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/registros/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        const updated = await response.json()
        // Mantém o rótulo que o usuário clicou independentemente da normalização do backend
        setRegistros(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
        filterRegistros()
        // Enviar a linha atualizada para o Google Sheets sem bloquear UI
        try {
          const payload = updated?.data ? updated.data : { id, status: newStatus }
          // Preferir atualizar a linha existente no Sheets
          updateRowInSheet(payload)
        } catch (gsErr) {
          console.error('Erro ao atualizar status no Google Sheets:', gsErr)
        }
      } else {
        const err = await response.json().catch(() => ({}))
        const detail = err.details || err.message || `HTTP ${response.status}`
        alert(`Erro ao atualizar status: ${detail}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    }
  }

  const handleToggleStatus = (registro) => {
    const current = displayStatusLabel(registro.status || 'Pendente')
    const idx = STATUS_ORDER.indexOf(current)
    const next = idx === -1 ? 'Entregue' : STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    applyStatusUpdate(registro.id, next)
  }

  const getPeFinBadge = (registro) => {
    const label = (registro.pefin || '').toLowerCase()
    if (label === 'vencido') {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>
    }
    if (label === 'em dia') {
      return <Badge variant="outline" className="text-xs text-green-700 border-green-200">Em dia</Badge>
    }
    if (label && label.startsWith('vence em')) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">{registro.pefin}</Badge>
    }
    // fallback baseado em data de vencimento
    const hoje = new Date()
    const vencimento = new Date(registro.data_vencimento)
    const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))
    if (isNaN(diasParaVencimento)) {
      return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">-</Badge>
    }
    if (diasParaVencimento < 0) {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>
    } else if (diasParaVencimento <= 7) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Vence em {diasParaVencimento}d</Badge>
    } else {
      return <Badge variant="outline" className="text-xs text-green-700 border-green-200">Em dia</Badge>
    }
  }

  // Igualar a renderização de Situação ao cálculo usado na aba "Atrasos" do Dashboard
  const calcularDiasAtrasoPorEmissao = (dataEmissao) => {
    if (!dataEmissao) return 0
    try {
      let d
      const s = String(dataEmissao)
      if (s.includes('.')) {
        const [dia, mes, ano] = s.split('.')
        d = new Date(Number(ano), Number(mes) - 1, Number(dia))
      } else {
        d = new Date(s)
      }
      if (isNaN(d.getTime())) return 0
      const hoje = new Date()
      const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
      const msPerDay = 24 * 60 * 60 * 1000
      const diff = startOfDay(hoje) - startOfDay(d)
      return Math.floor(diff / msPerDay)
    } catch {
      return 0
    }
  }

  const getSituacaoBadge = (registro) => {
    const dias = calcularDiasAtrasoPorEmissao(registro?.data_emissao)
    const atrasado = dias >= 7

    if (atrasado) {
      return (
        <Badge variant="destructive" className="text-xs">{`${dias} Dias em Atraso`}</Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs text-green-700 border-green-200">Dentro do prazo</Badge>
    )
  }

  // Calcular estatísticas
  const stats = {
    total: filteredRegistros.length,
    valorTotal: filteredRegistros.reduce((sum, r) => sum + parseFloat(r.valor_total || 0), 0),
    vencidos: filteredRegistros.filter(r => new Date(r.data_vencimento) < new Date()).length,
    fretistasUnicos: new Set(filteredRegistros.map(r => r.fretista)).size,
    pendentes: filteredRegistros.filter(r => (r.situacao || 'PENDENTE').toLowerCase() === 'pendente').length,
    canceladas: filteredRegistros.filter(r => (r.situacao || '').toLowerCase() === 'cancelada').length,
    entregues: filteredRegistros.filter(r => (r.situacao || '').toLowerCase() === 'entregue').length,
    devolvidas: filteredRegistros.filter(r => (r.situacao || '').toLowerCase() === 'devolvida').length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
  <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      {/* Header banner */}
      <PageHeader
        title="Registros"
        subtitle="Gerenciar notas fiscais processadas"
        icon={<FileText className="w-6 h-6 text-green-600" />}
      />

      {/* Ações principais */}
      <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            className="btn btn-outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={handleBulkShare} disabled={selectedRegistros.length === 0} className="btn btn-green">
            <MessageCircle className="mr-2 h-4 w-4" />
            Compartilhar ({selectedRegistros.length})
          </Button>
          <Button onClick={handleExport} variant="outline" disabled={selectedRegistros.length === 0} className="btn btn-outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total de Registros</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Valor Total</p>
                <p className="text-3xl font-bold text-green-900 break-words">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Vencidos</p>
                <p className="text-3xl font-bold text-red-900">{stats.vencidos}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Novos Cards de Status */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">PENDENTE</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">CANCELADA</p>
                <p className="text-3xl font-bold text-red-900">{stats.canceladas}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">ENTREGUE</p>
                <p className="text-3xl font-bold text-green-900">{stats.entregues}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">DEVOLVIDA</p>
                <p className="text-3xl font-bold text-orange-900">{stats.devolvidas}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="btn btn-outline w-full sm:w-auto"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Busca Livre */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Busca livre..."
                value={filters.searchText}
                onChange={(e) => updateFilter('searchText', e.target.value)}
                className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Data Início */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Data início"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Data Fim */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Data fim"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Período */}
            <Select value={filters.period} onValueChange={(value) => updateFilter('period', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.periods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fretista */}
            <Select value={filters.fretista} onValueChange={(value) => updateFilter('fretista', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Fretista" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.fretistas.map((fretista) => (
                  <SelectItem key={fretista.value} value={fretista.value}>
                    {fretista.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Placa */}
            <Select value={filters.placa} onValueChange={(value) => updateFilter('placa', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Placa" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.placas.map((placa) => (
                  <SelectItem key={placa.value} value={placa.value}>
                    {placa.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Cliente */}
            <Select value={filters.cliente} onValueChange={(value) => updateFilter('cliente', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.clientes.map((cliente) => (
                  <SelectItem key={cliente.value} value={cliente.value}>
                    {cliente.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rede */}
            <Select value={filters.rede} onValueChange={(value) => updateFilter('rede', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Rede" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.redes.map((rede) => (
                  <SelectItem key={rede.value} value={rede.value}>
                    {rede.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vendedor */}
            <Select value={filters.vendedor} onValueChange={(value) => updateFilter('vendedor', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.value} value={vendedor.value}>
                    {vendedor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* UF */}
            <Select value={filters.uf} onValueChange={(value) => updateFilter('uf', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.ufs.map((uf) => (
                  <SelectItem key={uf.value} value={uf.value}>
                    {uf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.status.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Situação */}
            <Select value={filters.situacao} onValueChange={(value) => updateFilter('situacao', value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Situação" />
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

{/* Botões de Ação dos Filtros */} <div className="flex gap-2"> <Button onClick={loadRegistros} className="btn btn-green" > <Search className="w-4 h-4 mr-2" /> Aplicar Filtros </Button> <Button variant="outline" onClick={clearFilters} className="btn btn-outline" > <RotateCcw className="w-4 h-4 mr-2" /> Limpar Filtros </Button> </div> </CardContent> </Card>

      {/* Paginação */}
      {filteredRegistros.length > 0 && (
        <Card className="card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredRegistros.length)} de {filteredRegistros.length} registros
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="px-3"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNumber)}
                        className="w-10 h-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="px-3"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Página {currentPage} de {totalPages}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de Visualização */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4 mr-2" />
            Tabela
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Cards
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllRegistros}>
            {selectedRegistros.length === filteredRegistros.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
          <Badge variant="secondary" className="px-3 py-1">
            {filteredRegistros.length} registros encontrados
          </Badge>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <Card className="card">
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="tabela-registros w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRegistros.length === filteredRegistros.length && filteredRegistros.length > 0}
                        onChange={selectAllRegistros}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <button 
                        onClick={() => handleSort('numero_nf')}
                        className="flex items-center gap-1 hover:text-green-600"
                      >
                        NF
                        {sortConfig.key === 'numero_nf' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSort('nome_fantasia')}
                          className="flex items-center gap-1 hover:text-green-600"
                        >
                          Clientes
                          {sortConfig.key === 'nome_fantasia' && (
                            sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </button>
                        {/* Filtro do cabeçalho removido */}
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <button 
                        onClick={() => handleSort('data_emissao')}
                        className="flex items-center gap-1 hover:text-green-600"
                      >
                        Data Emissão
                        {sortConfig.key === 'data_emissao' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <button 
                        onClick={() => handleSort('data_entrega')}
                        className="flex items-center gap-1 hover:text-green-600"
                      >
                        Data de Entrega
                        {sortConfig.key === 'data_entrega' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <button 
                        onClick={() => handleSort('valor_total')}
                        className="flex items-center gap-1 hover:text-green-600"
                      >
                        Valor
                        {sortConfig.key === 'valor_total' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSort('fretista')}
                          className="flex items-center gap-1 hover:text-green-600"
                        >
                          Fretista
                          {sortConfig.key === 'fretista' && (
                            sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </button>
                        {/* Filtro do cabeçalho removido */}
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">Placa</th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-green-600"
                        >
                          Status
                          {sortConfig.key === 'status' && (
                            sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </button>
                        {/* Filtro do cabeçalho removido */}
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSort('situacao')}
                          className="flex items-center gap-1 hover:text-green-600"
                        >
                          Situação
                          {sortConfig.key === 'situacao' && (
                            sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </button>
                        {/* Filtro do cabeçalho removido */}
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSort('pefin')}
                          className="flex items-center gap-1 hover:text-green-600"
                        >
                          PeFin
                          {sortConfig.key === 'pefin' && (
                            sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                          )}
                        </button>
                        {/* Filtro do cabeçalho removido */}
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRegistros.map((registro, index) => (
                    <tr key={registro.id} className={`border-b hover:bg-green-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedRegistros.includes(registro.id)}
                          onChange={() => toggleSelectRegistro(registro.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {registro.numero_nf}
                        </Badge>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-medium text-gray-900 whitespace-normal break-words">{registro.nome_fantasia}</div>
                      </td>
                      <td className="p-4 text-gray-600">{formatDate(registro.data_emissao)}</td>
                      <td className="p-4 text-gray-600">{registro.data_entrega ? formatDate(registro.data_entrega) : '-'}</td>
                      <td className="p-4">
                        <span className="font-semibold text-green-700">
                          {formatCurrency(parseFloat(registro.valor_total || 0))}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">{registro.fretista}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {registro.placa}
                        </Badge>
                      </td>
                      <td className="p-4">{getStatusBadge(registro)}</td>
                      <td className="p-4">{getSituacaoBadge(registro)}</td>
                      <td className="p-4">{getPeFinBadge(registro)}</td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(registro)} className="hover:bg-blue-100">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleShare(registro)} className="hover:bg-green-100">
                            <Share className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(registro.id)}
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {currentRegistros.map((registro) => (
                <Card key={registro.id} className="card hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            NF {registro.numero_nf}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {registro.nome_fantasia}
                        </CardDescription>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedRegistros.includes(registro.id)}
                        onChange={() => toggleSelectRegistro(registro.id)}
                        className="rounded border-gray-300"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Data Emissão</p>
                        <p className="font-medium">{formatDate(registro.data_emissao)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valor</p>
                        <p className="font-semibold text-green-700">
                          {formatCurrency(parseFloat(registro.valor_total || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fretista</p>
                        <p className="font-medium">{registro.fretista}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Placa</p>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {registro.placa}
                        </Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {getStatusBadge(registro)}
                        {getPeFinBadge(registro)}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(registro)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShare(registro)}>
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(registro.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {currentRegistros.length === 0 && filteredRegistros.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-500 mb-4">Tente ajustar os filtros ou adicionar novos registros</p>
              <Button onClick={() => setModalIncluirOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Registro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Flutuante de Inclusão */}
      <Button
        onClick={() => setModalIncluirOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 z-50 hover:scale-110"
        size="lg"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Modal de Inclusão de Registro */}
      <ModalIncluirRegistro
        isOpen={modalIncluirOpen}
        onClose={() => setModalIncluirOpen(false)}
        onSave={handleIncluirRegistro}
      />

      {/* Modal de Status Personalizado removido: ciclo automático conforme solicitado */}
      {/* Modal de Edição de Registro */}
      <ModalEditarRegistro
        isOpen={modalEditarOpen}
        registro={registroEditando}
        onClose={() => setModalEditarOpen(false)}
        onSave={(updated) => {
          setRegistros((prev) => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
          setFilteredRegistros((prev) => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
        }}
      />
    </div>
  )
}

export default Registros