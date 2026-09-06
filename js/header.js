/**
 * APP LUYỆN ĐỀ FE - HEADER COMPONENT SCRIPT
 * Quản lý Dark Mode, Sidebar Toggle, Phím tắt Search & Accessibility.
 */

(function () {
  'use strict';

  // KEY LƯU THEME VÀ LANG TRONG LOCALSTORAGE
  const THEME_STORAGE_KEY = 'luyenDe_theme_preference';
  const LANG_STORAGE_KEY = 'luyenDe_lang_preference';

  /**
   * 1. KHỞI TẠO VÀ CHUYỂN ĐỔI THEME (LIGHT / DARK MODE)
   */
  function initTheme() {
    if (window.ThemeModule && typeof window.ThemeModule.applyTheme === 'function') {
      window.ThemeModule.applyTheme();
      return;
    }
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch (e) {
      console.error("Lỗi khởi tạo theme:", e);
    }
  }

  function setTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (e) {}
  }

  function toggleTheme() {
    if (window.ThemeModule && typeof window.ThemeModule.toggleTheme === 'function') {
      window.ThemeModule.toggleTheme();
    } else {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
  }

  /**
   * 2. KHỞI TẠO VÀ CHUYỂN ĐỔI NGÔN NGỮ (VI / EN)
   */
  function initLanguage() {
    try {
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      const initialLang = (savedLang === 'en' || savedLang === 'vi') ? savedLang : 'vi';
      setLanguage(initialLang);
    } catch (e) {
      setLanguage('vi');
    }
  }

  function setLanguage(lang) {
    const validLang = lang === 'en' ? 'en' : 'vi';
    document.documentElement.setAttribute('lang', validLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, validLang);
    } catch (e) {}

    const langLabel = document.getElementById('lang-toggle-label');
    if (langLabel) {
      langLabel.textContent = validLang.toUpperCase();
    }

    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.setAttribute('title', validLang === 'vi' ? 'Đổi ngôn ngữ (VI / EN)' : 'Switch Language (EN / VI)');
      langBtn.setAttribute('aria-label', validLang === 'vi' ? 'Chuyển đổi ngôn ngữ Anh / Việt' : 'Switch English / Vietnamese Language');
    }

    applyTranslations(validLang);
    window.dispatchEvent(new CustomEvent('language-change', { detail: { lang: validLang } }));
  }

  function toggleLanguage() {
    const currentLang = document.documentElement.getAttribute('lang') || 'vi';
    setLanguage(currentLang === 'vi' ? 'en' : 'vi');
  }

  function applyTranslations(lang) {
    const translations = {
      vi: {
        home: "Trang chủ",
        subjects: "Môn học",
        history: "Lịch sử làm bài",
        stats: "Thống kê"
      },
      en: {
        home: "Home",
        subjects: "Subjects",
        history: "History",
        stats: "Statistics"
      }
    };

    const dict = translations[lang] || translations.vi;

    // Cập nhật menu popup trên Header
    document.querySelectorAll('[data-header-page]').forEach(btn => {
      const page = btn.getAttribute('data-header-page');
      const span = btn.querySelector('span');
      if (span && dict[page]) {
        span.textContent = dict[page];
      }
    });

    // Cập nhật Sidebar navigation
    document.querySelectorAll('[data-page]').forEach(btn => {
      const page = btn.getAttribute('data-page');
      const span = btn.querySelector('.nav-label');
      if (span && dict[page]) {
        span.textContent = dict[page];
      }
    });
  }

  /**
   * 3. RÀNG BUỘC SỰ KIỆN AN TOÀN KHI DOM ĐÃ SẴN SÀNG
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Theme và Ngôn ngữ ban đầu
    initTheme();
    initLanguage();

    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const logoBtn = document.getElementById('header-logo');
    const pageMenu = document.getElementById('header-page-menu');

    // Nút Bật/Tắt Chuyển đổi ngôn ngữ VI / EN
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Nút Bật/Tắt Dark Mode
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Nút Avatar Người Dùng
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        alert("Trang cá nhân đang được phát triển!");
      });
    }

    // Menu chọn nhanh các trang trong ứng dụng
    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = pageMenu && !pageMenu.classList.contains('hidden');
        if (pageMenu) pageMenu.classList.toggle('hidden', isOpen);
        logoBtn.setAttribute('aria-expanded', String(!isOpen));
      });
    }

    if (pageMenu) {
      pageMenu.addEventListener('click', (event) => {
        const pageButton = event.target.closest('[data-header-page]');
        if (!pageButton) return;
        const page = pageButton.getAttribute('data-header-page');
        pageMenu.classList.add('hidden');
        if (logoBtn) logoBtn.setAttribute('aria-expanded', 'false');
        if (page) window.dispatchEvent(new CustomEvent('page-change', { detail: { page } }));
      });
    }

    document.addEventListener('click', (event) => {
      if (pageMenu && logoBtn && !event.target.closest('.header-menu-wrap')) {
        pageMenu.classList.add('hidden');
        logoBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && pageMenu && !pageMenu.classList.contains('hidden')) {
        pageMenu.classList.add('hidden');
        if (logoBtn) logoBtn.setAttribute('aria-expanded', 'false');
      }
    });

  });
})();
