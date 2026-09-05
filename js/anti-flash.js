(function() {
    try {
        var pref = localStorage.getItem('luyenDe_theme_preference') || 'system';
        var isDark = false;
        if (pref === 'dark') {
            isDark = true;
        } else if (pref === 'light') {
            isDark = false;
        } else {
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
        }
    } catch (e) {}
})();
