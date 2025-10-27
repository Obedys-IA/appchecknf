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

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Rotas protegidas */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador', 'gerencia']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/processar" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador']}>
              <Layout>
                <ProcessarPDFs />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/registros" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador', 'gerencia']}>
              <Layout>
                <Registros />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/relatorios" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador', 'gerencia']}>
              <Layout>
                <Relatorios />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/usuarios" element={
            <ProtectedRoute allowedTypes={['administrador']}>
              <Layout>
                <Usuarios />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/perfil" element={
            <ProtectedRoute allowedTypes={['administrador', 'colaborador', 'fretista', 'gerencia']}>
              <Layout>
                <Perfil />
              </Layout>
            </ProtectedRoute>
          } />
          
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
      </AuthProvider>
    </Router>
  );
}

export default App;
