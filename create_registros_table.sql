-- Script para recriar a tabela REGISTROS no Supabase
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- REMOVER TABELA EXISTENTE (SE EXISTIR)
-- ========================================

-- Remover políticas RLS existentes
DROP POLICY IF EXISTS "registros_select_policy" ON registros;
DROP POLICY IF EXISTS "registros_insert_policy" ON registros;
DROP POLICY IF EXISTS "registros_update_policy" ON registros;
DROP POLICY IF EXISTS "registros_delete_policy" ON registros;

-- Remover tabela existente
DROP TABLE IF EXISTS registros CASCADE;

-- ========================================
-- CRIAR TABELA REGISTROS
-- ========================================

CREATE TABLE registros (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação do usuário e empresa
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    empresa_id UUID,
    
    -- Dados da nota fiscal
    numero_nf VARCHAR(50) NOT NULL,
    serie_nf VARCHAR(10),
    data_emissao DATE NOT NULL,
    hora_emissao TIME,
    data_vencimento DATE,
    valor_total DECIMAL(15,2) NOT NULL,
    
    -- Dados do destinatário/cliente
    cnpj_cpf_destinatario VARCHAR(20) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    endereco_destinatario TEXT,
    
    -- Dados comerciais
    vendedor VARCHAR(255),
    rede VARCHAR(255),
    
    -- Dados de transporte
    placa VARCHAR(10) NOT NULL,
    fretista VARCHAR(255) NOT NULL,
    hora_saida TIME,
    data_entrega DATE,
    
    -- Dados fiscais
    cfop VARCHAR(10),
    natureza_operacao VARCHAR(255),
    uf VARCHAR(2),
    
    -- Dados do emitente
    cnpj_emitente VARCHAR(20),
    razao_social_emitente VARCHAR(255),
    nome_fantasia_emitente VARCHAR(255),
    
    -- Status e controle
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PROCESSADO', 'ENTREGUE', 'CANCELADO')),
    situacao VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (situacao IN ('ATIVO', 'INATIVO', 'ARQUIVADO')),
    
    -- Observações
    observacoes TEXT,
    
    -- Controle de datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos adicionais para compatibilidade com o frontend
    numero VARCHAR(50) GENERATED ALWAYS AS (numero_nf) STORED, -- Alias para numero_nf
    emitente VARCHAR(255) GENERATED ALWAYS AS (COALESCE(nome_fantasia_emitente, razao_social_emitente)) STORED,
    valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_total) STORED, -- Alias para valor_total
    dataEmissao DATE GENERATED ALWAYS AS (data_emissao) STORED, -- Alias para data_emissao
    dataVencimento DATE GENERATED ALWAYS AS (data_vencimento) STORED, -- Alias para data_vencimento
    
    -- Constraints
    CONSTRAINT registros_valor_positivo CHECK (valor_total > 0),
    CONSTRAINT registros_data_valida CHECK (data_emissao <= COALESCE(data_vencimento, data_emissao + INTERVAL '365 days')),
    CONSTRAINT registros_cnpj_cpf_valido CHECK (LENGTH(cnpj_cpf_destinatario) >= 11)
);

-- ========================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX idx_registros_usuario_id ON registros(usuario_id);
CREATE INDEX idx_registros_numero_nf ON registros(numero_nf);
CREATE INDEX idx_registros_data_emissao ON registros(data_emissao);
CREATE INDEX idx_registros_cnpj_cpf ON registros(cnpj_cpf_destinatario);
CREATE INDEX idx_registros_razao_social ON registros(razao_social);
CREATE INDEX idx_registros_placa ON registros(placa);
CREATE INDEX idx_registros_fretista ON registros(fretista);
CREATE INDEX idx_registros_status ON registros(status);
CREATE INDEX idx_registros_situacao ON registros(situacao);
CREATE INDEX idx_registros_created_at ON registros(created_at);
CREATE INDEX idx_registros_uf ON registros(uf);

-- Índice composto para buscas frequentes
CREATE INDEX idx_registros_busca ON registros(numero_nf, razao_social, fretista, placa);
CREATE INDEX idx_registros_periodo ON registros(data_emissao, status);

-- ========================================
-- CRIAR TRIGGER PARA UPDATED_AT
-- ========================================

CREATE TRIGGER update_registros_updated_at 
    BEFORE UPDATE ON registros 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- HABILITAR RLS
-- ========================================

ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CRIAR POLÍTICAS RLS SEM RECURSÃO
-- ========================================

-- 1. Policy SELECT - Baseada no tipo de usuário
CREATE POLICY "registros_select_policy" ON registros
    FOR SELECT USING (
        -- Service role pode ver todos
        auth.role() = 'service_role'
        OR
        -- Administrador, Colaborador, Gerencia podem ver todos os registros
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' IN ('administrador', 'colaborador', 'gerencia'))
        OR
        -- Fretista pode ver apenas seus próprios registros
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' = 'fretista' AND usuario_id = auth.uid())
    );

-- 2. Policy INSERT - Apenas admins e colaboradores podem inserir
CREATE POLICY "registros_insert_policy" ON registros
    FOR INSERT WITH CHECK (
        -- Service role pode inserir
        auth.role() = 'service_role'
        OR
        -- Administrador e Colaborador podem incluir registros
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' IN ('administrador', 'colaborador'))
    );

-- 3. Policy UPDATE - Apenas admins e colaboradores podem alterar
CREATE POLICY "registros_update_policy" ON registros
    FOR UPDATE USING (
        -- Service role pode alterar
        auth.role() = 'service_role'
        OR
        -- Administrador e Colaborador podem alterar qualquer registro
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' IN ('administrador', 'colaborador'))
    );

-- 4. Policy DELETE - Apenas admins e colaboradores podem excluir
CREATE POLICY "registros_delete_policy" ON registros
    FOR DELETE USING (
        -- Service role pode excluir
        auth.role() = 'service_role'
        OR
        -- Administrador e Colaborador podem excluir qualquer registro
        (auth.jwt() ->> 'user_metadata' ->> 'tipo' IN ('administrador', 'colaborador'))
    );

-- ========================================
-- CRIAR VIEWS PARA FACILITAR CONSULTAS
-- ========================================

-- View para relatórios com dados consolidados
CREATE OR REPLACE VIEW vw_registros_relatorio AS
SELECT 
    r.id,
    r.numero_nf as numeroNF,
    r.data_emissao as dataEmissao,
    r.valor_total as valorTotal,
    r.razao_social as razaoSocial,
    r.placa,
    r.fretista,
    r.uf,
    r.status,
    r.created_at,
    u.nome as usuario_nome,
    u.email as usuario_email
FROM registros r
LEFT JOIN usuarios u ON r.usuario_id = u.id
WHERE r.situacao = 'ATIVO';

-- View para dashboard com estatísticas
CREATE OR REPLACE VIEW vw_registros_dashboard AS
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'PENDENTE' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'PROCESSADO' THEN 1 END) as processados,
    COUNT(CASE WHEN status = 'ENTREGUE' THEN 1 END) as entregues,
    SUM(valor_total) as valor_total,
    COUNT(DISTINCT fretista) as total_fretistas,
    COUNT(DISTINCT placa) as total_placas
FROM registros 
WHERE situacao = 'ATIVO' 
AND data_emissao >= CURRENT_DATE - INTERVAL '30 days';

-- ========================================
-- INSERIR DADOS DE EXEMPLO (OPCIONAL)
-- ========================================

-- Comentário: Descomente as linhas abaixo para inserir alguns registros de exemplo
/*
INSERT INTO registros (
    numero_nf, data_emissao, valor_total, cnpj_cpf_destinatario, 
    razao_social, placa, fretista, uf, status
) VALUES 
(
    '000001', 
    CURRENT_DATE, 
    1500.00, 
    '12345678901234', 
    'Empresa Exemplo LTDA', 
    'ABC1234', 
    'João Silva', 
    'SP', 
    'PENDENTE'
),
(
    '000002', 
    CURRENT_DATE - 1, 
    2300.50, 
    '98765432109876', 
    'Comércio Teste S/A', 
    'XYZ5678', 
    'Maria Santos', 
    'RJ', 
    'PROCESSADO'
);
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
WHERE table_name = 'registros' 
ORDER BY ordinal_position;

-- Verificar políticas RLS criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'registros'
ORDER BY policyname;

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'registros'
ORDER BY indexname;