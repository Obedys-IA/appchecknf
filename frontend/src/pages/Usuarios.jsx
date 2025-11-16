import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  UserX, 
  UserCheck, 
  Shield,
  Crown,
  Briefcase,
  Truck,
  Clock,
  Mail,
  Phone,
  Building,
  Calendar,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus
 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { getSystemStats, getAllUsers, updateUser, deleteUser } from '../lib/supabase';

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    storageUsed: 0,
    storageLimit: 0
  });
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'
  const [sortBy, setSortBy] = useState('nome');
  const [sortOrder, setSortOrder] = useState('asc');

  // Carregar usuários reais do Supabase
  useEffect(() => {
    const loadUsuarios = async () => {
      setLoading(true);
      try {
        const { data, error } = await getAllUsers();
        if (error) {
          console.error('Erro ao carregar usuários:', error);
          setUsuarios([]);
        } else {
          setUsuarios(data);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setUsuarios([]);
      } finally {
        setLoading(false);
      }
    };

    const loadSystemStats = async () => {
      try {
        const stats = await getSystemStats();
        setSystemStats(stats);
      } catch (error) {
        console.error('Erro ao carregar estatísticas do sistema:', error);
      }
    };
    
    loadUsuarios();
    loadSystemStats();
  }, []);

  const tiposUsuario = [
    { value: 'administrador', label: 'Administrador', icon: Crown, color: 'bg-purple-500' },
    { value: 'gerencia', label: 'Gerência', icon: Shield, color: 'bg-blue-500' },
    { value: 'colaborador', label: 'Colaborador', icon: Briefcase, color: 'bg-green-500' },
    { value: 'fretista', label: 'Fretista', icon: Truck, color: 'bg-orange-500' },
    { value: 'novo', label: 'Novo Usuário', icon: UserPlus, color: 'bg-gray-500' }
  ];

  const statusUsuario = [
    { value: 'ativo', label: 'Ativo', icon: CheckCircle, color: 'bg-green-500' },
    { value: 'inativo', label: 'Inativo', icon: XCircle, color: 'bg-gray-500' },
    { value: 'pendente', label: 'Pendente Aprovação', icon: Clock, color: 'bg-yellow-500' },
    { value: 'bloqueado', label: 'Bloqueado', icon: AlertTriangle, color: 'bg-red-500' }
  ];

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = !filtros.busca || 
      usuario.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      usuario.email.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      usuario.empresa.toLowerCase().includes(filtros.busca.toLowerCase());

    const matchTipo = !filtros.tipo || usuario.tipo === filtros.tipo;
    const matchStatus = !filtros.status || usuario.status === filtros.status;

    return matchBusca && matchTipo && matchStatus;
  }).sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    
    if (sortOrder === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const aprovarUsuario = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await updateUser(userId, { 
        status: 'ativo', 
        tipo: 'colaborador' 
      });
      
      if (error) {
        console.error('Erro ao aprovar usuário:', error);
        alert('Erro ao aprovar usuário');
      } else {
        // Atualizar o estado local
        setUsuarios(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: 'ativo', tipo: 'colaborador' }
            : u
        ));
        alert('Usuário aprovado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      alert('Erro ao aprovar usuário');
    } finally {
      setLoading(false);
    }
  };

  const rejeitarUsuario = async (userId) => {
    if (!window.confirm('Tem certeza que deseja rejeitar este usuário?')) return;
    
    setLoading(true);
    try {
      const { success, error } = await deleteUser(userId);
      
      if (error) {
        console.error('Erro ao rejeitar usuário:', error);
        alert('Erro ao rejeitar usuário');
      } else {
        // Remover do estado local
        setUsuarios(prev => prev.filter(u => u.id !== userId));
        alert('Usuário rejeitado e removido do sistema');
      }
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      alert('Erro ao rejeitar usuário');
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = (usuario) => {
    setEditingUser({ ...usuario });
  };

  const salvarEdicao = async () => {
    setLoading(true);
    try {
      const { data, error } = await updateUser(editingUser.id, {
        nome: editingUser.nome,
        email: editingUser.email,
        telefone: editingUser.telefone,
        empresa: editingUser.empresa,
        tipo: editingUser.tipo,
        status: editingUser.status
      });
      
      if (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar usuário');
      } else {
        // Atualizar o estado local
        setUsuarios(prev => prev.map(u => 
          u.id === editingUser.id ? { ...editingUser, ...data } : u
        ));
        setEditingUser(null);
        alert('Usuário atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const excluirUsuario = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    
    setLoading(true);
    try {
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      alert('Usuário excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusInfo = statusUsuario.find(s => s.value === status);
    if (!statusInfo) return null;
    
    const Icon = statusInfo.icon;
    
    return (
      <Badge variant="secondary" className={`${statusInfo.color} text-white border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo) => {
    const tipoInfo = tiposUsuario.find(t => t.value === tipo);
    if (!tipoInfo) return null;
    
    const Icon = tipoInfo.icon;
    
    return (
      <Badge variant="outline" className={`${tipoInfo.color} text-white border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {tipoInfo.label}
      </Badge>
    );
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Verificar se o usuário atual tem permissão para gerenciar usuários
  if (user?.tipo !== 'administrador' && user?.tipo !== 'gerencia') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <UserX className="w-16 h-16 mx-auto text-red-400 mb-4" />
                  <h2 className="text-xl font-semibold text-red-600">Acesso Negado</h2>
                  <p className="text-red-500">Você não tem permissão para gerenciar usuários.</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
  <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Gestão de Usuários"
          subtitle="Gerencie usuários, permissões e acessos do sistema"
          icon={<Users className="w-6 h-6" />}
          className="bg-white/90"
        />
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowNewUserForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total de Usuários</p>
                  <p className="text-3xl font-bold">{systemStats.totalUsers}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Users className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Usuários Ativos</p>
                  <p className="text-3xl font-bold">
                    {usuarios.filter(u => u.status === 'ativo').length}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <UserCheck className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pendentes</p>
                  <p className="text-3xl font-bold">
                    {usuarios.filter(u => u.status === 'pendente').length}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Fretistas</p>
                  <p className="text-3xl font-bold">
                    {usuarios.filter(u => u.tipo === 'fretista').length}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Truck className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Controles */}
        <Card className="card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Filter className="w-5 h-5" />
                  Filtros e Controles
                </CardTitle>
                <CardDescription>
                  Filtre e organize os usuários conforme necessário
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="">Todos os tipos</option>
                {tiposUsuario.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                value={filtros.status}
                onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Todos os status</option>
                {statusUsuario.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <div className="text-sm text-gray-600 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {usuariosFiltrados.length} usuário(s) encontrado(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="text-gray-800">
              Usuários ({usuariosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="tabela-registros w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th 
                        className="text-left p-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('nome')}
                      >
                        <div className="flex items-center gap-2">
                          Nome
                          <ChevronDown className={`w-4 h-4 transition-transform ${sortBy === 'nome' && sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                        </div>
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Empresa</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Registro</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-900">{usuario.nome}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {usuario.telefone}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Mail className="w-3 h-3" />
                            {usuario.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Building className="w-3 h-3" />
                            {usuario.empresa}
                          </div>
                        </td>
                        <td className="p-4">{getTipoBadge(usuario.tipo)}</td>
                        <td className="p-4">{getStatusBadge(usuario.status)}</td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-700">
                              <Calendar className="w-3 h-3" />
                              {usuario.dataRegistro}
                            </div>
                            {usuario.ultimoAcesso && (
                              <div className="text-gray-500 text-xs mt-1">
                                Último: {usuario.ultimoAcesso}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {usuario.status === 'pendente' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => aprovarUsuario(usuario.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejeitarUsuario(usuario.id)}
                                  disabled={loading}
                                  className="text-red-600 hover:bg-red-50 border-red-200"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarUsuario(usuario)}
                              className="hover:bg-blue-50 border-blue-200"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => excluirUsuario(usuario.id)}
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usuariosFiltrados.map((usuario) => (
                  <Card key={usuario.id} className="card hover:shadow-lg transition-all duration-200 border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-gray-900">{usuario.nome}</CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {usuario.empresa}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {getTipoBadge(usuario.tipo)}
                          {getStatusBadge(usuario.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          {usuario.email}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          {usuario.telefone}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {usuario.dataRegistro}
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="flex gap-2">
                        {usuario.status === 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => aprovarUsuario(usuario.id)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejeitarUsuario(usuario.id)}
                              disabled={loading}
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {usuario.status !== 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarUsuario(usuario)}
                              className="hover:bg-blue-50 border-blue-200 flex-1"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => excluirUsuario(usuario.id)}
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Editar Usuário
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Atualize as informações do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Input
                    placeholder="Nome"
                    value={editingUser.nome}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, nome: e.target.value }))}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Input
                    placeholder="Email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Input
                    placeholder="Telefone"
                    value={editingUser.telefone}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, telefone: e.target.value }))}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Input
                    placeholder="Empresa"
                    value={editingUser.empresa}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, empresa: e.target.value }))}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={editingUser.tipo}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    {tiposUsuario.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    value={editingUser.status}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {statusUsuario.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={salvarEdicao} 
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-1"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingUser(null)}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Usuarios;