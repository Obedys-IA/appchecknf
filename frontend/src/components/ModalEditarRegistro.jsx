import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import { Textarea } from './ui/textarea'
import { X, Save } from 'lucide-react'
import { updateRowInSheet } from '../services/googleSheets'
import { API_URL } from '../config/api'

const ModalEditarRegistro = ({ isOpen, onClose, registro, onSave }) => {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    if (isOpen && registro) {
      setFormData({
        status: registro.status || 'PENDENTE',
        situacao: registro.situacao || 'ATIVO',
        pefin: registro.pefin || '',
        data_entrega: registro.data_entrega || '',
        valor_total: registro.valor_total || '',
        fretista: registro.fretista || '',
        placa: registro.placa || '',
        observacoes: registro.observacoes || ''
      })
    }
  }, [isOpen, registro])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!registro?.id) return
    try {
      const response = await fetch(`${API_URL}/api/registros/${registro.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (!response.ok) {
        alert(result?.error || 'Falha ao atualizar registro')
        return
      }
      onSave(result.data)
      // Enviar atualização para Google Sheets de forma assíncrona
      try {
        updateRowInSheet(result.data)
      } catch (gsErr) {
        console.error('Erro ao atualizar registro no Google Sheets:', gsErr)
      }
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar registro:', err)
      alert('Erro ao atualizar registro')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Editar Registro NF {registro?.numero_nf}</CardTitle>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                    <SelectItem value="ENTREGUE">ENTREGUE</SelectItem>
                    <SelectItem value="CANCELADO">CANCELADO</SelectItem>
                    <SelectItem value="DEVOLVIDO">DEVOLVIDO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Situação</label>
                <Input value={formData.situacao} onChange={(e) => handleChange('situacao', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">PeFin</label>
                <Select value={formData.pefin} onValueChange={(v) => handleChange('pefin', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em dia">Em dia</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Data de Entrega</label>
                <Input type="date" value={formData.data_entrega || ''} onChange={(e) => handleChange('data_entrega', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Valor Total</label>
                <Input type="number" step="0.01" value={formData.valor_total} onChange={(e) => handleChange('valor_total', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Fretista</label>
                <Input value={formData.fretista} onChange={(e) => handleChange('fretista', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Placa</label>
                <Input value={formData.placa} onChange={(e) => handleChange('placa', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Observações</label>
                <Textarea value={formData.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ModalEditarRegistro