document.addEventListener('DOMContentLoaded', () => {
    const subtitle = document.getElementById('subtitle');
    if (subtitle) subtitle.textContent = 'Nova tela carregada via Config.js';

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    console.log('Config.js ativo');
});