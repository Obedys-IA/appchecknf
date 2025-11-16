import React, { useState, useEffect } from 'react';
import { BarChart3, Filter, Download, TrendingUp, Users, Building, ShoppingCart, AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getDeliveryRecordsWithFilters, getDeliveryRecordsWithFiltersAndPermissions, clientData, fretistas, problemTypes } from '../firebaseUtils.js';
import '../App.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import PageHeader from '../Components/PageHeader.jsx';

function Dashboard() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const [filterPeriod, setFilterPeriod] = useState('currentMonth');
  const [filterClient, setFilterClient] = useState('');
  const [filterFretista, setFilterFretista] = useState('');
  const [filterProblemType, setFilterProblemType] = useState('');
  const [filterVendedor, setFilterVendedor] = useState('');
  const [filterRede, setFilterRede] = useState('');
  const [filterUF, setFilterUF] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    topVendedor: { name: 'N/A', count: 0 },
    topRede: { name: 'N/A', count: 0 },
    topCliente: { name: 'N/A', count: 0 },
    totalRegistros: 0,
    registrosComProblemas: 0,
    tempoMedio: 0
  });

  const navigate = useNavigate();

  // Extrair listas dos dados
  const clients = Object.keys(clientData);
  const vendedores = [...new Set(Object.values(clientData).map(client => client.vendedor))];
  const redes = [...new Set(Object.values(clientData).map(client => client.rede))];
  const ufs = [...new Set(Object.values(clientData).map(client => client.uf))];

  // Função para calcular estatísticas dos registros
  const calculateStats = (records) => {
    const stats = {
      topVendedor: { name: 'N/A', count: 0 },
      topRede: { name: 'N/A', count: 0 },
      topCliente: { name: 'N/A', count: 0 },
      totalRegistros: records.length,
      registrosComProblemas: 0,
      tempoMedio: 0
    };

    // Contadores para rankings
    const vendedorCounts = {};
    const redeCounts = {};
    const clienteCounts = {};
    let totalTempo = 0;
    let registrosComTempo = 0;

    records.forEach(record => {
      // Contar problemas
      if (record.problem_type && record.problem_type.trim() !== '') {
        stats.registrosComProblemas++;
      }

      // Contar por vendedor
      if (record.vendedor) {
        vendedorCounts[record.vendedor] = (vendedorCounts[record.vendedor] || 0) + 1;
      }

      // Contar por rede
      if (record.rede) {
        redeCounts[record.rede] = (redeCounts[record.rede] || 0) + 1;
      }

      // Contar por cliente
      if (record.client) {
        clienteCounts[record.client] = (clienteCounts[record.client] || 0) + 1;
      }

      // Calcular tempo médio
      if (record.duration && record.duration.includes('min')) {
        const tempoStr = record.duration.replace(' min', '');
        const tempo = parseInt(tempoStr);
        if (!isNaN(tempo)) {
          totalTempo += tempo;
          registrosComTempo++;
        }
      }
    });

    // Encontrar top vendedor com problemas
    let maxVendedor = 0;
    Object.entries(vendedorCounts).forEach(([vendedor, count]) => {
      if (count > maxVendedor) {
        maxVendedor = count;
        stats.topVendedor = { name: vendedor, count };
      }
    });

    // Encontrar top rede com problemas
    let maxRede = 0;
    Object.entries(redeCounts).forEach(([rede, count]) => {
      if (count > maxRede) {
        maxRede = count;
        stats.topRede = { name: rede, count };
      }
    });

    // Encontrar top cliente com problemas
    let maxCliente = 0;
    Object.entries(clienteCounts).forEach(([cliente, count]) => {
      if (count > maxCliente) {
        maxCliente = count;
        stats.topCliente = { name: cliente, count };
      }
    });

    stats.tempoMedio = registrosComTempo > 0 ? Math.round(totalTempo / registrosComTempo) : 0;
    return stats;
  };

  // Função para obter registros baseado nos filtros
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const filters = {};

      // Aplicar filtros
      if (filterClient) filters.client = filterClient;
      if (filterFretista) filters.driver = filterFretista;
      if (filterProblemType) filters.problemType = filterProblemType;
      if (filterVendedor) filters.vendedor = filterVendedor;
      if (filterRede) filters.rede = filterRede;
      if (filterUF) filters.uf = filterUF;

      // Aplicar filtros de período
      const now = new Date();
      let startDateFilter = null;
      let endDateFilter = null;

      switch (filterPeriod) {
        case 'today':
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDateFilter = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          endDateFilter = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
        case 'thisWeek':
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          startDateFilter = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'lastWeek':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
          startDateFilter = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate());
          endDateFilter = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59);
          break;
        case 'currentMonth':
          startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
          endDateFilter = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'lastMonth':
          startDateFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDateFilter = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'currentQuarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDateFilter = new Date(now.getFullYear(), quarter * 3, 1);
          endDateFilter = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
          break;
        case 'lastQuarter':
          const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
          const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
          startDateFilter = new Date(lastQuarterYear, lastQuarterMonth, 1);
          endDateFilter = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59);
          break;
        case 'currentSemester':
          const semester = Math.floor(now.getMonth() / 6);
          startDateFilter = new Date(now.getFullYear(), semester * 6, 1);
          endDateFilter = new Date(now.getFullYear(), (semester + 1) * 6, 0, 23, 59, 59);
          break;
        case 'lastSemester':
          const lastSemester = Math.floor(now.getMonth() / 6) - 1;
          const lastSemesterYear = lastSemester < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastSemesterMonth = lastSemester < 0 ? 6 : lastSemester * 6;
          startDateFilter = new Date(lastSemesterYear, lastSemesterMonth, 1);
          endDateFilter = new Date(lastSemesterYear, lastSemesterMonth + 6, 0, 23, 59, 59);
          break;
        case 'currentYear':
          startDateFilter = new Date(now.getFullYear(), 0, 1);
          endDateFilter = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case 'lastYear':
          startDateFilter = new Date(now.getFullYear() - 1, 0, 1);
          endDateFilter = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
          break;
      }

      // Buscar registros
      const allRecords = await getDeliveryRecordsWithFiltersAndPermissions(filters, currentUser);
      
      // Filtrar por período
      const filteredRecords = allRecords.filter(record => {
        if (!startDateFilter || !endDateFilter) return true;
        const recordDate = new Date(record.timestamp?.toDate() || record.checkin_time);
        return recordDate >= startDateFilter && recordDate <= endDateFilter;
      });

      setRecords(filteredRecords);
      setStats(calculateStats(filteredRecords));
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o componente montar ou filtros mudarem
  useEffect(() => {
    fetchRecords();
  }, [filterPeriod, filterClient, filterFretista, filterProblemType, filterVendedor, filterRede, filterUF]);

  const handleClearFilters = () => {
    setFilterPeriod('currentMonth');
    setFilterClient('');
    setFilterFretista('');
    setFilterProblemType('');
    setFilterVendedor('');
    setFilterRede('');
    setFilterUF('');
  };

  const handleSavePdf = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    // Captura o cabeçalho
    const header = document.querySelector('.dashboard-container > div');
    const statsCards = document.querySelectorAll('.dashboard-stats-card');
    const chartSections = document.querySelectorAll('.dashboard-chart-section');
    let y = 10;
    // Cabeçalho
    if (header) {
      const canvas = await html2canvas(header);
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
      doc.addImage(imgData, 'PNG', 0, y, pageWidth, imgHeight);
      y += imgHeight + 5;
    }
    // Cards de estatísticas
    for (let card of statsCards) {
      const canvas = await html2canvas(card);
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth() / 2 - 10;
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
      if (y + imgHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 10;
      }
      doc.addImage(imgData, 'PNG', 10, y, pageWidth, imgHeight);
      y += imgHeight + 5;
    }
    // Gráficos
    for (let chart of chartSections) {
      const canvas = await html2canvas(chart);
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth() - 20;
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
      if (y + imgHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 10;
      }
      doc.addImage(imgData, 'PNG', 10, y, pageWidth, imgHeight);
      y += imgHeight + 10;
    }
    doc.save('dashboard_logistica.pdf');
  };

  // Funções utilitárias para gráficos
  // Problemas por tipo
  const problemasPorTipo = () => {
    const counts = {};
    records.forEach(r => {
      if (r.problem_type) {
        counts[r.problem_type] = (counts[r.problem_type] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([tipo, count]) => ({ tipo, count }));
  };

  // Top 10 clientes por tempo médio
  const topClientesTempoMedio = () => {
    const clientes = {};
    records.forEach(r => {
      if (r.client && r.duration && r.duration.includes('min')) {
        const tempo = parseInt(r.duration.replace(' min', ''));
        if (!isNaN(tempo)) {
          if (!clientes[r.client]) clientes[r.client] = [];
          clientes[r.client].push(tempo);
        }
      }
    });
    const arr = Object.entries(clientes).map(([client, tempos]) => ({
      client,
      tempoMedio: Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
    }));
    return arr.sort((a, b) => b.tempoMedio - a.tempoMedio).slice(0, 10);
  };

  // Top 10 clientes por devoluções
  const topClientesDevolucoes = () => {
    const counts = {};
    records.forEach(r => {
      if (r.client && r.status === 'Entrega devolvida') {
        counts[r.client] = (counts[r.client] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([client, count]) => ({ client, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  };

  // Total de registros por fretista
  const registrosPorFretista = () => {
    const counts = {};
    records.forEach(r => {
      if (r.driver) {
        counts[r.driver] = (counts[r.driver] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([driver, count]) => ({ driver, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Distribuição por status
  const distribuicaoStatus = () => {
    const counts = {};
    records.forEach(r => {
      if (r.status) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  };

  // Problemas por UF
  const problemasPorUF = () => {
    const counts = {};
    records.forEach(r => {
      if (r.uf && r.problem_type) {
        counts[r.uf] = (counts[r.uf] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([uf, count]) => ({ uf, count }));
  };

  // Cores para os gráficos com gradientes
  const COLORS = ['#ff9800', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#ff5722', '#795548', '#607d8b'];
  const GRADIENT_COLORS = [
    { start: '#ff9800', end: '#ff5722' },
    { start: '#2196f3', end: '#1976d2' },
    { start: '#4caf50', end: '#388e3c' },
    { start: '#f44336', end: '#d32f2f' },
    { start: '#9c27b0', end: '#7b1fa2' },
    { start: '#ff5722', end: '#e64a19' },
    { start: '#795548', end: '#5d4037' },
    { start: '#607d8b', end: '#455a64' }
  ];

  // Função para tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${isDarkMode ? '#4b5563' : '#e0e0e0'}`,
          borderRadius: 8,
          padding: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#333' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              margin: '4px 0 0 0', 
              color: entry.color,
              fontSize: '14px'
            }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Função para animação de entrada dos gráficos
  const chartAnimation = {
    animationBegin: 0,
    animationDuration: 800,
    animationEasing: 'ease-out'
  };

  return (
    <div className="dashboard-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '24px 0'}}>
      {/* Cabeçalho moderno padrão localização */}
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos indicadores logísticos"
        icon={BarChart3}
       />

      {/* Filtros */}
      <div className="card" style={{padding: 20, marginBottom: 20, background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              marginBlock: 14,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined}}>
        <h3 style={{fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600}}>
          <Filter style={{width: 16, height: 16}} />
          Filtros de Análise
        </h3>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12}}>
          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>Período:</label>
          <select
          style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="thisWeek">Esta Semana</option>
            <option value="lastWeek">Semana Passada</option>
            <option value="currentMonth">Mês Atual</option>
            <option value="lastMonth">Mês Anterior</option>
            <option value="currentQuarter">Trimestre Atual</option>
            <option value="lastQuarter">Trimestre Passado</option>
            <option value="currentSemester">Semestre Atual</option>
            <option value="lastSemester">Semestre Passado</option>
            <option value="currentYear">Ano Atual</option>
            <option value="lastYear">Ano Passado</option>
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>👤 Cliente:</label>
          <select
                    style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>🚛 Fretista:</label>
          <select
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterFretista}
            onChange={(e) => setFilterFretista(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todos os fretistas</option>
            {fretistas.map((fretista) => (
              <option key={fretista} value={fretista}>{fretista}</option>
            ))}
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>⚠️ Tipo de Problema:</label>
          <select
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterProblemType}
            onChange={(e) => setFilterProblemType(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todos os tipos</option>
            {problemTypes.map((problem) => (
              <option key={problem} value={problem}>{problem}</option>
            ))}
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>👨‍💼 Vendedor:</label>
          <select
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterVendedor}
            onChange={(e) => setFilterVendedor(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todos os vendedores</option>
            {vendedores.map((vendedor) => (
              <option key={vendedor} value={vendedor}>{vendedor}</option>
            ))}
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>🏪 Rede:</label>
          <select
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterRede}
            onChange={(e) => setFilterRede(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todas as redes</option>
            {redes.map((rede) => (
              <option key={rede} value={rede}>{rede}</option>
            ))}
          </select>
        </div>

          <div>
            <label style={{display: 'block', fontWeight: 500, color: isDarkMode ? '#9ca3af' : '#2a2a2a', marginBottom: 6, fontSize: 13}}>📍 UF:</label>
          <select
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
            value={filterUF}
            onChange={(e) => setFilterUF(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-all duration-200 text-sm
              ${isDarkMode 
                ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary' 
                : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'
              }
              focus:outline-none focus:ring-1 focus:ring-opacity-20
              ${isDarkMode ? 'focus:ring-dark-primary' : 'focus:ring-light-primary'}
            `}
          >
              <option value="">Todas as UFs</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

          <div style={{display: 'flex', alignItems: 'end'}}>
            <button 
              type="button"
              onClick={handleClearFilters}
              className={`
                w-full px-3 py-2 rounded-md border-none text-sm font-medium cursor-pointer
                transition-all duration-200 inline-flex items-center justify-center gap-2
                ${isDarkMode 
                  ? 'bg-dark-primary hover:bg-dark-primary/90 text-white' 
                  : 'bg-light-primary hover:bg-light-primary/90 text-white'
                }
                shadow-sm hover:shadow-md
              `}
            >
              <Filter className="w-4 h-4" />
              Limpar Filtros
            </button>
      </div>
        </div>
        </div>

      {/* Ação PDF */}
      <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            marginBlock: 16
            }} className={`
        rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-red-600/20' 
                : 'bg-white border-light-border hover:shadow-red-600/20'
              }
      `}>
        <div className="flex justify-center">
          <button 
            onClick={handleSavePdf}
            disabled={loading}
            className={`
              px-4 py-2 rounded-md text-sm font-medium cursor-pointer
              transition-all duration-200 inline-flex items-center gap-2
              ${isDarkMode 
                ? 'bg-dark-success hover:bg-dark-success/90 text-white' 
                : 'bg-light-success hover:bg-light-success/90 text-white'
              }
              shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Download className="w-4 h-4" />
            Salvar Dashboard em PDF
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            }} className={`
          rounded-lg border p-4 text-center
          ${isDarkMode 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-light-card border-light-border'
          }
        `}>
          <div className={`
            rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3
            ${isDarkMode ? 'bg-dark-danger' : 'bg-light-danger'}
          `}>
            <Users className="text-white w-5 h-5" />
          </div>
          <h3 className={`
            text-sm font-medium mb-2
            ${isDarkMode ? 'text-dark-text' : 'text-light-text'}
          `}>Top 1 Vendedor (Problemas)</h3>
          <p className={`
            text-lg font-semibold mb-1
            ${isDarkMode ? 'text-dark-danger' : 'text-light-danger'}
          `}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.topVendedor.name}
          </p>
          <small className={`
            ${isDarkMode ? 'text-dark-text/70' : 'text-light-text/70'}
          `}>{stats.topVendedor.count} registros</small>
        </div>

        <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            }} className={`
          rounded-lg border p-4 text-center
          ${isDarkMode 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-light-card border-light-border'
          }
        `}>
          <div className={`
            rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3
            ${isDarkMode ? 'bg-dark-warning' : 'bg-light-warning'}
          `}>
            <Building className="text-white w-5 h-5" />
          </div>
          <h3 className={`
            text-sm font-medium mb-2
            ${isDarkMode ? 'text-dark-text' : 'text-light-text'}
          `}>Top 1 Rede (Problemas)</h3>
          <p className={`
            text-lg font-semibold mb-1
            ${isDarkMode ? 'text-dark-warning' : 'text-light-warning'}
          `}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.topRede.name}
          </p>
          <small className={`
            ${isDarkMode ? 'text-dark-text/70' : 'text-light-text/70'}
          `}>{stats.topRede.count} registros</small>
        </div>

        <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            }} className={`
          rounded-lg border p-4 text-center
          ${isDarkMode 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-light-card border-light-border'
          }
        `}>
          <div className={`
            rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3
            ${isDarkMode ? 'bg-dark-accent' : 'bg-light-accent'}
          `}>
            <ShoppingCart className="text-white w-5 h-5" />
          </div>
          <h3 className={`
            text-sm font-medium mb-2
            ${isDarkMode ? 'text-dark-text' : 'text-light-text'}
          `}>Top 1 Cliente (Problemas)</h3>
          <p className={`
            text-lg font-semibold mb-1
            ${isDarkMode ? 'text-dark-accent' : 'text-light-accent'}
          `}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : stats.topCliente.name}
          </p>
          <small className={`
            ${isDarkMode ? 'text-dark-text/70' : 'text-light-text/70'}
          `}>{stats.topCliente.count} registros</small>
        </div>
      </div>

      {/* Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            }} className={`
          rounded-lg border p-4
          ${isDarkMode 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-light-card border-light-border'
          }
        `}>
          <h3 style={{fontSize: '1.0rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <AlertTriangle className="w-4 h-4" />
            Problemas por Tipo
          </h3>
          {loading ? (
            <div className={`
              p-8 rounded-lg text-center
              ${isDarkMode ? 'bg-dark-surface' : 'bg-light-surface'}
            `}>
              <Loader2 className={`
                w-8 h-8 mb-3 mx-auto animate-spin
                ${isDarkMode ? 'text-dark-text/50' : 'text-light-text/50'}
              `} />
              <p className={`
                text-sm m-0
                ${isDarkMode ? 'text-dark-text/70' : 'text-light-text/70'}
              `}>Carregando dados...</p>
            </div>
          ) : problemasPorTipo().length === 0 ? (
            <div className={`
              p-8 rounded-lg text-center
              ${isDarkMode ? 'bg-dark-surface' : 'bg-light-surface'}
            `}>
              <p className={`
                text-sm m-0
                ${isDarkMode ? 'text-dark-text/70' : 'text-light-text/70'}
              `}>Nenhum problema registrado.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={problemasPorTipo()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                {...chartAnimation}
              >
                <defs>
                  {GRADIENT_COLORS.map((color, index) => (
                    <linearGradient key={index} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color.start} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={color.end} stopOpacity={0.6}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#f0f0f0'} />
                <XAxis 
                  dataKey="tipo" 
                  fontSize={12} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    console.log('Clicked on:', data);
                    // Aqui você pode adicionar navegação ou filtros
                  }}
                >
                  {problemasPorTipo().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#gradient${index % GRADIENT_COLORS.length})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            }} className={`
          rounded-lg border p-4
          ${isDarkMode 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-light-card border-light-border'
          }
        `}>
          <h3 style={{fontSize: '1.0rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <Clock className="w-4 h-4" /> 
            Top 10 Clientes - Maior Tempo Médio
          </h3>
          {loading ? (
            <div className={`
              p-8 rounded-lg text-center
              ${isDarkMode ? 'bg-dark-surface' : 'bg-light-surface'}
            `}>
              <Loader2 className={`
                w-8 h-8 mb-3 mx-auto animate-spin
                ${isDarkMode ? 'text-dark-text/50' : 'text-light-text/50'}
              `} />
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Carregando dados...</p>
            </div>
          ) : topClientesTempoMedio().length === 0 ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Nenhum dado disponível.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={topClientesTempoMedio()} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                {...chartAnimation}
              >
                <defs>
                  <linearGradient id="timeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#42a5f5" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#f0f0f0'} />
                <XAxis 
                  type="number" 
                  allowDecimals={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <YAxis 
                  dataKey="client" 
                  type="category" 
                  fontSize={12} 
                  width={120} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="tempoMedio" 
                  fill="url(#timeGradient)"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card dashboard-chart-section" style={{ background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined, padding: 24, marginBlock: 5}}>
          <h3 style={{fontSize: '1.0rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <XCircle style={{width: 20, height: 20}} />
            Top 10 Clientes - Mais Devoluções
          </h3>
          {loading ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <Loader2 style={{width: 48, height: 48, color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 16, animation: 'spin 1s linear infinite'}} />
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Carregando dados...</p>
            </div>
          ) : topClientesDevolucoes().length === 0 ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Nenhum dado disponível.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={topClientesDevolucoes()} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                {...chartAnimation}
              >
                <defs>
                  <linearGradient id="returnGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#dc3545" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f8d7da" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#f0f0f0'} />
                <XAxis 
                  type="number" 
                  allowDecimals={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <YAxis 
                  dataKey="client" 
                  type="category" 
                  fontSize={12} 
                  width={120} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="url(#returnGradient)"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card dashboard-chart-section" style={{background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined, padding: 24, marginBlock: 5}}>
          <h3 style={{fontSize: '1.0rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <Users style={{width: 20, height: 20}} />
            Total de Registros por Fretista
          </h3>
          {loading ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <Loader2 style={{width: 48, height: 48, color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 16, animation: 'spin 1s linear infinite'}} />
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Carregando dados...</p>
            </div>
          ) : registrosPorFretista().length === 0 ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Nenhum dado disponível.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={registrosPorFretista()} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                {...chartAnimation}
              >
                <defs>
                  <linearGradient id="driverGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor="#43a047" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#81c784" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#f0f0f0'} />
                <XAxis 
                  type="number" 
                  allowDecimals={false} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <YAxis 
                  dataKey="driver" 
                  type="category" 
                  fontSize={12} 
                  width={120} 
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#666' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="url(#driverGradient)"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card dashboard-chart-section" style={{background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined, padding: 24, marginBlock: 5}}>
          <h3 style={{fontSize: '1.0rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <CheckCircle style={{width: 20, height: 20}} />
            Distribuição por Status
          </h3>
          {loading ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <Loader2 style={{width: 48, height: 48, color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 16, animation: 'spin 1s linear infinite'}} />
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Carregando dados...</p>
            </div>
          ) : distribuicaoStatus().length === 0 ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Nenhum dado disponível.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {GRADIENT_COLORS.map((color, index) => (
                    <radialGradient key={index} id={`pieGradient${index}`}>
                      <stop offset="0%" stopColor={color.start} stopOpacity={0.8}/>
                      <stop offset="100%" stopColor={color.end} stopOpacity={0.6}/>
                    </radialGradient>
                  ))}
                </defs>
                <Pie 
                  data={distribuicaoStatus()} 
                  dataKey="count" 
                  nameKey="status" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  {...chartAnimation}
                >
                  {distribuicaoStatus().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#pieGradient${index % GRADIENT_COLORS.length})`}
                      stroke={isDarkMode ? '#2a2a2a' : '#fff'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card dashboard-chart-section" style={{background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined, padding: 24, marginBlock: 5}}>
          <h3 style={{fontSize: '0.9rem', color: isDarkMode ? '#10b981' : '#218838', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8}}>
            <AlertTriangle style={{width: 20, height: 20}} />
            Registros com Problemas por UF (%)
          </h3>
          {loading ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <Loader2 style={{width: 48, height: 48, color: isDarkMode ? '#9ca3af' : '#666', marginBottom: 16, animation: 'spin 1s linear infinite'}} />
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Carregando dados...</p>
            </div>
          ) : problemasPorUF().length === 0 ? (
            <div style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa', padding: 40, borderRadius: 12, textAlign: 'center'}}>
              <p style={{color: isDarkMode ? '#9ca3af' : '#666', margin: 0}}>Nenhum dado disponível.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {GRADIENT_COLORS.map((color, index) => (
                    <radialGradient key={index} id={`ufGradient${index}`}>
                      <stop offset="0%" stopColor={color.start} stopOpacity={0.8}/>
                      <stop offset="100%" stopColor={color.end} stopOpacity={0.6}/>
                    </radialGradient>
                  ))}
                </defs>
                <Pie 
                  data={problemasPorUF()} 
                  dataKey="count" 
                  nameKey="uf" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  {...chartAnimation}
                >
                  {problemasPorUF().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#ufGradient${index % GRADIENT_COLORS.length})`}
                      stroke={isDarkMode ? '#2a2a2a' : '#fff'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: '0 8px 24px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 24,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: `3px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 32px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 8px 24px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>
    </div>
  );
}

export default Dashboard;
