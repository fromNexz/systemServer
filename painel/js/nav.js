(function fixNavLinks() {
    const pages = ['dashboard.html', 'index.html', 'clientes.html', 'bloqueadas.html', 'settings.html', 'chatbot-config.html'];

    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Pega só o nome do arquivo, sem caminho
        const filename = href.split('/').pop();

        // Se for uma página do painel, força /pri/
        if (pages.includes(filename)) {
            link.setAttribute('href', '/pri/' + filename);
        }
    });

    // Marca o link ativo com base na URL atual
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '/pri/' + currentPage) {
            link.classList.add('active');
        }
    });
})();
