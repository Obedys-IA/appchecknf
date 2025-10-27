import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Search, Plus, Edit, Trash2, Eye, EyeOff, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Carregar usuários reais do Supabase
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/usuarios')
        if (response.ok) {
          const data = await response.json()
          setUsuarios(data)
        } else {
          console.error('Erro ao carregar usuários da API')
          setUsuarios([])
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        setUsuarios([])
      }
    }
    
    loadUsuarios()
  }, []);

  const tiposUsuario = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'gerencia', label: 'Gerência' },
    { value: 'colaborador', label: 'Colaborador' },
    { value: 'fretista', label: 'Fretista' },
    { value: 'novo', label: 'Novo Usuário' }
  ];

  const statusUsuario = [
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
    { value: 'pendente', label: 'Pendente Aprovação' },
    { value: 'bloqueado', label: 'Bloqueado' }
  ];

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = !filtros.busca || 
      usuario.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      usuario.email.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      usuario.empresa.toLowerCase().includes(filtros.busca.toLowerCase());

    const matchTipo = !filtros.tipo || usuario.tipo === filtros.tipo;
    const matchStatus = !filtros.status || usuario.status === filtros.status;

    return matchBusca && matchTipo && matchStatus;
  });

  const aprovarUsuario = async (userId) => {
    setLoading(true);
    try {
      // Simular aprovação
      setUsuarios(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, status: 'ativo', tipo: 'colaborador' }
          : u
      ));
      alert('Usuário aprovado com sucesso!');
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
      // Simular rejeição
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      alert('Usuário rejeitado e removido do sistema');
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
      setUsuarios(prev => prev.map(u => 
        u.id === editingUser.id ? editingUser : u
      ));
      setEditingUser(null);
      alert('Usuário atualizado com sucesso!');
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
    const styles = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-gray-100 text-gray-800',
      pendente: 'bg-yellow-100 text-yellow-800',
      bloqueado: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inativo}`}>
        {statusUsuario.find(s => s.value === status)?.label || status}
      </span>
    );
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      administrador: 'bg-purple-100 text-purple-800',
      gerencia: 'bg-blue-100 text-blue-800',
      colaborador: 'bg-green-100 text-green-800',
      fretista: 'bg-orange-100 text-orange-800',
      novo: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[tipo] || styles.novo}`}>
        {tiposUsuario.find(t => t.value === tipo)?.label || tipo}
      </span>
    );
  };

  // Verificar se o usuário atual tem permissão para gerenciar usuários
  if (user?.tipo !== 'administrador' && user?.tipo !== 'gerencia') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Acesso Negado</h2>
          <p className="text-gray-500">Você não tem permissão para gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
        <Button onClick={() => setShowNewUserForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {usuarios.filter(u => u.status === 'ativo').length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {usuarios.filter(u => u.status === 'pendente').length}
                </p>
              </div>
              <UserX className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fretistas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {usuarios.filter(u => u.tipo === 'fretista').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Buscar usuários..."
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                className="pl-10"
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={filtros.tipo}
              onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
            >
              <option value="">Todos os tipos</option>
              {tiposUsuario.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border rounded-md"
              value={filtros.status}
              onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Todos os status</option>
              {statusUsuario.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({usuariosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Empresa</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Registro</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{usuario.nome}</div>
                        <div className="text-sm text-gray-500">{usuario.telefone}</div>
                      </div>
                    </td>
                    <td className="p-3">{usuario.email}</td>
                    <td className="p-3">{usuario.empresa}</td>
                    <td className="p-3">{getTipoBadge(usuario.tipo)}</td>
                    <td className="p-3">{getStatusBadge(usuario.status)}</td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{usuario.dataRegistro}</div>
                        {usuario.ultimoAcesso && (
                          <div className="text-gray-500">Último: {usuario.ultimoAcesso}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {usuario.status === 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => aprovarUsuario(usuario.id)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejeitarUsuario(usuario.id)}
                              disabled={loading}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editarUsuario(usuario)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => excluirUsuario(usuario.id)}
                          className="text-red-600 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Usuário</h3>
            <div className="space-y-4">
              <Input
                placeholder="Nome"
                value={editingUser.nome}
                onChange={(e) => setEditingUser(prev => ({ ...prev, nome: e.target.value }))}
              />
              <Input
                placeholder="Email"
                value={editingUser.email}
                onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Telefone"
                value={editingUser.telefone}
                onChange={(e) => setEditingUser(prev => ({ ...prev, telefone: e.target.value }))}
              />
              <Input
                placeholder="Empresa"
                value={editingUser.empresa}
                onChange={(e) => setEditingUser(prev => ({ ...prev, empresa: e.target.value }))}
              />
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={editingUser.tipo}
                onChange={(e) => setEditingUser(prev => ({ ...prev, tipo: e.target.value }))}
              >
                {tiposUsuario.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={editingUser.status}
                onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
              >
                {statusUsuario.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={salvarEdicao} disabled={loading}>
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;