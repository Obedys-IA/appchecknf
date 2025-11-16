import React, { useState, useEffect } from 'react';
import { Monitor, Filter, Trash2, Share2, Edit, MessageSquare, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDeliveryRecordsPaginated, getDeliveryRecordsPaginatedWithPermissions, clientData, fretistas, problemTypes, updateDeliveryRecord, deleteDeliveryRecord, addDeliveryComment, getAttachmentFromLocalStorage } from '../firebaseUtils.js';
import { supabase, STORAGE_BUCKETS } from '../supabaseConfig.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../App.css';
import PageHeader from '../Components/PageHeader.jsx';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { useNavigate } from 'react-router-dom';

function Monitoramento() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate(); // fallback para navegação

  const [filterClient, setFilterClient] = useState('');
  const [filterFretista, setFilterFretista] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterProblemType, setFilterProblemType] = useState('');
  const [filterHasAttachments, setFilterHasAttachments] = useState('all');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterRede, setFilterRede] = useState('');
  const [filterVendedor, setFilterVendedor] = useState('');
  const [filterUF, setFilterUF] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [commentModal, setCommentModal] = useState({ open: false, record: null, text: '' });
  const [editModal, setEditModal] = useState({ open: false, record: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const recordsPerPage = 100;

  // Extrair listas dos dados
  const clients = Object.keys(clientData);

  // Listas únicas para filtros
  const statusList = Array.from(new Set(records.map(r => r.status).filter(Boolean)));
  const userList = Array.from(new Set(records.map(r => r.userEmail).filter(Boolean)));
  const redeList = Array.from(new Set(records.map(r => r.rede).filter(Boolean)));
  const vendedorList = Array.from(new Set(records.map(r => r.vendedor).filter(Boolean)));
  const ufList = Array.from(new Set(records.map(r => r.uf).filter(Boolean)));

  // Filtro rápido de período
  const periodOptions = [
    { value: '', label: 'Todos os períodos' },
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'thisWeek', label: 'Esta Semana' },
    { value: 'lastWeek', label: 'Semana Passada' },
    { value: 'currentMonth', label: 'Mês Atual' },
    { value: 'lastMonth', label: 'Mês Anterior' },
    { value: 'currentQuarter', label: 'Trimestre Atual' },
    { value: 'lastQuarter', label: 'Trimestre Passado' },
    { value: 'currentSemester', label: 'Semestre Atual' },
    { value: 'lastSemester', label: 'Semestre Passado' },
    { value: 'currentYear', label: 'Ano Atual' },
    { value: 'lastYear', label: 'Ano Passado' },
  ];

  // Função para tentar baixar anexo com fallback
  const handleDownloadAttachment = async (attachment) => {
    try {
      console.log('🔍 Tentando baixar anexo:', attachment);
      
      // Se for um anexo local (base64), criar blob e baixar
      if (attachment.is_local) {
        // Verificar se o anexo está referenciado no localStorage
      if (attachment.file_url && attachment.file_url.startsWith('localStorage://')) {
        console.log('📁 Anexo referenciado no localStorage, buscando dados...');
        const localStorageKey = attachment.file_url.replace('localStorage://', '');
        const base64Data = await getAttachmentFromLocalStorage(localStorageKey);
          if (base64Data) {
            const response = await fetch(base64Data);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.file_name || attachment.original_name || 'anexo';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('✅ Download de anexo do localStorage concluído');
            return;
          }
        } else if (attachment.file_url.startsWith('data:')) {
          console.log('📁 Anexo local detectado, criando blob...');
          const response = await fetch(attachment.file_url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.file_name || attachment.original_name || 'anexo';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ Download de anexo local concluído');
          return;
        }
      }

      // Tentar baixar do Supabase usando file_path se disponível
      if (attachment.file_path) {
        console.log('📁 Tentando download usando file_path:', attachment.file_path);
        try {
          const { data } = supabase.storage
            .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
            .getPublicUrl(attachment.file_path);
          
          if (data.publicUrl) {
            const response = await fetch(data.publicUrl);
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = attachment.file_name || attachment.original_name || 'anexo';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              console.log('✅ Download usando file_path concluído');
              return;
            }
          }
        } catch (pathError) {
          console.warn('⚠️ Erro ao usar file_path:', pathError);
        }
      }

      // Tentar baixar usando file_url direto
      if (attachment.file_url) {
        console.log('📁 Tentando download usando file_url:', attachment.file_url);
        const response = await fetch(attachment.file_url);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.file_name || attachment.original_name || 'anexo';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ Download usando file_url concluído');
          return;
        } else {
          console.error('❌ Erro na resposta do fetch:', response.status, response.statusText);
          
          // Tentar recriar a URL pública
          console.log('🔄 Tentando recriar URL pública...');
          const newUrl = await recreatePublicUrl(attachment);
          if (newUrl) {
            const newResponse = await fetch(newUrl);
            if (newResponse.ok) {
              const blob = await newResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = attachment.file_name || attachment.original_name || 'anexo';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              console.log('✅ Download usando URL recriada concluído');
              return;
            }
          }
          
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      throw new Error('Nenhuma URL válida encontrada para download');
      
          } catch (error) {
        console.error('❌ Erro ao baixar anexo:', error);
        
        // Se for um anexo do Supabase que falhou, tentar migrar para localStorage
        if (attachment.storage_provider === 'supabase' && !attachment.is_local) {
          console.log('🔄 Tentando migrar anexo para localStorage...');
          const migratedAttachment = await migrateAttachmentToLocal(attachment);
          if (migratedAttachment) {
            // Tentar baixar o anexo migrado
            try {
              const response = await fetch(migratedAttachment.file_url);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = migratedAttachment.file_name || migratedAttachment.original_name || 'anexo';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              console.log('✅ Download do anexo migrado concluído');
              return;
            } catch (migrateError) {
              console.error('❌ Erro ao baixar anexo migrado:', migrateError);
            }
          }
        }
        
        // Tentar abrir em nova aba como último recurso
        if (attachment.file_url) {
          console.log('🔄 Tentando abrir em nova aba...');
          window.open(attachment.file_url, '_blank');
        } else {
          alert('Erro ao baixar anexo. O arquivo pode não estar mais disponível.');
        }
      }
  };

  // Função para migrar anexo para localStorage
  const migrateAttachmentToLocal = async (attachment) => {
    try {
      console.log('🔄 Migrando anexo para localStorage:', attachment.file_name);
      
      // Criar um arquivo a partir dos dados do anexo
      const response = await fetch(attachment.file_url);
      if (!response.ok) {
        throw new Error('Não foi possível acessar o arquivo original');
      }
      
      const blob = await response.blob();
      const file = new File([blob], attachment.original_name || attachment.file_name, {
        type: attachment.file_type || 'application/octet-stream'
      });
      
      // Converter para base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Criar novo anexo local
      const localAttachment = {
        ...attachment,
        file_url: base64Data,
        file_path: `local/${attachment.file_name}`,
        storage_provider: 'localStorage',
        is_local: true
      };
      
      console.log('✅ Anexo migrado com sucesso para localStorage');
      return localAttachment;
      
    } catch (error) {
      console.error('❌ Erro ao migrar anexo:', error);
      return null;
    }
  };

  // Função para tentar recriar URL pública do arquivo
  const recreatePublicUrl = async (attachment) => {
    try {
      console.log('🔄 Tentando recriar URL pública para:', attachment);
      
      // Se temos file_path, tentar recriar a URL
      if (attachment.file_path) {
        const { data } = supabase.storage
          .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
          .getPublicUrl(attachment.file_path);
        
        if (data.publicUrl) {
          console.log('✅ Nova URL criada:', data.publicUrl);
          return data.publicUrl;
        }
      }
      
      // Se temos apenas o nome do arquivo, tentar construir o caminho
      if (attachment.file_name) {
        // Tentar diferentes padrões de caminho
        const possiblePaths = [
          attachment.file_name, // Apenas o nome do arquivo
          `20250713/${attachment.file_name}`, // Com data
          `20250713/n30i4ZUxep4iW3r3nSKq/${attachment.file_name}`, // Caminho completo
        ];
        
        for (const path of possiblePaths) {
          try {
            const { data } = supabase.storage
              .from(STORAGE_BUCKETS.DELIVERY_ATTACHMENTS)
              .getPublicUrl(path);
            
            if (data.publicUrl) {
              // Testar se a URL funciona
              const response = await fetch(data.publicUrl, { method: 'HEAD' });
              if (response.ok) {
                console.log('✅ URL válida encontrada:', data.publicUrl);
                return data.publicUrl;
              }
            }
          } catch (error) {
            console.warn('⚠️ Caminho inválido:', path, error);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao recriar URL:', error);
      return null;
    }
  };



  useEffect(() => {
    loadRecords(currentPage);
  }, [currentPage]);

  // Removido o useEffect que bloqueava o acesso - agora as permissões são controladas pela função de busca

  const loadRecords = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeliveryRecordsPaginatedWithPermissions(page, recordsPerPage, currentUser);
      setRecords(data.records);
      setTotalPages(data.totalPages);
      setTotalRecords(data.totalRecords);
      setHasPrevious(data.hasPrevious);
      setHasNext(data.hasNext);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError('Erro ao carregar registros.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilterClient('');
    setFilterFretista('');
    setFilterDate('');
    setFilterProblemType('');
    setFilterHasAttachments('all');
    setFilterStatus('');
    setFilterUser('');
    setFilterPeriod('');
    setFilterRede('');
    setFilterVendedor('');
    setFilterUF('');
  };

  const handleGeneratePdf = () => {
    generateDeliveryReport();
  };

  const generateDeliveryReport = async () => {
    try {
      // Criar novo documento PDF em paisagem
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Configurações de página
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      let yPosition = margin;

      // Adicionar logo da empresa (se disponível)
      try {
        const logoUrl = '/assets/logodocemel.png';
        doc.addImage(logoUrl, 'PNG', margin, yPosition, 30, 15);
        yPosition += 20;
      } catch (logoError) {
        console.warn('Logo não encontrado, continuando sem logo');
        yPosition += 5;
      }

      // Cabeçalho principal com design moderno
      doc.setFillColor(33, 136, 56); // Verde do tema
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RELATÓRIO DE ENTREGAS', pageWidth / 2, yPosition + 10, { align: 'center' });
      yPosition += 20;

      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 136, 56);
      doc.text('LOGÍSTICA BA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Informações do relatório com design aprimorado
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const currentDate = new Date().toLocaleDateString('pt-BR');
      const currentTime = new Date().toLocaleTimeString('pt-BR');
      
      // Caixa de informações do relatório
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(`Data: ${currentDate}`, margin + 5, yPosition + 8);
      doc.text(`Hora: ${currentTime}`, pageWidth - margin - 40, yPosition + 8);
      yPosition += 18;

      // Filtros aplicados com design melhorado
      const appliedFilters = [];
      if (filterClient) appliedFilters.push(`Cliente: ${filterClient}`);
      if (filterFretista) appliedFilters.push(`Fretista: ${filterFretista}`);
      if (filterDate) appliedFilters.push(`Data: ${filterDate}`);
      if (filterProblemType) appliedFilters.push(`Problema: ${filterProblemType}`);
      if (filterHasAttachments !== 'all') {
        appliedFilters.push(`Anexos: ${filterHasAttachments === 'with' ? 'Com anexos' : 'Sem anexos'}`);
      }
      if (filterStatus) appliedFilters.push(`Status: ${filterStatus}`);
      if (filterUser) appliedFilters.push(`Usuário: ${filterUser}`);
      if (filterPeriod) {
        const periodLabel = periodOptions.find(opt => opt.value === filterPeriod)?.label || filterPeriod;
        appliedFilters.push(`Período: ${periodLabel}`);
      }
      if (filterRede) appliedFilters.push(`Rede: ${filterRede}`);
      if (filterVendedor) appliedFilters.push(`Vendedor: ${filterVendedor}`);
      if (filterUF) appliedFilters.push(`UF: ${filterUF}`);

      if (appliedFilters.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 136, 56);
        doc.text('FILTROS APLICADOS:', margin, yPosition);
        yPosition += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Dividir filtros em colunas
        const filtersPerColumn = Math.ceil(appliedFilters.length / 3);
        const colWidth = (pageWidth - 2 * margin) / 3;
        
        for (let i = 0; i < appliedFilters.length; i++) {
          const column = Math.floor(i / filtersPerColumn);
          const row = i % filtersPerColumn;
          
          const xPosition = margin + column * colWidth;
          const yTextPosition = yPosition + row * 5;
          
          doc.text(`• ${appliedFilters[i]}`, xPosition, yTextPosition);
        }
        
        yPosition += filtersPerColumn * 5 + 5;
      }

      // ===== RESUMO GERAL =====
      const totalRecords = filteredRecords.length;
      const completedDeliveries = filteredRecords.filter(r => r.status === 'Entrega finalizada').length;
      const pendingDeliveries = filteredRecords.filter(r => r.status === 'Entrega em andamento').length;
      const returnedDeliveries = filteredRecords.filter(r => r.status === 'Entrega devolvida').length;
      const deliveriesWithProblems = filteredRecords.filter(r => r.problem_type).length;
      const deliveriesWithAttachments = filteredRecords.filter(r => r.attachments && r.attachments.length > 0).length;

      // Box de resumo geral com design moderno
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 28, 2, 2, 'F');
      doc.setDrawColor(33, 136, 56);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 28, 2, 2, 'S');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 136, 56);
      doc.text('RESUMO GERAL', pageWidth / 2, yPosition + 7, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const col1 = margin + 15;
      const col2 = pageWidth / 3;
      const col3 = (pageWidth / 3) * 2 - 15;
      
      // Dividir em duas linhas para melhor legibilidade
      // Primeira linha
      doc.text(`Total de Registros: ${totalRecords}`, col1, yPosition + 15);
      doc.text(`Entregas Finalizadas: ${completedDeliveries}`, col2, yPosition + 15);
      doc.text(`Em Andamento: ${pendingDeliveries}`, col3, yPosition + 15);
      
      // Segunda linha
      doc.text(`Entregas Devolvidas: ${returnedDeliveries}`, col1, yPosition + 22);
      doc.text(`Com Problemas: ${deliveriesWithProblems}`, col2, yPosition + 22);
      doc.text(`Com Anexos: ${deliveriesWithAttachments}`, col3, yPosition + 22);

      yPosition += 35;

      // ===== RESUMOS ESTATÍSTICOS =====
      if (filteredRecords.length > 0) {
        // Calcular estatísticas
        const stats = calculateStatistics(filteredRecords);
        
        // Resumo por tipo de problema
        yPosition = addProblemTypeSummary(doc, stats.problemTypes, yPosition, pageWidth, margin);
        
        // Top 30 clientes com maior tempo médio
        yPosition = addTopClientsByTime(doc, stats.topClientsByTime, yPosition, pageWidth, margin);
        
        // Média de tempo por fretista
        yPosition = addDriverTimeAverage(doc, stats.driverTimeAverage, yPosition, pageWidth, margin);
        
        // Total de registros por fretista
        yPosition = addDriverRecordsCount(doc, stats.driverRecordsCount, yPosition, pageWidth, margin);
        
        // Tipos de problema com maior tempo médio
        yPosition = addProblemTypeTimeAverage(doc, stats.problemTypeTimeAverage, yPosition, pageWidth, margin);
        
        // Top 20 clientes com mais problemas
        yPosition = addTopClientsByProblems(doc, stats.topClientsByProblems, yPosition, pageWidth, margin);
      }

      // ===== TABELA DE REGISTROS =====
      if (filteredRecords.length > 0) {
        // Verificar se precisa de nova página para a tabela
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin + 10;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 136, 56);
        doc.text('DETALHAMENTO DOS REGISTROS', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Preparar dados para a tabela (apenas campos essenciais)
        const tableData = filteredRecords.map(record => [
          record.checkin_time ? new Date(record.checkin_time).toLocaleDateString('pt-BR') : '-',
          record.client || '-',
          record.driver || '-',
          record.userEmail || '-',
          record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-',
          record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : '-',
          record.duration || '-',
          record.status || '-'
        ]);

        // Verificar se autoTable está disponível
        if (typeof autoTable === 'function') {
        // Configurar tabela com design moderno
        autoTable(doc, {
            startY: yPosition,
            head: [['Data', 'Cliente', 'Fretista', 'Usuário', 'Check-in', 'Check-out', 'Duração', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: [33, 136, 56],
              textColor: 255,
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 7,
              textColor: 0,
              halign: 'center'
            },
            alternateRowStyles: {
              fillColor: [248, 249, 250]
            },
            margin: { left: margin, right: margin },
            pageBreak: 'auto',
            styles: {
              overflow: 'linebreak',
              cellWidth: 'wrap'
            },
            columnStyles: {
              0: { cellWidth: 22, halign: 'center' }, // Data
              1: { cellWidth: 32, halign: 'left' },   // Cliente
              2: { cellWidth: 28, halign: 'left' },   // Fretista
              3: { cellWidth: 35, halign: 'left' },   // Usuário
              4: { cellWidth: 22, halign: 'center' }, // Check-in
              5: { cellWidth: 22, halign: 'center' }, // Check-out
              6: { cellWidth: 18, halign: 'center' }, // Duração
              7: { cellWidth: 30, halign: 'left' }    // Status
            },
            didDrawPage: function(data) {
              // Adicionar rodapé em cada página
              const finalY = doc.lastAutoTable.finalY || yPosition + 100;
              doc.setFontSize(8);
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(100, 100, 100);
              doc.text(`Relatório gerado em ${currentDate} às ${currentTime}`, pageWidth / 2, finalY + 10, { align: 'center' });
              doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - margin - 15, finalY + 10);
            }
          });

          // Adicionar total de registros no final
          const finalY = doc.lastAutoTable.finalY || yPosition + 100;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(33, 136, 56);
          doc.text(`Total de registros: ${totalRecords}`, pageWidth / 2, finalY + 18, { align: 'center' });

        } else {
          // Fallback: criar tabela manual
          console.warn('autoTable não disponível, criando tabela manual');
          createManualTable(doc, filteredRecords, yPosition, pageWidth, margin);
        }

      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Nenhum registro encontrado com os filtros aplicados.', pageWidth / 2, yPosition + 15, { align: 'center' });
      }

      // Salvar o PDF
      const fileName = `relatorio_entregas_${currentDate.replace(/\//g, '-')}_${currentTime.replace(/:/g, '-')}.pdf`;
      doc.save(fileName);

      alert('Relatório PDF gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
    }
  };

  // Função para calcular todas as estatísticas
  const calculateStatistics = (records) => {
    const stats = {
      problemTypes: [],
      topClientsByTime: [],
      driverTimeAverage: [],
      driverRecordsCount: [],
      problemTypeTimeAverage: [],
      topClientsByProblems: []
    };

    // Objetos para acumular dados
    const problemTypesMap = {};
    const topClientsByTimeMap = {};
    const driverTimeAverageMap = {};
    const driverRecordsCountMap = {};
    const problemTypeTimeAverageMap = {};
    const topClientsByProblemsMap = {};

    records.forEach(record => {
      // Contar tipos de problema
      if (record.problem_type) {
        problemTypesMap[record.problem_type] = (problemTypesMap[record.problem_type] || 0) + 1;
      }

      // Calcular tempo médio por cliente
      if (record.client && record.duration) {
        const duration = parseDuration(record.duration);
        if (duration > 0) {
          if (!topClientsByTimeMap[record.client]) {
            topClientsByTimeMap[record.client] = { total: 0, count: 0, totalVisits: 0 };
          }
          topClientsByTimeMap[record.client].total += duration;
          topClientsByTimeMap[record.client].count += 1;
          topClientsByTimeMap[record.client].totalVisits += 1;
        }
      }

      // Calcular tempo médio por fretista
      if (record.driver && record.duration) {
        const duration = parseDuration(record.duration);
        if (duration > 0) {
          if (!driverTimeAverageMap[record.driver]) {
            driverTimeAverageMap[record.driver] = { total: 0, count: 0, totalVisits: 0 };
          }
          driverTimeAverageMap[record.driver].total += duration;
          driverTimeAverageMap[record.driver].count += 1;
          driverTimeAverageMap[record.driver].totalVisits += 1;
        }
      }

      // Contar registros por fretista
      if (record.driver) {
        driverRecordsCountMap[record.driver] = (driverRecordsCountMap[record.driver] || 0) + 1;
      }

      // Calcular tempo médio por tipo de problema
      if (record.problem_type && record.duration) {
        const duration = parseDuration(record.duration);
        if (duration > 0) {
          if (!problemTypeTimeAverageMap[record.problem_type]) {
            problemTypeTimeAverageMap[record.problem_type] = { total: 0, count: 0 };
          }
          problemTypeTimeAverageMap[record.problem_type].total += duration;
          problemTypeTimeAverageMap[record.problem_type].count += 1;
        }
      }

      // Contar problemas por cliente
      if (record.client && record.problem_type) {
        topClientsByProblemsMap[record.client] = (topClientsByProblemsMap[record.client] || 0) + 1;
      }
    });

    // Converter objetos em arrays e calcular percentuais/medias
    const totalRecords = records.length;
    const totalProblems = Object.values(problemTypesMap).reduce((sum, count) => sum + count, 0);
    const totalDrivers = Object.keys(driverRecordsCountMap).length;
    const totalClientsWithProblems = Object.keys(topClientsByProblemsMap).length;

    // Processar tipos de problema
    stats.problemTypes = Object.entries(problemTypesMap)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalProblems > 0 ? `${((count / totalProblems) * 100).toFixed(1)}%` : '0%'
      }))
      .sort((a, b) => b.count - a.count);

    // Processar top clientes por tempo médio
    stats.topClientsByTime = Object.entries(topClientsByTimeMap)
      .map(([client, data]) => ({
        client,
        averageTime: `${Math.round(data.total / data.count)} min`,
        totalVisits: data.totalVisits
      }))
      .sort((a, b) => {
        const avgA = parseInt(a.averageTime);
        const avgB = parseInt(b.averageTime);
        return avgB - avgA;
      })
      .slice(0, 30);

    // Processar média de tempo por fretista
    stats.driverTimeAverage = Object.entries(driverTimeAverageMap)
      .map(([driver, data]) => ({
        driver,
        averageTime: `${Math.round(data.total / data.count)} min`,
        totalVisits: data.totalVisits
      }))
      .sort((a, b) => {
        const avgA = parseInt(a.averageTime);
        const avgB = parseInt(b.averageTime);
        return avgB - avgA;
      });

    // Processar total de registros por fretista
    const totalDriverRecords = Object.values(driverRecordsCountMap).reduce((sum, count) => sum + count, 0);
    stats.driverRecordsCount = Object.entries(driverRecordsCountMap)
      .map(([driver, count]) => ({
        driver,
        count,
        percentage: totalDriverRecords > 0 ? `${((count / totalDriverRecords) * 100).toFixed(1)}%` : '0%'
      }))
      .sort((a, b) => b.count - a.count);

    // Processar tipos de problema com maior tempo médio
    stats.problemTypeTimeAverage = Object.entries(problemTypeTimeAverageMap)
      .map(([problemType, data]) => ({
        problemType,
        averageTime: `${Math.round(data.total / data.count)} min`,
        count: data.count
      }))
      .sort((a, b) => {
        const avgA = parseInt(a.averageTime);
        const avgB = parseInt(b.averageTime);
        return avgB - avgA;
      });

    // Processar top clientes com mais problemas
    stats.topClientsByProblems = Object.entries(topClientsByProblemsMap)
      .map(([client, problemCount]) => ({
        client,
        problemCount,
        percentage: totalClientsWithProblems > 0 ? `${((problemCount / totalClientsWithProblems) * 100).toFixed(1)}%` : '0%'
      }))
      .sort((a, b) => b.problemCount - a.problemCount)
      .slice(0, 20);

    return stats;
  };

  // Função para converter duração em minutos
  const parseDuration = (duration) => {
    if (!duration) return 0;
    const match = duration.match(/(\d+)\s*min/);
    return match ? parseInt(match[1]) : 0;
  };

  // Função para adicionar resumo por tipo de problema
  const addProblemTypeSummary = (doc, problemTypes, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('RESUMO POR TIPO DE PROBLEMA', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (problemTypes.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum problema registrado.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de tipos de problema
    const tableData = problemTypes.map(item => [
      item.type,
      item.count.toString(),
      item.percentage
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Tipo de Problema', 'Quantidade', 'Percentual']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 130, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função para adicionar top clientes por tempo
  const addTopClientsByTime = (doc, topClientsByTime, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('TOP 30 CLIENTES COM MAIOR TEMPO MÉDIO', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (topClientsByTime.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum dado disponível.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de clientes
    const tableData = topClientsByTime.map(item => [
      item.client,
      item.averageTime,
      item.totalVisits.toString()
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Cliente', 'Tempo Médio', 'Total de Visitas']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 140, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função para adicionar média de tempo por fretista
  const addDriverTimeAverage = (doc, driverTimeAverage, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('MÉDIA DE TEMPO POR FRETISTA', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (driverTimeAverage.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum dado disponível.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de fretistas
    const tableData = driverTimeAverage.map(item => [
      item.driver,
      item.averageTime,
      item.totalVisits.toString()
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Fretista', 'Tempo Médio', 'Total de Visitas']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 140, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função para adicionar total de registros por fretista
  const addDriverRecordsCount = (doc, driverRecordsCount, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('TOTAL DE REGISTROS POR FRETISTA', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (driverRecordsCount.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum dado disponível.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de fretistas
    const tableData = driverRecordsCount.map(item => [
      item.driver,
      item.count.toString(),
      item.percentage
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Fretista', 'Quantidade', 'Percentual']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 130, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função para adicionar tipos de problema com maior tempo médio
  const addProblemTypeTimeAverage = (doc, problemTypeTimeAverage, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('TIPOS DE PROBLEMA COM MAIOR TEMPO MÉDIO', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (problemTypeTimeAverage.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum dado disponível.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de problemas
    const tableData = problemTypeTimeAverage.map(item => [
      item.problemType,
      item.averageTime,
      item.count.toString()
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Tipo de Problema', 'Tempo Médio', 'Quantidade']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 140, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função para adicionar top clientes com mais problemas
  const addTopClientsByProblems = (doc, topClientsByProblems, yPosition, pageWidth, margin) => {
    // Verificar se precisa de nova página
    if (yPosition > doc.internal.pageSize.height - 100) {
      doc.addPage();
      yPosition = margin + 10;
    }

    // Título da seção com design moderno
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 136, 56);
    doc.text('TOP 20 CLIENTES COM MAIS PROBLEMAS', margin, yPosition);
    
    // Linha decorativa sob o título
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    
    yPosition += 10;

    // Verificar se há dados
    if (topClientsByProblems.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum dado disponível.', margin, yPosition);
      return yPosition + 15;
    }

    // Criar tabela de clientes
    const tableData = topClientsByProblems.map(item => [
      item.client,
      item.problemCount.toString(),
      item.percentage
    ]);

    // Verificar se autoTable está disponível
    if (typeof autoTable === 'function') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Cliente', 'Quantidade de Problemas', 'Percentual']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 136, 56],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 0,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: margin, right: margin },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80, halign: 'left' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        }
      });

      return doc.lastAutoTable.finalY + 12;
    } else {
      // Fallback manual
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      tableData.forEach((row, index) => {
        const yPos = yPosition + (index * 6);
        doc.text(row[0], margin, yPos);
        doc.text(row[1], margin + 100, yPos);
        doc.text(row[2], margin + 140, yPos);
      });
      
      return yPosition + (tableData.length * 6) + 10;
    }
  };

  // Função de fallback para criar tabela manual
  const createManualTable = (doc, records, startY, pageWidth, margin) => {
    let yPos = startY;
    
    // Cabeçalho da tabela
    doc.setFillColor(33, 136, 56);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    const headers = ['Data', 'Cliente', 'Fretista', 'Usuário', 'Check-in', 'Check-out', 'Duração', 'Status'];
    const colWidths = [20, 35, 25, 30, 20, 20, 15, 25];
    let xPos = margin;
    
    headers.forEach((header, index) => {
      doc.text(header, xPos + 2, yPos + 5);
      xPos += colWidths[index];
    });
    
    yPos += 8;
    
    // Dados da tabela
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    records.forEach((record, index) => {
      // Verificar se precisa de nova página
      if (yPos > pageWidth - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      // Linha de dados
      const rowData = [
        record.checkin_time ? new Date(record.checkin_time).toLocaleDateString('pt-BR') : '-',
        record.client || '-',
        record.driver || '-',
        record.userEmail || '-',
        record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-',
        record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : '-',
        record.duration || '-',
        record.status || '-'
      ];
      
      // Desenhar linha de fundo alternada
      if (index % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
      }
      
      // Desenhar borda da linha
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'S');
      
      // Texto dos dados
      xPos = margin;
      rowData.forEach((text, colIndex) => {
        doc.text(text.substring(0, 15), xPos + 1, yPos + 4); // Limitar texto
        xPos += colWidths[colIndex];
      });
      
      yPos += 6;
    });
    
    // Rodapé
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Relatório gerado em ${currentDate} às ${currentTime}`, pageWidth / 2, yPos + 8, { align: 'center' });
    doc.text(`Total de registros: ${records.length}`, pageWidth / 2, yPos + 12, { align: 'center' });
  };

  const handleToggleSelect = (id) => {
    setSelectedRecords((prevSelected) =>
      prevSelected.includes(id) ? prevSelected.filter((recordId) => recordId !== id) : [...prevSelected, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length || selectedRecords.length === 20) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.slice(0, 20).map((record) => record.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.length === 0) {
      alert('Nenhum registro selecionado para exclusão.');
      return;
    }

    const confirmDelete = window.confirm(`Tem certeza que deseja excluir ${selectedRecords.length} registro(s)?`);
    if (confirmDelete) {
      for (const id of selectedRecords) {
        setRecords((prevRecords) => prevRecords.filter((record) => record.id !== id));
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
      setSelectedRecords([]);
      alert('Registros excluídos com sucesso!');
    }
  };

  const handleShareRecord = async (record) => {
    try {
      // Montar a mensagem com todas as informações do registro
      let message = `🚚 *RESUMO DA ENTREGA*

`;
      message += `📅 Data: ${record.checkin_time ? new Date(record.checkin_time).toLocaleDateString('pt-BR') : 'N/A'}
`;
      message += `👤 Cliente: ${record.client || 'N/A'}
`;
      message += `🚛 Fretista: ${record.driver || 'N/A'}
`;
      message += `📍 Rede: ${record.rede || 'N/A'}
`;
      message += `👨‍💼 Vendedor: ${record.vendedor || 'N/A'}
`;
      message += `📍 UF: ${record.uf || 'N/A'}
`;
      message += `⏱️ Check-in: ${record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : 'N/A'}
`;
      message += `⏱️ Check-out: ${record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : 'N/A'}
`;
      message += `⏱️ Duração: ${record.duration || 'N/A'}
`;
      message += `📊 Status: ${record.status || 'N/A'}
`;
      message += `⚠️ Problema: ${record.problem_type || 'Nenhum'}
`;
      message += `📝 Informações: ${record.information || 'Nenhuma'}
`;
      message += `👤 Usuário: ${record.userEmail || 'N/A'}
`;
      
      // Adicionar links dos anexos, se houver
      if (record.attachments && record.attachments.length > 0) {
        message += `
📎 *Anexos* (${record.attachments.length}):
`;
        record.attachments.forEach((att, index) => {
          const fileName = att.original_name || att.file_name || `Anexo ${index + 1}`;
          message += `📄 ${fileName}: ${att.file_url || 'Link não disponível'}
`;
        });
      }
      
      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(message);
      
      // Detectar dispositivo móvel
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      let whatsappUrl;
      if (isMobile) {
        // Para mobile, tentar abrir app diretamente
        whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
      } else {
        // Para desktop/web, usar api.whatsapp.com
        whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
      }
      try {
        // Tentar abrir WhatsApp
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.error('Erro ao abrir WhatsApp:', error);
        // Fallback: copiar para clipboard
        navigator.clipboard.writeText(message).then(() => {
          alert('Mensagem copiada para a área de transferência! Cole no WhatsApp.');
        }).catch(() => {
          alert(`Mensagem gerada:

${message}`);
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar registro:', error);
      alert('Erro ao compartilhar registro. Por favor, tente novamente.');
    }
  };

  const handleEditRecord = (record) => {
    // Verificar se o usuário tem permissão para editar
    if (currentUser && !['admin', 'colaborador', 'gerencia'].includes(currentUser.type)) {
      alert('Apenas administradores, colaboradores e gerência podem editar registros.');
      return;
    }
    
    setEditModal({ open: true, record });
  };

  const handleCommentRecord = (record) => {
    setCommentModal({ open: true, record, text: '' });
  };

  const handleAddComment = async () => {
    if (!commentModal.record || !commentModal.text.trim()) {
      alert('Por favor, digite um comentário.');
      return;
    }
    
    try {
      await addDeliveryComment(
        commentModal.record.id,
        commentModal.text,
        currentUser.email,
        currentUser.name || currentUser.email
      );
      
      // Atualizar os registros localmente
      setRecords(prevRecords => 
        prevRecords.map(record => 
          record.id === commentModal.record.id 
            ? { 
                ...record, 
                comments: [
                  ...(record.comments || []), 
                  {
                    text: commentModal.text,
                    userEmail: currentUser.email,
                    userName: currentUser.name || currentUser.email,
                    timestamp: new Date().toISOString()
                  }
                ]
              }
            : record
        )
      );
      
      setCommentModal({ open: false, record: null, text: '' });
      alert('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      alert('Erro ao adicionar comentário. Por favor, tente novamente.');
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesClient = filterClient === '' || (record.client && record.client.includes(filterClient));
    const matchesFretista = filterFretista === '' || (record.driver && record.driver.includes(filterFretista));
    const matchesDate = filterDate === '' || (record.checkin_time && record.checkin_time.startsWith(filterDate));
    const matchesProblemType = filterProblemType === '' || record.problem_type === filterProblemType;
    const matchesAttachments = filterHasAttachments === 'all' ||
                               (filterHasAttachments === 'with' && record.attachments && record.attachments.length > 0) ||
                               (filterHasAttachments === 'without' && (!record.attachments || record.attachments.length === 0));
    const matchesStatus = filterStatus === '' || record.status === filterStatus;
    const matchesUser = filterUser === '' || record.userEmail === filterUser;
    const matchesRede = redeList.length === 0 || filterRede === '' || record.rede === filterRede;
    const matchesVendedor = vendedorList.length === 0 || filterVendedor === '' || record.vendedor === filterVendedor;
    const matchesUF = ufList.length === 0 || filterUF === '' || record.uf === filterUF;
    // Filtro rápido de período
    let matchesPeriod = true;
    if (filterPeriod) {
      const now = new Date();
      const recordDate = record.checkin_time ? new Date(record.checkin_time) : null;
      if (!recordDate) return false;
      switch (filterPeriod) {
        case 'today':
          matchesPeriod = recordDate.toDateString() === now.toDateString();
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          matchesPeriod = recordDate.toDateString() === yesterday.toDateString();
          break;
        case 'thisWeek':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          matchesPeriod = recordDate >= startOfWeek && recordDate <= now;
          break;
        case 'lastWeek':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
          matchesPeriod = recordDate >= lastWeekStart && recordDate <= lastWeekEnd;
          break;
        case 'currentMonth':
          matchesPeriod = recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
          break;
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesPeriod = recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear();
          break;
        case 'currentQuarter':
          const quarter = Math.floor(now.getMonth() / 3);
          matchesPeriod = Math.floor(recordDate.getMonth() / 3) === quarter && recordDate.getFullYear() === now.getFullYear();
          break;
        case 'lastQuarter':
          const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
          const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
          matchesPeriod = Math.floor(recordDate.getMonth() / 3) === lastQuarter && recordDate.getFullYear() === lastQuarterYear;
          break;
        case 'currentSemester':
          const semester = Math.floor(now.getMonth() / 6);
          matchesPeriod = Math.floor(recordDate.getMonth() / 6) === semester && recordDate.getFullYear() === now.getFullYear();
          break;
        case 'lastSemester':
          const lastSemester = Math.floor(now.getMonth() / 6) - 1;
          const lastSemesterYear = lastSemester < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastSemesterMonth = lastSemester < 0 ? 6 : lastSemester * 6;
          matchesPeriod = Math.floor(recordDate.getMonth() / 6) === lastSemester && recordDate.getFullYear() === lastSemesterYear;
          break;
        case 'currentYear':
          matchesPeriod = recordDate.getFullYear() === now.getFullYear();
          break;
        case 'lastYear':
          matchesPeriod = recordDate.getFullYear() === now.getFullYear() - 1;
          break;
        default:
          matchesPeriod = true;
      }
    }
    return matchesClient && matchesFretista && matchesDate && matchesProblemType && matchesAttachments && matchesStatus && matchesUser && matchesRede && matchesVendedor && matchesUF && matchesPeriod;
  });

  return (
    <div className={`monitoramento-container ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`} style={{maxWidth: '1400px', margin: '0 auto', padding: '12px 0'}}>
      {/* Cabeçalho moderno padrão localização */}
      <PageHeader
        title="Monitoramento"
        subtitle="Visualize o monitoramento em tempo real das entregas"
        icon={Monitor}
      />

      {/* Filtros */}
      <div className={`card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{padding: 16, marginBottom: 16, background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined, borderRadius: '12px'}}>
        <h3 style={{fontSize: 16, color: isDarkMode ? '#10b981' : '#218838', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6}}>
          <Filter style={{width: 18, height: 18}} />
          Filtros de Busca
        </h3>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12}}>
          {/* Filtro rápido de período */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>⏱️ Período:</label>
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
              onChange={e => setFilterPeriod(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {periodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {/* Cliente */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>👤 Cliente:</label>
          <select
            value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}          >
              <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
          {/* Fretista */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>🚛 Fretista:</label>
          <select
            value={filterFretista}
              onChange={e => setFilterFretista(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}          >
              <option value="">Todos os fretistas</option>
            {fretistas.map((fretista) => (
              <option key={fretista} value={fretista}>{fretista}</option>
            ))}
          </select>
        </div>
          {/* Usuário */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>👤 Usuário:</label>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}            >
              <option value="">Todos os usuários</option>
              {userList.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
        </div>
          {/* Status */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>📊 Status:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}            >
              <option value="">Todos os status</option>
              {statusList.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          {/* Rede */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>🏪 Rede:</label>
            <select
              value={filterRede}
              onChange={e => setFilterRede(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}            >
              <option value="">Todas as redes</option>
              {redeList.map((rede) => (
                <option key={rede} value={rede}>{rede}</option>
              ))}
            </select>
          </div>
          {/* Vendedor */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>👨‍💼 Vendedor:</label>
            <select
              value={filterVendedor}
              onChange={e => setFilterVendedor(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}            >
              <option value="">Todos os vendedores</option>
              {vendedorList.map((vendedor) => (
                <option key={vendedor} value={vendedor}>{vendedor}</option>
              ))}
            </select>
          </div>
          {/* UF */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>📍 UF:</label>
            <select
              value={filterUF}
              onChange={e => setFilterUF(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}            >
              <option value="">Todas as UFs</option>
              {ufList.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          {/* Tipo de Problema */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>⚠️ Tipo de Problema:</label>
          <select
            value={filterProblemType}
              onChange={e => setFilterProblemType(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}          >
              <option value="">Todos os tipos</option>
            {problemTypes.map((problem) => (
              <option key={problem} value={problem}>{problem}</option>
            ))}
          </select>
        </div>
          {/* Anexos */}
          <div>
            <label style={{display: 'block', fontWeight: 600, color: isDarkMode ? '#d1d5db' : '#495057', marginBottom: 6, fontSize: 13}}>📎 Anexos:</label>
          <select
            value={filterHasAttachments}
              onChange={e => setFilterHasAttachments(e.target.value)}
              className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
            }}          >
            <option value="all">Todos</option>
            <option value="with">Com Anexos</option>
            <option value="without">Sem Anexos</option>
          </select>
        </div>
          <div style={{display: 'flex', alignItems: 'end'}}>
            <button 
              type="button"
              onClick={handleClearFilters}
              className={`${isDarkMode ? 'bg-gradient-to-r from-green-400 to-orange-500 hover:from-green-500 hover:to-orange-600' : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'}`}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 4,
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                transition: 'all 0.2s',
                marginLeft: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Search style={{width: 14, height: 14}} />
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className={`card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{padding: 16, marginBottom: 16}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
            <button 
              className={`btn ${isDarkMode ? 'bg-green-400 hover:bg-green-500 text-black' : 'btn-green'}`}
              onClick={handleGeneratePdf}
              style={{fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
            >
              <Download style={{width: 16, height: 16}} />
              Gerar Relatório PDF
            </button>
        {selectedRecords.length > 0 && (
              <button 
                className={`btn ${isDarkMode ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'btn-red'}`}
                onClick={handleDeleteSelected}
                disabled={selectedRecords.length > 20}
                style={{fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6}}
              >
                <Trash2 style={{width: 16, height: 16}} />
            Excluir Selecionados ({selectedRecords.length})
          </button>
        )}
          </div>
          <div style={{color: isDarkMode ? '#d1d5db' : '#666', fontSize: 12}}>
            {totalRecords} registro(s) no total | Página {currentPage} de {totalPages}
          </div>
        </div>
        
        {/* Paginação */}
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12}}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={!hasPrevious}
            className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid',
              cursor: hasPrevious ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: hasPrevious ? 1 : 0.5,
              fontSize: 13
            }}
          >
            <ChevronLeft style={{width: 14, height: 14}} />
            Anterior
          </button>
          
          <div style={{color: isDarkMode ? '#d1d5db' : '#666', fontSize: 12}}>
            Página {currentPage} de {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={!hasNext}
            className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid',
              cursor: hasNext ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: hasNext ? 1 : 0.5,
              fontSize: 13
            }}
          >
            Próxima
            <ChevronRight style={{width: 14, height: 14}} />
          </button>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className={`card ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{padding: 0, overflow: 'hidden'}}>
        <div style={{overflowX: 'auto'}}>
          <table className="tabela-registros" style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
              <tr style={{background: isDarkMode ? '#2a2a2a' : '#f8f9fa'}}>
                <th style={{padding: '10px', textAlign: 'center', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontSize: 13}}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                  disabled={filteredRecords.length === 0}
                    style={{width: 14, height: 14}}
                />
              </th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Data</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Cliente</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Fretista</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Usuário</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Rede</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Vendedor</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>UF</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Check-in</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Check-out</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Duração</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Status</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Anexos</th>
                <th style={{padding: '10px', textAlign: 'center', borderBottom: `2px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`, fontWeight: 600, color: isDarkMode ? '#10b981' : '#218838', fontSize: 13}}>Ações</th>
            </tr>
          </thead>
          <tbody>
              {loading ? (
                <tr>
                  <td colSpan="14" style={{padding: '32px 12px', textAlign: 'center', color: isDarkMode ? '#d1d5db' : '#666', fontSize: 13}}>
                    Carregando registros...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="14" style={{padding: '32px 12px', textAlign: 'center', color: '#dc3545', fontSize: 13}}>
                    {error}
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={record.id} style={{background: isDarkMode ? (index % 2 === 0 ? '#1f2937' : '#2a2a2a') : (index % 2 === 0 ? '#fff' : '#f8f9fa'), borderBottom: `1px solid ${isDarkMode ? '#4b5563' : '#e9ecef'}`}}>
                    <td style={{padding: '8px 12px', textAlign: 'center'}}>
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleToggleSelect(record.id)}
                      disabled={selectedRecords.length >= 20 && !selectedRecords.includes(record.id)}
                        style={{width: 14, height: 14}}
                    />
                  </td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#d1d5db' : '#000'}}>
                      {record.checkin_time ? new Date(record.checkin_time).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{padding: '8px 12px', fontSize: 13, fontWeight: 500, color: isDarkMode ? '#d1d5db' : '#000'}}>{record.client || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#d1d5db' : '#000'}}>{record.driver || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#9ca3af' : '#666'}}>{record.userEmail || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#d1d5db' : '#000'}}>{record.rede || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#d1d5db' : '#000'}}>{record.vendedor || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#d1d5db' : '#000'}}>{record.uf || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#fb923c' : '#ff9800'}}>
                      {record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-'}
                    </td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#10b981' : '#4caf50'}}>
                      {record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString('pt-BR') : '-'}
                    </td>
                    <td style={{padding: '8px 12px', fontSize: 13, color: isDarkMode ? '#3b82f6' : '#1976d2'}}>{record.duration || '-'}</td>
                    <td style={{padding: '8px 12px', fontSize: 13}}>
                      <span
                        className="badge"
                        style={{
                          background: (record.status || '').toLowerCase() === 'entrega em andamento' ? (isDarkMode ? '#fb923c' : '#ffc107') : (record.status || '').toLowerCase() === 'entrega finalizada' ? (isDarkMode ? '#10b981' : '#4caf50') : (record.status || '').toLowerCase() === 'entrega devolvida' ? '#e53935' : (isDarkMode ? '#6b7280' : '#e0e0e0'),
                          color: (record.status || '').toLowerCase() === 'entrega em andamento' ? '#fff' : '#fff',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: 12
                        }}
                      >
                        {record.status || 'N/A'}
                      </span>
                      {record.problem_type && (
                        <div style={{marginTop: 4, fontSize: 11, color: isDarkMode ? '#fb923c' : '#e65100'}}>⚠️ {record.problem_type}</div>
                      )}
                    </td>
                    <td style={{padding: '8px 12px', fontSize: 13}}>
                      {record.attachments && record.attachments.length > 0 ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 3}}>
                          {record.attachments.map((att, idx) => (
                            <div key={`${record.id}-${idx}-${att.file_url || att.file_name || att.original_name}`} style={{display: 'flex', alignItems: 'center', gap: 4}}>
                              <button
                                onClick={() => handleDownloadAttachment(att)}
                                style={{background: 'none', border: 'none', cursor: 'pointer', color: isDarkMode ? '#3b82f6' : '#1976d2', fontWeight: 500, textDecoration: 'underline', fontSize: 12, padding: 0}}
                                title={att.original_name || att.file_name}
                              >
                                {att.file_name || att.original_name || `Anexo ${idx+1}`}
                              </button>
                              <button
                                onClick={() => handleDownloadAttachment(att)}
                                style={{background: 'none', border: 'none', cursor: 'pointer', color: isDarkMode ? '#10b981' : '#218838', fontSize: 14, padding: 0}}
                                title="Baixar anexo"
                              >
                                <Download style={{width: 14, height: 14}} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                  </td>
                    <td style={{padding: '8px 12px', textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: 3, justifyContent: 'center'}}>
                        <button 
                          onClick={() => handleCommentRecord(record)}
                          style={{background: isDarkMode ? '#3b82f6' : '#1976d2', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 6px', cursor: 'pointer', fontSize: 11}}
                          title="Comentar"
                        >
                          <MessageSquare style={{width: 11, height: 11}} />
                        </button>
                        <button 
                          onClick={() => handleShareRecord(record)}
                          style={{background: isDarkMode ? '#10b981' : '#4caf50', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 6px', cursor: 'pointer', fontSize: 11}}
                          title="Compartilhar"
                        >
                          <Share2 style={{width: 11, height: 11}} />
                        </button>
                        <button 
                          onClick={() => handleEditRecord(record)}
                          style={{background: isDarkMode ? '#fb923c' : '#ff9800', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 6px', cursor: 'pointer', fontSize: 11, opacity: currentUser && !['admin', 'colaborador', 'gerencia'].includes(currentUser.type) ? 0.5 : 1}}
                          title={currentUser && !['admin', 'colaborador', 'gerencia'].includes(currentUser.type) ? 'Apenas administradores, colaboradores e gerência podem editar' : 'Editar'}
                          disabled={currentUser && !['admin', 'colaborador', 'gerencia'].includes(currentUser.type)}
                        >
                          <Edit style={{width: 11, height: 11}} />
                        </button>
                        <button 
                          onClick={async () => {
                            // Verificar se o usuário tem permissão para excluir
                            if (currentUser && !['admin', 'colaborador', 'gerencia'].includes(currentUser.type)) {
                              alert('Apenas administradores, colaboradores e gerência podem excluir registros.');
                              return;
                            }
                            
                            const confirmDelete = window.confirm('Tem certeza que deseja excluir este registro?');
                            if (confirmDelete) {
                              try {
                                await deleteDeliveryRecord(record.id);
                                setRecords((prevRecords) => prevRecords.filter((r) => r.id !== record.id));
                                alert('Registro excluído com sucesso!');
                              } catch (error) {
                                console.error('Erro ao excluir registro:', error);
                                alert('Erro ao excluir registro. Por favor, tente novamente.');
                              }
                            }
                          }}
                          style={{background: '#dc3545', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 6px', cursor: 'pointer', fontSize: 11}}
                          title="Excluir"
                        >
                          <Trash2 style={{width: 11, height: 11}} />
                        </button>
                      </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                  <td colSpan="14" style={{padding: '32px 12px', textAlign: 'center', color: isDarkMode ? '#d1d5db' : '#666', fontSize: 13}}>
                    Nenhum registro encontrado com os filtros aplicados.
                  </td>
              </tr>
            )}
          </tbody>
        </table>
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
          border: '3px solid rgba(255, 255, 255, 0.2)',
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
      
      {/* Modal de Comentário */}
      {commentModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setCommentModal({ open: false, record: null, text: '' })}
        >
          <div style={{
            background: isDarkMode ? '#2a2a2a' : '#fff',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: isDarkMode ? '1px solid #333' : 'none'
          }}
          onClick={e => e.stopPropagation()}
          >
            <h3 style={{margin: '0 0 24px 0', color: isDarkMode ? '#00ff88' : '#218838'}}>Adicionar Comentário</h3>
            <p style={{margin: '0 0 16px 0', color: isDarkMode ? '#ccc' : '#666'}}>
              <strong>Registro:</strong> {commentModal.record?.client || 'N/A'} - {commentModal.record?.driver || 'N/A'}
            </p>
            <textarea
              value={commentModal.text}
              onChange={e => setCommentModal({...commentModal, text: e.target.value})}
              placeholder="Digite seu comentário..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 16,
                borderRadius: 8,
                border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
                fontSize: 16,
                fontFamily: 'inherit',
                resize: 'vertical',
                background: isDarkMode ? '#2a2a2a' : '#fff',
                color: isDarkMode ? '#ccc' : '#333'
              }}
            />
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
              <button
                onClick={() => setCommentModal({ open: false, record: null, text: '' })}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
                  background: isDarkMode ? '#2a2a2a' : '#fff',
                  color: isDarkMode ? '#ccc' : '#666',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddComment}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: isDarkMode ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  color: isDarkMode ? '#000' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Adicionar Comentário
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Edição - Simplificado para este exemplo */}
      {editModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setEditModal({ open: false, record: null })}
        >
          <div style={{
            background: isDarkMode ? '#2a2a2a' : '#fff',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: isDarkMode ? '1px solid #333' : 'none'
          }}
          onClick={e => e.stopPropagation()}
          >
            <h3 style={{margin: '0 0 24px 0', color: isDarkMode ? '#00ff88' : '#218838'}}>Editar Registro</h3>
            <p style={{margin: '0 0 16px 0', color: isDarkMode ? '#ccc' : '#666'}}>
              Funcionalidade de edição em desenvolvimento. Por favor, utilize a tela de Registros para editar informações.
            </p>
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
              <button
                onClick={() => setEditModal({ open: false, record: null })}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
                  background: isDarkMode ? '#2a2a2a' : '#fff',
                  color: isDarkMode ? '#ccc' : '#666',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setEditModal({ open: false, record: null });
                  navigate('/registros');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: isDarkMode ? 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)' : 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ir para Registros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Monitoramento;
