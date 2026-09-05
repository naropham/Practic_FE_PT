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

    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const notificationBtn = document.getElementById('notification-btn');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const searchInput = document.getElementById('header-search-input');
    const logoBtn = document.getElementById('header-logo');

    // Nút Bật/Tắt Sidebar
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
        // Phát event tùy chỉnh để các component khác lắng nghe nếu cần
        window.dispatchEvent(new CustomEvent('toggle-sidebar'));
      });
    }

    // Nút Bật/Tắt Dark Mode
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Nút Thông báo
    if (notificationBtn) {
      notificationBtn.addEventListener('click', () => {
        alert("Hiện tại chưa có thông báo mới!");
      });
    }

    // Nút Avatar Người Dùng
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        alert("Trang cá nhân & Cài đặt đang được phát triển!");
      });
    }

    // Nút Logo về trang chủ
    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.goHome === 'function') {
          window.goHome();
        }
      });
    }

    // Xử lý ô Tìm kiếm (Keyboard Accessibility)
    if (searchInput) {
      // Phím tắt Ctrl+K hoặc phím / để focus nhanh vào thanh tìm kiếm
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement !== searchInput)) {
          e.preventDefault();
          searchInput.focus();
        } else if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.blur();
        }
      });

      // Lắng nghe sự kiện gõ ô tìm kiếm
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        window.dispatchEvent(new CustomEvent('header-search', { detail: { query } }));
      });
    }
  });
})();
