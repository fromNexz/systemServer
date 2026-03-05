// Arquivo: prisystem/painel/js/chatbot-config.js - VERSÃO COMPLETA ATUALIZADA

// ==================== GERENCIAMENTO DE MODO ====================

window.setFlowMode = async function (mode) {
    console.log('🔄 Alterando modo para:', mode);

    try {
        const response = await fetch(`/api/chatbot/flow-mode?mode=${mode}`, {
            method: 'PUT'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao alterar modo');
        }

        const data = await response.json();

        if (data.success) {
            console.log('[+] Modo salvo no banco:', mode);
            showSuccess('Modo Alterado', data.message + '<br><br>⚠️ Reinicie o bot para aplicar as mudanças.');
            updateModeUI(mode);
        } else {
            showError('Erro', data.message);
        }
    } catch (error) {
        console.error('[X] Erro ao alterar modo:', error);
        showError('Erro ao Alterar Modo', error.message);
    }
};

function updateModeUI(mode) {
    console.log('🎨 Atualizando UI para modo:', mode);

    const btnDefault = document.getElementById('btn-mode-default');
    const btnCustom = document.getElementById('btn-mode-custom');
    const modeText = document.getElementById('current-mode-text');
    const modeDesc = document.getElementById('mode-description-text');
    const customSection = document.getElementById('custom-messages-section');

    if (!btnDefault || !btnCustom) {
        console.error('❌ Botões não encontrados, tentando novamente...');
        return;
    }

    if (mode === 'default') {
        btnDefault.className = 'button-primary';
        btnCustom.className = 'button-secondary';
        if (modeText) modeText.textContent = '🔵 Padrão';
        if (modeDesc) modeDesc.textContent = 'Fluxo profissional com 4 mensagens fixas e envio de catálogo';
        if (customSection) customSection.style.display = 'none';
        console.log('✅ UI atualizada para PADRÃO');
    } else if (mode === 'custom') {
        btnDefault.className = 'button-secondary';
        btnCustom.className = 'button-primary';
        if (modeText) modeText.textContent = '🟣 Personalizado';
        if (modeDesc) modeDesc.textContent = 'Crie suas próprias mensagens e fluxo de atendimento';
        if (customSection) customSection.style.display = 'block';
        console.log('✅ UI atualizada para PERSONALIZADO');
    }
}

async function loadCurrentMode() {
    console.log('📥 Carregando modo do banco...');

    try {
        const response = await fetch('/api/chatbot/settings');

        if (!response.ok) {
            throw new Error('Erro ao carregar settings');
        }

        const data = await response.json();
        const mode = data.flow_mode || 'default';

        console.log('✅ Modo carregado do banco:', mode);
        console.log('📋 Dados completos:', data);

        // Aguardar um pouco para garantir que elementos existem
        setTimeout(() => {
            updateModeUI(mode);
        }, 50);

    } catch (error) {
        console.error('❌ Erro ao carregar modo:', error);
        updateModeUI('default');
    }
}

// ==================== INICIALIZAÇÃO ====================

// Garantir execução no carregamento
(function () {
    console.log('🔧 Inicializando gerenciamento de modo...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOMContentLoaded disparado');
            setTimeout(loadCurrentMode, 200);
        });
    } else {
        console.log('📄 DOM já está pronto');
        setTimeout(loadCurrentMode, 200);
    }
})();

// Também carregar quando a página ficar visível (se estava em outra aba)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👁️ Página ficou visível, recarregando modo...');
        loadCurrentMode();
    }
});



let messages = [];
let draggedElement = null;
let hasUnsavedChanges = false;
let originalMessagesJson = "";

// Templates de resumo
const SUMMARY_TEMPLATES = {
    classic: {
        name: "Clássico",
        format: `━━━━━━━━━━━━━━━
📋 Resumo da sua solicitação:
👤 Nome: {nome}
⏰ Período: {periodo}
💆 Serviço: {servico}
━━━━━━━━━━━━━━━`
    },
    modern: {
        name: "Moderno",
        format: `✨ RESUMO DO AGENDAMENTO ✨

Nome: {nome}
Período: {periodo}
Serviço: {servico}

Aguardamos você!`
    },
    minimal: {
        name: "Minimalista",
        format: `Resumo:
• {nome}
• {periodo}
• {servico}`
    }
};

// Definir tipos de mensagem
const MESSAGE_TYPES = {
    message: {
        label: "Mensagem",
        icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
        color: "#4a90e2"
    },
    important: {
        label: "Recado Importante",
        icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
        color: "#ffc107"
    },
    alert: {
        label: "Alerta",
        icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        color: "#dc3545"
    },
    final: {
        label: "Final (com resumo)",
        icon: '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
        color: "#28a745"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadMessages();

    // Detectar mudanças não salvas ao sair
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

// Marcar como não salvo
function markAsUnsaved() {
    hasUnsavedChanges = true;
    document.getElementById('unsaved-indicator').classList.add('show');
}

// Marcar como salvo
function markAsSaved() {
    hasUnsavedChanges = false;
    document.getElementById('unsaved-indicator').classList.remove('show');
    originalMessagesJson = JSON.stringify(messages);
}

// Carregar mensagens do backend
async function loadMessages() {
    try {
        const response = await fetch("/api/chatbot-messages/");
        messages = await response.json();

        if (messages.length === 0) {
            addNewMessage();
        } else {
            renderMessages();
        }

        originalMessagesJson = JSON.stringify(messages);
    } catch (error) {
        console.error("Erro ao carregar mensagens:", error);
        addNewMessage();
    }
}

// Renderizar todas as mensagens
function renderMessages() {
    const builder = document.getElementById("message-builder");
    builder.innerHTML = "";

    messages.forEach((msg, index) => {
        const card = createMessageCard(msg, index);
        builder.appendChild(card);
    });
}

// Criar card de mensagem
function createMessageCard(msg, index) {
    const card = document.createElement("div");
    card.className = "message-card";
    card.draggable = true;
    card.dataset.index = index;
    card.dataset.type = msg.message_type || "message";

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragover", handleDragOver);
    card.addEventListener("drop", handleDrop);
    card.addEventListener("dragend", handleDragEnd);

    const currentType = MESSAGE_TYPES[msg.message_type || "message"];
    const isFinalType = msg.message_type === "final";

    card.innerHTML = `
    <div class="message-header">
      <div class="message-number">
        <span class="drag-handle">☰</span>
        Mensagem ${index + 1}
        <span class="type-badge ${msg.message_type || 'message'}">
          <svg class="type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${currentType.icon}
          </svg>
          ${currentType.label}
        </span>
      </div>
      <div class="message-actions">
        <button class="btn-icon" onclick="moveUp(${index})" title="Mover para cima">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="btn-icon" onclick="moveDown(${index})" title="Mover para baixo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="btn-icon btn-delete" onclick="deleteMessage(${index})" title="Excluir">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Tipo da mensagem:</label>
      <select 
        class="message-type-select" 
        id="msg-type-${index}"
        onchange="updateMessageType(${index}, this.value)"
      >
        <option value="message" ${msg.message_type === 'message' ? 'selected' : ''}>Mensagem</option>
        <option value="important" ${msg.message_type === 'important' ? 'selected' : ''}>Recado Importante</option>
        <option value="alert" ${msg.message_type === 'alert' ? 'selected' : ''}>Alerta</option>
        <option value="final" ${msg.message_type === 'final' ? 'selected' : ''}>Final (com resumo)</option>
      </select>
    </div>

    ${isFinalType ? createSummaryPreview(msg, index) : ''}

    <div class="form-group">
      <label>Texto da mensagem:</label>
      <textarea 
        id="msg-text-${index}" 
        placeholder="Digite a mensagem que será enviada..."
        onchange="updateMessage(${index}, 'message_text', this.value)"
      >${msg.message_text || ""}</textarea>
    </div>

    <div class="form-row">
      <div class="checkbox-group" style="flex: 1;">
        <input 
          type="checkbox" 
          id="wait-reply-${index}" 
          ${msg.wait_for_reply ? "checked" : ""}
          onchange="updateMessage(${index}, 'wait_for_reply', this.checked)"
        />
        <label for="wait-reply-${index}" style="margin: 0; cursor: pointer;">
          Aguardar resposta do cliente?
        </label>
      </div>
    </div>

    <div class="form-group" id="delay-group-${index}" style="display: ${msg.wait_for_reply ? 'none' : 'block'};">
      <label>Tempo de espera (segundos) antes da próxima mensagem:</label>
      <input 
        type="number" 
        class="delay-input" 
        id="delay-${index}"
        value="${msg.delay_seconds || 0}"
        min="0"
        placeholder="Ex: 5"
        onchange="updateMessage(${index}, 'delay_seconds', this.value)"
      />
    </div>

    <div class="form-group">
      <label>Anexar arquivo (imagem, PDF, etc):</label>
      <div class="upload-area ${msg.media_filename ? 'has-file' : ''}" 
           id="upload-${index}"
           onclick="document.getElementById('file-${index}').click()">
        <input 
          type="file" 
          id="file-${index}" 
          style="display: none;"
          accept="image/*,.pdf,.doc,.docx"
          onchange="handleFileUpload(${index}, this.files[0])"
        />
        <div id="upload-text-${index}">
          ${msg.media_filename
            ? `<strong>✓ ${msg.media_filename}</strong><br><small>Clique para trocar</small>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg><br>
              Clique ou arraste um arquivo aqui`
        }
        </div>
      </div>
    </div>
  `;

    return card;
}

// Criar preview do resumo (para tipo final)
function createSummaryPreview(msg, index) {
    const selectedTemplate = msg.summary_template || 'classic';

    return `
    <div class="summary-preview-section" id="summary-section-${index}">
      <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Modelo de Resumo:</label>
      <div class="summary-template-selector">
        ${Object.keys(SUMMARY_TEMPLATES).map(key => `
          <div class="template-option ${selectedTemplate === key ? 'selected' : ''}" 
               onclick="selectSummaryTemplate(${index}, '${key}')">
            ${SUMMARY_TEMPLATES[key].name}
          </div>
        `).join('')}
      </div>
      <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Preview do Resumo:</label>
      <div class="template-preview" id="preview-${index}">
${SUMMARY_TEMPLATES[selectedTemplate].format.replace('{nome}', 'Cliente Exemplo').replace('{periodo}', 'Manhã (8h às 12h)').replace('{servico}', 'Serviço Exemplo - R$ 100,00')}
      </div>
    </div>
  `;
}

// Selecionar template de resumo
function selectSummaryTemplate(index, templateKey) {
    updateMessage(index, 'summary_template', templateKey);

    // Atualizar UI
    const section = document.getElementById(`summary-section-${index}`);
    if (section) {
        section.querySelectorAll('.template-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        section.querySelector(`[onclick*="'${templateKey}'"]`).classList.add('selected');

        // Atualizar preview
        const preview = document.getElementById(`preview-${index}`);
        if (preview) {
            preview.textContent = SUMMARY_TEMPLATES[templateKey].format
                .replace('{nome}', 'Cliente Exemplo')
                .replace('{periodo}', 'Manhã (8h às 12h)')
                .replace('{servico}', 'Serviço Exemplo - R$ 100,00');
        }
    }
}

// Atualizar dados da mensagem
function updateMessage(index, field, value) {
    if (!messages[index]) {
        messages[index] = {};
    }

    messages[index][field] = value;
    markAsUnsaved();

    if (field === "wait_for_reply") {
        const delayGroup = document.getElementById(`delay-group-${index}`);
        if (delayGroup) {
            delayGroup.style.display = value ? "none" : "block";
        }
    }

    console.log(`Mensagem ${index + 1} atualizada:`, field, value);
}

// Atualizar tipo de mensagem
function updateMessageType(index, type) {
    const oldType = messages[index].message_type;
    updateMessage(index, 'message_type', type);

    // Se mudou para/de "final", re-renderizar
    if ((oldType === 'final' && type !== 'final') || (oldType !== 'final' && type === 'final')) {
        renderMessages();
    } else {
        // Apenas atualizar visual do card
        const card = document.querySelector(`.message-card[data-index="${index}"]`);
        if (card) {
            card.dataset.type = type;

            const typeInfo = MESSAGE_TYPES[type];
            const badge = card.querySelector('.type-badge');
            if (badge) {
                badge.className = `type-badge ${type}`;
                badge.innerHTML = `
          <svg class="type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${typeInfo.icon}
          </svg>
          ${typeInfo.label}
        `;
            }
        }
    }
}

// Adicionar nova mensagem
function addNewMessage() {
    const newMessage = {
        id: null,
        order_position: messages.length + 1,
        message_type: "message",
        message_text: "",
        wait_for_reply: true,
        delay_seconds: 0,
        media_type: null,
        media_url: null,
        media_filename: null,
        summary_template: "classic",
        is_active: true
    };

    messages.push(newMessage);
    renderMessages();
    markAsUnsaved();
}

// Excluir mensagem
function deleteMessage(index) {
    showConfirm(
        'Excluir Mensagem',
        'Tem certeza que deseja excluir esta mensagem?',
        () => {
            messages.splice(index, 1);
            renderMessages();
            markAsUnsaved();
        }
    );
}

// Mover mensagem para cima
function moveUp(index) {
    if (index > 0) {
        [messages[index], messages[index - 1]] = [messages[index - 1], messages[index]];
        renderMessages();
        markAsUnsaved();
    }
}

// Mover mensagem para baixo
function moveDown(index) {
    if (index < messages.length - 1) {
        [messages[index], messages[index + 1]] = [messages[index + 1], messages[index]];
        renderMessages();
        markAsUnsaved();
    }
}

// Upload de arquivo
async function handleFileUpload(index, file) {
    if (!file) return;

    const uploadText = document.getElementById(`upload-text-${index}`);
    uploadText.innerHTML = '<small>Enviando...</small>';

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/chatbot-messages/upload-media", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Erro no upload");

        const result = await response.json();

        messages[index].media_type = file.type.startsWith('image/') ? 'image' : 'document';
        messages[index].media_url = result.url;
        messages[index].media_filename = result.original_name;

        const uploadArea = document.getElementById(`upload-${index}`);
        uploadArea.classList.add('has-file');
        uploadText.innerHTML = `<strong>✓ ${result.original_name}</strong><br><small>Clique para trocar</small>`;

        markAsUnsaved();
        console.log("Upload concluído:", result);

    } catch (error) {
        console.error("Erro no upload:", error);
        showError('Erro no Upload', 'Não foi possível enviar o arquivo. Tente novamente.');
        uploadText.innerHTML = 'Clique ou arraste um arquivo aqui';
    }
}

// Drag and Drop handlers
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);

        const temp = messages[draggedIndex];
        messages.splice(draggedIndex, 1);
        messages.splice(targetIndex, 0, temp);

        renderMessages();
        markAsUnsaved();
    }

    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

// Salvar todas as mensagens
async function saveAll() {
    const saveBtn = document.querySelector('.btn-save-all');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> Salvando...';

    try {
        messages.forEach((msg, index) => {
            msg.order_position = index + 1;
        });

        for (const msg of messages) {
            if (msg.id) {
                await fetch(`/api/chatbot-messages/${msg.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(msg)
                });
            } else {
                const response = await fetch("/api/chatbot-messages/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(msg)
                });
                const result = await response.json();
                msg.id = result.id;
            }
        }

        showSuccess('Salvo', 'Mensagens salvas com sucesso!');
        markAsSaved();
        await loadMessages();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        showError('Erro ao Salvar', 'Não foi possível salvar as mensagens. Verifique o console.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Salvar Tudo
    `;
    }
}

// Botão voltar
function handleBackButton() {
    if (hasUnsavedChanges) {
        document.getElementById('unsaved-modal').classList.add('show');
    } else {
        window.location.href = 'settings.html';
    }
}

// Salvar e sair
async function saveAndExit() {
    await saveAll();
    window.location.href = 'settings.html';
}

// Sair sem salvar
function exitWithoutSaving() {
    hasUnsavedChanges = false;
    window.location.href = 'settings.html';
}

// Fechar modal
function closeModal() {
    document.getElementById('unsaved-modal').classList.remove('show');
}

setTimeout(() => {
    console.log('⏰ Timeout de segurança: carregando modo...');
    loadCurrentMode();
}, 500);

// ==================== GERENCIAMENTO DE TABS ====================

function switchTab(tabName) {
    // Atualizar botões das tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tabName === 'default') {
        document.getElementById('tab-default-mode').classList.add('active');
    } else {
        document.getElementById('tab-custom-mode').classList.add('active');
    }
    
    // Atualizar conteúdo das tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    if (tabName === 'default') {
        const defaultSection = document.getElementById('default-mode-section');
        defaultSection.classList.add('active');
        defaultSection.style.display = 'block';
        loadDefaultMessages();
    } else {
        const customSection = document.getElementById('custom-messages-section');
        customSection.classList.add('active');
        customSection.style.display = 'block';
        loadMessages();
    }
}

// ==================== MENSAGENS DO MODO PADRÃO ====================

let defaultMessagesData = [];

async function loadDefaultMessages() {
    try {
        const response = await fetch('/default-messages/');
        
        if (!response.ok) {
            throw new Error('Erro ao carregar mensagens padrão');
        }
        
        defaultMessagesData = await response.json();
        renderDefaultMessages();
        
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao carregar mensagens do modo padrão', 'error');
    }
}

function renderDefaultMessages() {
    const container = document.getElementById('default-messages-list');
    
    if (!container) {
        console.error('Container default-messages-list não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    defaultMessagesData.forEach((msg, index) => {
        const card = document.createElement('div');
        card.className = 'default-message-card';
        card.dataset.messageId = msg.id;
        
        // Definir ícones e títulos personalizados
        const messageInfo = {
            'welcome': { icon: '👋', title: 'Mensagem de Boas-vindas' },
            'ask_period': { icon: '⏰', title: 'Pergunta sobre Período' },
            'ask_service': { icon: '💆', title: 'Pergunta sobre Serviço' },
            'closing': { icon: '✅', title: 'Mensagem de Encerramento' }
        };
        
        const info = messageInfo[msg.message_key] || { icon: '📝', title: msg.message_key };
        
        card.innerHTML = `
            <div class="default-message-header">
                <div class="default-message-title">
                    ${info.icon} ${info.title}
                </div>
                <span style="color: #999; font-size: 0.85rem;">Posição: ${msg.order_position}</span>
            </div>
            
            ${msg.description ? `
                <div class="default-message-description">
                    ${msg.description}
                </div>
            ` : ''}
            
            <textarea 
                class="default-message-textarea" 
                data-message-id="${msg.id}"
                placeholder="Digite a mensagem..."
            >${msg.message_text}</textarea>
            
            <div class="message-variables-hint">
                <strong>💡 Variáveis disponíveis:</strong> 
                ${getVariablesForMessage(msg.message_key)}
            </div>
        `;
        
        container.appendChild(card);
    });
}

function getVariablesForMessage(messageKey) {
    const variables = {
        'welcome': 'Nenhuma variável necessária',
        'ask_period': '<code>{nome}</code>',
        'ask_service': '<code>{servicos_lista}</code>',
        'closing': '<code>{nome}</code>, <code>{periodo}</code>, <code>{servico}</code>'
    };
    
    return variables[messageKey] || 'Nenhuma variável disponível';
}

async function saveDefaultMessages() {
    try {
        const textareas = document.querySelectorAll('.default-message-textarea');
        const updates = [];
        
        for (const textarea of textareas) {
            const messageId = parseInt(textarea.dataset.messageId);
            const messageText = textarea.value.trim();
            
            if (!messageText) {
                showNotification('Todas as mensagens devem ter conteúdo', 'error');
                return;
            }
            
            const originalMsg = defaultMessagesData.find(m => m.id === messageId);
            
            updates.push(
                fetch(`/default-messages/${messageId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message_key: originalMsg.message_key,
                        message_text: messageText,
                        description: originalMsg.description,
                        order_position: originalMsg.order_position,
                        is_active: originalMsg.is_active
                    })
                })
            );
        }
        
        const results = await Promise.all(updates);
        
        const allSuccess = results.every(r => r.ok);
        
        if (allSuccess) {
            showNotification('Mensagens do modo padrão salvas com sucesso!', 'success');
            await loadDefaultMessages();
        } else {
            showNotification('Erro ao salvar algumas mensagens', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showNotification('Erro ao salvar mensagens', 'error');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const defaultSection = document.getElementById('default-mode-section');
    if (defaultSection && defaultSection.classList.contains('active')) {
        loadDefaultMessages();
    }
});
