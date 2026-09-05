/**
 * APP LUYỆN ĐỀ FE - QUIZ ENGINE MODULE (js/quiz-engine.js)
 * Điều phối làm bài trắc nghiệm, bàn phím phím tắt, Fullscreen, Thanh tiến trình & Nộp bài.
 * Bảo mật: Không eval, Không innerHTML cho dữ liệu động.
 */

(function (global) {
  'use strict';

  // TRẠNG THÁI BÀI THI (QUIZ STATE)
  const quizState = {
    examId: "",
    subject: "",
    examName: "",
    questions: [],
    currentQuestion: 0,
    answers: {},             // Map: { [questionIndex]: answerChar }
    markedQuestions: new Set(),
    isSubmitted: false,
    initialTimeSeconds: 3600
  };

  // CACHE DOM ELEMENTS AN TOÀN
  const DOM = {
    quizView: document.getElementById('quiz-screen-view'),
    subjectTag: document.getElementById('quiz-subject-tag'),
    examTitle: document.getElementById('quiz-exam-title'),
    timerBox: document.getElementById('quiz-timer-box'),
    timerDisplay: document.getElementById('quiz-timer-display'),
    progressText: document.getElementById('quiz-progress-text'),
    progressPercent: document.getElementById('quiz-progress-percent'),
    progressFill: document.getElementById('quiz-progress-fill'),
    answerContainer: document.getElementById('quiz-answer-options'),
    flagCheckbox: document.getElementById('quiz-flag-checkbox'),
    navDotsContainer: document.getElementById('quiz-nav-dots'),
    questionImage: document.getElementById('quiz-question-image'),
    questionIndexLabel: document.getElementById('quiz-question-index-label'),
    prevBtn: document.getElementById('quiz-prev-btn'),
    nextBtn: document.getElementById('quiz-next-btn'),
    submitBtn: document.getElementById('quiz-submit-btn'),
    fullscreenBtn: document.getElementById('quiz-fullscreen-btn')
  };

  /**
   * 1. KHỞI TẠO VÀ BẮT ĐẦU BÀI THI
   */
  function startQuiz(examId, subjectCode, examName, validQuestionsArray) {
    const checkValidExam = (typeof window !== 'undefined' && typeof window.isValidExamId === 'function')
      ? window.isValidExamId
      : function(id) { return typeof id === 'string' && id.trim().length > 0 && id.length <= 100 && !id.includes('..'); };

    if (!examId || !checkValidExam(examId) || !Array.isArray(validQuestionsArray) || validQuestionsArray.length === 0) {
      alert("Không thể bắt đầu: Dữ liệu bộ đề không hợp lệ.");
      return;
    }

    quizState.examId = examId;
    quizState.subject = subjectCode || "Khác";
    quizState.examName = examName || examId;
    quizState.questions = validQuestionsArray;
    quizState.currentQuestion = 0;
    quizState.answers = {};
    quizState.markedQuestions.clear();
    quizState.isSubmitted = false;

    // Kiểm tra bản nháp tiến độ dở dang từ StorageModule
    let initialTimerSec = 3600; // 60 phút mặc định
    if (global.StorageModule) {
      const draft = global.StorageModule.loadDraft(examId);
      if (draft && draft.answers && typeof draft.answers === 'object') {
        quizState.answers = draft.answers;
        if (Array.isArray(draft.markedQuestions)) {
          quizState.markedQuestions = new Set(draft.markedQuestions);
        }
        if (typeof draft.currentQuestion === 'number' && draft.currentQuestion >= 0 && draft.currentQuestion < validQuestionsArray.length) {
          quizState.currentQuestion = draft.currentQuestion;
        }
        if (typeof draft.remainingTime === 'number' && draft.remainingTime >= 0) {
          let rem = draft.remainingTime;
          if (draft.updatedAt) {
            const elapsed = Math.floor((Date.now() - new Date(draft.updatedAt).getTime()) / 1000);
            if (elapsed > 0) {
              rem = Math.max(0, rem - elapsed);
            }
          }
          initialTimerSec = rem;
        }
      }
    }

    // Cập nhật Header Quiz
    if (DOM.subjectTag) DOM.subjectTag.textContent = `MÔN HỌC: ${quizState.subject}`;
    if (DOM.examTitle) DOM.examTitle.textContent = quizState.examName;

    // Khởi động đồng hồ đếm ngược từ TimerModule
    if (global.TimerModule) {
      global.TimerModule.start(
        initialTimerSec,
        function onTick(formattedTime, isWarning) {
          if (DOM.timerDisplay) DOM.timerDisplay.textContent = formattedTime;
          if (DOM.timerBox) {
            if (isWarning) {
              DOM.timerBox.classList.add('timer-warning');
            } else {
              DOM.timerBox.classList.remove('timer-warning');
            }
          }
          autoSaveProgress();
        },
        function onExpire() {
          alert("HẾT GIỜ LÀM BÀI! Hệ thống sẽ tự động nộp bài thi của bạn.");
          submitQuiz(true);
        }
      );
    }

    renderQuizUI();
  }

  /**
   * 2. RENDER GIAO DIỆN CÂU HỎI & BẢNG ĐIỀU HƯỚNG
   */
  function renderQuizUI() {
    const totalQ = quizState.questions.length;
    if (totalQ === 0) return;

    // Đảm bảo chỉ số câu hỏi luôn trong phạm vi hợp lệ
    if (quizState.currentQuestion < 0) quizState.currentQuestion = 0;
    if (quizState.currentQuestion >= totalQ) quizState.currentQuestion = totalQ - 1;

    const idx = quizState.currentQuestion;
    const qItem = quizState.questions[idx];

    // 1. Cập nhật ảnh câu hỏi an toàn
    if (DOM.questionImage) {
      const checkSafe = (typeof global.isSafeUrl === 'function')
        ? global.isSafeUrl
        : (typeof window !== 'undefined' && typeof window.isSafeUrl === 'function' ? window.isSafeUrl : function (url) {
            if (typeof url !== 'string' || !url.trim()) return false;
            const lower = url.trim().toLowerCase();
            return !lower.startsWith('javascript:') && !lower.startsWith('data:') && !lower.startsWith('file:') && !lower.startsWith('vbscript:') && !url.includes('..');
          });

      let safeSrc = '';

      if (qItem.link_media && checkSafe(qItem.link_media)) {
        safeSrc = qItem.link_media;
      } else if (qItem.question && typeof qItem.question === 'string' && checkSafe(qItem.question) && (qItem.question.startsWith('http://') || qItem.question.startsWith('https://'))) {
        safeSrc = qItem.question;
      } else {
        const rawQId = qItem.question_id || `Q${idx + 1}`;
        const safeSub = String(quizState.subject || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const safeExam = String(quizState.examId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const safeQId = String(rawQId).replace('.webp', '').replace(/[^a-zA-Z0-9_-]/g, '');
        const localPath = `./data/images/${safeSub}/${safeExam}/${safeQId}.webp`;
        if (checkSafe(localPath)) {
          safeSrc = localPath;
        }
      }

      if (safeSrc) {
        DOM.questionImage.src = safeSrc;
        DOM.questionImage.style.display = '';
        DOM.questionImage.onerror = function () {
          this.style.display = 'none';
        };
      } else {
        DOM.questionImage.src = '';
        DOM.questionImage.style.display = 'none';
      }
      DOM.questionImage.alt = `Câu hỏi ${idx + 1}`;
    }

    // 2. Nhãn câu hỏi hiện tại
    if (DOM.questionIndexLabel) {
      DOM.questionIndexLabel.textContent = `Câu ${idx + 1} / ${totalQ}`;
    }

    // 3. Checkbox đánh dấu
    if (DOM.flagCheckbox) {
      DOM.flagCheckbox.checked = quizState.markedQuestions.has(idx);
      DOM.flagCheckbox.disabled = quizState.isSubmitted;
    }

    // 4. Trạng thái nút chọn đáp án (A-F)
    const currentAnswerChar = quizState.answers[idx] || null;
    const optButtons = DOM.answerContainer ? DOM.answerContainer.querySelectorAll('.quiz-opt-btn') : [];

    optButtons.forEach(btn => {
      const char = btn.getAttribute('data-answer');
      if (currentAnswerChar === char) {
        btn.classList.add('selected-btn');
      } else {
        btn.classList.remove('selected-btn');
      }
      btn.disabled = quizState.isSubmitted;
    });

    // 5. Nút chuyển câu trước / câu tiếp
    if (DOM.prevBtn) DOM.prevBtn.disabled = (idx === 0);
    if (DOM.nextBtn) DOM.nextBtn.disabled = (idx === totalQ - 1);

    // 6. Thanh tiến trình làm bài
    updateProgressBar();

    // 7. Bảng nốt chuyển câu (Nav Dots)
    renderNavDots();
  }

  /**
   * 3. CẬP NHẬT THANH TIẾN TRÌNH (PROGRESS BAR)
   */
  function updateProgressBar() {
    const totalQ = quizState.questions.length;
    const answeredCount = Object.keys(quizState.answers).length;
    const percent = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

    if (DOM.progressText) DOM.progressText.textContent = `Đã làm: ${answeredCount} / ${totalQ} câu`;
    if (DOM.progressPercent) DOM.progressPercent.textContent = `${percent}%`;
    if (DOM.progressFill) DOM.progressFill.style.width = `${percent}%`;
  }

  /**
   * 4. RENDER BẢNG NỐT CÂU HỎI (QUESTION GRID DOTS)
   */
  function renderNavDots() {
    if (!DOM.navDotsContainer) return;

    DOM.navDotsContainer.replaceChildren();

    quizState.questions.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = "button";
      btn.textContent = String(i + 1);
      btn.setAttribute('data-index', String(i));
      btn.setAttribute('aria-label', `Chuyển tới câu hỏi ${i + 1}`);

      let dotClass = "dot-btn ";

      if (quizState.markedQuestions.has(i)) {
        dotClass += "dot-flagged ";
      } else if (quizState.answers[i]) {
        dotClass += "dot-answered ";
      }

      if (i === quizState.currentQuestion) {
        dotClass += "dot-active ";
      }

      btn.className = dotClass;
      DOM.navDotsContainer.appendChild(btn);
    });
  }

  /**
   * 5. CHỌN ĐÁP ÁN & ĐÁNH DẤU CÂU HỎI
   */
  function selectAnswer(char) {
    if (quizState.isSubmitted || !['A', 'B', 'C', 'D', 'E', 'F'].includes(char)) return;

    const idx = quizState.currentQuestion;
    if (quizState.answers[idx] === char) {
      delete quizState.answers[idx]; // Bỏ chọn nếu click lại
    } else {
      quizState.answers[idx] = char;
    }

    renderQuizUI();
    autoSaveProgress();
  }

  function toggleFlag() {
    if (quizState.isSubmitted) return;

    const idx = quizState.currentQuestion;
    if (quizState.markedQuestions.has(idx)) {
      quizState.markedQuestions.delete(idx);
    } else {
      quizState.markedQuestions.add(idx);
    }

    renderQuizUI();
    autoSaveProgress();
  }

  /**
   * 6. NỘP BÀI THI & HIỂN THỊ CẢNH BÁO
   */
  function submitQuiz(autoSubmit = false) {
    if (quizState.isSubmitted) return;

    const totalQ = quizState.questions.length;
    const answeredCount = Object.keys(quizState.answers).length;
    const unansweredCount = Math.max(0, totalQ - answeredCount);

    if (autoSubmit !== true) {
      let confirmMsg = "Bạn có chắc chắn muốn nộp bài thi?";
      if (unansweredCount > 0) {
        confirmMsg = `⚠️ CẢNH BÁO: Bạn còn ${unansweredCount} câu chưa trả lời!\nBạn có chắc chắn vẫn muốn nộp bài ngay bây giờ?`;
      }

      const confirmed = confirm(confirmMsg);
      if (!confirmed) return;
    }

    if (global.TimerModule) global.TimerModule.stop();

    quizState.isSubmitted = true;
    if (DOM.submitBtn) DOM.submitBtn.style.display = 'none';
    if (DOM.flagCheckbox) DOM.flagCheckbox.disabled = true;

    // Tính toán số câu Đúng, Sai, Bỏ trống với kiểm tra bất biến bảo mật
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    quizState.questions.forEach((q, i) => {
      const correctStr = String(q.correct_answer || '').toUpperCase().trim();
      const userStr = String(quizState.answers[i] || '').toUpperCase().trim();
      if (!userStr) {
        skippedCount++;
      } else if (userStr === correctStr && correctStr !== '') {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    // Đảm bảo tính bất biến toán học tuyệt đối: correct + wrong + skipped === totalQ
    if (correctCount + wrongCount + skippedCount !== totalQ) {
      skippedCount = Math.max(0, totalQ - correctCount - wrongCount);
    }

    const rawScore = totalQ > 0 ? (correctCount / totalQ) * 10 : 0;
    const scoreNum = Math.min(10, Math.max(0, rawScore));
    const score = scoreNum.toFixed(2);

    // 1. Tính toán thời gian làm bài
    const remSec = global.TimerModule ? global.TimerModule.getRemainingSeconds() : 0;
    const spentSec = Math.max(0, 3600 - remSec);
    const spentMins = Math.floor(spentSec / 60);

    // Thu thập danh sách các câu trả lời sai hoặc bỏ trống
    const wrongItemsList = [];
    quizState.questions.forEach((q, i) => {
      const correctStr = String(q.correct_answer || '').toUpperCase().trim();
      const userStr = String(quizState.answers[i] || '').toUpperCase().trim();
      if (userStr !== correctStr) {
        wrongItemsList.push({
          question_id: q.question_id || `Q${i + 1}`,
          question: q,
          userAnswer: userStr,
          correctAnswer: correctStr
        });
      }
    });

    // 2. Lưu vào Lịch sử, Lưu câu sai & Xóa bản nháp tiến độ
    if (global.StorageModule) {
      global.StorageModule.saveExamResult({
        examId: quizState.examId,
        subject: quizState.subject,
        examName: quizState.examName,
        score: score,
        correctCount: correctCount,
        totalQuestions: totalQ,
        timeSpentText: `${spentMins} phút`
      });

      if (wrongItemsList.length > 0) {
        global.StorageModule.saveWrongQuestionItems(
          quizState.examId,
          quizState.subject,
          quizState.examName,
          wrongItemsList
        );
      }

      global.StorageModule.clearDraft(quizState.examId);
    }

    renderQuizUI();

    // 3. Hiển thị Trang Kết Quả Thi (Result Module)
    if (global.ResultModule) {
      global.ResultModule.renderResult({
        examId: quizState.examId,
        subject: quizState.subject,
        examName: quizState.examName,
        questions: quizState.questions,
        userAnswers: quizState.answers,
        spentSeconds: spentSec
      });

      window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'result' } }));
    } else {
      alert(`🎉 ĐÃ NỘP BÀI THÀNH CÔNG!\n\n• Điểm số: ${score} / 10\n• Số câu đúng: ${correctCount} / ${totalQ} câu`);
    }
  }

  /**
   * 7. TỰ ĐỘNG LƯU TIẾN ĐỘ VÀO STORAGE
   */
  function autoSaveProgress() {
    if (quizState.isSubmitted || !global.StorageModule) return;
    const remSec = global.TimerModule ? global.TimerModule.getRemainingSeconds() : 3600;

    global.StorageModule.saveDraft(quizState.examId, {
      answers: quizState.answers,
      markedQuestions: quizState.markedQuestions,
      currentQuestion: quizState.currentQuestion,
      remainingTime: remSec
    });
  }

  /**
   * 8. CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN TOGGLE)
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Không thể bật toàn màn hình:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /**
   * 9. ĐĂNG KÝ EVENT LISTENERS AN TOÀN
   */
  function bindEventListeners() {
    // Event delegation cho các nút đáp án (A-D)
    if (DOM.answerContainer) {
      DOM.answerContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-opt-btn');
        if (btn) {
          const char = btn.getAttribute('data-answer');
          if (char) selectAnswer(char);
        }
      });
    }

    // Checkbox đánh dấu
    if (DOM.flagCheckbox) {
      DOM.flagCheckbox.addEventListener('change', toggleFlag);
    }

    // Nút nộp bài
    if (DOM.submitBtn) {
      DOM.submitBtn.addEventListener('click', () => submitQuiz());
    }

    // Nút Fullscreen
    if (DOM.fullscreenBtn) {
      DOM.fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Nút Câu trước / Câu tiếp
    if (DOM.prevBtn) {
      DOM.prevBtn.addEventListener('click', () => {
        if (quizState.currentQuestion > 0) {
          quizState.currentQuestion--;
          renderQuizUI();
        }
      });
    }

    if (DOM.nextBtn) {
      DOM.nextBtn.addEventListener('click', () => {
        if (quizState.currentQuestion < quizState.questions.length - 1) {
          quizState.currentQuestion++;
          renderQuizUI();
        }
      });
    }

    // Event delegation cho Bảng nốt nhảy câu
    if (DOM.navDotsContainer) {
      DOM.navDotsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.hasAttribute('data-index')) {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < quizState.questions.length) {
            quizState.currentQuestion = idx;
            renderQuizUI();
          }
        }
      });
    }

    // Phím tắt bàn phím (A, B, C, D, Phím mũi tên, Phím F)
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        selectAnswer(key);
      } else if (e.key === 'ArrowRight') {
        if (quizState.currentQuestion < quizState.questions.length - 1) {
          quizState.currentQuestion++;
          renderQuizUI();
        }
      } else if (e.key === 'ArrowLeft') {
        if (quizState.currentQuestion > 0) {
          quizState.currentQuestion--;
          renderQuizUI();
        }
      } else if (key === 'F') {
        toggleFlag();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bindEventListeners);

  global.QuizEngine = {
    startQuiz: startQuiz,
    submitQuiz: submitQuiz
  };
})(window);
