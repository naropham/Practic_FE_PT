/**
 * APP LUYỆN ĐỀ FE - TIMER MODULE (js/timer.js)
 * Quản lý đồng hồ đếm ngược, cảnh báo khi còn 5 phút và tự động kích hoạt hết giờ.
 */

(function (global) {
  'use strict';

  let timerInterval = null;
  let remainingSeconds = 0;

  const TimerModule = {
    /**
     * Bắt đầu đếm ngược đồng hồ.
     * @param {number} durationInSeconds - Số giây đếm ngược
     * @param {function} onTick - Callback gọi mỗi giây: onTick(formattedTime, isWarning, remainingSec)
     * @param {function} onExpire - Callback gọi khi hết giờ: onExpire()
     */
    start: function (durationInSeconds, onTick, onExpire) {
      this.stop();

      remainingSeconds = Math.max(0, parseInt(durationInSeconds, 10) || 0);

      // Gọi lần đầu lập tức
      if (typeof onTick === 'function') {
        const isWarning = remainingSeconds <= 300 && remainingSeconds > 0;
        onTick(this.formatTime(remainingSeconds), isWarning, remainingSeconds);
      }

      timerInterval = setInterval(() => {
        remainingSeconds--;

        if (remainingSeconds <= 0) {
          remainingSeconds = 0;
          this.stop();

          if (typeof onTick === 'function') {
            onTick(this.formatTime(0), true, 0);
          }

          if (typeof onExpire === 'function') {
            onExpire();
          }
          return;
        }

        const isWarning = remainingSeconds <= 300;
        if (typeof onTick === 'function') {
          onTick(this.formatTime(remainingSeconds), isWarning, remainingSeconds);
        }
      }, 1000);
    },

    /**
     * Dừng đồng hồ đếm ngược.
     */
    stop: function () {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    },

    /**
     * Lấy số giây còn lại.
     * @returns {number}
     */
    getRemainingSeconds: function () {
      return Math.max(0, remainingSeconds);
    },

    /**
     * Format số giây thành chuỗi MM:SS.
     * @param {number} totalSec 
     * @returns {string}
     */
    formatTime: function (totalSec) {
      const sec = Math.max(0, parseInt(totalSec, 10) || 0);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  };

  global.TimerModule = TimerModule;
})(window);
