// js/services/loja.js
import { supabase } from '../config/supabase.js';

// Buscar dados da loja do usuário logado
export async function getMinhaLoja() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        const { data, error } = await supabase
            .from('lojas')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar loja:', error);
        throw error;
    }
}

// Buscar loja por ID (público)
export async function getLojaById(id) {
    try {
        const { data, error } = await supabase
            .from('lojas')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar loja:', error);
        throw error;
    }
}

// Buscar todas as lojas (página pública)
export async function buscarLojas(filtro = {}) {
    try {
        let query = supabase
            .from('lojas')
            .select('*')
            .eq('ativo', true);
        
        if (filtro.categoria) {
            query = query.eq('categoria', filtro.categoria);
        }
        
        if (filtro.nome) {
            query = query.ilike('nome', `%${filtro.nome}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar lojas:', error);
        throw error;
    }
}

// Atualizar dados da loja
export async function atualizarLoja(id, dados) {
    try {
        const { data, error } = await supabase
            .from('lojas')
            .update(dados)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao atualizar loja:', error);
        throw error;
    }
}

// Buscar configurações de horário
export async function getConfiguracoesHorario(lojaId) {
    try {
        const { data, error } = await supabase
            .from('configuracoes_horario')
            .select('*')
            .eq('loja_id', lojaId)
            .order('dia_semana');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        throw error;
    }
}

// Atualizar configurações de horário
export async function atualizarConfiguracaoHorario(id, dados) {
    try {
        const { data, error } = await supabase
            .from('configuracoes_horario')
            .update(dados)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        throw error;
    }
}
