/**
 * APP LUYỆN ĐỀ FE - TEST RESULT MODULE (js/result.js)
 * Quản lý hiển thị trang kết quả bài thi chuyên nghiệp, bảo mật & trực quan.
 * Điểm số được tính toán lại trực tiếp từ dữ liệu bài làm (chống sửa DOM phía client).
 */

(function (global) {
  'use strict';

  // Lưu session bài làm hiện tại để hỗ trợ Làm lại / Ôn câu sai
  let currentResultSession = null;

  /**
   * 1. TÍNH TOÁN & RENDER KẾT QUẢ BÀI THI AN TOÀN
   * @param {object} sessionData - { examId, subject, examName, questions, userAnswers, spentSeconds }
   */
  function renderResult(sessionData) {
    if (!sessionData || !Array.isArray(sessionData.questions)) {
      console.error("Dữ liệu session không hợp lệ.");
      return;
    }

    currentResultSession = sessionData;

    const questions = sessionData.questions;
    const userAnswers = sessionData.userAnswers || {};
    const totalQuestions = questions.length;

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    // Tính toán lại kết quả trực tiếp từ dữ liệu bài làm (Security Check)
    questions.forEach((q, i) => {
      const correctStr = String(q.correct_answer || '').toUpperCase().trim();
      const userAns = userAnswers[i];
      const userStr = String(userAns || '').toUpperCase().trim();

      if (!userStr) {
        skippedCount++;
      } else if (userStr === correctStr && correctStr !== '') {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const scoreNum = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
    const scoreFormatted = scoreNum.toFixed(2);
    const accuracyRatePct = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : "0.0";

    // Tính định dạng thời gian làm bài
    const spentSec = Math.max(0, sessionData.spentSeconds || 0);
    const spentMins = Math.floor(spentSec / 60);
    const remSec = spentSec % 60;
    const timeFormatted = `${String(spentMins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;

    // Cập nhật DOM các chỉ số số liệu an toàn với textContent
    const scoreValEl = document.getElementById('res-score-value');
    if (scoreValEl) scoreValEl.textContent = scoreFormatted;

    const correctValEl = document.getElementById('res-correct-count');
    if (correctValEl) correctValEl.textContent = String(correctCount);

    const wrongValEl = document.getElementById('res-wrong-count');
    if (wrongValEl) wrongValEl.textContent = String(wrongCount);

    const skippedValEl = document.getElementById('res-skipped-count');
    if (skippedValEl) skippedValEl.textContent = String(skippedCount);

    const accuracyValEl = document.getElementById('res-accuracy-rate');
    if (accuracyValEl) accuracyValEl.textContent = `${accuracyRatePct}%`;

    const timeSpentEl = document.getElementById('res-time-spent');
    if (timeSpentEl) timeSpentEl.textContent = timeFormatted;

    // Cập nhật Biểu đồ Phân tích (Breakdown Bar)
    const correctPct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const wrongPct = totalQuestions > 0 ? (wrongCount / totalQuestions) * 100 : 0;
    const skippedPct = totalQuestions > 0 ? (skippedCount / totalQuestions) * 100 : 0;

    const segCorrectEl = document.getElementById('res-seg-correct');
    if (segCorrectEl) segCorrectEl.style.width = `${correctPct}%`;

    const segWrongEl = document.getElementById('res-seg-wrong');
    if (segWrongEl) segWrongEl.style.width = `${wrongPct}%`;

    const segSkippedEl = document.getElementById('res-seg-skipped');
    if (segSkippedEl) segSkippedEl.style.width = `${skippedPct}%`;

    const legCorrectEl = document.getElementById('legend-correct-text');
    if (legCorrectEl) legCorrectEl.textContent = `Đúng: ${correctCount}`;

    const legWrongEl = document.getElementById('legend-wrong-text');
    if (legWrongEl) legWrongEl.textContent = `Sai: ${wrongCount}`;

    const legSkippedEl = document.getElementById('legend-skipped-text');
    if (legSkippedEl) legSkippedEl.textContent = `Bỏ trống: ${skippedCount}`;

    // Cập nhật Phân loại Điểm số & Nhận xét
    updateGradeClassification(parseFloat(accuracyRatePct));
  }

  /**
   * 2. CẬP NHẬT BADGE VÀ LỜI NHẬN XÉT THEO TỶ LỆ CHÍNH XÁC (ĐIỂM SỐ)
   * >= 90: Xuất sắc
   * >= 80: Rất tốt
   * >= 65: Khá
   * >= 50: Cần cố gắng
   * < 50: Hãy ôn tập thêm
   */
  function updateGradeClassification(accuracyPct) {
    const badgeEl = document.getElementById('res-grade-badge');
    const feedbackEl = document.getElementById('res-feedback-msg');
    if (!badgeEl || !feedbackEl) return;

    badgeEl.className = "result-grade-badge ";

    if (accuracyPct >= 90) {
      badgeEl.classList.add('grade-excellent');
      badgeEl.textContent = "Xuất sắc 🌟";
      feedbackEl.textContent = "Chúc mừng! Bạn đã hoàn thành bài thi với kết quả tuyệt vời!";
    } else if (accuracyPct >= 80) {
      badgeEl.classList.add('grade-verygood');
      badgeEl.textContent = "Rất tốt 👏";
      feedbackEl.textContent = "Kết quả rất tốt! Hãy tiếp tục duy trì phong độ này nhé!";
    } else if (accuracyPct >= 65) {
      badgeEl.classList.add('grade-good');
      badgeEl.textContent = "Khá 👍";
      feedbackEl.textContent = "Bạn làm bài khá tốt, ôn tập thêm một chút nữa để bứt phá điểm số nhé!";
    } else if (accuracyPct >= 50) {
      badgeEl.classList.add('grade-average');
      badgeEl.textContent = "Cần cố gắng 💪";
      feedbackEl.textContent = "Bạn đã vượt qua điểm liệt nhưng cần cố gắng luyện tập thêm!";
    } else {
      badgeEl.classList.add('grade-poor');
      badgeEl.textContent = "Hãy ôn tập thêm 📚";
      feedbackEl.textContent = "Đừng nản lòng! Hãy ôn lại các câu chưa làm tốt và thử lại nhé!";
    }
  }

  /**
   * 3. ĐĂNG KÝ CÁC EVENT LISTENERS CHO CÁC NÚT THAO TÁC
   */
  function bindEventListeners() {
    const btnReview = document.getElementById('btn-res-review');
    const btnRetry = document.getElementById('btn-res-retry');
    const btnReviewWrong = document.getElementById('btn-res-review-wrong');
    const btnHome = document.getElementById('btn-res-home');

    // Nút Xem lại bài
    if (btnReview) {
      btnReview.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
      });
    }

    // Nút Làm lại
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        if (currentResultSession && window.QuizEngine) {
          window.QuizEngine.startQuiz(
            currentResultSession.examId,
            currentResultSession.subject,
            currentResultSession.examName,
            currentResultSession.questions
          );
          window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
        }
      });
    }

    // Nút Ôn câu sai
    if (btnReviewWrong) {
      btnReviewWrong.addEventListener('click', () => {
        if (!currentResultSession || !Array.isArray(currentResultSession.questions)) return;

        const wrongQuestions = currentResultSession.questions.filter((q, i) => {
          const correctStr = String(q.correct_answer || '').toUpperCase().trim();
          const userStr = String(currentResultSession.userAnswers[i] || '').toUpperCase().trim();
          return userStr !== correctStr;
        });

        if (wrongQuestions.length === 0) {
          alert("Tuyệt vời! Bạn không làm sai câu nào trong bài thi này 🎉");
          return;
        }

        if (window.QuizEngine) {
          window.QuizEngine.startQuiz(
            currentResultSession.examId,
            currentResultSession.subject,
            `${currentResultSession.examName} (Ôn câu sai - ${wrongQuestions.length} câu)`,
            wrongQuestions
          );
          window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
        }
      });
    }

    // Nút Về trang chủ
    if (btnHome) {
      btnHome.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'home' } }));
      });
    }
  }

  document.addEventListener('DOMContentLoaded', bindEventListeners);

  global.ResultModule = {
    renderResult: renderResult
  };
})(window);
