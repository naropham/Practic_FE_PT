/**
 * APP LUYỆN ĐỀ FE - THEME MODULE (js/theme.js)
 * Quản lý Dark Mode, Light Mode & System Preference chuẩn Accessibility.
 * Thứ tự ưu tiên: User Preference > System Preference.
 * Lưu preference vào localStorage, không flash trắng màn hình khi khởi động.
 */

(function (global) {
  'use strict';

  const THEME_KEY = 'luyenDe_theme_preference';

  /**
   * Lấy preference hiện tại của người dùng ('light' | 'dark' | 'system')
   */
  function getPreference() {
    try {
      const val = localStorage.getItem(THEME_KEY);
      if (val === 'dark' || val === 'light' || val === 'system') {
        return val;
      }
    } catch (e) {
      console.error("Lỗi đọc theme preference:", e);
    }
    return 'system'; // Mặc định theo hệ thống
  }

  /**
   * Kiểm tra xem giao diện hiện tại có đang là Dark mode hay không
   */
  function isDarkModeActive() {
    const pref = getPreference();
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Áp dụng Theme lên thẻ <html> (document.documentElement)
   * @param {string} mode - 'light' | 'dark' | 'system'
   */
  function applyTheme(mode) {
    const targetMode = mode || getPreference();
    let isDark = false;

    if (targetMode === 'dark') {
      isDark = true;
    } else if (targetMode === 'light') {
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

    // Phát sự kiện custom thông báo cho toàn hệ thống
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { mode: targetMode, isDark: isDark }
    }));
  }

  /**
   * Đặt Preference mới của người dùng và lưu vào localStorage
   * @param {string} mode - 'light' | 'dark' | 'system'
   */
  function setPreference(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.error("Lỗi lưu theme preference:", e);
    }
    applyTheme(mode);
  }

  /**
   * Chuyển đổi qua lại giữa Light và Dark (hoặc System)
   */
  function toggleTheme() {
    const isDark = isDarkModeActive();
    setPreference(isDark ? 'light' : 'dark');
  }

  /**
   * Đăng ký lắng nghe sự kiện thay đổi giao diện từ hệ điều hành (OS System Preference)
   */
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = function () {
      if (getPreference() === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
  });

  global.ThemeModule = {
    getPreference: getPreference,
    setPreference: setPreference,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    isDarkModeActive: isDarkModeActive
  };
})(window);
