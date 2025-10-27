import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Separator } from '../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import ModalIncluirRegistro from '../components/ModalIncluirRegistro'
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
  SortAsc,
  SortDesc,
  Grid3X3,
  List
} from 'lucide-react'

const Registros = () => {
  const [registros, setRegistros] = useState([])
  const [filteredRegistros, setFilteredRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fretista: '',
    emitente: '',
    valorMin: '',
    valorMax: ''
  })
  const [selectedRegistros, setSelectedRegistros] = useState([])
  const [modalIncluirOpen, setModalIncluirOpen] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' ou 'cards'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

  useEffect(() => {
    loadRegistros()
  }, [])

  useEffect(() => {
    filterRegistros()
  }, [searchTerm, filters, registros])

  const loadRegistros = async () => {
    try {
      setLoading(true)
      // Conectar com API do Supabase para carregar registros reais
      const response = await fetch('http://localhost:3001/api/registros')
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
        (registro.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      filtered = filtered.filter(registro => 
        (registro.fretista || '').toLowerCase().includes(filters.fretista.toLowerCase())
      )
    }
    if (filters.emitente) {
      filtered = filtered.filter(registro => 
        (registro.razao_social || '').toLowerCase().includes(filters.emitente.toLowerCase())
      )
    }
    if (filters.valorMin) {
      filtered = filtered.filter(registro => parseFloat(registro.valor_total || 0) >= parseFloat(filters.valorMin))
    }
    if (filters.valorMax) {
      filtered = filtered.filter(registro => parseFloat(registro.valor_total || 0) <= parseFloat(filters.valorMax))
    }

    setFilteredRegistros(filtered)
  }

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
    // Implementar edição
    console.log('Editar registro:', registro)
  }

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      setRegistros(registros.filter(r => r.id !== id))
    }
  }

  const handleShare = (registro) => {
    const message = `*Nota Fiscal ${registro.numero_nf}*\n\n` +
      `Emitente: ${registro.razao_social}\n` +
      `Data: ${new Date(registro.data_emissao).toLocaleDateString('pt-BR')}\n` +
      `Valor: ${formatCurrency(parseFloat(registro.valor_total || 0))}\n` +
      `Fretista: ${registro.fretista}\n` +
      `Placa: ${registro.placa}\n` +
      `Vencimento: ${new Date(registro.data_vencimento).toLocaleDateString('pt-BR')}`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleBulkShare = () => {
    if (selectedRegistros.length === 0) {
      alert('Selecione pelo menos um registro para compartilhar')
      return
    }

    let message = '*Relatório de Notas Fiscais*\n\n'
    selectedRegistros.forEach(id => {
      const registro = registros.find(r => r.id === id)
      if (registro) {
        message += `NF ${registro.numero_nf} - ${registro.razao_social} - ${formatCurrency(parseFloat(registro.valor_total || 0))}\n`
      }
    })

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleExport = () => {
    // Implementar exportação para Excel
    console.log('Exportar registros selecionados:', selectedRegistros)
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

  const handleIncluirRegistro = (novoRegistro) => {
    // Adicionar o novo registro à lista
    setRegistros(prev => [novoRegistro, ...prev])
    // Recarregar a lista para garantir sincronização
    loadRegistros()
  }

  const getStatusBadge = (registro) => {
    const hoje = new Date()
    const vencimento = new Date(registro.data_vencimento)
    const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))

    if (diasParaVencimento < 0) {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>
    } else if (diasParaVencimento <= 7) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Vence em {diasParaVencimento}d</Badge>
    } else {
      return <Badge variant="outline" className="text-xs text-green-700 border-green-200">Em dia</Badge>
    }
  }

  // Calcular estatísticas
  const stats = {
    total: filteredRegistros.length,
    valorTotal: filteredRegistros.reduce((sum, r) => sum + parseFloat(r.valor_total || 0), 0),
    vencidos: filteredRegistros.filter(r => new Date(r.data_vencimento) < new Date()).length,
    fretistasUnicos: new Set(filteredRegistros.map(r => r.fretista)).size
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
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
            Registros
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Gerenciar notas fiscais processadas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => loadRegistros()} 
            variant="outline" 
            size="sm"
            className="hover:bg-green-50 hover:border-green-300"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={handleBulkShare} disabled={selectedRegistros.length === 0}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Compartilhar ({selectedRegistros.length})
          </Button>
          <Button onClick={handleExport} variant="outline" disabled={selectedRegistros.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.valorTotal)}</p>
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

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Fretistas</p>
                <p className="text-3xl font-bold text-purple-900">{stats.fretistasUnicos}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Pesquisa
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilters({
                  dataInicio: '',
                  dataFim: '',
                  fretista: '',
                  emitente: '',
                  valorMin: '',
                  valorMax: ''
                })
                setSearchTerm('')
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, emitente, fretista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Data início"
                value={filters.dataInicio}
                onChange={(e) => setFilters({...filters, dataInicio: e.target.value})}
                className="pl-10 h-11"
              />
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Data fim"
                value={filters.dataFim}
                onChange={(e) => setFilters({...filters, dataFim: e.target.value})}
                className="pl-10 h-11"
              />
            </div>
            
            <Input
              placeholder="Fretista"
              value={filters.fretista}
              onChange={(e) => setFilters({...filters, fretista: e.target.value})}
              className="h-11"
            />
            
            <Input
              placeholder="Emitente"
              value={filters.emitente}
              onChange={(e) => setFilters({...filters, emitente: e.target.value})}
              className="h-11"
            />
            
            <Input
              type="number"
              placeholder="Valor mínimo"
              value={filters.valorMin}
              onChange={(e) => setFilters({...filters, valorMin: e.target.value})}
              className="h-11"
            />
            
            <Input
              type="number"
              placeholder="Valor máximo"
              value={filters.valorMax}
              onChange={(e) => setFilters({...filters, valorMax: e.target.value})}
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

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
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
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
                    <th className="text-left p-4 font-semibold text-gray-700">Emitente</th>
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
                        onClick={() => handleSort('valor_total')}
                        className="flex items-center gap-1 hover:text-green-600"
                      >
                        Valor
                        {sortConfig.key === 'valor_total' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-semibold text-gray-700">Fretista</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Placa</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((registro, index) => (
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
                      <td className="p-4 max-w-48">
                        <div className="truncate font-medium text-gray-900">{registro.razao_social}</div>
                      </td>
                      <td className="p-4 text-gray-600">{formatDate(registro.data_emissao)}</td>
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
                      <td className="p-4">
                        <div className="flex gap-1">
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
              {filteredRegistros.map((registro) => (
                <Card key={registro.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            NF {registro.numero_nf}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {registro.razao_social}
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
                      {getStatusBadge(registro)}
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
          
          {filteredRegistros.length === 0 && (
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
    </div>
  )
}

export default Registros