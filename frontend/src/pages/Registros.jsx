import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
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
  Plus
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registros</h1>
          <p className="text-gray-600 mt-1">Gerenciar notas fiscais processadas</p>
        </div>
        
        <div className="flex gap-2">
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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, emitente, fretista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Input
              type="date"
              placeholder="Data início"
              value={filters.dataInicio}
              onChange={(e) => setFilters({...filters, dataInicio: e.target.value})}
            />
            
            <Input
              type="date"
              placeholder="Data fim"
              value={filters.dataFim}
              onChange={(e) => setFilters({...filters, dataFim: e.target.value})}
            />
            
            <Input
              placeholder="Fretista"
              value={filters.fretista}
              onChange={(e) => setFilters({...filters, fretista: e.target.value})}
            />
            
            <Input
              placeholder="Emitente"
              value={filters.emitente}
              onChange={(e) => setFilters({...filters, emitente: e.target.value})}
            />
            
            <Input
              type="number"
              placeholder="Valor mínimo"
              value={filters.valorMin}
              onChange={(e) => setFilters({...filters, valorMin: e.target.value})}
            />
            
            <Input
              type="number"
              placeholder="Valor máximo"
              value={filters.valorMax}
              onChange={(e) => setFilters({...filters, valorMax: e.target.value})}
            />
            
            <Button 
              variant="outline" 
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
        </CardContent>
      </Card>

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Registros ({filteredRegistros.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={selectAllRegistros}>
              {selectedRegistros.length === filteredRegistros.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={selectedRegistros.length === filteredRegistros.length && filteredRegistros.length > 0}
                      onChange={selectAllRegistros}
                    />
                  </th>
                  <th className="text-left p-2">NF</th>
                  <th className="text-left p-2">Emitente</th>
                  <th className="text-left p-2">Data Emissão</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Fretista</th>
                  <th className="text-left p-2">Placa</th>
                  <th className="text-left p-2">UF</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.map((registro) => (
                  <tr key={registro.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedRegistros.includes(registro.id)}
                        onChange={() => toggleSelectRegistro(registro.id)}
                      />
                    </td>
                    <td className="p-2 font-mono">{registro.numero_nf}</td>
                    <td className="p-2">{registro.razao_social}</td>
                    <td className="p-2">{formatDate(registro.data_emissao)}</td>
                    <td className="p-2 font-semibold">{formatCurrency(parseFloat(registro.valor_total || 0))}</td>
                    <td className="p-2">{registro.fretista}</td>
                    <td className="p-2 font-mono">{registro.placa}</td>
                    <td className="p-2">{registro.uf}</td>
                    <td className="p-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredRegistros.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão Flutuante de Inclusão */}
      <Button
        onClick={() => setModalIncluirOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
        size="lg"
      >
        <Plus className="h-6 w-6" />
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