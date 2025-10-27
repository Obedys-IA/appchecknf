import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar, 
  Filter,
  FileText,
  PieChart,
  Activity,
  DollarSign,
  Package,
  Truck,
  Users,
  Clock,
  MapPin,
  Target,
  Zap,
  Eye,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  Search,
  Calendar as CalendarIcon,
  FileBarChart,
  LineChart,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Relatorios = () => {
  const { userData } = useAuth();
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState({
    vendas: [],
    entregas: [],
    usuarios: [],
    financeiro: {}
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  // Dados simulados para demonstração
  const estatisticas = {
    vendas: {
      total: 125000,
      variacao: 12.5,
      meta: 150000,
      pedidos: 342
    },
    entregas: {
      total: 298,
      concluidas: 276,
      pendentes: 22,
      taxa_sucesso: 92.6
    },
    financeiro: {
      receita: 125000,
      custos: 87500,
      lucro: 37500,
      margem: 30
    },
    usuarios: {
      ativos: 156,
      novos: 23,
      fretistas: 45,
      empresas: 78
    }
  };

  const dadosGrafico = {
    vendas: [
      { mes: 'Jan', valor: 45000, pedidos: 120 },
      { mes: 'Fev', valor: 52000, pedidos: 135 },
      { mes: 'Mar', valor: 48000, pedidos: 128 },
      { mes: 'Abr', valor: 61000, pedidos: 156 },
      { mes: 'Mai', valor: 55000, pedidos: 142 },
      { mes: 'Jun', valor: 67000, pedidos: 178 }
    ],
    entregas: [
      { dia: 'Seg', concluidas: 45, pendentes: 5 },
      { dia: 'Ter', concluidas: 52, pendentes: 3 },
      { dia: 'Qua', concluidas: 48, pendentes: 7 },
      { dia: 'Qui', concluidas: 61, pendentes: 4 },
      { dia: 'Sex', concluidas: 55, pendentes: 2 },
      { dia: 'Sab', concluidas: 35, pendentes: 1 },
      { dia: 'Dom', concluidas: 28, pendentes: 0 }
    ]
  };

  const topFretistas = [
    { nome: 'João Silva', entregas: 45, avaliacao: 4.8, receita: 12500 },
    { nome: 'Maria Santos', entregas: 38, avaliacao: 4.9, receita: 11200 },
    { nome: 'Pedro Costa', entregas: 32, avaliacao: 4.7, receita: 9800 },
    { nome: 'Ana Oliveira', entregas: 28, avaliacao: 4.6, receita: 8900 },
    { nome: 'Carlos Lima', entregas: 25, avaliacao: 4.5, receita: 7800 }
  ];

  const regioes = [
    { nome: 'Centro', entregas: 89, receita: 25600, crescimento: 15.2 },
    { nome: 'Zona Norte', entregas: 76, receita: 22100, crescimento: 8.7 },
    { nome: 'Zona Sul', entregas: 65, receita: 19800, crescimento: -2.1 },
    { nome: 'Zona Leste', entregas: 45, receita: 14200, crescimento: 22.5 },
    { nome: 'Zona Oeste', entregas: 23, receita: 8300, crescimento: 5.8 }
  ];

  // Carregar dados reais dos relatórios
  const carregarDadosRelatorios = async () => {
    setLoading(true);
    try {
      // Buscar estatísticas gerais
      const responseStats = await fetch('/api/relatorios/estatisticas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (responseStats.ok) {
        const stats = await responseStats.json();
        setDadosRelatorio(prev => ({
          ...prev,
          ...stats
        }));
      }

      // Buscar dados de vendas por período
      const responseVendas = await fetch(`/api/relatorios/vendas?inicio=${filtros.dataInicio}&fim=${filtros.dataFim}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (responseVendas.ok) {
        const vendas = await responseVendas.json();
        setDadosRelatorio(prev => ({
          ...prev,
          vendas: vendas
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados dos relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (canViewReports) {
      carregarDadosRelatorios();
    }
  }, [filtros.dataInicio, filtros.dataFim, canViewReports]);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/relatorios/gerar', {
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
      const response = await fetch('/api/relatorios/exportar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: filtros.tipo,
          dataInicio: filtros.dataInicio,
          dataFim: filtros.dataFim,
          formato: formato
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

  const StatCard = ({ title, value, subtitle, icon: Icon, color, variation, trend }) => (
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

  // Verificação de permissões
  const isAdmin = userData?.tipo === 'administrador';
  const isGerencia = userData?.tipo === 'gerencia';
  const canViewReports = isAdmin || isGerencia;

  if (!canViewReports) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Relatórios e Analytics
            </h1>
            <p className="text-gray-600 mt-2">Análise completa de performance e métricas do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>
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
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Receita Total"
            value={`R$ ${estatisticas.vendas.total.toLocaleString()}`}
            subtitle={`${estatisticas.vendas.pedidos} pedidos`}
            icon={DollarSign}
            color="bg-green-500"
            variation={estatisticas.vendas.variacao}
            trend={{
              meta: `R$ ${estatisticas.vendas.meta.toLocaleString()}`,
              progress: (estatisticas.vendas.total / estatisticas.vendas.meta) * 100
            }}
          />
          
          <StatCard
            title="Entregas"
            value={estatisticas.entregas.total}
            subtitle={`${estatisticas.entregas.concluidas} concluídas`}
            icon={Truck}
            color="bg-blue-500"
            variation={8.2}
            trend={{
              meta: "95% taxa de sucesso",
              progress: estatisticas.entregas.taxa_sucesso
            }}
          />
          
          <StatCard
            title="Usuários Ativos"
            value={estatisticas.usuarios.ativos}
            subtitle={`+${estatisticas.usuarios.novos} novos`}
            icon={Users}
            color="bg-purple-500"
            variation={15.3}
          />
          
          <StatCard
            title="Margem de Lucro"
            value={`${estatisticas.financeiro.margem}%`}
            subtitle={`R$ ${estatisticas.financeiro.lucro.toLocaleString()}`}
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
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <LineChart className="w-5 h-5" />
                    Evolução das Vendas
                  </CardTitle>
                  <CardDescription>Receita mensal dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2 p-4">
                    {dadosGrafico.vendas.map((item, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        <div className="text-xs font-medium text-gray-600">
                          R$ {(item.valor / 1000).toFixed(0)}k
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                          style={{ 
                            height: `${(item.valor / Math.max(...dadosGrafico.vendas.map(v => v.valor))) * 200}px`,
                            minHeight: '20px'
                          }}
                        />
                        <div className="text-xs text-gray-500">{item.mes}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status das Entregas */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <PieChart className="w-5 h-5" />
                    Status das Entregas
                  </CardTitle>
                  <CardDescription>Distribuição semanal das entregas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dadosGrafico.entregas.map((item, index) => (
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
                    ))}
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
                      {dadosGrafico.vendas.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                          <div className="text-xs font-medium text-gray-600">
                            {item.pedidos}
                          </div>
                          <div 
                            className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-md transition-all duration-300 hover:from-purple-600 hover:to-purple-500 cursor-pointer"
                            style={{ 
                              height: `${(item.pedidos / Math.max(...dadosGrafico.vendas.map(v => v.pedidos))) * 250}px`,
                              minHeight: '30px'
                            }}
                            title={`${item.mes}: ${item.pedidos} pedidos - R$ ${item.valor.toLocaleString()}`}
                          />
                          <div className="text-xs text-gray-500">{item.mes}</div>
                        </div>
                      ))}
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
                    {dadosGrafico.entregas.map((item, index) => (
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
                    ))}
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
                  {topFretistas.map((fretista, index) => (
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
                  ))}
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
                  {regioes.map((regiao, index) => (
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
                          style={{ width: `${(regiao.entregas / Math.max(...regioes.map(r => r.entregas))) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
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