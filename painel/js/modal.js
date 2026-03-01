// Ícones SVG
const MODAL_ICONS = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
    question: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>'
};

// Função para mostrar modal
function showModal({ type = 'info', title, message, buttons = [] }) {
    const modal = document.getElementById('custom-modal');
    const modalIcon = document.getElementById('modal-icon');
    const modalIconSvg = document.getElementById('modal-icon-svg');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    // Configurar ícone
    modalIcon.className = `modal-icon-custom ${type}`;
    modalIconSvg.innerHTML = MODAL_ICONS[type] || MODAL_ICONS.info;
    
    // Configurar título e mensagem
    modalTitle.textContent = title;
    
    // Se a mensagem for HTML, usar innerHTML, senão textContent
    if (typeof message === 'string' && message.includes('<')) {
        modalBody.innerHTML = message;
    } else {
        modalBody.textContent = message;
    }
    
    // Limpar e adicionar botões
    modalFooter.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `modal-btn-custom ${btn.style || 'secondary'}`;
        button.textContent = btn.text;
        button.onclick = () => {
            hideModal();
            if (btn.onClick) btn.onClick();
        };
        modalFooter.appendChild(button);
    });
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Fechar ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal();
        }
    };
}

// Função para esconder modal
function hideModal() {
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('active');
}

// Atalhos para tipos comuns
window.showSuccess = (title, message, onClose) => {
    showModal({
        type: 'success',
        title: title,
        message: message,
        buttons: [
            { text: 'OK', style: 'success', onClick: onClose }
        ]
    });
};

window.showError = (title, message, onClose) => {
    showModal({
        type: 'error',
        title: title,
        message: message,
        buttons: [
            { text: 'Fechar', style: 'danger', onClick: onClose }
        ]
    });
};

window.showWarning = (title, message, onClose) => {
    showModal({
        type: 'warning',
        title: title,
        message: message,
        buttons: [
            { text: 'Entendi', style: 'primary', onClick: onClose }
        ]
    });
};

window.showConfirm = (title, message, onConfirm, onCancel) => {
    showModal({
        type: 'question',
        title: title,
        message: message,
        buttons: [
            { text: 'Cancelar', style: 'ghost', onClick: onCancel },
            { text: 'Confirmar', style: 'primary', onClick: onConfirm }
        ]
    });
};

window.showDangerConfirm = (title, message, confirmText, onConfirm, onCancel) => {
    showModal({
        type: 'warning',
        title: title,
        message: message,
        buttons: [
            { text: 'Cancelar', style: 'ghost', onClick: onCancel },
            { text: confirmText || 'Confirmar', style: 'danger', onClick: onConfirm }
        ]
    });
};