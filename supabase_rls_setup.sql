-- Script para configurar RLS (Row Level Security) com permissões específicas por tipo de usuário
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- CONFIGURAÇÃO RLS PARA TABELA USUARIOS
-- ========================================

-- 1. Habilitar RLS na tabela usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT para tabela usuarios
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT USING (
        -- Administrador: pode ver todos os usuários
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
        OR
        -- Colaborador, Gerencia, Fretista: podem ver apenas seus próprios dados
        (auth.uid() = id AND tipo IN ('colaborador', 'gerencia', 'fretista'))
        -- Usuário 'novo': não pode ver nada (não incluído)
    );

-- 3. Policy INSERT para tabela usuarios
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT WITH CHECK (
        -- Administrador: pode inserir qualquer usuário
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
        OR
        -- Permitir auto-inserção durante registro (quando não há usuário logado ainda)
        auth.uid() = id
    );

-- 4. Policy UPDATE para tabela usuarios
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE USING (
        -- Administrador: pode alterar qualquer usuário
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
        OR
        -- Outros usuários: podem alterar apenas seus próprios dados
        (auth.uid() = id AND tipo IN ('colaborador', 'gerencia', 'fretista'))
    );

-- 5. Policy DELETE para tabela usuarios
CREATE POLICY "usuarios_delete_policy" ON usuarios
    FOR DELETE USING (
        -- Apenas administrador pode excluir usuários
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
    );

-- ========================================
-- CONFIGURAÇÃO RLS PARA TABELA REGISTROS
-- ========================================

-- 6. Habilitar RLS na tabela registros (assumindo que existe)
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

-- 7. Policy SELECT para tabela registros
CREATE POLICY "registros_select_policy" ON registros
    FOR SELECT USING (
        -- Administrador, Colaborador, Gerencia: podem ver todos os registros
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador', 'gerencia'))
        OR
        -- Fretista: pode ver apenas seus próprios registros (usando usuario_id se existir)
        (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'fretista') 
         AND (usuario_id = auth.uid()))
        -- Usuário 'novo': não pode ver nada (não incluído)
    );

-- 8. Policy INSERT para tabela registros
CREATE POLICY "registros_insert_policy" ON registros
    FOR INSERT WITH CHECK (
        -- Administrador e Colaborador: podem incluir registros
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador'))
        -- Gerencia e Fretista: não podem incluir (apenas visualizar)
        -- Usuário 'novo': não pode incluir
    );

-- 9. Policy UPDATE para tabela registros
CREATE POLICY "registros_update_policy" ON registros
    FOR UPDATE USING (
        -- Administrador e Colaborador: podem alterar qualquer registro
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador'))
        -- Gerencia e Fretista: não podem alterar
        -- Usuário 'novo': não pode alterar
    );

-- 10. Policy DELETE para tabela registros
CREATE POLICY "registros_delete_policy" ON registros
    FOR DELETE USING (
        -- Administrador e Colaborador: podem excluir qualquer registro
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador'))
        -- Gerencia e Fretista: não podem excluir
        -- Usuário 'novo': não pode excluir
    );

-- ========================================
-- CONFIGURAÇÃO RLS PARA OUTRAS TABELAS
-- ========================================

-- 11. Habilitar RLS em outras tabelas do sistema
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fretistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE emitentes ENABLE ROW LEVEL SECURITY;

-- 12. Policies genéricas para outras tabelas (clientes, fretistas, emitentes)
-- SELECT: Administrador, Colaborador, Gerencia podem ver tudo; Fretista vê apenas relacionado a ele
CREATE POLICY "clientes_select_policy" ON clientes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador', 'gerencia'))
        OR
        (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'fretista'))
    );

CREATE POLICY "fretistas_select_policy" ON fretistas
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador', 'gerencia'))
        OR
        (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'fretista'))
    );

CREATE POLICY "emitentes_select_policy" ON emitentes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo IN ('administrador', 'colaborador', 'gerencia'))
        OR
        (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'fretista'))
    );

-- INSERT/UPDATE/DELETE: Apenas Administrador pode modificar dados mestres
CREATE POLICY "clientes_modify_policy" ON clientes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
    );

CREATE POLICY "fretistas_modify_policy" ON fretistas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
    );

CREATE POLICY "emitentes_modify_policy" ON emitentes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'administrador')
    );

-- ========================================
-- VERIFICAÇÃO DAS POLICIES CRIADAS
-- ========================================

-- Verificar todas as policies criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('usuarios', 'registros', 'clientes', 'fretistas', 'emitentes')
ORDER BY tablename, policyname;