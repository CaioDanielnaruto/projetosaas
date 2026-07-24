// js/services/auth.js
import { supabase } from '../config/supabase.js';

// Login
export async function login(email, senha) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });
        
        if (error) throw error;
        
        // Verificar se o usuário tem uma loja cadastrada
        const { data: loja, error: lojaError } = await supabase
            .from('lojas')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();
        
        return {
            success: true,
            user: data.user,
            loja: loja || null
        };
    } catch (error) {
        console.error('Erro no login:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Cadastro de lojista (cria usuário e loja)
export async function cadastrarLojista(dados) {
    try {
        // 1. Criar usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: dados.email,
            password: dados.senha,
            options: {
                data: {
                    nome: dados.nome_loja,
                    tipo: 'lojista'
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Criar a loja no banco
        const { data: lojaData, error: lojaError } = await supabase
            .from('lojas')
            .insert([{
                user_id: authData.user.id,
                nome: dados.nome_loja,
                categoria: dados.categoria,
                endereco: dados.endereco,
                telefone: dados.telefone,
                email: dados.email,
                descricao: dados.descricao || ''
            }])
            .select()
            .single();
        
        if (lojaError) throw lojaError;
        
        // 3. Criar configuração de horários padrão
        const diasSemana = [0, 1, 2, 3, 4, 5, 6]; // Todos os dias
        const horariosPadrao = diasSemana.map(dia => ({
            loja_id: lojaData.id,
            dia_semana: dia,
            hora_abertura: '08:00:00',
            hora_fechamento: '18:00:00',
            duracao_padrao: 30,
            intervalo_entre_agendamentos: 15
        }));
        
        const { error: configError } = await supabase
            .from('configuracoes_horario')
            .insert(horariosPadrao);
        
        if (configError) throw configError;
        
        return {
            success: true,
            user: authData.user,
            loja: lojaData
        };
    } catch (error) {
        console.error('Erro no cadastro:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Logout
export async function logout() {
    try {
        await supabase.auth.signOut();
        return { success: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Recuperar senha
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5500/reset-password.html'
        });
        
        if (error) throw error;
        
        return {
            success: true,
            message: 'Email de recuperação enviado!'
        };
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        return {
            success: false,
            error: error.message
        };
    }
}