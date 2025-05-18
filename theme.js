const toggleBtn = document.getElementById('theme-toggle');
const themeImage = document.getElementById('theme-image');
const logo = document.getElementById('logogogo');

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');

    if (document.body.classList.contains('light-theme')) {
        themeImage.src = 'assets/images/roomzy-logo-light.png';
        logo.src = 'assets/images/roomzy-logo-light.png';
        document.getElementById('theme-toggle').style.backgroundColor = '#ffffff'; 

    } else {
        themeImage.src = 'assets/images/roomzy-logo-dark.png';
        logo.src = 'assets/images/roomzy-logo-dark.png';
        document.getElementById('theme-toggle').style.backgroundColor = '#0C0C0C'; 
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
        themeImage.src = 'assets/images/roomzy-logo-light.png';
        logo.src = 'assets/images/roomzy-logo-light.png';
        document.getElementById('theme-toggle').style.backgroundColor = '#ffffff'; 
    }
    else
        themeImage.src = 'assets/images/roomzy-logo-dark.png';
        logo.src = 'assets/images/roomzy-logo-dark.png';
        document.getElementById('theme-toggle').style.backgroundColor = '#0C0C0C'; 
}