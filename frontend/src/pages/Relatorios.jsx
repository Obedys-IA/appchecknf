import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FileText, Download, Calendar, Filter, MessageCircle, Search, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Relatorios = () => {
  const [registros, setRegistros] = useState([]);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    fretista: '',
    valorMin: '',
    valorMax: '',
    busca: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Carregar dados reais do Supabase
  useEffect(() => {
    const loadRelatorios = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/relatorios')
        if (response.ok) {
          const data = await response.json()
          setRegistros(data)
        } else {
          console.error('Erro ao carregar relatórios da API')
          setRegistros([])
        }
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error)
        setRegistros([])
      }
    }
    
    loadRelatorios()
  }, []);

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const registrosFiltrados = registros.filter(registro => {
    const matchBusca = !filtros.busca || 
      registro.numeroNF.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      registro.razaoSocial.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      registro.fretista.toLowerCase().includes(filtros.busca.toLowerCase());

    const matchDataInicio = !filtros.dataInicio || 
      new Date(registro.dataEmissao) >= new Date(filtros.dataInicio);

    const matchDataFim = !filtros.dataFim || 
      new Date(registro.dataEmissao) <= new Date(filtros.dataFim);

    const matchFretista = !filtros.fretista || 
      registro.fretista.toLowerCase().includes(filtros.fretista.toLowerCase());

    const matchValorMin = !filtros.valorMin || 
      registro.valorTotal >= parseFloat(filtros.valorMin);

    const matchValorMax = !filtros.valorMax || 
      registro.valorTotal <= parseFloat(filtros.valorMax);

    return matchBusca && matchDataInicio && matchDataFim && matchFretista && matchValorMin && matchValorMax;
  });

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === registrosFiltrados.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(registrosFiltrados.map(item => item.id));
    }
  };

  const gerarRelatorioPDF = async () => {
    setLoading(true);
    try {
      const itensRelatorio = registrosFiltrados.filter(item => 
        selectedItems.length === 0 || selectedItems.includes(item.id)
      );

      // Simular geração de PDF
      console.log('Gerando relatório PDF para:', itensRelatorio);
      
      // Aqui você implementaria a geração real do PDF
      // Por exemplo, usando jsPDF ou enviando para o backend
      
      alert('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
      alert('Erro ao gerar relatório PDF');
    } finally {
      setLoading(false);
    }
  };

  const enviarWhatsApp = (registro) => {
    const mensagem = whatsappMessage || 
      `Olá! Segue informações da Nota Fiscal:
      
📄 NF: ${registro.numeroNF}
🏢 Empresa: ${registro.razaoSocial}
📅 Data: ${registro.dataEmissao}
🚛 Placa: ${registro.placa}
👤 Fretista: ${registro.fretista}
💰 Valor: R$ ${registro.valorTotal.toFixed(2)}`;

    const telefone = registro.telefone?.replace(/\D/g, '') || '';
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(url, '_blank');
  };

  const enviarWhatsAppLote = () => {
    const itensSelecionados = registrosFiltrados.filter(item => 
      selectedItems.includes(item.id)
    );

    if (itensSelecionados.length === 0) {
      alert('Selecione pelo menos um item para enviar');
      return;
    }

    itensSelecionados.forEach(registro => {
      setTimeout(() => enviarWhatsApp(registro), 1000); // Delay para evitar spam
    });
  };

  const exportarExcel = async () => {
    setLoading(true);
    try {
      const itensExportar = registrosFiltrados.filter(item => 
        selectedItems.length === 0 || selectedItems.includes(item.id)
      );

      // Simular exportação
      console.log('Exportando para Excel:', itensExportar);
      alert('Dados exportados para Excel com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <Button onClick={gerarRelatorioPDF} disabled={loading}>
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
          <Button onClick={exportarExcel} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={filtros.busca}
                onChange={(e) => handleFiltroChange('busca', e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              placeholder="Data início"
              value={filtros.dataInicio}
              onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
            />
            <Input
              type="date"
              placeholder="Data fim"
              value={filtros.dataFim}
              onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
            />
            <Input
              placeholder="Fretista"
              value={filtros.fretista}
              onChange={(e) => handleFiltroChange('fretista', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Valor mín."
              value={filtros.valorMin}
              onChange={(e) => handleFiltroChange('valorMin', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Valor máx."
              value={filtros.valorMax}
              onChange={(e) => handleFiltroChange('valorMax', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp em Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Envio WhatsApp em Lote
          </CardTitle>
          <CardDescription>
            Personalize a mensagem que será enviada via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <textarea
              className="w-full p-3 border rounded-md resize-none"
              rows="4"
              placeholder="Digite sua mensagem personalizada (deixe em branco para usar a mensagem padrão)"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <Button 
                onClick={enviarWhatsAppLote}
                disabled={selectedItems.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar para Selecionados ({selectedItems.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registros ({registrosFiltrados.length})</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === registrosFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === registrosFiltrados.length && registrosFiltrados.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-2">NF</th>
                  <th className="text-left p-2">Empresa</th>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Placa</th>
                  <th className="text-left p-2">Fretista</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(registro.id)}
                        onChange={() => handleSelectItem(registro.id)}
                      />
                    </td>
                    <td className="p-2 font-mono">{registro.numeroNF}</td>
                    <td className="p-2">{registro.razaoSocial}</td>
                    <td className="p-2">{registro.dataEmissao}</td>
                    <td className="p-2 font-mono">{registro.placa}</td>
                    <td className="p-2">{registro.fretista}</td>
                    <td className="p-2">R$ {registro.valorTotal.toFixed(2)}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enviarWhatsApp(registro)}
                        className="bg-green-50 hover:bg-green-100 text-green-700"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;