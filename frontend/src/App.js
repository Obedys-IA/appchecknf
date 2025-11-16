import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import ProcessarPDFs from './pages/ProcessarPDFs';
import Registros from './pages/Registros';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import Configuracoes from './pages/Configuracoes';
import Unauthorized from './pages/Unauthorized';
import './App.css';
import './styles/theme.css';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Rotas protegidas */}
          {/* Dashboard - Acesso para administrador, gerencia e colaborador */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedTypes={['administrador', 'gerencia', 'colaborador']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Processar PDFs - Apenas administrador e colaborador */}
          <Route path="/processar" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador']}>
              <Layout>
                <ProcessarPDFs />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Registros - Acesso para administrador, gerencia e colaborador */}
          <Route path="/registros" element={
            <ProtectedRoute allowedTypes={['administrador', 'gerencia', 'colaborador']}>
              <Layout>
                <Registros />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Relatórios - Acesso para administrador, gerencia e colaborador */}
          <Route path="/relatorios" element={
            <ProtectedRoute allowedTypes={['administrador', 'gerencia', 'colaborador']}>
              <Layout>
                <Relatorios />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Gestão de Usuários - Apenas administrador */}
          <Route path="/usuarios" element={
            <ProtectedRoute allowedTypes={['administrador']}>
              <Layout>
                <Usuarios />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Perfil - Todos os tipos de usuário, incluindo novos/pendentes */}
          <Route path="/perfil" element={
            <ProtectedRoute allowedTypes={['administrador', 'gerencia', 'colaborador', 'fretista', 'novo']}>
              <Layout>
                <Perfil />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Configurações - Apenas administrador */}
          <Route path="/configuracoes" element={
            <ProtectedRoute allowedTypes={['administrador']}>
              <Layout>
                <Configuracoes />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Redirecionamento padrão */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
