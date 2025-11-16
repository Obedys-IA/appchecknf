import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Settings, Database, Mail, FileText, Save, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSystemStats, createBackup, exportEmitentesToSupabase, exportClientesToSupabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader.jsx';

const Configuracoes = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    storageUsed: 0,
    storageLimit: 0
  });
  const [configuracoes, setConfiguracoes] = useState({
    // Configurações gerais
    nomeEmpresa: 'Minha Empresa Ltda',
    emailNotificacoes: 'admin@empresa.com',
    telefoneContato: '11999887766',
    
    // Configurações de processamento
    formatoArquivo: 'excel',
    incluirCabecalho: true,
    separarPorFretista: false,
    
    // Configurações de notificação
    notificarProcessamento: true,
    notificarErros: true,
    notificarNovoUsuario: true,
    
    // Configurações de backup
    backupAutomatico: true,
    frequenciaBackup: 'diario',
    manterBackups: 30
  });

  useEffect(() => {
    const loadSystemStats = async () => {
      try {
        const stats = await getSystemStats();
        setSystemStats(stats);
      } catch (error) {
        console.error('Erro ao carregar estatísticas do sistema:', error);
      }
    };

    loadSystemStats();
  }, []);

  const handleConfigChange = (campo, valor) => {
    setConfiguracoes(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const salvarConfiguracoes = async () => {
    setLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui você faria a chamada real para a API
      // const response = await fetch(`${API_URL}/configuracoes`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(configuracoes)
      // });
      
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const importarEmitentes = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Simular importação
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Arquivo de emitentes importado com sucesso!');
    } catch (error) {
      console.error('Erro ao importar emitentes:', error);
      alert('Erro ao importar arquivo de emitentes');
    } finally {
      setLoading(false);
    }
  };

  const importarClientes = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Simular importação
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Arquivo de clientes importado com sucesso!');
    } catch (error) {
      console.error('Erro ao importar clientes:', error);
      alert('Erro ao importar arquivo de clientes');
    } finally {
      setLoading(false);
    }
  };

  const exportarDados = async () => {
    setLoading(true);
    try {
      const result = await exportEmitentesToSupabase();
      if (result.success) {
        const clientesResult = await exportClientesToSupabase();
        if (clientesResult.success) {
          alert(`Dados exportados com sucesso! Emitentes: ${result.count}, Clientes: ${clientesResult.count}`);
        } else {
          throw new Error(clientesResult.error || 'Erro ao exportar clientes');
        }
      } else {
        throw new Error(result.error || 'Erro ao exportar emitentes');
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      alert('Erro ao exportar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const limparCache = async () => {
    if (!window.confirm('Tem certeza que deseja limpar o cache? Esta ação pode afetar a performance temporariamente.')) {
      return;
    }

    setLoading(true);
    try {
      // Simular limpeza de cache
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Cache limpo com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Erro ao limpar cache');
    } finally {
      setLoading(false);
    }
  };

  const realizarBackup = async () => {
    if (!window.confirm('Deseja criar um backup manual dos dados do sistema?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await createBackup();
      if (result.success) {
        alert(`Backup criado com sucesso! Arquivo: ${result.filename}`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      alert('Erro ao criar backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar permissões (normalizar tipo para minúsculas)
  const tipo = (userData?.tipo || '').toLowerCase();
  const isAdmin = tipo === 'administrador';
  const isGerencia = tipo === 'gerencia';
  const canManageSystem = isAdmin || isGerencia;

  if (!canManageSystem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Acesso Negado</h2>
          <p className="text-gray-500">Você não tem permissão para acessar as configurações do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Ajuste preferências, processamento e integrações"
        icon={<Settings className="w-6 h-6 text-green-600" />}
        className="bg-white/80 backdrop-blur-sm"
      />
      <div className="flex justify-end">
        <Button onClick={salvarConfiguracoes} disabled={loading} className="btn btn-green">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Configurações Gerais */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Configurações básicas da empresa e sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nome da Empresa</label>
              <Input
                value={configuracoes.nomeEmpresa}
                onChange={(e) => handleConfigChange('nomeEmpresa', e.target.value)}
                placeholder="Nome da sua empresa"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email para Notificações</label>
              <Input
                type="email"
                value={configuracoes.emailNotificacoes}
                onChange={(e) => handleConfigChange('emailNotificacoes', e.target.value)}
                placeholder="admin@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Telefone de Contato</label>
              <Input
                value={configuracoes.telefoneContato}
                onChange={(e) => handleConfigChange('telefoneContato', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Processamento */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Processamento de PDFs
          </CardTitle>
          <CardDescription>
            Configure como os PDFs são processados e exportados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Formato de Exportação Padrão</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={configuracoes.formatoArquivo}
                onChange={(e) => handleConfigChange('formatoArquivo', e.target.value)}
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="json">JSON (.json)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="incluirCabecalho"
                checked={configuracoes.incluirCabecalho}
                onChange={(e) => handleConfigChange('incluirCabecalho', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="incluirCabecalho" className="text-sm font-medium text-gray-700">
                Incluir cabeçalho nos arquivos exportados
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="separarPorFretista"
                checked={configuracoes.separarPorFretista}
                onChange={(e) => handleConfigChange('separarPorFretista', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="separarPorFretista" className="text-sm font-medium text-gray-700">
                Separar arquivos por fretista automaticamente
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Notificação */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure quando e como receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notificarProcessamento"
              checked={configuracoes.notificarProcessamento}
              onChange={(e) => handleConfigChange('notificarProcessamento', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="notificarProcessamento" className="text-sm font-medium text-gray-700">
              Notificar quando o processamento de PDFs for concluído
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notificarErros"
              checked={configuracoes.notificarErros}
              onChange={(e) => handleConfigChange('notificarErros', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="notificarErros" className="text-sm font-medium text-gray-700">
              Notificar quando ocorrerem erros no sistema
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notificarNovoUsuario"
              checked={configuracoes.notificarNovoUsuario}
              onChange={(e) => handleConfigChange('notificarNovoUsuario', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="notificarNovoUsuario" className="text-sm font-medium text-gray-700">
              Notificar quando novos usuários se registrarem
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Dados */}
      {isAdmin && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Gerenciamento de Dados
            </CardTitle>
            <CardDescription>
              Importe e exporte dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Importar Emitentes</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json,.csv,.xlsx"
                    onChange={importarEmitentes}
                    className="hidden"
                    id="importar-emitentes"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('importar-emitentes').click()}
                    disabled={loading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Formatos aceitos: JSON, CSV, Excel</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Importar Clientes</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json,.csv,.xlsx"
                    onChange={importarClientes}
                    className="hidden"
                    id="importar-clientes"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('importar-clientes').click()}
                    disabled={loading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Formatos aceitos: JSON, CSV, Excel</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={exportarDados} disabled={loading}>
                Exportar Todos os Dados
              </Button>
              <Button variant="outline" onClick={limparCache} disabled={loading}>
                Limpar Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurações de Backup (apenas para Admin) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Backup e Segurança</CardTitle>
            <CardDescription>
              Configure backups automáticos e políticas de retenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="backupAutomatico"
                checked={configuracoes.backupAutomatico}
                onChange={(e) => handleConfigChange('backupAutomatico', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="backupAutomatico" className="text-sm font-medium text-gray-700">
                Ativar backup automático
              </label>
            </div>

            {configuracoes.backupAutomatico && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Frequência do Backup</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={configuracoes.frequenciaBackup}
                    onChange={(e) => handleConfigChange('frequenciaBackup', e.target.value)}
                  >
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Manter Backups (dias)</label>
                  <Input
                    type="number"
                    value={configuracoes.manterBackups}
                    onChange={(e) => handleConfigChange('manterBackups', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={realizarBackup}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Database className="w-4 h-4 mr-2" />
                Criar Backup Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Versão do Sistema</label>
              <p className="mt-1 text-gray-600">v1.0.0</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Última Atualização</label>
              <p className="mt-1 text-gray-600">20 de Janeiro, 2024</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Espaço em Disco Usado</label>
              <p className="mt-1 text-gray-600">
                {(systemStats.storageUsed / (1024 * 1024)).toFixed(2)} MB / {(systemStats.storageLimit / (1024 * 1024 * 1024)).toFixed(1)} GB
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Usuários Ativos</label>
              <p className="mt-1 text-gray-600">{systemStats.totalUsers} usuários</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;