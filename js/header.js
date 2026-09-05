/**
 * APP LUYỆN ĐỀ FE - HEADER COMPONENT SCRIPT
 * Quản lý Dark Mode, Sidebar Toggle, Phím tắt Search & Accessibility.
 */

(function () {
  'use strict';

  // KEY LƯU THEME TRONG LOCALSTORAGE (Không chứa dữ liệu nhạy cảm)
  const THEME_STORAGE_KEY = 'luyenDe_theme_preference';

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
   * 2. RÀNG BUỘC SỰ KIỆN AN TOÀN KHI DOM ĐÃ SẴN SÀNG
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Theme ban đầu
    initTheme();

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const logoBtn = document.getElementById('header-logo');
    const pageMenu = document.getElementById('header-page-menu');

    // Nút Bật/Tắt Dark Mode
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Nút Avatar Người Dùng
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        alert("Trang cá nhân & Cài đặt đang được phát triển!");
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
