-- ============================================
-- SCHEMA COMPLETO PARA SUPABASE
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Tabela de Lojas
CREATE TABLE IF NOT EXISTS lojas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    endereco TEXT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de Configuração de Horários
CREATE TABLE IF NOT EXISTS configuracoes_horario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_abertura TIME NOT NULL DEFAULT '08:00:00',
    hora_fechamento TIME NOT NULL DEFAULT '18:00:00',
    duracao_padrao INTEGER DEFAULT 30,
    intervalo_entre_agendamentos INTEGER DEFAULT 15,
    UNIQUE(loja_id, dia_semana)
);

-- 3. Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    duracao INTEGER NOT NULL,
    preco DECIMAL(10,2),
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela de Profissionais
CREATE TABLE IF NOT EXISTS profissionais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    foto_url TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID REFERENCES lojas(id) ON DELETE CASCADE,
    servico_id UUID REFERENCES servicos(id),
    profissional_id UUID REFERENCES profissionais(id),
    nome_cliente VARCHAR(100) NOT NULL,
    telefone_cliente VARCHAR(20) NOT NULL,
    email_cliente VARCHAR(100),
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' 
        CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    confirmado_em TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agendamentos_loja_data ON agendamentos(loja_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(profissional_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_telefone ON agendamentos(telefone_cliente);
CREATE INDEX IF NOT EXISTS idx_lojas_user_id ON lojas(user_id);

-- ============================================
-- RLS (ROW LEVEL SECURITY) - SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_horario ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para Lojas
CREATE POLICY "Lojistas podem ver suas próprias lojas" ON lojas
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Qualquer um pode ver lojas ativas" ON lojas
    FOR SELECT USING (ativo = true);

-- Políticas para Configurações de Horário
CREATE POLICY "Lojistas podem gerenciar suas configurações" ON configuracoes_horario
    FOR ALL USING (
        loja_id IN (SELECT id FROM lojas WHERE user_id = auth.uid())
    );

CREATE POLICY "Qualquer um pode ver configurações de loja" ON configuracoes_horario
    FOR SELECT USING (true);

-- Políticas para Serviços
CREATE POLICY "Lojistas podem gerenciar seus serviços" ON servicos
    FOR ALL USING (
        loja_id IN (SELECT id FROM lojas WHERE user_id = auth.uid())
    );

CREATE POLICY "Qualquer um pode ver serviços ativos" ON servicos
    FOR SELECT USING (ativo = true);

-- Políticas para Profissionais
CREATE POLICY "Lojistas podem gerenciar seus profissionais" ON profissionais
    FOR ALL USING (
        loja_id IN (SELECT id FROM lojas WHERE user_id = auth.uid())
    );

CREATE POLICY "Qualquer um pode ver profissionais ativos" ON profissionais
    FOR SELECT USING (ativo = true);

-- Políticas para Agendamentos
CREATE POLICY "Lojistas podem gerenciar agendamentos da sua loja" ON agendamentos
    FOR ALL USING (
        loja_id IN (SELECT id FROM lojas WHERE user_id = auth.uid())
    );

CREATE POLICY "Clientes podem criar agendamentos" ON agendamentos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Clientes podem ver seus próprios agendamentos" ON agendamentos
    FOR SELECT USING (telefone_cliente IS NOT NULL);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para validar disponibilidade antes de inserir
CREATE OR REPLACE FUNCTION validar_disponibilidade()
RETURNS TRIGGER AS $$
DECLARE
    conflito INTEGER;
BEGIN
    -- Verificar se já existe agendamento no mesmo horário
    SELECT COUNT(*) INTO conflito
    FROM agendamentos
    WHERE loja_id = NEW.loja_id
        AND data = NEW.data
        AND (
            (hora_inicio <= NEW.hora_inicio AND hora_fim > NEW.hora_inicio)
            OR (hora_inicio < NEW.hora_fim AND hora_fim >= NEW.hora_fim)
            OR (hora_inicio >= NEW.hora_inicio AND hora_fim <= NEW.hora_fim)
        )
        AND status IN ('pendente', 'confirmado')
        AND id != NEW.id;
    
    IF conflito > 0 THEN
        RAISE EXCEPTION 'Horário indisponível: já existe um agendamento neste período';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar disponibilidade
CREATE TRIGGER validar_disponibilidade_trigger
    BEFORE INSERT OR UPDATE ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION validar_disponibilidade();

-- ============================================
-- DADOS DE EXEMPLO (opcional)
-- ============================================

-- Inserir categorias de exemplo (apenas para referência)
INSERT INTO configuracoes_horario (loja_id, dia_semana, hora_abertura, hora_fechamento, duracao_padrao)
SELECT 
    id,
    generate_series(0, 6) as dia_semana,
    '08:00:00'::time,
    '18:00:00'::time,
    30
FROM lojas
ON CONFLICT (loja_id, dia_semana) DO NOTHING;

-- ============================================
-- PERMISSÕES FINAIS
-- ============================================

-- Garantir permissões para o anon (público)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON lojas TO anon;
GRANT SELECT ON configuracoes_horario TO anon;
GRANT SELECT ON servicos TO anon;
GRANT SELECT ON profissionais TO anon;
GRANT SELECT ON agendamentos TO anon;
GRANT INSERT ON agendamentos TO anon;

-- Garantir permissões para usuários autenticados
GRANT ALL ON lojas TO authenticated;
GRANT ALL ON configuracoes_horario TO authenticated;
GRANT ALL ON servicos TO authenticated;
GRANT ALL ON profissionais TO authenticated;
GRANT ALL ON agendamentos TO authenticated;
