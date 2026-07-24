// js/services/servico.js
import { supabase } from '../config/supabase.js';

// Buscar serviços da loja
export async function buscarServicos(lojaId) {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .eq('loja_id', lojaId)
            .eq('ativo', true)
            .order('nome');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        throw error;
    }
}

// Criar serviço
export async function criarServico(dados) {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .insert([{
                ...dados,
                criado_em: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            servico: data
        };
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Atualizar serviço
export async function atualizarServico(id, dados) {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .update(dados)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            servico: data
        };
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Desativar serviço
export async function desativarServico(id) {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .update({ ativo: false })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            servico: data
        };
    } catch (error) {
        console.error('Erro ao desativar serviço:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
