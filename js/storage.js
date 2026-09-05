/**
 * APP LUYỆN ĐỀ FE - STORAGE MODULE (js/storage.js)
 * Quản lý lưu tự động tiến độ làm bài (Draft), Lịch sử thi (History) & Câu sai (Wrong Questions).
 * Bảo mật: 
 * - 100% JSON.parse bọc try/catch.
 * - Kiểm tra kiểu dữ liệu, giới hạn độ dài chuỗi, số hữu hạn (Number.isFinite).
 * - Không tin tưởng score từ localStorage (tự động tính lại & clamp 0-10).
 * - Chỉ lưu đáp án trong lịch sử bài thi để người học xem lại kết quả của chính mình.
 */

(function (global) {
  'use strict';

  const DRAFT_PREFIX = 'luyenDe_draft_';
  const HISTORY_KEY = 'luyenDe_exam_history';
  const WRONG_KEY = 'luyenDe_wrong_questions';

  // --- HELPER VALIDATORS ---

  function isFiniteNumber(val) {
    return typeof val === 'number' && Number.isFinite(val);
  }

  function isNonNegativeNumber(val) {
    return isFiniteNumber(val) && val >= 0;
  }

  function sanitizeString(val, defaultVal, maxLen) {
    if (typeof val !== 'string') return defaultVal || '';
    const trimmed = val.trim();
    if (!trimmed) return defaultVal || '';
    const limit = maxLen || 500;
    return trimmed.length > limit ? trimmed.substring(0, limit) : trimmed;
  }

  function sanitizeQuestionDetails(details) {
    if (!Array.isArray(details)) return [];

    return details.slice(0, 500).map(item => {
      if (!item || typeof item !== 'object') return null;
      const media = sanitizeString(item.linkMedia || item.link_media, '', 1000);
      return {
        questionId: sanitizeString(item.questionId || item.question_id, '', 150),
        questionText: sanitizeString(item.questionText || item.question, '', 2000),
        linkMedia: media && typeof window !== 'undefined' && typeof window.isSafeUrl === 'function' && window.isSafeUrl(media) ? media : '',
        userAnswer: sanitizeString(item.userAnswer, '', 50),
        correctAnswer: sanitizeString(item.correctAnswer, 'N/A', 50),
        isCorrect: item.isCorrect === true,
        isMarked: item.isMarked === true
      };
    }).filter(Boolean);
  }

  function validateExamId(examId) {
    if (typeof window !== 'undefined' && typeof window.isValidExamId === 'function') {
      return window.isValidExamId(examId);
    }
    if (typeof examId !== 'string') return false;
    const trimmed = examId.trim();
    if (!trimmed || trimmed.length > 100 || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) return false;
    if (trimmed.startsWith('PRACTICE_') || trimmed.startsWith('WRONG_')) return true;
    return /^[a-zA-Z0-9_\-]+$/.test(trimmed);
  }

  /**
   * Tính lại hoặc clamp điểm số hợp lệ trong khoảng [0, 10]
   */
  function recalculateScore(correctCount, totalQuestions, rawScore) {
    const c = isNonNegativeNumber(correctCount) ? Math.floor(correctCount) : 0;
    const t = isFiniteNumber(totalQuestions) && totalQuestions > 0 ? Math.floor(totalQuestions) : 0;

    if (t > 0) {
      const calc = Number(((c / t) * 10).toFixed(2));
      const clampedCalc = Math.max(0, Math.min(10, calc));

      if (!isFiniteNumber(rawScore) || rawScore < 0 || rawScore > 10 || Math.abs(rawScore - clampedCalc) > 0.5) {
        return clampedCalc;
      }
      return Number(Math.max(0, Math.min(10, rawScore)).toFixed(2));
    }

    if (isFiniteNumber(rawScore)) {
      return Number(Math.max(0, Math.min(10, rawScore)).toFixed(2));
    }

    return 0;
  }

  // --- STORAGE MODULE CORE ---

  const StorageModule = {
    /**
     * Tự động lưu tiến độ dở dang của bài thi.
     * @param {string} examId 
     * @param {object} progressState 
     */
    saveDraft: function (examId, progressState) {
      if (!validateExamId(examId) || !progressState || typeof progressState !== 'object') return;
      try {
        const sanitizedAnswers = {};
        if (progressState.answers && typeof progressState.answers === 'object') {
          Object.keys(progressState.answers).forEach(key => {
            const val = progressState.answers[key];
            if (typeof val === 'string' && val.length <= 10) {
              sanitizedAnswers[sanitizeString(key, '', 20)] = val.trim();
            }
          });
        }

        const sanitizedFlags = Array.isArray(progressState.markedQuestions) 
          ? progressState.markedQuestions.filter(i => isFiniteNumber(i) || typeof i === 'string').map(i => String(i).slice(0, 20))
          : [];

        const payload = {
          examId: examId,
          answers: sanitizedAnswers,
          markedQuestions: sanitizedFlags,
          currentQuestion: isNonNegativeNumber(progressState.currentQuestion) ? Math.floor(progressState.currentQuestion) : 0,
          remainingTime: isNonNegativeNumber(progressState.remainingTime) ? Math.floor(progressState.remainingTime) : 0,
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
      if (!validateExamId(examId)) return null;
      try {
        const raw = localStorage.getItem(DRAFT_PREFIX + examId);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || parsed.examId !== examId) {
          this.clearDraft(examId);
          return null;
        }

        // Validate cấu trúc draft
        const answers = (parsed.answers && typeof parsed.answers === 'object') ? parsed.answers : {};
        const markedQuestions = Array.isArray(parsed.markedQuestions) ? parsed.markedQuestions : [];
        const currentQuestion = isNonNegativeNumber(parsed.currentQuestion) ? Math.floor(parsed.currentQuestion) : 0;
        const remainingTime = isNonNegativeNumber(parsed.remainingTime) ? Math.floor(parsed.remainingTime) : 0;

        return {
          examId: examId,
          answers: answers,
          markedQuestions: markedQuestions,
          currentQuestion: currentQuestion,
          remainingTime: remainingTime,
          updatedAt: sanitizeString(parsed.updatedAt, new Date().toISOString(), 100)
        };
      } catch (err) {
        console.error("Lỗi nạp bản nháp làm bài:", err);
        this.clearDraft(examId);
        return null;
      }
    },

    /**
     * Xóa tiến độ dở dang sau khi đã hoàn thành nộp bài.
     * @param {string} examId 
     */
    clearDraft: function (examId) {
      if (!validateExamId(examId)) return;
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
      if (!resultObj || !validateExamId(resultObj.examId)) return;
      try {
        const history = this.getExamHistory();
        const totalQ = isFiniteNumber(resultObj.totalQuestions) && resultObj.totalQuestions > 0 
          ? Math.floor(resultObj.totalQuestions) : 50;
        const correctC = isNonNegativeNumber(resultObj.correctCount) 
          ? Math.floor(resultObj.correctCount) : 0;
        const wrongC = isNonNegativeNumber(resultObj.wrongCount) 
          ? Math.floor(resultObj.wrongCount) : Math.max(0, totalQ - correctC);
        const scoreVal = recalculateScore(correctC, totalQ, resultObj.score);

        const now = new Date();
        history.unshift({
          examId: resultObj.examId,
          subject: sanitizeString(resultObj.subject, 'Khác', 100),
          examName: sanitizeString(resultObj.examName, resultObj.examId, 200),
          score: scoreVal,
          correctCount: correctC,
          wrongCount: wrongC,
          totalQuestions: totalQ,
          questionDetails: sanitizeQuestionDetails(resultObj.questionDetails),
          date: now.toISOString(),
          dateFormatted: now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          timeSpentText: sanitizeString(resultObj.timeSpentText, 'N/A', 50)
        });

        // Giữ tối đa 50 bản ghi lịch sử gần nhất
        const trimmedHistory = history.slice(0, 50);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));

        // Phát Custom Event cập nhật UI Dashboard
        window.dispatchEvent(new CustomEvent('exam-submitted'));
      } catch (err) {
        console.error("Lỗi lưu kết quả làm bài:", err);
      }
    },

    /**
     * Lấy toàn bộ danh sách lịch sử thi đã qua kiểm duyệt an toàn.
     * @returns {Array<object>}
     */
    getExamHistory: function () {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          console.warn("Dữ liệu exam_history trong localStorage bị lỗi, khởi tạo lại mảng trống.");
          return [];
        }

        const validHistory = [];
        let hasCorrupted = false;

        parsed.forEach(item => {
          if (!item || typeof item !== 'object') {
            hasCorrupted = true;
            return;
          }

          const examId = sanitizeString(item.examId, '', 100);
          if (!examId) {
            hasCorrupted = true;
            return;
          }

          const totalQ = isFiniteNumber(item.totalQuestions) && item.totalQuestions > 0 
            ? Math.floor(item.totalQuestions) : 50;
          const correctC = isNonNegativeNumber(item.correctCount) 
            ? Math.floor(item.correctCount) : 0;
          const wrongC = isNonNegativeNumber(item.wrongCount) 
            ? Math.floor(item.wrongCount) : Math.max(0, totalQ - correctC);
          const scoreVal = recalculateScore(correctC, totalQ, item.score);

          validHistory.push({
            examId: examId,
            subject: sanitizeString(item.subject, 'Khác', 100),
            examName: sanitizeString(item.examName || item.examTitle, examId, 200),
            score: scoreVal,
            correctCount: correctC,
            wrongCount: wrongC,
            totalQuestions: totalQ,
            questionDetails: sanitizeQuestionDetails(item.questionDetails),
            date: sanitizeString(item.date, new Date().toISOString(), 100),
            dateFormatted: sanitizeString(item.dateFormatted, '', 100),
            timeSpentText: sanitizeString(item.timeSpentText, 'N/A', 50)
          });
        });

        // Nếu phát hiện dữ liệu hỏng, cập nhật lại localStorage bằng dữ liệu đã làm sạch
        if (hasCorrupted) {
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
          } catch (e) {}
        }

        return validHistory;
      } catch (err) {
        console.error("Lỗi nạp lịch sử thi:", err);
        return [];
      }
    },

    /**
     * Lấy danh sách toàn bộ các câu làm sai đã qua kiểm duyệt an toàn.
     * @returns {Array<object>}
     */
    getWrongQuestions: function () {
      try {
        const raw = localStorage.getItem(WRONG_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          console.warn("Dữ liệu wrong_questions trong localStorage bị lỗi, khởi tạo lại mảng trống.");
          return [];
        }

        const validList = [];
        let hasCorrupted = false;

        parsed.forEach(item => {
          if (!item || typeof item !== 'object') {
            hasCorrupted = true;
            return;
          }

          const id = sanitizeString(item.id, '', 150);
          const examId = sanitizeString(item.examId, '', 100);
          if (!id || !examId) {
            hasCorrupted = true;
            return;
          }

          validList.push({
            id: id,
            examId: examId,
            subject: sanitizeString(item.subject, 'Khác', 100),
            examName: sanitizeString(item.examName, examId, 200),
            qId: sanitizeString(item.qId, 'Q_UNKNOWN', 100),
            question: typeof item.question === 'object' && item.question !== null 
              ? item.question 
              : sanitizeString(item.question, '', 5000),
            userAnswer: sanitizeString(item.userAnswer, '', 20),
            correctAnswer: sanitizeString(item.correctAnswer, '', 20),
            wrongCount: isFiniteNumber(item.wrongCount) && item.wrongCount >= 1 
              ? Math.floor(item.wrongCount) : 1,
            lastFailedAt: sanitizeString(item.lastFailedAt, new Date().toISOString(), 100),
            lastFailedFormatted: sanitizeString(item.lastFailedFormatted, '', 100)
          });
        });

        if (hasCorrupted) {
          try {
            localStorage.setItem(WRONG_KEY, JSON.stringify(validList));
          } catch (e) {}
        }

        return validList;
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
      if (!validateExamId(examId) || !Array.isArray(wrongItemsList) || wrongItemsList.length === 0) return;
      try {
        const list = this.getWrongQuestions();
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        wrongItemsList.forEach(item => {
          if (!item || typeof item !== 'object') return;

          const rawQId = item.question_id || (item.question && typeof item.question === 'object' ? item.question.question_id : 'Q_UNKNOWN');
          const qId = sanitizeString(rawQId, 'Q_UNKNOWN', 100);
          const uniqueId = `${examId}_${qId}`;
          const existingIndex = list.findIndex(w => w.id === uniqueId);

          const userAns = sanitizeString(item.userAnswer, '', 20);
          const correctAns = sanitizeString(item.correctAnswer, '', 20);

          if (existingIndex >= 0) {
            list[existingIndex].wrongCount = (list[existingIndex].wrongCount || 1) + 1;
            list[existingIndex].lastFailedAt = now.toISOString();
            list[existingIndex].lastFailedFormatted = dateStr;
            list[existingIndex].userAnswer = userAns;
          } else {
            list.push({
              id: uniqueId,
              examId: examId,
              subject: sanitizeString(subject, 'Khác', 100),
              examName: sanitizeString(examName, examId, 200),
              qId: qId,
              question: item.question,
              userAnswer: userAns,
              correctAnswer: correctAns,
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
     * Xóa 1 câu sai khỏi danh sách câu sai.
     * @param {string} targetId 
     */
    removeWrongQuestion: function (targetId) {
      if (!targetId || typeof targetId !== 'string') return;
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
