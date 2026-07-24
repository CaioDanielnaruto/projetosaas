// js/services/profissional.js
import { supabase } from '../config/supabase.js';

// Buscar profissionais da loja
export async function buscarProfissionais(lojaId) {
    try {
        const { data, error } = await supabase
            .from('profissionais')
            .select('*')
            .eq('loja_id', lojaId)
            .eq('ativo', true)
            .order('nome');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        throw error;
    }
}

// Criar profissional
export async function criarProfissional(dados) {
    try {
        const { data, error } = await supabase
            .from('profissionais')
            .insert([{
                ...dados,
                criado_em: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            profissional: data
        };
    } catch (error) {
        console.error('Erro ao criar profissional:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Atualizar profissional
export async function atualizarProfissional(id, dados) {
    try {
        const { data, error } = await supabase
            .from('profissionais')
            .update(dados)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            profissional: data
        };
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Desativar profissional
export async function desativarProfissional(id) {
    try {
        const { data, error } = await supabase
            .from('profissionais')
            .update({ ativo: false })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            profissional: data
        };
    } catch (error) {
        console.error('Erro ao desativar profissional:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
