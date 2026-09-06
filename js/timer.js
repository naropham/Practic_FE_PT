/**
 * APP LUYỆN ĐỀ FE - TIMER MODULE (js/timer.js)
 * Quản lý đồng hồ đếm ngược chính xác cao dùng Timestamp Target Delta.
 * Khắc phục triệt để lỗi hoãn/lệch giờ khi tab ở trạng thái inactive/background.
 */

(function (global) {
  'use strict';

  let timerInterval = null;
  let targetEndTime = 0;
  let isRunning = false;
  let currentOnTick = null;
  let currentOnExpire = null;

  function calculateRemainingSeconds() {
    if (!isRunning || targetEndTime <= 0) return 0;
    const diffMs = targetEndTime - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  const TimerModule = {
    /**
     * Bắt đầu đếm ngược đồng hồ.
     * @param {number} durationInSeconds - Số giây đếm ngược (phải > 0)
     * @param {function} onTick - Callback gọi mỗi giây: onTick(formattedTime, isWarning, remainingSec)
     * @param {function} onExpire - Callback gọi khi hết giờ: onExpire()
     */
    start: function (durationInSeconds, onTick, onExpire) {
      this.stop();

      const sec = Math.max(0, parseInt(durationInSeconds, 10) || 0);
      if (sec <= 0) {
        if (typeof onExpire === 'function') onExpire();
        return;
      }

      isRunning = true;
      targetEndTime = Date.now() + sec * 1000;
      currentOnTick = typeof onTick === 'function' ? onTick : null;
      currentOnExpire = typeof onExpire === 'function' ? onExpire : null;

      // Tick lần đầu tiên ngay lập tức
      this.tick();

      timerInterval = setInterval(() => {
        this.tick();
      }, 1000);
    },

    /**
     * Thực hiện 1 nhịp tick đồng hồ
     */
    tick: function () {
      if (!isRunning) return;

      const remainingSec = calculateRemainingSeconds();
      const isWarning = remainingSec <= 300 && remainingSec > 0;

      if (currentOnTick) {
        currentOnTick(this.formatTime(remainingSec), isWarning, remainingSec);
      }

      if (remainingSec <= 0) {
        this.stop();
        if (currentOnExpire) {
          currentOnExpire();
        }
      }
    },

    /**
     * Dừng đồng hồ đếm ngược.
     */
    stop: function () {
      isRunning = false;
      targetEndTime = 0;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    },

    /**
     * Lấy số giây còn lại chính xác.
     * @returns {number}
     */
    getRemainingSeconds: function () {
      return calculateRemainingSeconds();
    },

    /**
     * Format số giây thành chuỗi MM:SS hoặc HH:MM:SS.
     * @param {number} totalSec 
     * @returns {string}
     */
    formatTime: function (totalSec) {
      const sec = Math.max(0, parseInt(totalSec, 10) || 0);
      const hours = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;

      const formattedM = String(m).padStart(2, '0');
      const formattedS = String(s).padStart(2, '0');

      if (hours > 0) {
        const formattedH = String(hours).padStart(2, '0');
        return `${formattedH}:${formattedM}:${formattedS}`;
      }
      return `${formattedM}:${formattedS}`;
    }
  };

  // Cập nhật lập tức thời gian khi chuyển quay lại Tab (Visibility Change Listener)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isRunning) {
        TimerModule.tick();
      }
    });
  }

  global.TimerModule = TimerModule;
})(window);
