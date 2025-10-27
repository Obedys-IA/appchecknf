import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Mail, Phone, Calendar, Save, Eye, EyeOff, Edit, Building, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Perfil = () => {
  const { userData, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: ''
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
        empresa: userData.empresa || ''
      });
    }
  }, [userData]);

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
      // Simular atualização do perfil
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui você faria a chamada real para a API
      // const response = await fetch(`${API_URL}/usuario/perfil`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      // Simular sucesso
      if (updateUser) {
        updateUser({ ...user, ...formData });
      }
      
      setEditMode(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil');
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
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
        empresa: user.empresa || ''
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

  if (!user) {
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        {!editMode && (
          <Button onClick={() => setEditMode(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        )}
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Gerencie suas informações pessoais e de contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  disabled={!editMode}
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
                  disabled={!editMode}
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
                  disabled={!editMode}
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
                  disabled={!editMode}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {editMode && (
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Gerencie sua senha e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
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
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Ativa
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Registro</label>
              <p className="mt-1 text-gray-600">15 de Janeiro, 2024</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Último Acesso</label>
              <p className="mt-1 text-gray-600">Hoje às 14:30</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Perfil;