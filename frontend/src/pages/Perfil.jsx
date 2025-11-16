import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Mail, Phone, Calendar, Save, Eye, EyeOff, Edit, Building, Lock, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveUsersCount, getRecentlyActiveUsers } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const Perfil = () => {
  const { userData, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [recentlyActiveUsers, setRecentlyActiveUsers] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    tipo: ''
  });
  const [senhaData, setSenhaData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        nome: userData.nome || '',
        email: userData.email || '',
        telefone: userData.telefone || '',
        empresa: userData.empresa || '',
        tipo: userData.tipo || ''
      });
    }
  }, [userData]);

  // Carregar dados de usuários ativos
  useEffect(() => {
    const loadActiveUsers = async () => {
      try {
        const [countResult, usersResult] = await Promise.all([
          getActiveUsersCount(),
          getRecentlyActiveUsers()
        ]);
        
        if (!countResult.error) {
          setActiveUsersCount(countResult.count);
        }
        
        if (!usersResult.error) {
          setRecentlyActiveUsers(usersResult.data);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários ativos:', error);
      }
    };

    loadActiveUsers();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadActiveUsers, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleSenhaChange = (campo, valor) => {
    setSenhaData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const salvarPerfil = async () => {
    setLoading(true);
    try {
      // Importar supabase
      const { updateUserData } = await import('../lib/supabase');
      
      // Atualizar dados no Supabase
      const result = await updateUserData(userData.id, formData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Atualizar o contexto de autenticação com os novos dados
      const updatedUserData = { ...userData, ...formData };
      
      // Atualizar o contexto de autenticação com os novos dados, se disponível
      if (typeof updateUser === 'function') {
        updateUser(updatedUserData);
      } else {
        console.log('Dados atualizados:', updatedUserData);
      }

      setEditMode(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const alterarSenha = async () => {
    if (senhaData.novaSenha !== senhaData.confirmarSenha) {
      alert('As senhas não coincidem');
      return;
    }

    if (senhaData.novaSenha.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Simular alteração de senha
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui você faria a chamada real para a API
      // const response = await fetch(`${API_URL}/usuario/senha`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     senhaAtual: senhaData.senhaAtual,
      //     novaSenha: senhaData.novaSenha
      //   })
      // });
      
      setSenhaData({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
      setShowChangePassword(false);
      alert('Senha alterada com sucesso!');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      alert('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicao = () => {
    if (userData) {
      setFormData({
        nome: userData.nome || '',
        email: userData.email || '',
        telefone: userData.telefone || '',
        empresa: userData.empresa || '',
        tipo: userData.tipo || ''
      });
    }
    setEditMode(false);
  };

  const getTipoUsuarioBadge = (tipo) => {
    const styles = {
      administrador: 'bg-purple-100 text-purple-800',
      gerencia: 'bg-blue-100 text-blue-800',
      colaborador: 'bg-green-100 text-green-800',
      fretista: 'bg-orange-100 text-orange-800',
      novo: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      administrador: 'Administrador',
      gerencia: 'Gerência',
      colaborador: 'Colaborador',
      fretista: 'Fretista',
      novo: 'Novo Usuário'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[tipo] || styles.novo}`}>
        {labels[tipo] || tipo}
      </span>
    );
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Carregando perfil...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
      <PageHeader
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais e segurança"
        icon={<User className="w-6 h-6" />}
      />
      {!editMode && userData?.tipo === 'administrador' && (
        <div className="flex justify-end">
          <Button onClick={() => setEditMode(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        </div>
      )}

      {/* Informações Básicas */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Gerencie suas informações pessoais e de contato
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{userData.nome}</h3>
              <p className="text-gray-600">{userData.email}</p>
              <div className="mt-2">
                {getTipoUsuarioBadge(userData.tipo)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nome Completo</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  disabled={!editMode || userData?.tipo !== 'administrador'}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!editMode || userData?.tipo !== 'administrador'}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Telefone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  disabled={!editMode || userData?.tipo !== 'administrador'}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Empresa</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  value={formData.empresa}
                  onChange={(e) => handleInputChange('empresa', e.target.value)}
                  disabled={!editMode || userData?.tipo !== 'administrador'}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo de Usuário</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <select
                  value={formData.tipo}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                  disabled={!editMode || userData?.tipo !== 'administrador'}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="administrador">Administrador</option>
                  <option value="gerencia">Gerência</option>
                  <option value="colaborador">Colaborador</option>
                  <option value="fretista">Fretista</option>
                  <option value="novo">Novo Usuário</option>
                </select>
              </div>
            </div>
          </div>

          {editMode && userData?.tipo === 'administrador' && (
            <div className="flex gap-2 pt-4">
              <Button onClick={salvarPerfil} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button variant="outline" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Gerencie sua senha e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {!showChangePassword ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Senha</h4>
                  <p className="text-sm text-gray-600">Última alteração: Não disponível</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowChangePassword(true)}
                >
                  Alterar Senha
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Senha Atual</label>
                <Input
                  type="password"
                  value={senhaData.senhaAtual}
                  onChange={(e) => handleSenhaChange('senhaAtual', e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nova Senha</label>
                <Input
                  type="password"
                  value={senhaData.novaSenha}
                  onChange={(e) => handleSenhaChange('novaSenha', e.target.value)}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                <Input
                  type="password"
                  value={senhaData.confirmarSenha}
                  onChange={(e) => handleSenhaChange('confirmarSenha', e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={alterarSenha} disabled={loading}>
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowChangePassword(false);
                    setSenhaData({
                      senhaAtual: '',
                      novaSenha: '',
                      confirmarSenha: ''
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações da Conta */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo de Usuário</label>
              <div className="mt-1">
                {getTipoUsuarioBadge(userData.tipo)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status da Conta</label>
              <div className="mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userData.status === 'ativo' ? 'bg-green-100 text-green-800' :
                  userData.status === 'inativo' ? 'bg-red-100 text-red-800' :
                  userData.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {userData.status === 'ativo' ? 'Ativa' :
                   userData.status === 'inativo' ? 'Inativa' :
                   userData.status === 'pendente' ? 'Pendente' :
                   userData.status || 'Desconhecido'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Registro</label>
              <p className="mt-1 text-gray-600">
                {userData.created_at ? 
                  new Date(userData.created_at).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : 
                  'Não disponível'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Último Acesso</label>
              <p className="mt-1 text-gray-600">
                {userData.last_sign_in_at ? 
                  new Date(userData.last_sign_in_at).toLocaleString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 
                  'Nunca'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usuários Logados Simultaneamente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários Logados Simultaneamente
          </CardTitle>
          <CardDescription>
            Usuários ativos no sistema em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900">Total de Usuários Ativos</h4>
                <p className="text-sm text-blue-700">Logados nas últimas 24 horas</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {activeUsersCount}
              </div>
            </div>
            
            {recentlyActiveUsers.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Usuários Recentemente Ativos (últimas 2 horas)</h5>
                <div className="space-y-2">
                  {recentlyActiveUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.nome}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.tipo === 'administrador' ? 'bg-purple-100 text-purple-800' :
                          user.tipo === 'gerencia' ? 'bg-blue-100 text-blue-800' :
                          user.tipo === 'colaborador' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.tipo}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {user.last_sign_in_at ? 
                            new Date(user.last_sign_in_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {recentlyActiveUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum usuário ativo recentemente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Perfil;