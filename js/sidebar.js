/**
 * APP LUYỆN ĐỀ FE - SIDEBAR COMPONENT SCRIPT
 * Quản lý chọn trang (Active State), Điều hướng Bàn phím (Keyboard Navigation) & Responsive Off-Canvas.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const navList = document.querySelector('.sidebar-nav');

    if (!navList) return;

    const navLinks = Array.from(navList.querySelectorAll('.nav-link'));

    /**
     * 1. ĐÓNG/MỞ SIDEBAR TRÊN MOBILE & OVERLAY
     */
    function closeMobileSidebar() {
      document.body.classList.remove('sidebar-open');
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeMobileSidebar);
    }

    // Lắng nghe sự kiện custom từ Header để mở/đóng Sidebar trên Mobile
    window.addEventListener('toggle-sidebar', () => {
      document.body.classList.toggle('sidebar-open');
    });

    /**
     * 2. XỬ LÝ CLICK CHỌN TRANG (NO PAGE RELOAD)
     */
    function setActivePage(targetBtn) {
      if (!targetBtn) return;

      navLinks.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      });

      targetBtn.classList.add('active');
      targetBtn.setAttribute('aria-current', 'page');

      const pageKey = targetBtn.getAttribute('data-page');

      // Tự động đóng sidebar trên màn hình di động sau khi chọn
      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      }

      // Phát Custom Event thông báo đổi trang cho ứng dụng chính
      window.dispatchEvent(new CustomEvent('page-change', {
        detail: { page: pageKey }
      }));
    }

    // Event Delegation lắng nghe click duy nhất tại thẻ ul
    navList.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-link');
      if (btn) {
        setActivePage(btn);
      }
    });

    /**
     * 3. ĐIỀU HƯỚNG BÀN PHÍM CHUẨN ACCESSIBILITY (WAI-ARIA Menu pattern)
     */
    navList.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement;
      const currentIndex = navLinks.indexOf(activeElement);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % navLinks.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + navLinks.length) % navLinks.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = navLinks.length - 1;
      }

      if (nextIndex !== currentIndex) {
        navLinks[nextIndex].focus();
      }
    });
  });
})();
