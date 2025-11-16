import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext.js';
import { ToastContext } from '../App.js';
import { getLatestDeliveryRecordsWithPermissions, updateDeliveryRecord, isAdmin, uploadRouteImage, deleteRouteImage, isCollaborator, addDeliveryComment, problemTypes } from '../firebaseUtils.js';
import { getAllRouteImages } from '../firebaseUtils.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { 
  Home as HomeIcon, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Paperclip,
  Truck,
  User,
  MapPin,
  Calendar,
  Timer
} from 'lucide-react';
import ToastNotification from '../Components/ToastNotification.jsx';
import PageHeader from '../Components/PageHeader.jsx';
import { useNavigate } from 'react-router-dom';

// [NOVO] Componente de texto colapsável com modal
function CollapsibleText({ text, maxLength = 20 }) {
  const { isDarkMode } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  if (!text || text.length <= maxLength) return <span>{text}</span>;
  return (
    <>
      <span>
        {text.slice(0, maxLength)}... <span style={{color:'#1976d2',cursor:'pointer',fontWeight:600}} onClick={()=>setModalOpen(true)}>ver</span>
      </span>
      {modalOpen && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background: isDarkMode ? '#0f0f0f' : '#fff' , border: isDarkMode ? '0.5px solid #585858ff' : 'none',borderRadius:16,padding:32,minWidth:220,maxWidth:370,boxShadow:'0 8px 32px #0005',position:'relative',wordBreak:'break-word`}'}}>
            <button onClick={()=>setModalOpen(false)} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer',color: isDarkMode ? '#d1d5db' : '#888'}} title="Fechar">×</button>
            <h2 style={{fontWeight:700, fontSize:'1.1rem', color: isDarkMode ? '#ffffff' : '#000000ff', marginBottom:18}}>Observação Completa</h2>
            <div style={{fontSize:16, color: isDarkMode ? '#e5e7eb' : '#333', wordBreak:'break-word', whiteSpace:'pre-wrap'}}>{text}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Home() {
  const { currentUser: user } = useAuth();
  const { showToast } = React.useContext(ToastContext);
  const { isDarkMode, colors } = useTheme();
  const [routeImage, setRouteImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [currentRouteImageId, setCurrentRouteImageId] = useState(null);
  const [routeImageInfo, setRouteImageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latestRecords, setLatestRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState({});
  const fileInputRef = useRef(null);
  const [supportCooldown, setSupportCooldown] = useState({});
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [drag, setDrag] = useState({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
  const imgRef = useRef();
  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });
  const [problemModal, setProblemModal] = useState({ open: false, record: null });
  const [selectedProblem, setSelectedProblem] = useState('');
  const [problemInfo, setProblemInfo] = useState('');
  const [commentModal, setCommentModal] = useState({ open: false, record: null });
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [viewCommentsModal, setViewCommentsModal] = useState({ open: false, record: null });
  const [viewAttachmentsModal, setViewAttachmentsModal] = useState({ open: false, record: null });
  const [filterClient, setFilterClient] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProblem, setFilterProblem] = useState('');
  const [filterFretista, setFilterFretista] = useState('');
  // [NOVO] Hook para atualizar o tempo em aberto a cada segundo
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  // Listas únicas para filtros
  const clientList = Array.from(new Set(latestRecords.map(r => r.client).filter(Boolean)));
  const statusList = Array.from(new Set(latestRecords.map(r => r.status).filter(Boolean)));
  const fretistaList = Array.from(new Set(latestRecords.map(r => r.driver).filter(Boolean)));

  // Função para calcular tempo médio de finalização
  const calculateAverageTime = (records) => {
    let totalDurationMinutes = 0;
    let validDurations = 0;
    
    records.forEach(record => {
      if (record.duration) {
        const match = record.duration.match(/(\d+)\s*min/);
        if (match) {
          totalDurationMinutes += parseInt(match[1]);
          validDurations++;
        }
      }
    });
    
    return validDurations > 0 
      ? `${Math.round(totalDurationMinutes / validDurations)} min` 
      : 'N/A';
  };

  // Estatísticas dos registros
  const stats = {
    total: latestRecords.length,
    emAndamento: latestRecords.filter(r => r.status === 'Entrega em andamento').length,
    comProblema: latestRecords.filter(r => r.problem_type || r.tipoProblema).length,
    finalizada: latestRecords.filter(r => r.status === 'Entrega finalizada').length,
    devolvida: latestRecords.filter(r => r.status === 'Entrega devolvida').length,
    tempoMedio: calculateAverageTime(latestRecords)
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setFilterClient('');
    setFilterDuration('');
    setFilterStatus('');
    setFilterProblem('');
    setFilterFretista('');
  };

  // Resetar zoom e posição ao abrir/fechar
  useEffect(() => {
    if (zoomOpen) {
      setZoomLevel(1);
      setDrag({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
    }
  }, [zoomOpen]);

  const handleWheel = (e) => {
    e.preventDefault();
    let newZoom = zoomLevel + (e.deltaY < 0 ? 0.2 : -0.2);
    newZoom = Math.max(1, Math.min(newZoom, 5));
    setZoomLevel(newZoom);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDrag({ ...drag, active: true, startX: e.clientX - drag.x, startY: e.clientY - drag.y });
  };
  const handleMouseMove = (e) => {
    if (!drag.active) return;
    setDrag({ ...drag, x: e.clientX - drag.startX, y: e.clientY - drag.startY, active: true, startX: drag.startX, startY: drag.startY });
  };
  const handleMouseUp = () => {
    setDrag({ ...drag, active: false });
  };

  // Carregar cooldowns do localStorage ao montar
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('supportCooldown') || '{}');
    setSupportCooldown(saved);
  }, []);

  // Salvar cooldowns no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('supportCooldown', JSON.stringify(supportCooldown));
  }, [supportCooldown]);

  // [NOVO] Hook para atualizar o tempo em aberto a cada segundo
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLatestRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const records = await getLatestDeliveryRecordsWithPermissions(20, user);
      setLatestRecords(records || []); // Garantir que sempre seja um array
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      setLatestRecords([]); // Definir array vazio em caso de erro
    } finally {
      setLoadingRecords(false);
    }
  }, [user]);

  const loadCurrentRouteImage = async () => {
    try {
      const images = await getAllRouteImages();
      if (images && images.length > 0) {
        const latest = images[0];
        setRouteImage(latest.image_url);
        setImageName(latest.original_name);
        setCurrentRouteImageId(latest.id);
        setRouteImageInfo(latest);
      } else {
        setRouteImage(null);
        setImageName('');
        setCurrentRouteImageId(null);
        setRouteImageInfo(null);
      }
    } catch (error) {
      console.error('Erro ao carregar imagem da rota do Supabase:', error);
      setRouteImage(null);
      setImageName('');
      setCurrentRouteImageId(null);
      setRouteImageInfo(null);
    }
  };

  const checkNotifications = useCallback(() => {
    const now = new Date();
    const newNotifications = [];
    const timeWaitRecords = [];
    const problemRecords = [];

    // Verificar entregas com mais de 1 hora
    latestRecords.forEach(record => {
      if (record.status === 'Entrega em andamento' && record.checkin_time) {
        const checkinTime = new Date(record.checkin_time);
        const diffHours = (now - checkinTime) / (1000 * 60 * 60);
        
        if (diffHours >= 1) {
          timeWaitRecords.push(record);
        }
      }

      // Verificar entregas com problemas (apenas as que ainda estão em andamento)
      if (record.problem_type && record.status === 'Entrega em andamento') {
        problemRecords.push(record);
      }
    });

    // Criar notificação de tempo de espera para cada registro específico
    timeWaitRecords.forEach(record => {
          const notificationKey = `time_wait_${record.id}`;
          if (!dismissedNotifications[notificationKey]) {
        const cliente = record.cliente || record.client || 'N/A';
        const fretista = record.fretista || record.driver || 'N/A';
        const info = record.informacoesAdicionais || record.information || 'N/A';
        const problema = record.tipoProblema || record.problem_type || '';
        
        let message = `🚨 ALERTA DE TEMPO DE ESPERA 🚨\n🚛 FRETISTA ${fretista} NO CLIENTE ${cliente} HÁ 1 HORA AGUARDANDO.\n👁 FAVOR, ACOMPANHAR!`;
        
        if (info) {
          message += `\n\n📝 INFORMAÇÕES: ${info}`;
        }
        
        if (problema) {
          message += `\n\n⚠ PROBLEMA NA ENTREGA: ${problema}`;
        }
        
            newNotifications.push({
              id: notificationKey,
              type: 'time_wait',
          records: [record],
          message: message,
              time: now
            });
          }
    });

    // Criar notificação de problemas apenas a cada 1 hora
    if (problemRecords.length > 0) {
      const currentHour = now.getHours();
      const currentDate = now.toLocaleDateString('pt-BR');
      const hourKey = `${currentDate}_hour_${currentHour}`;
      const lastProblemNotified = localStorage.getItem('lastProblemNotification');
      
      if (lastProblemNotified !== hourKey) {
        const notificationKey = 'problem_group';
        newNotifications.push({
          id: notificationKey,
          type: 'problem',
          records: problemRecords,
          message: `⚠️ ENTREGA(S) COM PROBLEMA ⚠️\n${problemRecords.length} entrega(s) com problemas em andamento.\n📝 Verificar detalhes abaixo.`,
          time: now
        });
        localStorage.setItem('lastProblemNotification', hourKey);
      }
    }

    // Notificação global de horário limite (1 vez por hora para todos)
    // Só mostrar se houver registros em andamento com mais de 1 hora
    if (timeWaitRecords.length > 0) {
      const currentHour = now.getHours();
      const currentDate = now.toLocaleDateString('pt-BR');
      const hourKey = `${currentDate}_hour_${currentHour}`;
      const lastHourNotified = localStorage.getItem('lastTimeLimitNotification');
      if (currentHour >= 17 && lastHourNotified !== hourKey) {
        const notificationKey = `time_limit_${currentDate}_${currentHour}`;
        if (!dismissedNotifications[notificationKey]) {
          newNotifications.push({
            id: notificationKey,
            type: 'time_limit',
            message: `🚨⏳🚨 Alerta: carro há muito tempo em entrega/loja 🚨⏳🚨\nNotificar os responsáveis para que sejam tomadas as devidas providências.`,
            time: now
          });
          localStorage.setItem('lastTimeLimitNotification', hourKey);
        }
      }
    }

    setNotifications(newNotifications);
  }, [latestRecords, dismissedNotifications]);

  // Carregar registros, verificar notificações e carregar imagem da rota
  useEffect(() => {
    loadLatestRecords();
    loadCurrentRouteImage();
    // Carregar notificações descartadas do localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
    setDismissedNotifications(dismissed);
  }, [loadLatestRecords]); // Separando a lógica inicial

  // Configurar intervalo para verificar notificações
  useEffect(() => {
    const interval = setInterval(() => {
      if (latestRecords.length > 0) {
        checkNotifications();
      }
    }, 60000); // Verificar a cada minuto
    return () => clearInterval(interval);
  }, [latestRecords.length]); // Removido checkNotifications das dependências para evitar loop infinito

  // Verificar notificações quando os registros mudarem
  useEffect(() => {
    if (latestRecords.length > 0) {
      checkNotifications();
    }
  }, [latestRecords.length]); // Removido checkNotifications das dependências para evitar loop infinito

  // Mostrar toast sempre que uma nova notificação for criada
  useEffect(() => {
    if (notifications.length > 0) {
      // Mostra apenas a primeira notificação como toast
      const n = notifications[0];
      let type = 'info';
      if (n.type === 'problem') type = 'warning';
      if (n.type === 'time_wait') type = 'danger';
      if (n.type === 'time_limit') type = 'info';
      setToast({ open: true, type, message: n.message });
    } else {
      setToast({ open: false, type: 'info', message: '' });
    }
  }, [notifications]);

  const dismissNotification = (notificationId) => {
    setDismissedNotifications(prev => ({
      ...prev,
      [notificationId]: true
    }));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Salvar no localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
    dismissed[notificationId] = true;
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissed));
  };

  // Corrigir a função markAsBeingMonitored para incluir colaboradores e gerência
  const markAsBeingMonitored = async (recordId) => {
    if (!['admin', 'colaborador', 'gerencia'].includes(user?.type)) {
      showToast('Apenas administradores, colaboradores e gerência podem marcar entregas como sendo acompanhadas.', 'warning');
      return;
    }

    try {
      await updateDeliveryRecord(recordId, {
        being_monitored: true
      });
      
      // Remover notificação de problemas
      const notificationKey = 'problem_group';
      dismissNotification(notificationKey);
      
      // Recarregar registros
      loadLatestRecords();
      
      showToast('Entrega marcada como sendo acompanhada.', 'success');
    } catch (error) {
      console.error('Erro ao marcar como sendo acompanhada:', error);
      showToast('Erro ao marcar como sendo acompanhada.', 'error');
    }
  };

  // Função para saber se pode mostrar o botão de apoio
  const canRequestSupport = (record) => {
    if (!user) return false;
    if (record.status !== 'Entrega em andamento') return false;
    if (!record.problem_type) return false;
    const cooldown = supportCooldown[record.id];
    if (cooldown && Date.now() < cooldown) return false;
    // Só mostra para o usuário que fez o registro ou para admin
    if (record.userEmail !== user.email && !isAdmin(user.email)) return false;
    return true;
  };

  // Definir tipo de usuário comercial
  const isComercial = user && user.type === 'comercial';

  // Permissão de comentário (admin/colaborador/comercial em todos, fretista só o próprio)
  const canComment = (record) => {
    if (!user) return false;
    if (isAdmin(user?.email) || isCollaborator(user) || isComercial) return true;
    return record?.userEmail === user?.email;
  };

  // Função para solicitar apoio e iniciar cooldown
  const requestSupport = (record) => {
    const now = new Date();
    const checkinTime = new Date(record.checkin_time);
    const diffMs = now.getTime() - checkinTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Usar campos corretos com fallback
    const cliente = record.cliente || record.client || 'N/A';
    const fretista = record.fretista || record.driver || 'N/A';
    const usuario = record.userEmail || 'N/A';
    const info = record.informacoesAdicionais || record.information || 'N/A';
    const problema = record.tipoProblema || record.problem_type || '';
    
    let message = `📞SOLICITAÇÃO DE APOIO📞\n\n`;
    message += `📌Cliente: ${cliente}\n`;
    message += `🚛Fretista: ${fretista}\n`;
    message += `👤Usuário: ${usuario}\n`;
    message += `⏱️Tempo em loja: ${diffMinutes} minutos\n`;
    message += `📝Info: ${info}\n`;
    if (problema) {
      message += `\n⚠️ Problema: ${problema}\n`;
    }
    message += `\n⚠️ESTOU AGUARDANDO, FAVOR ACOMPANHAR!⚠️`;
    
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
        alert('Mensagem gerada:\n\n' + message);
      });
    }
    
    // Iniciar cooldown de 30 minutos
    setSupportCooldown(prev => ({ ...prev, [record.id]: Date.now() + 30 * 60 * 1000 }));
  };

  const handleSaveComment = async () => {
    if (!commentText.trim()) return;
    
    setSavingComment(true);
    try {
      await addDeliveryComment(
        commentModal.record.id, 
        commentText.trim(), 
        user?.email,
        user?.displayName || user?.email
      );
      
      setCommentModal({ open: false, record: null });
      setCommentText('');
      loadLatestRecords();
      showToast('Comentário adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      showToast('Erro ao salvar comentário!', 'error');
    }
    setSavingComment(false);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo é muito grande. Selecione uma imagem menor que 5MB.');
        return;
      }

      setIsLoading(true);
      
      try {
        // Fazer upload da imagem para o Firebase
        const uploadedImage = await uploadRouteImage(file, user?.email);
        
        setRouteImage(uploadedImage.image_url);
        setImageName(uploadedImage.original_name);
        setCurrentRouteImageId(uploadedImage.id);
        setRouteImageInfo(uploadedImage);
        
        const message = uploadedImage.is_local 
          ? `Imagem "${uploadedImage.original_name}" salva localmente com sucesso!`
          : `Imagem "${uploadedImage.original_name}" salva no Supabase com sucesso!`;
        alert(message);
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        
        // Mensagens de erro mais específicas
        if (error.code === 'storage/unauthorized') {
          alert('Imagem salva localmente (sem dependência de servidor).');
        } else if (error.code === 'storage/quota-exceeded') {
          alert('Limite de armazenamento excedido. Tente com uma imagem menor.');
        } else if (error.message.includes('CORS')) {
          alert('Imagem salva localmente (modo offline ativado).');
        } else {
          alert('Imagem salva localmente. Funcionando normalmente!');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImportClick = () => {
    if (!isAdmin(user?.email)) {
      showToast('Apenas administradores podem importar rotas.', 'warning');
      return;
    }
    fileInputRef.current.click();
  };

  const handleRemoveImage = async () => {
    if (!currentRouteImageId) {
      setRouteImage(null);
      setImageName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!isAdmin(user?.email)) {
      showToast('Apenas administradores podem remover rotas.', 'warning');
      return;
    }

    const confirmRemove = window.confirm('Tem certeza que deseja remover a imagem da rota? Esta ação não pode ser desfeita.');
    if (!confirmRemove) return;

    setIsLoading(true);
    
    try {
      await deleteRouteImage(currentRouteImageId);
      setRouteImage(null);
      setImageName('');
      setCurrentRouteImageId(null);
      setRouteImageInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('Imagem da rota removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      showToast('Erro ao remover a imagem. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoute = () => {
    if (!routeImage) {
      showToast('Nenhuma imagem selecionada para salvar.', 'warning');
      return;
    }
    showToast(`Rota "${imageName}" já está salva no sistema!`, 'info');
  };

  // Filtro para exibir apenas registros que não estão com problema em andamento nem sendo acompanhados em andamento
  const filteredRecords = latestRecords.filter(record => {
    // Busca
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      record.client?.toLowerCase().includes(searchLower) ||
      record.driver?.toLowerCase().includes(searchLower) ||
      record.userEmail?.toLowerCase().includes(searchLower) ||
      record.problem_type?.toLowerCase().includes(searchLower) ||
      record.information?.toLowerCase().includes(searchLower) ||
      record.status?.toLowerCase().includes(searchLower)
    );
    // Filtros adicionais
    const matchesClient = !filterClient || record.client === filterClient;
    const matchesStatus = !filterStatus || record.status === filterStatus;
    const matchesFretista = !filterFretista || record.driver === filterFretista;
    // Filtro por problema
    const matchesProblem = filterProblem === '' ? true : (filterProblem === 'sim' ? !!record.problem_type : !record.problem_type);
    // Filtro por duração
    let matchesDuration = true;
    if (filterDuration) {
      const min = record.duration && record.duration.includes('min') ? parseInt(record.duration.replace(' min', '')) : null;
      if (min !== null) {
        if (filterDuration === '0-59') matchesDuration = min >= 0 && min <= 59;
        if (filterDuration === '60-120') matchesDuration = min >= 60 && min <= 120;
        if (filterDuration === '120+') matchesDuration = min > 120;
      } else {
        matchesDuration = false;
      }
    }
    // Filtro visual padrão
    const isProblemInProgress = record.problem_type && record.status === 'Entrega em andamento';
    const isBeingMonitored = record.being_monitored && record.status === 'Entrega em andamento';
    return matchesSearch && matchesClient && matchesStatus && matchesFretista && matchesProblem && matchesDuration && !isProblemInProgress && !isBeingMonitored;
  });

  // Filtros para os cards de problemas e acompanhadas devem usar latestRecords, não filteredRecords
  const problemsInProgress = latestRecords.filter(record => 
    record.problem_type && record.status === 'Entrega em andamento' && !record.being_monitored
  );

  const beingMonitored = latestRecords.filter(record => 
    record.being_monitored && record.status === 'Entrega em andamento'
  );

  // Exibir o tempo em aberto com emoji ⏰
  // Exemplo para cada registro:
  // Calcular tempo desde o check-in
  const getElapsedTime = (checkin_time) => {
    if (!checkin_time) return '00:00';
    const start = new Date(checkin_time).getTime();
    const diff = Math.max(0, now - start);
    const min = Math.floor(diff / 60000).toString().padStart(2, '0');
    const sec = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  // Função para exibir o tempo correto no card
  const getTempoEmLoja = (record) => {
    if (record.status === 'Entrega em andamento') {
      return getElapsedTime(record.checkin_time);
    }
    // Se finalizada ou devolvida, mostrar duração fixa
    return record.duracao || record.duration || '00:00';
  };

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'text-white' : 'bg-light-bg text-light-text'
      }`}
      style={{
        background: isDarkMode ? '#0F0F0F' : 'transparent'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header moderno */}
        <PageHeader
          title="Dashboard Logística"
          subtitle="Acompanhe entregas, status e solicitações em tempo real"
          icon={HomeIcon}
        />
      {/* Input file oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {/* Área de upload da rota */}
      <div className="card" style={{
        background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
        backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
        border: isDarkMode ? '1px solid #0F0F0F' : 'none', 
        maxWidth: 5000, 
        margin: '0 auto 24px auto',
        textAlign: 'center',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'undefined'
      }}>
        {!routeImage ? (
          <>
            <p style={{fontWeight: 600, color: isDarkMode ? '#FFFFFF' : '#218838', fontSize: 14, marginBottom: 6}}>
              📋 Imagem da Rota do Dia
            </p>
            <p className="route-instructions" style={{fontSize: 12, color: isDarkMode ? '#B3B3B3' : '#888', marginBottom: 12}}>
              Clique no botão abaixo para importar a imagem da rota do dia
            </p>
            <button 
              onClick={handleImportClick}
              disabled={isLoading || !isAdmin(user?.email)}
              className="btn btn-green"
              style={{
                width: '100%', 
                maxWidth: 200, 
                margin: '0 auto',
                padding: '8px 16px',
                fontSize: '12px',
                borderRadius: '8px'
              }}
            >
              {isLoading ? '⏳ Carregando...' : '📁 Importar Imagem da Rota'}
            </button>
            {!isAdmin(user?.email) && (
              <p className="admin-only" style={{color: '#e65100', fontSize: 11, marginTop: 8}}>Apenas administradores podem importar rotas</p>
            )}
          </>
        ) : (
          <div className="route-preview">
            <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8}}>
              <span style={{fontSize: 16, color: '#4caf50'}}>✅</span>
              <h4 style={{fontSize: 14, color: isDarkMode ? '#ffffff' : '#218838', margin: 0}}>Rota do Dia Carregada</h4>
            </div>
            
            <div className="route-info" style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(25, 25, 25, 0.6) 100%)' : '#DAF1DE', 
              backdropFilter: isDarkMode ? 'blur(15px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : 'none', 
              borderRadius: 6, 
              padding: '8px 12px', 
              marginBottom: 12
            }}>
              <span style={{fontSize: 12, color: isDarkMode ? '#ffffff' : '#218838', fontWeight: 600}}>
                📅 Data: {routeImageInfo?.date?.hour ? new Date(routeImageInfo.date).toLocaleDateString('pt-BR') : (() => {
                  // Obter data atual no fuso horário de Salvador, Bahia
                  const now = new Date();
                  // Criar um objeto de data com o fuso horário de Salvador
                  const formatter = new Intl.DateTimeFormat('pt-BR', {
                    timeZone: 'America/Bahia',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  return formatter.format(now);
                })()}
              </span>
              <span style={{fontSize: 12, color: routeImageInfo?.is_local ? (isDarkMode ? '#ffffffff' : '#51ac56ff') : (isDarkMode ? '#ffffffff' : '#51ac56ff'), fontWeight: 600}}>
                💾 Status: {routeImageInfo?.is_local ? 'Salva localmente' : 'Salva no Supabase'}
              </span>
            </div>
            
            <div className="image-preview-container" style={{marginBottom: 12, display: 'flex', justifyContent: 'center'}}>
              <img 
                src={routeImage} 
                alt="Preview da Rota" 
                className="route-preview-image"
                style={{
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  padding: 15,
                  gap: 15,
                  borderRadius: 12, 
                  cursor: 'zoom-in', 
                  border: 'none'
                }}
                onClick={() => setZoomOpen(true)}
              />
            </div>

            {zoomOpen && (
              <div
                style={{position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.85)', zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}
                onClick={() => setZoomOpen(false)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <div
                  style={{position:'relative', maxWidth:'90vw', maxHeight:'90vh', overflow:'hidden', borderRadius: 18, boxShadow: '0 8px 32px #0008', background:'#222'}}
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    ref={imgRef}
                    src={routeImage}
                    alt="Zoom da Rota"
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: `${zoomLevel * 100}%`,
                      height: 'auto',
                      transform: `translate(${drag.x}px, ${drag.y}px)`,
                      cursor: drag.active ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'zoom-in',
                      userSelect: 'none',
                      transition: drag.active ? 'none' : 'transform 0.2s',
                      display: 'block',
                    }}
                    onWheel={handleWheel}
                    onMouseDown={zoomLevel > 1 ? handleMouseDown : undefined}
                    draggable={false}
                  />
                  <button onClick={() => setZoomOpen(false)} style={{position:'absolute', top:16, right:16, background:'none', border:'none', color:'#fff', fontSize:36, cursor:'pointer', zIndex:10000}}>&times;</button>
                  <div style={{position:'absolute', bottom:16, left:16, color:'#fff', fontSize:16, background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'4px 12px'}}>
                    Zoom: {Math.round(zoomLevel * 100)}% (Use a roda do mouse para ampliar, arraste para mover)
                  </div>
                </div>
              </div>
            )}
            
            <div className="route-actions" style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
              <button 
                onClick={handleSaveRoute}
                className="btn btn-green" 
                style={{
                  background: isDarkMode ? '#51ac56ff' : '#4caf50',
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '6px'
                }}
                disabled={isLoading}
              >
                💾 Rota Salva
              </button>
              {isAdmin(user?.email) && (
                <button 
                  onClick={handleRemoveImage}
                  className="btn btn-orange" 
                  style={{
                    background: isDarkMode ? '#ff9100ff' : '#FFA726',
                    padding: '6px 12px',
                    fontSize: '11px',
                    borderRadius: '6px'
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ Removendo...' : '🗑️ Remover'}
                </button>
              )}
            </div>
            
            {!isAdmin(user?.email) && (
              <p style={{color: '#e65100', fontSize: 10, marginTop: 6}}>
                Apenas administradores podem remover rotas
              </p>
            )}
          </div>
        )}
      </div>
      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="card" style={{
          marginBottom: 24, 
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          border: 'none', 
          boxShadow: '0 4px 16px rgba(117, 0, 0, 0.37)',
          padding: '16px',
          borderRadius: '12px'
        }}>
          <h3 style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 1px 4px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
              }}>
            <span style={{fontSize: 18}}>🔔</span>
            Notificações do Sistema
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {notifications.map(notification => (
              <div key={notification.id} className="notification-item" style={{
                background: isDarkMode ? '#2a2a2aff' : '#fff',
                border: 'none', 
                borderRadius: 12, 
                padding: 12, 
                display: 'block',
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 12,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="notification-content" style={{
                  fontSize: 13, 
                  color: isDarkMode ? '#e5e7eb' : '#2a2a2a', 
                  whiteSpace: 'pre-line',
                  fontWeight: 500,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  display: 'block',
                }}>
                  {notification.message}
                </div>
                <div className="notification-actions" style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                  {notification.type === 'problem' && notification.records && (isAdmin(user?.email) || isCollaborator(user)) && (
                    <button 
                      onClick={() => notification.records.forEach(record => markAsBeingMonitored(record.id))}
                      className="btn btn-blue"
                      style={{
                        fontSize: 10, 
                        padding: '6px 12px',
                        background: isDarkMode ? '#2a2a2a' : '#fff',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Marcar como Acompanhada
                    </button>
                  )}
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="btn btn-outline"
                    style={{
                      fontSize: 11, 
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{fontSize: 12}}>✅</span>
                    CIENTE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Entregas com problemas */}
      {problemsInProgress.length > 0 && (
        <div className="card" style={{
          marginBottom: 24, 
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
          overflow: 'hidden'
        }}>
          {/* Header do card */}
          <div style={{
            background: 'linear-gradient(135deg, #4d0202ff 0%, #fc0000ff 100%)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{
              background: isDarkMode ? '#2a2a2a' : '#fff',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{fontSize: 16, color: '#fff'}}>🚨</span>
          </div>
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                letterSpacing: '0.5px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                ATENÇÃO: ENTREGAS COM PROBLEMAS
              </h3>
              <p style={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {problemsInProgress.length} entrega(s) requerem atenção imediata
              </p>
            </div>
          </div>

          {/* Lista de problemas */}
          <div style={{padding: '16px'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {problemsInProgress.map(record => (
                <div key={record.id} style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: 'none',
              boxShadow: 'none',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              position: 'relative'
                }}>
                  {/* Indicador de problema */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}></div>

                  <div style={{padding: '12px'}}>
                    {/* Informações principais */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 12,
                      marginBottom: 12
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span style={{fontSize: 14, color: '#6b7280'}}>🚛</span>
                        <div>
                          <div style={{fontSize: '0.6rem', color: isDarkMode ? '#9ca3af' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Fretista</div>
                          <div style={{fontSize: '0.8rem', color: isDarkMode ? '#f3f4f6' : '#1f2937', fontWeight: 700}}>{record.fretista || record.driver || '-'}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span style={{fontSize: 14, color: '#6b7280'}}>👤</span>
                        <div>
                          <div style={{fontSize: '0.6rem', color: isDarkMode ? '#9ca3af' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Cliente</div>
                          <div style={{fontSize: '0.8rem', color: isDarkMode ? '#f3f4f6' : '#1f2937', fontWeight: 700}}>{record.cliente || record.client || '-'}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span style={{fontSize: 14, color: '#6b7280'}}>⏰</span>
                        <div>
                          <div style={{fontSize: '0.6rem', color: isDarkMode ? '#9ca3af' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Check-in</div>
                          <div style={{fontSize: '0.8rem', color: isDarkMode ? '#f3f4f6' : '#1f2937', fontWeight: 700}}>{record.checkin || (record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-')}</div>
                        </div>
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span style={{fontSize: 14, color: '#6b7280'}}>⏳</span>
                        <div>
                          <div style={{fontSize: '0.6rem', color: isDarkMode ? '#9ca3af' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Tempo em Loja</div>
                          <div style={{fontSize: '0.8rem', color: '#ef4444', fontWeight: 800}}>{(() => {
                    const now = new Date();
                    const checkin = new Date(record.checkin_time);
                    const diff = Math.floor((now - checkin)/1000);
                    const min = Math.floor(diff/60).toString().padStart(2,'0');
                    const sec = (diff%60).toString().padStart(2,'0');
                    return `${min}:${sec}`;
                          })()}</div>
                </div>
                </div>
                    </div>

                    {/* Problema destacado */}
                    <div style={{
                      background: isDarkMode ? 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: isDarkMode ? '1px solid #92400e' : '1px solid #f59e0b',
                      borderRadius: 8,
                      padding: '12px',
                      marginBottom: 12,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 3,
                        height: '100%',
                        background: 'linear-gradient(180deg, #ef4444 0%, #f59e0b 100%)'
                      }}></div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6}}>
                        <span style={{fontSize: 16, color: '#d97706'}}>⚠️</span>
                        <div>
                          <div style={{fontSize: '0.7rem', color: isDarkMode ? '#fbbf24' : '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Problema Identificado</div>
                          <div style={{fontSize: '0.9rem', color: isDarkMode ? '#fbbf24' : '#92400e', fontWeight: 800}}>{record.tipoProblema || record.problem_type || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Informações adicionais */}
                    <CollapsibleText text={record.informacoesAdicionais || record.information} />

                    {/* Usuário responsável */}
                    <div style={{
                      background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
                      backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
                      border: 'none',
                      boxShadow: 'none',
                      padding: '6px 10px',
                      marginBottom: 12,
                      display: 'inline-block'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                        <span style={{fontSize: 12, color: '#64748b'}}>👤</span>
                        <span style={{fontSize: '0.7rem', color: isDarkMode ? '#9ca3af' : '#64748b', fontWeight: 600}}>Registrado por:</span>
                        <span style={{fontSize: '0.7rem', color: isDarkMode ? '#e5e7eb' : '#475569', fontWeight: 700}}>
                          {record.userName ? `${record.userName} (${record.userEmail || '-'})` : (record.userEmail || '-')}
                        </span>
                      </div>
                    </div>

                    {/* Comentários existentes */}
                    {(record.comments || []).length > 0 && (
                      <div style={{marginBottom:6}}>
                        <button 
                          onClick={() => setViewCommentsModal({ open: true, record })}
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 1px 4px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.2s ease',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 2px 6px rgba(139, 92, 246, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 1px 4px rgba(139, 92, 246, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 16}}>💬</span>
                          Ver {(record.comments || []).length} comentário(s)
                        </button>
                      </div>
                    )}

                    {/* Botões de ação */}
                    <div style={{
                      display: 'flex',
                      gap: 6,
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: 8
                    }}>
                      {(record.userEmail === user.email || isAdmin(user?.email)) && !isComercial && (
                        <button 
                          onClick={() => {
                            setProblemModal({ open: true, record });
                            setSelectedProblem('');
                            setProblemInfo('');
                          }}
                          className="btn btn-red"
                          style={{
                            fontWeight: 600,
                            fontSize: 10,
                            padding: '4px 6px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #e53935 0%, #ff9800 100%)',
                            color: '#fff',
                            boxShadow: '0 1px 3px rgba(229, 57, 53, 0.3)',
                            border: 'none',
                            cursor: 'pointer',
                            letterSpacing: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            width: '45%',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 2px 5px rgba(229, 57, 53, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 1px 3px rgba(229, 57, 53, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 10}}>⚠️</span>
                          PROBLEMA
                        </button>
                      )}
                      {(record.userEmail === user.email || isAdmin(user?.email)) && !isComercial && (
                        <button 
                          onClick={() => requestSupport(record)}
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 6px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            boxShadow: '0 1px 3px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s ease',
                            width: '45%',
                            letterSpacing: 0.5,
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 2px 5px rgba(245, 158, 11, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 1px 3px rgba(245, 158, 11, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 10}}>🆘</span>
                          APOIO
                        </button>
                      )}
                      {['admin', 'colaborador', 'gerencia', 'comercial'].includes(user?.type) && (
                        <button 
                          onClick={() => markAsBeingMonitored(record.id)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 6px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease',
                            width: '45%',
                            justifyContent: 'center',
                            letterSpacing: 0.5
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 2px 5px rgba(59, 130, 246, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 1px 3px rgba(59, 130, 246, 0.3)';
                          }}
                        >
                          <span style={{fontSize: 10}}>👁️</span>
                          ACOMPANHAR
                        </button>
                      )}
                      {/* Botão de comentário */}
                      <button 
                        onClick={() => {
                          setCommentModal({ open: true, record });
                          setCommentText('');
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 6px',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.3)',
                          transition: 'all 0.2s ease',
                          width: '45%',
                          justifyContent: 'center',
                          letterSpacing: 0.5
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 2px 5px rgba(139, 92, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 1px 3px rgba(139, 92, 246, 0.3)';
                        }}
                      >
                        <span style={{fontSize: 10}}>💬</span>
                        COMENTAR
                      </button>
                    </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
      {/* Entregas sendo acompanhadas */}
      {beingMonitored.length > 0 && (
        <div className="card" style={{marginBottom: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(59,130,246,0.10)'}}>
          {/* shimmer azul */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}></div>
          <h3 style={{fontSize: 14, color: isDarkMode ? '#10b981' : '#218838', marginBottom: 8, marginTop: 12, marginLeft: 12}}>🔄 Entregas Sendo Acompanhadas</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8, padding: 12}}>
            {beingMonitored.map(record => (
              <div
                key={record.id}
                style={{
                  background: isDarkMode ? '#065f46' : '#eafff6',
                  borderRadius: 10,
                  margin: '0 0 12px 0',
                  padding: 12,
                  boxShadow: '0 1px 4px #0001',
                  maxWidth: 420,
                  width: '100%',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{display:'flex',alignItems:'center',gap:4,fontWeight:700,fontSize:13,color:'#1976d2',marginBottom:6}}>
  <span role="img" aria-label="Relógio">⏰</span> {getTempoEmLoja(record)}
</div>
                <div style={{fontSize: 11, lineHeight: 1.4, marginBottom: 6}}>
                  <b>🚚 Fretista:</b> {record.fretista || record.driver || '-'} <b>👤 Cliente:</b> {record.cliente || record.client || '-'} <b>🕒 Check-in:</b> {record.checkin || (record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString('pt-BR') : '-')} <b>⚠️ Problema:</b> {record.tipoProblema || record.problem_type || '-'} <b>📝 Info:</b> <CollapsibleText text={record.informacoesAdicionais || record.information || '-'} /> <b>👤 Usuário:</b> {record.userEmail || '-'}
                </div>
                  <div style={{marginTop: 3, fontSize: 10, color: '#888'}}>🔄 Status: Responsável da logística resolvendo o Problema, por favor, aguardar e em caso de demora, entrar em contato por ligação!</div>
                <div style={{marginBottom:6, color:'#1976d2', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:4, maxWidth:'100%', wordBreak:'break-word', overflowWrap:'break-word'}}>
  <span style={{fontSize:14}}>✉️</span>
  <CollapsibleText text={record.informacoesAdicionais || record.information} />
                </div>
                <div className="record-actions">
                  {canRequestSupport(record) && (
                    <button 
                      onClick={() => requestSupport(record)}
                      className="btn btn-orange"
                      style={{fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 6}}
                    >
                      🆘 SOLICITAR APOIO
                    </button>
                  )}
                  {/* Botão de comentário */}
                  <button 
                    onClick={() => {
                      setViewCommentsModal({ open: true, record });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 1px 4px rgba(139, 92, 246, 0.3)',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 2px 6px rgba(139, 92, 246, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 4px rgba(139, 92, 246, 0.3)';
                    }}
                  >
                    <span style={{fontSize: 12}}>💬</span>
                    Ver {(record.comments || []).length} comentário(s)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
        {/* Cards Estatísticos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          {/* Card Total */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-blue-500/20' 
                : 'bg-white border-light-border hover:shadow-light-primary/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {stats.total}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Total
            </div>
          </motion.div>

          {/* Card Em Andamento */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-amber-500/20' 
                : 'bg-white border-light-border hover:shadow-amber-500/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-500 mb-2">
              {stats.emAndamento}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Em Andamento
            </div>
          </motion.div>

          {/* Card Com Problema */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-red-500/20' 
                : 'bg-white border-light-border hover:shadow-red-500/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500 mb-2">
              {stats.comProblema}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Com Problemas
            </div>
          </motion.div>

          {/* Card Finalizada */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-green-500/20' 
                : 'bg-white border-light-border hover:shadow-green-500/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500 mb-2">
              {stats.finalizada}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Finalizadas
            </div>
          </motion.div>

          {/* Card Devolvida */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-red-600/20' 
                : 'bg-white border-light-border hover:shadow-red-600/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {stats.devolvida}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Devolvidas
            </div>
          </motion.div>

          {/* Card Tempo Médio */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              rounded-2xl p-6 text-center shadow-lg border transition-all duration-300
              ${isDarkMode 
                ? 'hover:shadow-purple-500/20' 
                : 'bg-white border-light-border hover:shadow-purple-500/20'
              }
            `}
            style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <Timer className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-purple-500 mb-2">
              {stats.tempoMedio}
            </div>
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
            }`}>
              Tempo Médio
            </div>
          </motion.div>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`
            rounded-xl p-4 mb-6 shadow-md border
            ${isDarkMode 
              ? '' 
              : 'bg-white border-light-border'
            }
          `}
          style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
          }}
        >
          {/* Barra de Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`} />
              <input
                type="text"
                placeholder="Buscar por cliente, fretista, status, problema..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', 
                padding: '8px 12px', 
                textIndent: '16px',
                border: isDarkMode ? '1px solid #0F0F0F' : '1px solid #e0e0e0', 
                borderRadius: 6, 
                fontSize: 12,
                background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(25, 25, 25, 0.6) 100%)' : '#fff',
                color: isDarkMode ? '#FFFFFF' : '#333',
                backdropFilter: isDarkMode ? 'blur(15px)' : 'none'
              }}
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Cliente */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${ 
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                👤 Cliente
              </label>
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
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
              >
                <option value="">Todos os Clientes</option>
                {clientList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Duração */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                ⏱️ Duração
              </label>
              <select
                value={filterDuration}
                onChange={e => setFilterDuration(e.target.value)}
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
              >
                <option value="">Todas as Durações</option>
                <option value="0-59">0 a 59 min</option>
                <option value="60-120">60 a 120 min</option>
                <option value="120+">Acima de 120 min</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                📊 Status
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
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
              >
                <option value="">Todos os Status</option>
                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Problema */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                ⚠️ Problema
              </label>
              <select
                value={filterProblem}
                onChange={e => setFilterProblem(e.target.value)}
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
              >
                <option value="">Com ou sem Problema</option>
                <option value="sim">Com Problema</option>
                <option value="nao">Sem Problema</option>
              </select>
            </div>

            {/* Fretista */}
            <div className="space-y-1">
              <label className={`text-xs font-medium ${
                isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'
              }`}>
                🚛 Fretista
              </label>
              <select
                value={filterFretista}
                onChange={e => setFilterFretista(e.target.value)}
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
              >
                <option value="">Todos os Fretistas</option>
                {fretistaList.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            <div className="space-y-1">
              <label className="text-xs font-medium opacity-0">Ações</label>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleClearFilters}
                className={`
                  w-full px-3 py-2 rounded-md font-medium transition-all duration-200 text-xs
                  ${isDarkMode 
                    ? 'bg-gradient-to-r from-dark-primary to-green-600 hover:from-dark-primary/90 hover:to-green-600/90 text-white' 
                    : 'bg-gradient-to-r from-light-primary to-green-600 hover:from-light-primary/90 hover:to-green-600/90 text-white'
                  }
                  shadow-md hover:shadow-lg
                `}
              >
                <Filter className="w-3 h-3 inline mr-1" />
                Limpar Filtros
              </motion.button>
            </div>
          </div>
        </motion.div>

      {/* Lista de registros */}
      <div className="latest-records" style={{display: 'flex', flexDirection: 'column',gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 16}}>
        <AnimatePresence>
          {loadingRecords ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Carregando registros...
                </p>
              </div>
            </motion.div>
          ) : filteredRecords.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Package className={`w-12 h-12 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Nenhum registro encontrado.
              </p>
            </motion.div>
          ) : (
            filteredRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className={`
                  rounded-lg p-4 mb-4 shadow-md border transition-all duration-300
                  ${isDarkMode 
                    ? 'bg-dark-card border-dark-border hover:shadow-lg hover:shadow-blue-500/10' 
                    : 'bg-white border-gray-200 hover:shadow-lg hover:shadow-blue-500/10'
                  }
                `}
                style={{
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white', border: isDarkMode ? '1px solid #0F0F0F' : undefined,
                  boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
                  maxWidth: '100%',
                  maxWidth: '100%'
                }}
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Left Section - Main Info */}
                  <div className="flex-1 space-y-3">
                    {/* Date and Time */}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className={`font-semibold text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Data:
                      </span>
                      <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {record.data || new Date(record.checkin_time).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-blue-600 text-sm">
                        {getTempoEmLoja(record)}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-purple-500" />
                        <span className="font-semibold text-purple-600 text-xs">Cliente:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.cliente || record.client}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Truck className="w-3 h-3 text-green-500" />
                        <span className="font-semibold text-green-600 text-xs">Fretista:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.fretista || record.driver}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-orange-500" />
                        <span className="font-semibold text-orange-600 text-xs">Vendedor:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.vendedor}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-red-500" />
                        <span className="font-semibold text-red-600 text-xs">Rede:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.rede}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold text-blue-600 text-xs">UF:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.uf}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-yellow-500" />
                        <span className="font-semibold text-yellow-600 text-xs">Check-in:</span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {record.checkin || new Date(record.checkin_time).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>

                      {record.checkout && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="font-semibold text-green-600 text-xs">Check-out:</span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {record.checkout}
                          </span>
                        </div>
                      )}

                      {record.duracao && (
                        <div className="flex items-center gap-2">
                          <Timer className="w-3 h-3 text-green-500" />
                          <span className="font-semibold text-green-600 text-xs">Duração:</span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {record.duracao}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <User className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-slate-600 text-xs">Registrado por:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {record.userName ? `${record.userName} (${record.userEmail || '-'})` : (record.userEmail || '-')}
                      </span>
                    </div>

                    {/* Comments Button */}
                    {(record.comments || []).length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setViewCommentsModal({ open: true, record })}
                        className="w-full mt-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-3 rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Ver {(record.comments || []).length} comentário(s)
                      </motion.button>
                    )}
                  </div>

                  {/* Right Section - Status and Actions */}
                  <div className="grid grid-cols-1 items-end gap-3 min-w-[160px] text-center">
                    {/* Status Badge */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr', alignItems: 'flex-end'}} className="flex flex-col items-end">
                      <span className={`text-xs font-bold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      </span>
                      <motion.span
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={`
                          inline-block px-3 py-1 rounded-full font-bold text-xs shadow-md
                          ${record.status === 'Entrega em andamento' 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                            : record.status === 'Entrega finalizada' 
                            ? 'bg-green-500 text-white' 
                            : record.status === 'Entrega devolvida' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-200 text-gray-800'
                          }
                        `}
                      >
                        {record.status}
                      </motion.span>
                    </div>

                    {/* Problem Indicator */}
                    {record.problem_type || record.tipoProblema ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 mb-1 p-1 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 text-xs"
                      >
                        <AlertTriangle className="w-3 h-3 text-red-500 text-center"/>
                        <span className="text-center font-semibold text-red-600 dark:text-red-400 text-xs">
                          {record.tipoProblema || record.problem_type}
                        </span>
                      </motion.div>
                    ) : null}

                    {/* Additional Information */}
                    {record.informacoesAdicionais || record.information ? (
                      <div className="flex items-center gap-2 mb-1 p-1 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800 text-xs">
                        <MessageCircle className="w-3 h-3 text-blue-500"  />
                        <CollapsibleText text={record.informacoesAdicionais || record.information} />
                      </div>
                    ) : null}

                    {/* Attachments */}
                    {(record.attachments || []).length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setViewAttachmentsModal({ open: true, record })}
                        className="flex items-center gap-2 mb-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Paperclip className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">
                          {(record.attachments || []).length} anexo(s)
                        </span>
                      </motion.button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-3">
                      {record.status === 'Entrega em andamento' && (user?.email === record.userEmail || isAdmin(user?.email)) && !isComercial && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setProblemModal({ open: true, record });
                            setSelectedProblem('');
                            setProblemInfo('');
                          }}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          PROBLEMA
                        </motion.button>
                      )}

                      {record.status === 'Entrega em andamento' && (user?.email === record.userEmail || isAdmin(user?.email)) && !isComercial && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => requestSupport(record)}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          SOLICITAR APOIO
                        </motion.button>
                      )}

                      {canComment(record) && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setCommentModal({ open: true, record });
                            setCommentText('');
                          }}
                          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-purple-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs"
                        >
                          <MessageCircle className="w-3 h-3" />
                          COMENTAR
                        </motion.button>
                      )}
                    </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
      </div>
      {/* Modal de Problema */}
      <AnimatePresence>
        {problemModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 min-w-80 max-w-md w-full shadow-xl relative`}
            >
              <button
                onClick={() => setProblemModal({ open: false, record: null })}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold"
                title="Fechar"
              >
                ×
              </button>
              
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Registrar Problema
              </h2>
              
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">
                  Tipo de Problema:
                </label>
                <select
                  value={selectedProblem}
                  onChange={e => setSelectedProblem(e.target.value)}
                  className={`w-full p-2 rounded-md border-2 text-sm ${isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                  } focus:border-red-500 focus:outline-none transition-colors`}
                >
                  <option value="">Selecione...</option>
                  {problemTypes.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">
                  Observação (opcional):
                </label>
                <textarea
                  value={problemInfo}
                  onChange={e => setProblemInfo(e.target.value)}
                  className={`w-full p-2 rounded-md border-2 min-h-16 text-sm ${isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                  } focus:border-red-500 focus:outline-none transition-colors`}
                  placeholder="Descreva o problema..."
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-md shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                disabled={!selectedProblem}
                onClick={async () => {
                  if (!selectedProblem) return;
                  await updateDeliveryRecord(problemModal.record.id, {
                    problem_type: selectedProblem,
                    information: problemInfo
                  });
                  // NOVO MODELO DE RESUMO (ENTREGA COM PROBLEMA)
                  const record = problemModal.record;
                  let message = `🚨ENTREGA COM PROBLEMA🚨\n\n`;
                  message += `🚛 Fretista: ${(record.fretista || record.driver || '-')}\n`;
                  message += `🛒 Cliente: ${(record.cliente || record.client || '-')}\n`;
                  message += `🧰 Vendedor: ${(record.vendedor || '-')}\n`;
                  message += `⚠️ Problema: ${selectedProblem}\n`;
                  message += `📝 Observação: ${problemInfo || 'Nenhuma'}\n\n`;
                  message += `🫵NO AGUARDO DA RESOLUÇÃO!⌛`;
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
                      alert('Mensagem gerada:\n\n' + message);
                    });
                  }
                  
                  setProblemModal({ open: false, record: null });
                  setSelectedProblem('');
                  setProblemInfo('');
                  loadLatestRecords();
                }}
              >
                Salvar Problema e Enviar WhatsApp
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal de Comentário */}
      <AnimatePresence>
        {commentModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 min-w-80 max-w-md w-full shadow-xl relative`}
            >
              <button
                onClick={() => setCommentModal({ open: false, record: null })}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold"
                title="Fechar"
              >
                ×
              </button>
              
              <h2 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Adicionar Comentário
              </h2>
              
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">
                  Comentário:
                </label>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className={`w-full p-2 rounded-md border-2 min-h-20 text-sm ${isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                  } focus:border-purple-500 focus:outline-none transition-colors resize-none`}
                  placeholder="Digite seu comentário..."
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                  {commentText.length}/500 caracteres
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-md shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                disabled={!commentText.trim() || savingComment}
                onClick={handleSaveComment}
              >
                {savingComment ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3 h-3" />
                    Salvar Comentário
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal de Visualização de Comentários */}
      <AnimatePresence>
        {viewCommentsModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 min-w-96 max-w-2xl w-full max-h-[80vh] shadow-xl relative flex flex-col overflow-hidden`}
            >
              <button
                onClick={() => setViewCommentsModal({ open: false, record: null })}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold z-10"
                title="Fechar"
              >
                ×
              </button>
              
              <div className="mb-4 border-b-2 border-gray-100 dark:border-gray-700 pb-3">
                <h2 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comentários da Entrega
                </h2>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Cliente:</strong> {viewCommentsModal.record?.cliente || viewCommentsModal.record?.client} | 
                  <strong> Fretista:</strong> {viewCommentsModal.record?.fretista || viewCommentsModal.record?.driver}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-3">
                {viewCommentsModal.record?.comments?.length > 0 ? (
                  viewCommentsModal.record.comments.map((comment, index) => (
                    <motion.div
                      key={`${comment.userEmail}-${comment.timestamp}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border relative`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {comment.userName || comment.userEmail}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {comment.timestamp ? (comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString('pt-BR') : new Date(comment.timestamp).toLocaleString('pt-BR')) : 'Agora'}
                        </div>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.comment}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum comentário encontrado para esta entrega.</p>
                  </div>
                )}
              </div>
              
              <div className="border-t-2 border-gray-100 dark:border-gray-700 pt-4 flex gap-3">
                {canComment(viewCommentsModal.record) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setViewCommentsModal({ open: false, record: null });
                      setCommentModal({ open: true, record: viewCommentsModal.record });
                      setCommentText('');
                    }}
                    className="flex-1 py-3 px-5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Adicionar Comentário
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewCommentsModal({ open: false, record: null })}
                  className={`py-3 px-6 font-semibold rounded-lg border-2 transition-all duration-200 ${isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white' 
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  Fechar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toast Notification Popup */}
      <ToastNotification open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast({ ...toast, open: false })} />
      
      {/* Botão flutuante para Registros */}
      <motion.div
        onClick={() => navigate('/registros')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center text-white text-2xl z-50 border-2 border-white/20"
      >
        <Truck className="w-8 h-8" />
      </motion.div>

      {/* Modal de Visualização de Anexos */}
      <AnimatePresence>
        {viewAttachmentsModal.open && viewAttachmentsModal.record && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
            onClick={() => setViewAttachmentsModal({ open: false, record: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-[90vw] max-h-[90vh] overflow-auto relative shadow-2xl`}
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setViewAttachmentsModal({ open: false, record: null })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold z-10"
                title="Fechar"
              >
                ×
              </button>
              
              <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 text-center mb-6 flex items-center justify-center gap-2">
                <Paperclip className="w-7 h-7" />
                Anexos - {viewAttachmentsModal.record.client || viewAttachmentsModal.record.cliente}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
                {(viewAttachmentsModal.record.attachments || []).map((attachment, index) => (
                  <motion.div
                    key={`${attachment.file_name || attachment.original_name || index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    {attachment.file_url ? (
                      // Verificar se é uma imagem (base64 ou URL)
                      (attachment.file_url.startsWith('data:image') || 
                       (attachment.file_type && attachment.file_type.startsWith('image/')) ||
                       (attachment.original_name && /\.(jpe?g|png|gif|webp|bmp)$/i.test(attachment.original_name))) ? (
                        // Imagem
                        <>
                          <img 
                            src={attachment.file_url} 
                            alt={`Anexo ${index + 1}`}
                            className="max-w-full max-h-72 rounded-lg object-contain border border-gray-200 dark:border-gray-600"
                            onError={(e) => {
                              // Se a imagem não carregar, mostrar placeholder
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          {/* Placeholder para quando a imagem falhar */}
                          <div className="hidden items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Paperclip className="w-10 h-10 text-gray-400" />
                          </div>
                        </>
                      ) : (
                        // Placeholder para arquivos não imagem
                        <div className="flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Paperclip className="w-10 h-10 text-gray-400" />
                        </div>
                      )
                    ) : (
                      // Placeholder quando não há file_url
                      <div className="flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Paperclip className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 break-words">
                      {attachment.original_name || attachment.file_name || `Anexo ${index + 1}`}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {(viewAttachmentsModal.record.attachments || []).length === 0 && (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <Paperclip className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhum anexo disponível para este registro.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

export default Home;
