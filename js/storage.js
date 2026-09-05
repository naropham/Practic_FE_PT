/**
 * APP LUYỆN ĐỀ FE - STORAGE MODULE (js/storage.js)
 * Quản lý lưu tự động tiến độ làm bài (Draft) và Lịch sử thi (History).
 * Bảo mật: Không lưu đáp án đúng vào localStorage.
 */

(function (global) {
  'use strict';

  const DRAFT_PREFIX = 'luyenDe_draft_';
  const HISTORY_KEY = 'luyenDe_exam_history';

  const WRONG_KEY = 'luyenDe_wrong_questions';

  const StorageModule = {
    /**
     * Tự động lưu tiến độ dở dang của bài thi.
     * @param {string} examId 
     * @param {object} progressState 
     */
    saveDraft: function (examId, progressState) {
      if (!examId || typeof progressState !== 'object') return;
      try {
        const payload = {
          examId: examId,
          answers: progressState.answers || {}, // Map { [questionIndex]: answerChar }
          markedQuestions: Array.from(progressState.markedQuestions || []),
          currentQuestion: progressState.currentQuestion || 0,
          remainingTime: progressState.remainingTime || 0,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_PREFIX + examId, JSON.stringify(payload));
      } catch (err) {
        console.error("Lỗi tự động lưu tiến độ bài thi:", err);
      }
    },

    /**
     * Nạp lại tiến độ làm bài dở dang nếu có.
     * @param {string} examId 
     * @returns {object|null}
     */
    loadDraft: function (examId) {
      if (!examId) return null;
      try {
        const raw = localStorage.getItem(DRAFT_PREFIX + examId);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (err) {
        console.error("Lỗi nạp bản nháp làm bài:", err);
        return null;
      }
    },

    /**
     * Xóa tiến độ dở dang sau khi đã hoàn thành nộp bài.
     * @param {string} examId 
     */
    clearDraft: function (examId) {
      if (!examId) return;
      try {
        localStorage.removeItem(DRAFT_PREFIX + examId);
      } catch (err) {
        console.error("Lỗi xóa bản nháp:", err);
      }
    },

    /**
     * Lưu kết quả làm bài vào lịch sử thi.
     * @param {object} resultObj 
     */
    saveExamResult: function (resultObj) {
      if (!resultObj || !resultObj.examId) return;
      try {
        const history = this.getExamHistory();
        history.unshift({
          examId: resultObj.examId,
          subject: resultObj.subject || 'Khác',
          examName: resultObj.examName || resultObj.examId,
          score: resultObj.score,
          correctCount: resultObj.correctCount,
          totalQuestions: resultObj.totalQuestions,
          date: new Date().toISOString(),
          dateFormatted: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          timeSpentText: resultObj.timeSpentText || 'N/A'
        });

        // Giữ tối đa 50 bản ghi lịch sử gần nhất
        const trimmedHistory = history.slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));

        // Báo động Custom Event cập nhật UI Dashboard
        window.dispatchEvent(new CustomEvent('exam-submitted'));
      } catch (err) {
        console.error("Lỗi lưu kết quả làm bài:", err);
      }
    },

    /**
     * Lấy toàn bộ danh sách lịch sử thi.
     * @returns {Array<object>}
     */
    getExamHistory: function () {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("Lỗi nạp lịch sử thi:", err);
        return [];
      }
    },

    /**
     * Lấy danh sách toàn bộ các câu làm sai.
     * @returns {Array<object>}
     */
    getWrongQuestions: function () {
      try {
        const raw = localStorage.getItem(WRONG_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("Lỗi nạp danh sách câu sai:", err);
        return [];
      }
    },

    /**
     * Lưu/Cập nhật danh sách câu làm sai sau mỗi bài thi.
     * @param {string} examId 
     * @param {string} subject 
     * @param {string} examName 
     * @param {Array<object>} wrongItemsList 
     */
    saveWrongQuestionItems: function (examId, subject, examName, wrongItemsList) {
      if (!examId || !Array.isArray(wrongItemsList) || wrongItemsList.length === 0) return;
      try {
        const list = this.getWrongQuestions();
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        wrongItemsList.forEach(item => {
          const qId = item.question_id || (item.question ? item.question.question_id : 'Q_UNKNOWN');
          const uniqueId = `${examId}_${qId}`;
          const existingIndex = list.findIndex(w => w.id === uniqueId);

          if (existingIndex >= 0) {
            list[existingIndex].wrongCount = (list[existingIndex].wrongCount || 1) + 1;
            list[existingIndex].lastFailedAt = now.toISOString();
            list[existingIndex].lastFailedFormatted = dateStr;
            list[existingIndex].userAnswer = item.userAnswer || '';
          } else {
            list.push({
              id: uniqueId,
              examId: examId,
              subject: subject || 'Khác',
              examName: examName || examId,
              qId: qId,
              question: item.question,
              userAnswer: item.userAnswer || '',
              correctAnswer: item.correctAnswer || '',
              wrongCount: 1,
              lastFailedAt: now.toISOString(),
              lastFailedFormatted: dateStr
            });
          }
        });

        localStorage.setItem(WRONG_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      } catch (err) {
        console.error("Lỗi lưu danh sách câu sai:", err);
      }
    },

    /**
     * Xóa 1 câu sai khỏi danh sách câu sai (KHÔNG ảnh hưởng đến lịch sử thi).
     * @param {string} targetId 
     */
    removeWrongQuestion: function (targetId) {
      if (!targetId) return;
      try {
        const list = this.getWrongQuestions();
        const filtered = list.filter(item => item.id !== targetId);
        localStorage.setItem(WRONG_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      } catch (err) {
        console.error("Lỗi xóa câu sai khỏi danh sách:", err);
      }
    }
  };

  global.StorageModule = StorageModule;
})(window);
