-- Script para recriar a tabela USUARIOS no Supabase
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- REMOVER TABELA EXISTENTE (SE EXISTIR)
-- ========================================

-- Remover políticas RLS existentes
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON usuarios;

-- Remover tabela existente
DROP TABLE IF EXISTS usuarios CASCADE;

-- ========================================
-- CRIAR TABELA USUARIOS
-- ========================================

CREATE TABLE usuarios (
    -- Chave primária (UUID do Supabase Auth)
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    
    -- Dados básicos do usuário
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    empresa VARCHAR(255),
    
    -- Tipo de usuário (administrador, gerencia, colaborador, fretista, novo)
    tipo VARCHAR(50) NOT NULL DEFAULT 'novo' CHECK (tipo IN ('administrador', 'gerencia', 'colaborador', 'fretista', 'novo')),
    
    -- Status do usuário (ativo, inativo, pendente, bloqueado)
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo', 'inativo', 'pendente', 'bloqueado')),
    
    -- Controle de datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ultimo_acesso TIMESTAMPTZ,
    
    -- Dados adicionais
    observacoes TEXT,
    
    -- Índices para melhor performance
    CONSTRAINT usuarios_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ========================================
-- CRIAR ÍNDICES
-- ========================================

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_usuarios_status ON usuarios(status);
CREATE INDEX idx_usuarios_created_at ON usuarios(created_at);

-- ========================================
-- CRIAR TRIGGER PARA UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- HABILITAR RLS
-- ========================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CRIAR POLÍTICAS RLS SEM RECURSÃO
-- ========================================

-- 1. Policy SELECT - Usuários podem ver seus próprios dados, admins veem todos
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT USING (
        -- Usuário pode ver seus próprios dados
        auth.uid() = id
        OR
        -- Service role pode ver todos
        auth.role() = 'service_role'
        OR
        -- Administradores podem ver todos (usando metadata do JWT)
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
    );

-- 2. Policy INSERT - Permitir auto-inserção e inserção por admins
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT WITH CHECK (
        -- Permitir auto-inserção durante registro
        auth.uid() = id
        OR
        -- Service role pode inserir
        auth.role() = 'service_role'
        OR
        -- Administradores podem inserir usuários
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
    );

-- 3. Policy UPDATE - Usuários podem alterar seus dados, admins alteram qualquer um
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE USING (
        -- Usuário pode alterar seus próprios dados
        auth.uid() = id
        OR
        -- Service role pode alterar
        auth.role() = 'service_role'
        OR
        -- Administradores podem alterar qualquer usuário
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
    );

-- 4. Policy DELETE - Apenas admins podem excluir
CREATE POLICY "usuarios_delete_policy" ON usuarios
    FOR DELETE USING (
        -- Service role pode excluir
        auth.role() = 'service_role'
        OR
        -- Apenas administradores podem excluir usuários
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
    );

-- ========================================
-- INSERIR USUÁRIO ADMINISTRADOR PADRÃO
-- ========================================

-- Comentário: Descomente e ajuste os dados abaixo para criar um usuário administrador inicial
-- Substitua 'seu-uuid-aqui' pelo UUID do usuário que deve ser administrador
-- Substitua 'admin@empresa.com' pelo email do administrador

/*
INSERT INTO usuarios (id, email, nome, tipo, status, empresa) 
VALUES (
    'seu-uuid-aqui'::UUID,
    'admin@empresa.com',
    'Administrador do Sistema',
    'administrador',
    'ativo',
    'Sua Empresa'
) ON CONFLICT (id) DO UPDATE SET
    tipo = 'administrador',
    status = 'ativo',
    updated_at = NOW();
*/

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;

-- Verificar políticas RLS criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;