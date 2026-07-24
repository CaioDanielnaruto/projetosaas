// js/pages/agendamento-cliente.js
import { supabase } from '../config/supabase.js';
import { buscarLojas } from '../services/loja.js';
import { buscarServicos } from '../services/servico.js';
import { buscarProfissionais } from '../services/profissional.js';
import { buscarHorariosDisponiveis, criarAgendamento } from '../services/agendamento.js';

let lojaSelecionada = null;
let servicoSelecionado = null;
let profissionalSelecionado = null;
let dataSelecionada = null;
let horarioSelecionado = null;
let stepAtual = 1;

document.addEventListener('DOMContentLoaded', function() {
    // Definir data mínima para hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataAgendamento').min = hoje;
    document.getElementById('dataAgendamento').value = hoje;
    
    // Carregar lojas
    carregarLojas();
    
    // Event listeners dos botões
    document.getElementById('btnProximo1').addEventListener('click', () => irParaStep(2));
    document.getElementById('btnVoltar2').addEventListener('click', () => irParaStep(1));
    document.getElementById('btnProximo2').addEventListener('click', () => irParaStep(3));
    document.getElementById('btnVoltar3').addEventListener('click', () => irParaStep(2));
    document.getElementById('btnProximo3').addEventListener('click', () => irParaStep(4));
    document.getElementById('btnVoltar4').addEventListener('click', () => irParaStep(3));
    document.getElementById('btnProximo4').addEventListener('click', confirmarAgendamento);
    
    // Mudança de data
    document.getElementById('dataAgendamento').addEventListener('change', function() {
        dataSelecionada = this.value;
        carregarHorarios();
    });
});

// ============= CARREGAR LOJAS =============
async function carregarLojas() {
    const container = document.getElementById('lojasList');
    
    try {
        const lojas = await buscarLojas();
        
        if (!lojas || lojas.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Nenhuma loja cadastrada ainda.</div>';
            return;
        }
        
        let html = '';
        for (const loja of lojas) {
            html += `
                <div class="loja-card" data-id="${loja.id}">
                    <h4>${loja.nome}</h4>
                    <p style="color: var(--gray-500); font-size: 0.875rem;">${loja.categoria || 'Loja'}</p>
                    <p style="color: var(--gray-500); font-size: 0.875rem;">${loja.endereco || ''}</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Event listeners nas lojas
        container.querySelectorAll('.loja-card').forEach(card => {
            card.addEventListener('click', function() {
                container.querySelectorAll('.loja-card').forEach(c => c.classList.remove('selecionada'));
                this.classList.add('selecionada');
                lojaSelecionada = this.dataset.id;
                document.getElementById('btnProximo1').disabled = false;
            });
        });
    } catch (error) {
        console.error('Erro ao carregar lojas:', error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar lojas</div>';
    }
}

// ============= CARREGAR SERVIÇOS =============
async function carregarServicos() {
    const container = document.getElementById('servicosList');
    
    try {
        const servicos = await buscarServicos(lojaSelecionada);
        
        if (!servicos || servicos.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Esta loja ainda não tem serviços cadastrados.</div>';
            document.getElementById('btnProximo2').disabled = true;
            return;
        }
        
        let html = '';
        for (const servico of servicos) {
            html += `
                <div class="loja-card" data-id="${servico.id}">
                    <h4>${servico.nome}</h4>
                    <p style="color: var(--gray-500); font-size: 0.875rem;">⏱️ ${servico.duracao} min | R$ ${servico.preco?.toFixed(2) || '0,00'}</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Event listeners nos serviços
        container.querySelectorAll('.loja-card').forEach(card => {
            card.addEventListener('click', function() {
                container.querySelectorAll('.loja-card').forEach(c => c.classList.remove('selecionada'));
                this.classList.add('selecionada');
                servicoSelecionado = this.dataset.id;
                document.getElementById('btnProximo2').disabled = false;
            });
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar serviços</div>';
    }
}

// ============= CARREGAR HORÁRIOS =============
async function carregarHorarios() {
    const container = document.getElementById('horariosContainer');
    const data = document.getElementById('dataAgendamento').value;
    
    if (!data) {
        container.innerHTML = '<p style="color: var(--gray-500); grid-column: 1/-1; text-align: center;">Selecione uma data</p>';
        return;
    }
    
    container.innerHTML = '<p style="color: var(--gray-500); grid-column: 1/-1; text-align: center;">Carregando horários...</p>';
    
    try {
        // Buscar profissionais da loja (opcional)
        const profissionais = await buscarProfissionais(lojaSelecionada);
        if (profissionais && profissionais.length > 0) {
            profissionalSelecionado = profissionais[0].id;
        }
        
        const horarios = await buscarHorariosDisponiveis(
            lojaSelecionada,
            data,
            profissionalSelecionado,
            servicoSelecionado
        );
        
        if (!horarios || horarios.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); grid-column: 1/-1; text-align: center;">Nenhum horário disponível para esta data</p>';
            document.getElementById('btnProximo3').disabled = true;
            return;
        }
        
        let html = '';
        let temDisponivel = false;
        
        for (const horario of horarios) {
            if (horario.disponivel) {
                temDisponivel = true;
                html += `
                    <button class="horario-btn" data-hora="${horario.hora}" data-fim="${horario.hora_fim}">
                        ${horario.hora}
                    </button>
                `;
            } else {
                html += `
                    <button class="horario-btn indisponivel" disabled>
                        ${horario.hora}
                    </button>
                `;
            }
        }
        
        container.innerHTML = html;
        
        if (!temDisponivel) {
            container.innerHTML += '<p style="color: var(--gray-500); grid-column: 1/-1; text-align: center;">Nenhum horário disponível</p>';
            document.getElementById('btnProximo3').disabled = true;
            return;
        }
        
        // Event listeners nos horários
        container.querySelectorAll('.horario-btn:not(.indisponivel)').forEach(btn => {
            btn.addEventListener('click', function() {
                container.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                this.classList.add('selecionado');
                horarioSelecionado = {
                    inicio: this.dataset.hora,
                    fim: this.dataset.fim || this.dataset.hora
                };
                document.getElementById('btnProximo3').disabled = false;
            });
        });
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar horários</div>';
    }
}

// ============= NAVEGAÇÃO DE STEPS =============
function irParaStep(step) {
    // Esconder todos os steps
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-content-${step}`).classList.add('active');
    
    // Atualizar indicadores
    document.querySelectorAll('.step-indicator .step').forEach(el => {
        el.classList.remove('active', 'done');
        const num = parseInt(el.id.replace('step', ''));
        if (num === step) el.classList.add('active');
        else if (num < step) el.classList.add('done');
    });
    
    stepAtual = step;
    
    // Carregar dados específicos do step
    if (step === 2 && lojaSelecionada) {
        carregarServicos();
    }
    if (step === 3) {
        carregarHorarios();
    }
    if (step === 4) {
        document.getElementById('btnProximo4').disabled = false;
    }
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= CONFIRMAR AGENDAMENTO =============
async function confirmarAgendamento() {
    const nome = document.getElementById('clienteNome').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    const email = document.getElementById('clienteEmail').value.trim();
    
    if (!nome || !telefone) {
        mostrarMensagem('Preencha seu nome e telefone!', 'danger');
        return;
    }
    
    const dados = {
        loja_id: lojaSelecionada,
        servico_id: servicoSelecionado,
        profissional_id: profissionalSelecionado,
        nome_cliente: nome,
        telefone_cliente: telefone,
        email_cliente: email || null,
        data: dataSelecionada,
        hora_inicio: horarioSelecionado.inicio,
        hora_fim: horarioSelecionado.fim || horarioSelecionado.inicio,
        status: 'pendente'
    };
    
    const resultado = await criarAgendamento(dados);
    
    if (resultado.success) {
        // Mostrar resumo
        document.getElementById('resumoAgendamento').innerHTML = `
            <p><strong>Loja:</strong> ${lojaSelecionada}</p>
            <p><strong>Data:</strong> ${formatarData(dataSelecionada)}</p>
            <p><strong>Horário:</strong> ${horarioSelecionado.inicio} - ${horarioSelecionado.fim}</p>
            <p><strong>Cliente:</strong> ${nome}</p>
        `;
        irParaStep(5);
    } else {
        mostrarMensagem('❌ Erro ao agendar: ' + resultado.error, 'danger');
    }
}

// ============= UTILITÁRIOS =============
function mostrarMensagem(texto, tipo) {
    const msg = document.getElementById('message');
    msg.className = `alert alert-${tipo}`;
    msg.textContent = texto;
}

function formatarData(dataStr) {
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}
