-- Script para corrigir a recursão infinita nas políticas RLS da tabela usuarios
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- REMOVER POLÍTICAS EXISTENTES
-- ========================================

-- Remover todas as políticas existentes da tabela usuarios
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON usuarios;

-- ========================================
-- CRIAR NOVAS POLÍTICAS SEM RECURSÃO
-- ========================================

-- 1. Policy SELECT para tabela usuarios (sem recursão)
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT USING (
        -- Permitir que qualquer usuário autenticado veja seus próprios dados
        auth.uid() = id
        OR
        -- Permitir que administradores vejam todos os usuários
        -- Usando uma abordagem sem recursão: verificar diretamente no auth.jwt()
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
        OR
        -- Fallback: permitir acesso se o usuário tem role de service_role
        auth.role() = 'service_role'
    );

-- 2. Policy INSERT para tabela usuarios (sem recursão)
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT WITH CHECK (
        -- Permitir auto-inserção durante registro
        auth.uid() = id
        OR
        -- Permitir que administradores insiram usuários
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
        OR
        -- Permitir inserção via service_role
        auth.role() = 'service_role'
    );

-- 3. Policy UPDATE para tabela usuarios (sem recursão)
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE USING (
        -- Permitir que usuários alterem seus próprios dados
        auth.uid() = id
        OR
        -- Permitir que administradores alterem qualquer usuário
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
        OR
        -- Permitir alteração via service_role
        auth.role() = 'service_role'
    );

-- 4. Policy DELETE para tabela usuarios (sem recursão)
CREATE POLICY "usuarios_delete_policy" ON usuarios
    FOR DELETE USING (
        -- Apenas administradores podem excluir usuários
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'administrador')
        OR
        -- Permitir exclusão via service_role
        auth.role() = 'service_role'
    );

-- ========================================
-- VERIFICAÇÃO DAS POLÍTICAS CRIADAS
-- ========================================

-- Verificar as políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;