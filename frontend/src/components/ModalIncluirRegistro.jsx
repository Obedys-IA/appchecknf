import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { X, Save, Calculator } from 'lucide-react'
import { API_URL } from '../config/api'


const ModalIncluirRegistro = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    // Identificação do usuário
    usuario_id: '',
    empresa_id: '',
    
    // Dados da nota fiscal
    numero_nf: '',
    serie_nf: '',
    data_emissao: '',
    hora_emissao: '',
    data_vencimento: '',
    valor_total: '',
    
    // Dados do cliente
    cnpj_cpf_destinatario: '',
    razao_social: '',
    nome_fantasia: '',
    endereco_destinatario: '',
    
    // Dados comerciais
    vendedor: '',
    rede: '',
    
    // Dados de transporte
    placa: '',
    fretista: '',
    hora_saida: '',
    data_entrega: '',
    
    // Dados fiscais
    cfop: '',
    natureza_operacao: '',
    uf: '',
    
    // Dados do emitente
    cnpj_emitente: '',
    razao_social_emitente: '',
    nome_fantasia_emitente: '',
    
    // Status e controle
    status: 'PENDENTE',
    situacao: 'ATIVO',
    pefin: '',
    observacoes: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Resetar formulário quando modal abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        usuario_id: '',
        empresa_id: '',
        numero_nf: '',
        serie_nf: '',
        data_emissao: '',
        hora_emissao: '',
        data_vencimento: '',
        valor_total: '',
        cnpj_cpf_destinatario: '',
        razao_social: '',
        nome_fantasia: '',
        endereco_destinatario: '',
        vendedor: '',
        rede: '',
        placa: '',
        fretista: '',
        hora_saida: '',
        data_entrega: '',
        cfop: '',
        natureza_operacao: '',
        uf: '',
        cnpj_emitente: '',
        razao_social_emitente: '',
        nome_fantasia_emitente: '',
      status: 'PENDENTE',
      situacao: 'ATIVO',
      pefin: '',
      observacoes: ''
    })
    setErrors({})
  }
  }, [isOpen])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  // Buscar fretista automaticamente quando placa for preenchida
  const buscarFretista = async (placa) => {
    if (placa && placa.length >= 7) {
      try {
        const response = await fetch(`${API_URL}/fretista/${placa}`)
        if (response.ok) {
          const data = await response.json()
          handleInputChange('fretista', data.fretista)
        }
      } catch (error) {
        console.error('Erro ao buscar fretista:', error)
      }
    }
  }

  // Buscar nome fantasia automaticamente quando CNPJ/CPF for preenchido
  const buscarNomeFantasia = async (cnpjCpf) => {
    if (cnpjCpf && cnpjCpf.length >= 11) {
      try {
        // Implementar busca no clientes.json
        console.log('Buscando nome fantasia para:', cnpjCpf)
      } catch (error) {
        console.error('Erro ao buscar nome fantasia:', error)
      }
    }
  }

  // Calcular data de entrega (3 dias úteis após emissão)
  const calcularDataEntrega = (dataEmissao) => {
    if (!dataEmissao) return ''
    
    const data = new Date(dataEmissao)
    let diasUteis = 0
    
    while (diasUteis < 3) {
      data.setDate(data.getDate() + 1)
      const diaSemana = data.getDay()
      if (diaSemana !== 0 && diaSemana !== 6) { // Não é domingo (0) nem sábado (6)
        diasUteis++
      }
    }
    
    return data.toISOString().split('T')[0]
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Campos obrigatórios
    if (!formData.numero_nf) newErrors.numero_nf = 'Número da NF é obrigatório'
    if (!formData.data_emissao) newErrors.data_emissao = 'Data de emissão é obrigatória'
    if (!formData.cnpj_cpf_destinatario) newErrors.cnpj_cpf_destinatario = 'CNPJ/CPF do destinatário é obrigatório'
    if (!formData.razao_social) newErrors.razao_social = 'Razão social é obrigatória'
    if (!formData.valor_total) newErrors.valor_total = 'Valor total é obrigatório'
    if (!formData.placa) newErrors.placa = 'Placa é obrigatória'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      // Calcular campos automáticos
      const dataEntregaCalculada = calcularDataEntrega(formData.data_emissao)
      
      const registroCompleto = {
        ...formData,
        data_entrega: dataEntregaCalculada,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const response = await fetch(`${API_URL}/registrar-nota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registroCompleto)
      })
      
      if (response.ok) {
        const resultado = await response.json()
        onSave(resultado)
        onClose()
      } else {
        const error = await response.json()
        alert(`Erro ao salvar registro: ${error.message}`)
      }
    } catch (error) {
      console.error('Erro ao salvar registro:', error)
      alert('Erro ao salvar registro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Incluir Novo Registro</CardTitle>
              <CardDescription>Preencha os dados da nota fiscal manualmente</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados da Nota Fiscal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_nf">Número da NF *</Label>
                  <Input
                    id="numero_nf"
                    value={formData.numero_nf}
                    onChange={(e) => handleInputChange('numero_nf', e.target.value)}
                    className={errors.numero_nf ? 'border-red-500' : ''}
                  />
                  {errors.numero_nf && <p className="text-red-500 text-sm">{errors.numero_nf}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="serie_nf">Série da NF</Label>
                  <Input
                    id="serie_nf"
                    value={formData.serie_nf}
                    onChange={(e) => handleInputChange('serie_nf', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_emissao">Data de Emissão *</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => {
                      handleInputChange('data_emissao', e.target.value)
                      // Calcular data de entrega automaticamente
                      const dataEntrega = calcularDataEntrega(e.target.value)
                      handleInputChange('data_entrega', dataEntrega)
                    }}
                    className={errors.data_emissao ? 'border-red-500' : ''}
                  />
                  {errors.data_emissao && <p className="text-red-500 text-sm">{errors.data_emissao}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_emissao">Hora de Emissão</Label>
                  <Input
                    id="hora_emissao"
                    type="time"
                    value={formData.hora_emissao}
                    onChange={(e) => handleInputChange('hora_emissao', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) => handleInputChange('valor_total', e.target.value)}
                    className={errors.valor_total ? 'border-red-500' : ''}
                  />
                  {errors.valor_total && <p className="text-red-500 text-sm">{errors.valor_total}</p>}
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Dados do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj_cpf_destinatario">CNPJ/CPF Destinatário *</Label>
                    <Input
                      id="cnpj_cpf_destinatario"
                      value={formData.cnpj_cpf_destinatario}
                      onChange={(e) => {
                        handleInputChange('cnpj_cpf_destinatario', e.target.value)
                        buscarNomeFantasia(e.target.value)
                      }}
                      className={errors.cnpj_cpf_destinatario ? 'border-red-500' : ''}
                    />
                    {errors.cnpj_cpf_destinatario && <p className="text-red-500 text-sm">{errors.cnpj_cpf_destinatario}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => handleInputChange('razao_social', e.target.value)}
                      className={errors.razao_social ? 'border-red-500' : ''}
                    />
                    {errors.razao_social && <p className="text-red-500 text-sm">{errors.razao_social}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endereco_destinatario">Endereço</Label>
                    <Input
                      id="endereco_destinatario"
                      value={formData.endereco_destinatario}
                      onChange={(e) => handleInputChange('endereco_destinatario', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Dados de Transporte */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Dados de Transporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="placa">Placa *</Label>
                    <Input
                      id="placa"
                      value={formData.placa}
                      onChange={(e) => {
                        handleInputChange('placa', e.target.value.toUpperCase())
                        buscarFretista(e.target.value)
                      }}
                      className={errors.placa ? 'border-red-500' : ''}
                    />
                    {errors.placa && <p className="text-red-500 text-sm">{errors.placa}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fretista">Fretista</Label>
                    <Input
                      id="fretista"
                      value={formData.fretista}
                      onChange={(e) => handleInputChange('fretista', e.target.value)}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hora_saida">Hora de Saída</Label>
                    <Input
                      id="hora_saida"
                      type="time"
                      value={formData.hora_saida}
                      onChange={(e) => handleInputChange('hora_saida', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_entrega">Data de Entrega (Calculada)</Label>
                    <Input
                      id="data_entrega"
                      type="date"
                      value={formData.data_entrega}
                      onChange={(e) => handleInputChange('data_entrega', e.target.value)}
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">Calculada automaticamente (3 dias úteis após emissão)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={formData.uf}
                      onChange={(e) => handleInputChange('uf', e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Dados Comerciais e Fiscais */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Dados Comerciais e Fiscais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendedor">Vendedor</Label>
                    <Input
                      id="vendedor"
                      value={formData.vendedor}
                      onChange={(e) => handleInputChange('vendedor', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rede">Rede</Label>
                    <Input
                      id="rede"
                      value={formData.rede}
                      onChange={(e) => handleInputChange('rede', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cfop">CFOP</Label>
                    <Input
                      id="cfop"
                      value={formData.cfop}
                      onChange={(e) => handleInputChange('cfop', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="natureza_operacao">Natureza da Operação</Label>
                    <Input
                      id="natureza_operacao"
                      value={formData.natureza_operacao}
                      onChange={(e) => handleInputChange('natureza_operacao', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                        <SelectItem value="ENTREGUE">Entregue</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pefin">PeFin</Label>
                    <Input
                      id="pefin"
                      placeholder="Ex.: Em dia, Vence em 5d, Vencido"
                      value={formData.pefin}
                      onChange={(e) => handleInputChange('pefin', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Calculator className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Registro
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ModalIncluirRegistro