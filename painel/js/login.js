document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const btnLogin = document.getElementById('btnLogin');

    // Verificar se já está logado
    checkAuth();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        errorMessage.classList.remove('show');
        btnLogin.disabled = true;
        btnLogin.textContent = 'Entrando...';
        
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login bem-sucedido
                window.location.href = '/pri/dashboard.html';
            } else {
                // Erro no login
                showError(data.detail || 'Erro ao fazer login');
            }
        } catch (error) {
            showError('Erro de conexão com o servidor');
            console.error('Erro:', error);
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Entrar';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }

    async function checkAuth() {
        try {
            const response = await fetch('/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                
                window.location.href = '/pri/dashboard.html';
            }
        } catch (error) {
            
        }
    }
});
