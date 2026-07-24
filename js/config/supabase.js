// js/config/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔑 SUBSTITUA PELAS SUAS CREDENCIAIS
// Vá em: https://app.supabase.com/project/_/settings/api
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para verificar autenticação
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
    }
}

// Função para verificar se é lojista
export async function isLojista() {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const { data, error } = await supabase
        .from('lojas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (error || !data) return false;
    return true;
}

// Função para logout
export async function logout() {
    try {
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Função para redirecionar se não estiver logado
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return user;
}
