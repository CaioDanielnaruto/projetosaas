// js/services/agendamento.js

import { supabase } from '../config/supabase.js';

// Buscar horários disponíveis
export async function buscarHorariosDisponiveis(lojaId, data, profissionalId = null, servicoId = null) {
    try {
        const diaSemana = new Date(data).getDay();
        
        // 1. Buscar configuração de horário da loja
        const { data: config, error: configError } = await supabase
            .from('configuracoes_horario')
            .select('*')
            .eq('loja_id', lojaId)
            .eq('dia_semana', diaSemana)
            .single();
        
        if (configError) throw configError;
        
        // 2. Buscar duração do serviço (se fornecido)
        let duracaoServico = config.duracao_padrao;
        if (servicoId) {
            const { data: servico, error: servicoError } = await supabase
                .from('servicos')
                .select('duracao')
                .eq('id', servicoId)
                .single();
            
            if (!servicoError && servico) {
                duracaoServico = servico.duracao;
            }
        }
        
        // 3. Buscar agendamentos já marcados
        let query = supabase
            .from('agendamentos')
            .select('hora_inicio, hora_fim, profissional_id')
            .eq('loja_id', lojaId)
            .eq('data', data)
            .in('status', ['confirmado', 'pendente']);
        
        if (profissionalId) {
            query = query.eq('profissional_id', profissionalId);
        }
        
        const { data: agendamentos, error: agendError } = await query;
        if (agendError) throw agendError;
        
        // 4. Gerar slots disponíveis
        const slots = gerarSlots(
            config.hora_abertura,
            config.hora_fechamento,
            duracaoServico,
            config.intervalo_entre_agendamentos || 0,
            agendamentos
        );
        
        return slots;
    } catch (error) {
        console.error('Erro ao buscar horários:', error);
        throw error;
    }
}

function gerarSlots(abertura, fechamento, duracao, intervalo, agendamentos) {
    const slots = [];
    const inicio = new Date(`2000-01-01T${abertura}`);
    const fim = new Date(`2000-01-01T${fechamento}`);
    
    let current = new Date(inicio);
    
    while (current < fim) {
        const horaStr = current.toTimeString().slice(0, 5);
        const horaFim = new Date(current.getTime() + duracao * 60000);
        const horaFimStr = horaFim.toTimeString().slice(0, 5);
        
        // Verificar se o slot está disponível
        let ocupado = false;
        for (const agendamento of agendamentos) {
            const agInicio = agendamento.hora_inicio;
            const agFim = agendamento.hora_fim;
            
            if (horaStr >= agInicio && horaStr < agFim) {
                ocupado = true;
                break;
            }
        }
        
        slots.push({
            hora: horaStr,
            hora_fim: horaFimStr,
            disponivel: !ocupado,
            duracao: duracao
        });
        
        // Avançar para o próximo slot
        current.setMinutes(current.getMinutes() + duracao + intervalo);
    }
    
    return slots;
}

// Criar agendamento
export async function criarAgendamento(dados) {
    try {
        // 1. Validar disponibilidade (evitar race condition)
        const { data: existing, error: checkError } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('loja_id', dados.loja_id)
            .eq('data', dados.data)
            .eq('hora_inicio', dados.hora_inicio)
            .in('status', ['confirmado', 'pendente'])
            .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existing) {
            throw new Error('Esse horário já está reservado!');
        }
        
        // 2. Inserir agendamento
        const { data, error } = await supabase
            .from('agendamentos')
            .insert([{
                ...dados,
                status: 'pendente',
                criado_em: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return {
            success: true,
            agendamento: data
        };
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Buscar agendamentos da loja
export async function buscarAgendamentos(lojaId, filtros = {}) {
    try {
        let query = supabase
            .from('agendamentos')
            .select(`
                *,
                servicos (nome, preco),
                profissionais (nome, cargo)
            `)
            .eq('loja_id', lojaId)
            .order('data', { ascending: true })
            .order('hora_inicio', { ascending: true });
        
        if (filtros.data) {
            query = query.eq('data', filtros.data);
        }
        
        if (filtros.status) {
            query = query.eq('status', filtros.status);
        }
        
        if (filtros.profissional_id) {
            query = query.eq('profissional_id', filtros.profissional_id);
        }
        
        if (filtros.data_inicio && filtros.data_fim) {
            query = query.gte('data', filtros.data_inicio).lte('data', filtros.data_fim);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        throw error;
    }
}

// Buscar agendamentos do cliente
export async function buscarAgendamentosCliente(telefone) {
    try {
        const { data, error } = await supabase
            .from('agendamentos')
            .select(`
                *,
                lojas (nome, endereco),
                servicos (nome, preco),
                profissionais (nome)
            `)
            .eq('telefone_cliente', telefone)
            .order('data', { ascending: false })
            .order('hora_inicio', { ascending: true });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar agendamentos do cliente:', error);
        throw error;
    }
}

// Atualizar status do agendamento
export async function atualizarStatusAgendamento(id, status) {
    try {
        const { data, error } = await supabase
            .from('agendamentos')
            .update({ 
                status,
                confirmado_em: status === 'confirmado' ? new Date().toISOString() : null
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            agendamento: data
        };
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Cancelar agendamento
export async function cancelarAgendamento(id, motivo = '') {
    try {
        const { data, error } = await supabase
            .from('agendamentos')
            .update({ 
                status: 'cancelado',
                observacoes: motivo
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return {
            success: true,
            agendamento: data
        };
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
