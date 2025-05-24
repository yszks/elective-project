window.onload = () => {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;

    const themeImage = document.getElementById('theme-image');
    const themelogin = document.getElementById('theme-login');
    const logo = document.getElementById('logogogo');
    const toggleBtn = document.getElementById('theme-toggle');
    const sideChat = document.getElementById('side-chat');
    const registForm = document.getElementById('regist-form');

    // Apply theme on load
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        if (themeImage) themeImage.src = 'public/assets/images/roomzy-logo-light.png';
        if (themelogin) themelogin.src = 'assets/images/roomzy-logo-light.png';
        if (logo) logo.src = 'public/assets/images/roomzy-logo-light.png';
        if (toggleBtn) toggleBtn.style.backgroundColor = '#ffffff';
        if (sideChat) sideChat.style.backgroundColor = '#69a0f9';
        if (registForm) registForm.style.backgroundColor = '#69a0f9';
    } else {
        if (toggleBtn) toggleBtn.style.backgroundColor = '#0C0C0C';
        if (sideChat) sideChat.style.backgroundColor = '#242424';
        if (registForm) registForm.style.backgroundColor = '#242424';  
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            body.classList.toggle('light-theme');

            const isLight = body.classList.contains('light-theme');

            if (isLight) {
                if (themeImage) themeImage.src = 'public/assets/images/roomzy-logo-light.png';
                if (themelogin) themelogin.src = 'assets/images/roomzy-logo-light.png';
                if (logo) logo.src = 'public/assets/images/roomzy-logo-light.png';
                toggleBtn.style.backgroundColor = '#ffffff';
                if (sideChat) sideChat.style.backgroundColor = '#69a0f9';
                if (registForm) registForm.style.backgroundColor = '#69a0f9';
            } else {
                if (themeImage) themeImage.src = 'public/assets/images/roomzy-logo-dark.png';
                if (themelogin) themelogin.src = 'public/assets/images/roomzy-logo-dark.png';
                if (logo) logo.src = 'public/assets/images/roomzy-logo-dark.png';
                toggleBtn.style.backgroundColor = '#0C0C0C';
                if (sideChat) sideChat.style.backgroundColor = '#242424';
                if (registForm) registForm.style.backgroundColor = '#242424';
            }

            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }
};
