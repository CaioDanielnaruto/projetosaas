// js/pages/cadastro-loja.js
import { cadastrarLojista } from '../services/auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastroForm');
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const btnText = document.getElementById('btnText');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Mostrar loading
        submitBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        btnText.textContent = 'Cadastrando...';
        messageDiv.className = 'hidden';
        
        // Coletar dados
        const dados = {
            nome_loja: document.getElementById('nomeLoja').value,
            categoria: document.getElementById('categoria').value,
            endereco: document.getElementById('endereco').value,
            telefone: document.getElementById('telefone').value,
            email: document.getElementById('email').value,
            senha: document.getElementById('senha').value,
            descricao: document.getElementById('descricao').value || ''
        };
        
        // Validar senha
        const confirmarSenha = document.getElementById('confirmarSenha').value;
        if (dados.senha !== confirmarSenha) {
            mostrarMensagem('As senhas não coincidem!', 'danger');
            resetarBotao();
            return;
        }
        
        if (dados.senha.length < 6) {
            mostrarMensagem('A senha deve ter pelo menos 6 caracteres!', 'danger');
            resetarBotao();
            return;
        }
        
        // Cadastrar
        const resultado = await cadastrarLojista(dados);
        
        if (resultado.success) {
            mostrarMensagem('✅ Cadastro realizado com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            mostrarMensagem('❌ Erro ao cadastrar: ' + resultado.error, 'danger');
            resetarBotao();
        }
    });
    
    function mostrarMensagem(texto, tipo) {
        messageDiv.className = `alert alert-${tipo}`;
        messageDiv.textContent = texto;
    }
    
    function resetarBotao() {
        submitBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
        btnText.textContent = 'Cadastrar';
    }
});
