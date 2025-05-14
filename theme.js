const toggleBtn = document.getElementById('theme-toggle');
const themeImage = document.getElementById('theme-image');

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');

    if (document.body.classList.contains('light-theme')) {
        themeImage.src = 'assets/images/roomzy-logo-light.png';
    } else {
        themeImage.src = 'assets/images/roomzy-logo-dark.png';
    }

    // Optional: Save preference to localStorage
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// Optional: Load saved theme preference on page load
window.onload = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}