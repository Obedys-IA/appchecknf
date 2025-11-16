import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  Download, 
  Filter,
  FileText,
  PieChart,
  Activity,
  DollarSign,
  Truck,
  Users,
  Clock,
  MapPin,
  Target,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Minus,
  FileBarChart,
  LineChart,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader.jsx';
import { getRelatoriosStatistics, getFilterOptions, getRegistrosWithFilters } from '../lib/supabase';
import { API_URL } from '../config/api'

// Componente StatCard
const StatCard = ({ title, value, subtitle, icon: Icon, color, variation, trend }) => {
  const getVariacaoIcon = (variacao) => {
    if (variacao > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (variacao < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getVariacaoColor = (variacao) => {
    if (variacao > 0) return 'text-green-600';
    if (variacao < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {variation && (
                <div className={`flex items-center gap-1 ${getVariacaoColor(variation)}`}>
                  {getVariacaoIcon(variation)}
                  <span className="text-sm font-medium">
                    {Math.abs(variation)}%
                  </span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-4 rounded-full ${color} bg-opacity-10`}>
            <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Meta: {trend.meta}</span>
              <span className={`font-medium ${trend.progress >= 80 ? 'text-green-600' : trend.progress >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {trend.progress}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  trend.progress >= 80 ? 'bg-green-500' : 
                  trend.progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(trend.progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Relatorios = () => {
  const { userData } = useAuth();
  
  // Verificação de permissões
  const tipo = (userData?.tipo || '').toLowerCase();
  const isAdmin = tipo === 'administrador';
  const isGerencia = tipo === 'gerencia';
  const isColaborador = tipo === 'colaborador';
  const canViewReports = isAdmin || isGerencia || isColaborador;
  
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
    status: '',
    fretista: '',
    placa: '',
    cliente: '',
    rede: '',
    vendedor: '',
    uf: '',
    situacao: '',
    busca: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [registros, setRegistros] = useState([]);

  // Estado para opções de filtros
  const [filterOptions, setFilterOptions] = useState({
    fretistas: [],
    placas: [],
    clientes: [],
    redes: [],
    vendedores: [],
    ufs: [],
    status: [],
    situacoes: []
  });

  // Estado para dados do relatório
  const [dadosRelatorio, setDadosRelatorio] = useState({
    estatisticas: {
      vendas: { total: 0, variacao: 0, meta: 0, pedidos: 0 },
      entregas: { total: 0, concluidas: 0, pendentes: 0, taxa_sucesso: 0 },
      financeiro: { receita: 0, custos: 0, lucro: 0, margem: 0 },
      usuarios: { ativos: 0, novos: 0, fretistas: 0, empresas: 0 }
    },
    dadosGrafico: {
      vendas: [],
      entregas: []
    },
    topFretistas: [],
    topRegioes: [],
    registros: []
  });

  // Carregar dados reais dos relatórios
  const carregarDadosRelatorios = async () => {
    setLoading(true);
    try {
      // Usar as novas funções do Supabase
      const { data: relatoriosData, error } = await getRelatoriosStatistics(filtros);
      
      if (error) {
        console.error('Erro ao carregar dados dos relatórios:', error);
        return;
      }
      
      if (relatoriosData) {
        setDadosRelatorio(relatoriosData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados dos relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar opções de filtros
  useEffect(() => {
    const loadFilterOptions = async () => {
      const { data, error } = await getFilterOptions();
      if (data && !error) {
        setFilterOptions(data);
      }
    };
    
    if (canViewReports) {
      loadFilterOptions();
    }
  }, [canViewReports]);

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (canViewReports) {
      carregarDadosRelatorios();
    }
  }, [filtros.dataInicio, filtros.dataFim, canViewReports]);

  // Carregar registros filtrados
  const carregarRegistrosFiltrados = async () => {
    try {
      const { data, error } = await getRegistrosWithFilters(filtros);
      if (error) {
        console.error('Erro ao carregar registros filtrados:', error);
        setRegistros([]);
        return;
      }
      setRegistros(data || []);
    } catch (error) {
      console.error('Erro ao carregar registros filtrados:', error);
      setRegistros([]);
    }
  };

  // Aplicar filtros: carregar estatísticas e registros
  const aplicarFiltros = async () => {
    await Promise.all([
      carregarDadosRelatorios(),
      carregarRegistrosFiltrados()
    ]);
  };

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/relatorios/gerar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: filtros.tipo,
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim,
          formato: 'json'
        })
      });

      if (response.ok) {
        const relatorio = await response.json();
        alert('Relatório gerado com sucesso!');
        // Atualizar dados com o relatório gerado
        setDadosRelatorio(prev => ({
          ...prev,
          ...relatorio
        }));
      } else {
        throw new Error('Erro ao gerar relatório');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = async (formato) => {
    try {
      const response = await fetch(`${API_URL}/api/relatorios/exportar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: filtros.tipo,
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim,
          formato: formato,
          fretista: filtros.fretista || undefined,
          placa: filtros.placa || undefined,
          cliente: filtros.cliente || undefined,
          status: filtros.status || undefined,
          ordenacao: 'nome_fantasia,numero_nf'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `relatorio_${formato}_${new Date().toISOString().split('T')[0]}.${formato}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert(`Relatório exportado em formato ${formato.toUpperCase()}!`);
      } else {
        throw new Error('Erro ao exportar relatório');
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório');
    }
  };

  // Utilitários de resumo para WhatsApp
  const abrirWhatsApp = (texto) => {
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (valor) => {
    try {
      return `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return `R$ ${valor}`;
    }
  };

  const diasEmAtraso = (dataEmissao) => {
    if (!dataEmissao) return 0;
    const hoje = new Date();
    const emissao = new Date(dataEmissao);
    return Math.max(0, Math.floor((hoje - emissao) / (1000 * 60 * 60 * 24)));
  };

  const pendentesMais7Dias = () => {
    const lista = (registros || []).filter(r => (r.status || '').toUpperCase() === 'PENDENTE' && diasEmAtraso(r.data_emissao) >= 7);
    return lista.sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''));
  };

  const gerarResumoGeralDiario = () => {
    const totalPendentes = (registros || []).filter(r => (r.status || '').toUpperCase() === 'PENDENTE').length;
    const totalEntregues = (registros || []).filter(r => (r.status || '').toUpperCase() === 'ENTREGUE').length;
    const totalCanceladas = (registros || []).filter(r => (r.status || '').toUpperCase() === 'CANCELADA').length;
    const totalDevolvidas = (registros || []).filter(r => (r.status || '').toUpperCase() === 'DEVOLVIDA').length;
    const eficiencia = (registros.length ? Math.round((totalEntregues / registros.length) * 100) : 0);

    const pendentes = (registros || []).filter(r => (r.status || '').toUpperCase() === 'PENDENTE');
    const noPrazo = pendentes
      .filter(r => diasEmAtraso(r.data_emissao) < 7)
      .sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''))
      .slice(0, 10)
      .map(r => `- ${r.fretista || '—'} - NF ${r.numero_nf || '—'} - ${r.nome_fantasia || '—'}`)
      .join('\n');
    const atrasados = pendentes
      .filter(r => diasEmAtraso(r.data_emissao) >= 7)
      .sort((a, b) => (a.nome_fantasia || '').localeCompare(b.nome_fantasia || ''))
      .slice(0, 10)
      .map(r => `- ${r.fretista || '—'} - NF ${r.numero_nf || '—'} - ${r.nome_fantasia || '—'}`)
      .join('\n');

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const texto = `📝 RESUMO GERAL DOS CANHOTOS – ATUALIZAÇÃO ${dataHoje}\n\n🟢 Recebidos: ${totalEntregues}\n🔴 Pendentes: ${totalPendentes}\n⚫ Cancelados: ${totalCanceladas}\n🟣 Devolução Total: ${totalDevolvidas}\n\n📈 Eficiência: ${eficiencia}%\n\n⏳ No prazo (≤ 7 dias):\n${noPrazo || '- Sem itens'}\n\n🔔 Atrasados (+7 dias):\n${atrasados || '- Sem itens'}\n\nObs.: Verificar canhotos pendentes acima de 7 dias.`;
    abrirWhatsApp(texto);
  };

  const gerarResumoPorFretista = (nomeFretista) => {
    const filtro = (registros || []).filter(r => (r.fretista || '').toLowerCase() === (nomeFretista || '').toLowerCase());
    const recebidos = filtro.filter(r => (r.status || '').toUpperCase() === 'ENTREGUE').length;
    const pendentes = filtro.filter(r => (r.status || '').toUpperCase() === 'PENDENTE');
    const mediaRetorno = 0;

    const pendNoPrazo = pendentes.filter(r => diasEmAtraso(r.data_emissao) < 7);
    const pendAtrasados = pendentes.filter(r => diasEmAtraso(r.data_emissao) >= 7);

    const gruposNoPrazo = pendNoPrazo.reduce((acc, r) => {
      const data = new Date(r.data_emissao).toLocaleDateString('pt-BR');
      acc[data] = acc[data] || [];
      acc[data].push(r);
      return acc;
    }, {});

    const gruposAtrasados = pendAtrasados.reduce((acc, r) => {
      const data = new Date(r.data_emissao).toLocaleDateString('pt-BR');
      acc[data] = acc[data] || [];
      acc[data].push(r);
      return acc;
    }, {});

    const linhasNoPrazo = Object.entries(gruposNoPrazo).map(([data, itens]) => {
      const diaSemana = new Date(itens[0].data_emissao).toLocaleDateString('pt-BR', { weekday: 'long' });
      const header = `\n⏳ Emissão: ${diaSemana}, ${data}`;
      const rows = itens.map(r => `- NF ${r.numero_nf || '—'} – ${r.nome_fantasia || '—'} – ${diasEmAtraso(r.data_emissao)} dias - ${formatCurrency(r.valor_total || r.valor || 0)}`).join('\n');
      return `${header}\n${rows}`;
    }).join('\n');

    const linhasAtrasados = Object.entries(gruposAtrasados).map(([data, itens]) => {
      const diaSemana = new Date(itens[0].data_emissao).toLocaleDateString('pt-BR', { weekday: 'long' });
      const header = `\n🔔 Emissão: ${diaSemana}, ${data}`;
      const rows = itens.map(r => `- NF ${r.numero_nf || '—'} – ${r.nome_fantasia || '—'} – ${diasEmAtraso(r.data_emissao)} dias - ${formatCurrency(r.valor_total || r.valor || 0)}`).join('\n');
      return `${header}\n${rows}`;
    }).join('\n');

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const texto = `📝 RESUMO DOS CANHOTOS POR FRETISTA – ATUALIZAÇÃO ${dataHoje}\n\n🚚 Fretista: ${nomeFretista}\n\n🟢 Recebidos: ${recebidos}\n🔴 Pendentes: ${pendentes.length}\n⏱️ Média retorno: ${mediaRetorno} dias\n\n⏳ No prazo (≤ 7 dias):${linhasNoPrazo || '\n- Sem pendentes'}\n\n🔔 Atrasados (+7 dias):${linhasAtrasados || '\n- Sem pendentes'}\n\nObs.: Priorizar coleta de canhotos atrasados.`;
    abrirWhatsApp(texto);
  };

  const gerarResumoPorCliente = (nomeCliente) => {
    const filtro = (registros || []).filter(r => (r.nome_fantasia || '').toLowerCase() === (nomeCliente || '').toLowerCase());
    const recebidos = filtro.filter(r => (r.status || '').toUpperCase() === 'ENTREGUE').length;
    const pendentes = filtro.filter(r => (r.status || '').toUpperCase() === 'PENDENTE');

    const pendNoPrazo = pendentes.filter(r => diasEmAtraso(r.data_emissao) < 7);
    const pendAtrasados = pendentes.filter(r => diasEmAtraso(r.data_emissao) >= 7);

    const linhasNoPrazo = pendNoPrazo.map(r => `- NF ${r.numero_nf || '—'} – ${r.fretista || '—'} – ${diasEmAtraso(r.data_emissao)} dias - ${formatCurrency(r.valor_total || r.valor || 0)}`).join('\n');
    const linhasAtrasados = pendAtrasados.map(r => `- NF ${r.numero_nf || '—'} – ${r.fretista || '—'} – ${diasEmAtraso(r.data_emissao)} dias - ${formatCurrency(r.valor_total || r.valor || 0)}`).join('\n');

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const texto = `📝 RESUMO DOS CANHOTOS POR CLIENTE – ATUALIZAÇÃO ${dataHoje}\n\n🏢 Cliente: ${nomeCliente}\n\n🟢 Recebidos: ${recebidos}\n🔴 Pendentes: ${pendentes.length}\n⏱️ Média retorno: — dias\n\n⏳ No prazo (≤ 7 dias):\n${linhasNoPrazo || '- Sem pendentes'}\n\n🔔 Atrasados (+7 dias):\n${linhasAtrasados || '- Sem pendentes'}\n\nObs.: Priorizar retorno dos canhotos atrasados para este cliente.`;
    abrirWhatsApp(texto);
  };

  const getVariacaoIcon = (valor) => {
    if (valor > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (valor < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getVariacaoColor = (valor) => {
    if (valor > 0) return 'text-green-600';
    if (valor < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!canViewReports) {
    return (
  <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-800 mb-2">Acesso Negado</h2>
              <p className="text-red-600">
                Você não tem permissão para acessar os relatórios. 
                Apenas administradores e gerentes podem visualizar esta seção.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
  <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Relatórios e Analytics"
          subtitle="Análise completa de performance e métricas do sistema"
          icon={<FileBarChart className="w-6 h-6 text-green-600" />}
          className="bg-white/80 backdrop-blur-sm"
        />
        {/* Header actions preserved */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={gerarRelatorio}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>

        {/* Filters Section */}
        <Card className="shadow-2xl border dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Filtre os dados dos relatórios por período e outros critérios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Primeira linha de filtros - Datas e Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Início</label>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data Fim</label>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Período</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="1y">Último ano</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </div>
            </div>

            {/* Segunda linha de filtros - Fretista, Placa, Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fretista</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.fretista || ''}
                  onChange={(e) => setFiltros({...filtros, fretista: e.target.value})}
                >
                  <option value="">Todos</option>
                  {filterOptions.fretistas.map(fretista => (
                    <option key={fretista} value={fretista}>{fretista}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Placa</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.placa || ''}
                  onChange={(e) => setFiltros({...filtros, placa: e.target.value})}
                >
                  <option value="">Todas</option>
                  {filterOptions.placas.map(placa => (
                    <option key={placa} value={placa}>{placa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cliente</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.cliente || ''}
                  onChange={(e) => setFiltros({...filtros, cliente: e.target.value})}
                >
                  <option value="">Todos</option>
                  {filterOptions.clientes.map(cliente => (
                    <option key={cliente} value={cliente}>{cliente}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Terceira linha de filtros - Rede, Vendedor, UF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rede</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.rede || ''}
                  onChange={(e) => setFiltros({...filtros, rede: e.target.value})}
                >
                  <option value="">Todas</option>
                  {filterOptions.redes.map(rede => (
                    <option key={rede} value={rede}>{rede}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Vendedor</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.vendedor || ''}
                  onChange={(e) => setFiltros({...filtros, vendedor: e.target.value})}
                >
                  <option value="">Todos</option>
                  {filterOptions.vendedores.map(vendedor => (
                    <option key={vendedor} value={vendedor}>{vendedor}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">UF</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.uf || ''}
                  onChange={(e) => setFiltros({...filtros, uf: e.target.value})}
                >
                  <option value="">Todas</option>
                  {filterOptions.ufs.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quarta linha de filtros - Status, Situação, Busca */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option value="">Todos</option>
                  {filterOptions.status.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Situação</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={filtros.situacao || ''}
                  onChange={(e) => setFiltros({...filtros, situacao: e.target.value})}
                >
                  <option value="">Todas</option>
                  {filterOptions.situacoes.map(situacao => (
                    <option key={situacao} value={situacao}>{situacao}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Busca Livre</label>
                <Input
                  type="text"
                  placeholder="Digite para buscar..."
                  value={filtros.busca || ''}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2">
               <Button onClick={aplicarFiltros}>Aplicar Filtros</Button>
               <Button variant="outline" onClick={() => setFiltros({
                 dataInicio: '',
                 dataFim: '',
                 tipo: '',
                 status: '',
                 fretista: '',
                 placa: '',
                 cliente: '',
                 rede: '',
                 vendedor: '',
                 uf: '',
                 situacao: '',
                 busca: ''
               })}>Limpar Filtros</Button>
             </div>
          </CardContent>
        </Card>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Receita Total"
            value={`R$ ${dadosRelatorio.estatisticas.vendas.total.toLocaleString()}`}
            subtitle={`${dadosRelatorio.estatisticas.vendas.pedidos} pedidos`}
            icon={DollarSign}
            color="bg-green-500"
            variation={dadosRelatorio.estatisticas.vendas.variacao}
            trend={{
              meta: `R$ ${dadosRelatorio.estatisticas.vendas.meta.toLocaleString()}`,
              progress: (dadosRelatorio.estatisticas.vendas.total / dadosRelatorio.estatisticas.vendas.meta) * 100
            }}
          />
          
          <StatCard
            title="Entregas"
            value={dadosRelatorio.estatisticas.entregas.total}
            subtitle={`${dadosRelatorio.estatisticas.entregas.concluidas} concluídas`}
            icon={Truck}
            color="bg-blue-500"
            variation={8.2}
            trend={{
              meta: "95% taxa de sucesso",
              progress: dadosRelatorio.estatisticas.entregas.taxa_sucesso
            }}
          />
          
          <StatCard
            title="Usuários Ativos"
            value={dadosRelatorio.estatisticas.usuarios.ativos}
            subtitle={`+${dadosRelatorio.estatisticas.usuarios.novos} novos`}
            icon={Users}
            color="bg-purple-500"
            variation={15.3}
          />
          
          <StatCard
            title="Margem de Lucro"
            value={`${dadosRelatorio.estatisticas.financeiro.margem}%`}
            subtitle={`R$ ${dadosRelatorio.estatisticas.financeiro.lucro.toLocaleString()}`}
            icon={Target}
            color="bg-orange-500"
            variation={5.7}
          />
        </div>

        {/* Tabs de Relatórios */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-gray-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="vendas" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="entregas" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Truck className="w-4 h-4 mr-2" />
              Entregas
            </TabsTrigger>
            <TabsTrigger value="fretistas" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Fretistas
            </TabsTrigger>
            <TabsTrigger value="regioes" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              Regiões
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Vendas */}
              <Card className="shadow-2xl border dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <LineChart className="w-5 h-5" />
                    Evolução das Vendas
                  </CardTitle>
                  <CardDescription>Receita mensal dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2 p-4">
                    {dadosRelatorio.dadosGrafico?.vendas?.map((item, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        <div className="text-xs font-medium text-gray-600">
                          R$ {(item.valor / 1000).toFixed(0)}k
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                          style={{ 
                            height: `${(item.valor / Math.max(...(dadosRelatorio.dadosGrafico?.vendas?.map(v => v.valor) || [1]))) * 200}px`,
                            minHeight: '20px'
                          }}
                        />
                        <div className="text-xs text-gray-500">{item.mes}</div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>

              {/* Status das Entregas */}
              <Card className="shadow-2xl border dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <PieChart className="w-5 h-5" />
                    Status das Entregas
                  </CardTitle>
                  <CardDescription>Distribuição semanal das entregas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dadosRelatorio.dadosGrafico?.entregas?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">{item.dia}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-600">{item.concluidas}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-gray-600">{item.pendentes}</span>
                          </div>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Tempo Médio de Entrega</p>
                      <p className="text-3xl font-bold">2.4h</p>
                      <p className="text-green-100 text-sm">-15 min vs. mês anterior</p>
                    </div>
                    <Clock className="w-12 h-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Avaliação Média</p>
                      <p className="text-3xl font-bold">4.7★</p>
                      <p className="text-blue-100 text-sm">+0.2 vs. mês anterior</p>
                    </div>
                    <Target className="w-12 h-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Taxa de Retenção</p>
                      <p className="text-3xl font-bold">89%</p>
                      <p className="text-purple-100 text-sm">+5% vs. mês anterior</p>
                    </div>
                    <Zap className="w-12 h-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Resumos WhatsApp */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <FileText className="w-5 h-5" />
                  Resumos WhatsApp
                </CardTitle>
                <CardDescription>
                  Gere resumos rápidos e compartilhe pelo WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={gerarResumoGeralDiario} className="bg-blue-600 text-white hover:bg-blue-700">
                    📝 Resumo Geral Diário
                  </Button>
                  <Button onClick={() => {
                    const nome = prompt('Digite o nome do fretista');
                    if (nome) gerarResumoPorFretista(nome);
                  }} className="bg-green-600 text-white hover:bg-green-700">
                    🚛 Resumo por Fretista
                  </Button>
                  <Button onClick={() => {
                    const nome = prompt('Digite o nome do cliente');
                    if (nome) gerarResumoPorCliente(nome);
                  }} className="bg-purple-600 text-white hover:bg-purple-700">
                    🏢 Resumo por Cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Vendas */}
          <TabsContent value="vendas" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Análise Detalhada de Vendas</CardTitle>
                <CardDescription>Performance de vendas por período e categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="h-80 flex items-end justify-between gap-3 p-4 bg-gray-50 rounded-lg">
                      {dadosRelatorio.dadosGrafico?.vendas?.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                          <div className="text-xs font-medium text-gray-600">
                            {item.pedidos}
                          </div>
                          <div 
                            className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-md transition-all duration-300 hover:from-purple-600 hover:to-purple-500 cursor-pointer"
                            style={{ 
                              height: `${(item.pedidos / Math.max(...(dadosRelatorio.dadosGrafico?.vendas?.map(v => v.pedidos) || [1]))) * 250}px`,
                              minHeight: '30px'
                            }}
                            title={`${item.mes}: ${item.pedidos} pedidos - R$ ${item.valor.toLocaleString()}`}
                          />
                          <div className="text-xs text-gray-500">{item.mes}</div>
                        </div>
                      )) || []}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Produtos Mais Vendidos</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Eletrônicos</span>
                          <span className="font-medium">45%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Roupas</span>
                          <span className="font-medium">28%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Casa & Jardim</span>
                          <span className="font-medium">18%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Outros</span>
                          <span className="font-medium">9%</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Metas do Mês</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Receita</span>
                            <span>83%</span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '83%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Pedidos</span>
                            <span>91%</span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '91%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Entregas */}
          <TabsContent value="entregas" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800">Performance de Entregas</CardTitle>
                  <CardDescription>Análise semanal de entregas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dadosRelatorio.dadosGrafico?.entregas?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.dia}</div>
                            <div className="text-sm text-gray-500">
                              {item.concluidas + item.pendentes} total
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium">{item.concluidas}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">{item.pendentes}</span>
                          </div>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800">Métricas de Qualidade</CardTitle>
                  <CardDescription>Indicadores de performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
                        <span className="text-sm font-bold text-green-600">92.6%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: '92.6%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Pontualidade</span>
                        <span className="text-sm font-bold text-blue-600">87.3%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: '87.3%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Satisfação</span>
                        <span className="text-sm font-bold text-purple-600">94.1%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-purple-500 h-3 rounded-full" style={{ width: '94.1%' }}></div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">2.4h</div>
                        <div className="text-xs text-green-700">Tempo Médio</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">4.7★</div>
                        <div className="text-xs text-blue-700">Avaliação</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Top Fretistas */}
          <TabsContent value="fretistas" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Ranking de Fretistas</CardTitle>
                <CardDescription>Performance dos melhores fretistas do mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dadosRelatorio.topFretistas?.map((fretista, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{fretista.nome}</div>
                          <div className="text-sm text-gray-500">{fretista.entregas} entregas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          R$ {fretista.receita.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <span>★</span>
                          <span>{fretista.avaliacao}</span>
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Análise por Regiões */}
          <TabsContent value="regioes" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">Performance por Região</CardTitle>
                <CardDescription>Análise geográfica de entregas e receita</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dadosRelatorio.topRegioes?.map((regiao, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium text-gray-900">{regiao.nome}</div>
                            <div className="text-sm text-gray-500">{regiao.entregas} entregas</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            R$ {regiao.receita.toLocaleString()}
                          </div>
                          <div className={`flex items-center gap-1 text-sm ${getVariacaoColor(regiao.crescimento)}`}>
                            {getVariacaoIcon(regiao.crescimento)}
                            <span>{Math.abs(regiao.crescimento)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(regiao.entregas / Math.max(...(dadosRelatorio.topRegioes?.map(r => r.entregas) || [1]))) * 100}%` }}
                        />
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ações de Exportação */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Download className="w-5 h-5" />
              Exportar Relatórios
            </CardTitle>
            <CardDescription>
              Baixe os relatórios em diferentes formatos para análise externa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => exportarRelatorio('pdf')}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button 
                onClick={() => exportarRelatorio('excel')}
                variant="outline"
                className="border-green-200 text-green-600 hover:bg-green-50"
              >
                <FileBarChart className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
              <Button 
                onClick={() => exportarRelatorio('csv')}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;