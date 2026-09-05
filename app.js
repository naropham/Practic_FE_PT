/**
 * APP LUYỆN ĐỀ FE - MAIN APPLICATION MODULE
 * Kiến trúc code tuân thủ 20 nguyên tắc bảo mật và tối ưu hóa DOM.
 */

// ==========================================
// 1. TIỆN ÍCH BẢO MẬT & VALIDATE (Security & Validation Utils)
// ==========================================

/**
 * An toàn làm sạch tên file/path để chống Path Traversal và XSS.
 * @param {string} str 
 * @returns {string}
 */
function sanitizePathSegment(str) {
    if (typeof str !== 'string') return '';
    // Chỉ cho phép ký tự chữ, số, dấu gạch ngang và gạch dưới
    return str.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Kiểm tra xem 1 chuỗi URL có hợp lệ và thuộc protocol an toàn (http/https/file) hay không.
 * @param {string} urlString 
 * @returns {boolean}
 */
function isSafeUrl(urlString) {
    if (typeof urlString !== 'string' || !urlString.trim()) return false;
    try {
        const parsed = new URL(urlString.trim(), window.location.origin);
        return ['http:', 'https:', 'file:'].includes(parsed.protocol);
    } catch (_) {
        return false;
    }
}

/**
 * Escape chuỗi văn bản thuần túy phòng chống XSS khi render.
 * @param {string} text 
 * @returns {string}
 */
function escapeText(text) {
    const span = document.createElement('span');
    span.textContent = String(text ?? '');
    return span.textContent;
}

/**
 * Validate và chuẩn hóa dữ liệu từng câu hỏi nhập vào từ CSV/XLSX.
 * @param {any} rawItem 
 * @returns {object|null}
 */
function validateQuestionItem(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') return null;

    const rawId = rawItem.question_id || rawItem['question_id.webp'] || rawItem['link_media'] || rawItem.question;
    if (!rawId) return null;

    const rawAns = rawItem.correct_answer || rawItem['correct_answer'] || rawItem.answer || '';
    const cleanAns = String(rawAns).toUpperCase().replace(/[^A-F]/g, '').split('').sort().join('');

    return {
        question_id: String(rawId).trim(),
        correct_answer: cleanAns,
        link_media: typeof rawItem.link_media === 'string' ? rawItem.link_media.trim() : '',
        question: typeof rawItem.question === 'string' ? rawItem.question.trim() : ''
    };
}

/**
 * Validate toàn bộ mảng danh sách câu hỏi.
 * @param {any} dataArray 
 * @returns {Array<object>}
 */
function validateExamData(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    const validQuestions = [];
    for (const item of dataArray) {
        const validated = validateQuestionItem(item);
        if (validated) {
            validQuestions.push(validated);
        }
    }
    return validQuestions;
}


// ==========================================
// 2. STATE ỨNG DỤNG (Application State)
// ==========================================

const state = {
    currentExam: "",
    currentSubject: "",
    questions: [],
    currentIndex: 0,
    userAnswers: [], // Array<Set<string>>
    flaggedQuestions: new Set(),
    isSubmitted: false,
    timerInterval: null,
    timeRemaining: 0
};


// ==========================================
// 3. CACHE DOM ELEMENTS (Safe DOM references)
// ==========================================

const DOM = {
    appLogo: document.getElementById('app-logo'),
    timeInput: document.getElementById('time-input'),
    examSelect: document.getElementById('exam-select'),
    quizContainer: document.getElementById('quiz-container'),
    qImage: document.getElementById('question-image'),
    qIndexLabel: document.getElementById('question-index'),
    questionFeedback: document.getElementById('question-feedback'),
    scoreBoard: document.getElementById('score-board'),
    navDots: document.getElementById('nav-dots'),
    submitBtn: document.getElementById('submit-btn'),
    flagCheckbox: document.getElementById('flag-checkbox'),
    timerDisplay: document.getElementById('timer-display'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    answerOptionsContainer: document.getElementById('answer-options'),
    lastUpdateSpan: document.getElementById('last-update')
};


// ==========================================
// 4. QUẢN LÝ ĐỒNG HỒ & THỜI GIAN (Timer Logic)
// ==========================================

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (DOM.timerDisplay) {
        DOM.timerDisplay.classList.remove('animate-pulse');
    }
}

function updateTimerDisplay() {
    if (!DOM.timerDisplay) return;
    const m = Math.floor(state.timeRemaining / 60);
    const s = state.timeRemaining % 60;
    const formattedMinutes = String(m).padStart(2, '0');
    const formattedSeconds = String(s).padStart(2, '0');
    
    DOM.timerDisplay.textContent = `⏳ ${formattedMinutes}:${formattedSeconds}`;

    if (state.timeRemaining <= 60) {
        DOM.timerDisplay.classList.add('animate-pulse');
    } else {
        DOM.timerDisplay.classList.remove('animate-pulse');
    }
}

function startTimer() {
    stopTimer();
    if (!DOM.timeInput || !DOM.timerDisplay) return;

    const rawVal = DOM.timeInput.value ? parseInt(DOM.timeInput.value, 10) : NaN;

    if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 600) { // Giới hạn tối đa 600 phút
        state.timeRemaining = rawVal * 60;
        DOM.timerDisplay.classList.remove('hidden');
        updateTimerDisplay();

        state.timerInterval = setInterval(() => {
            try {
                if (state.isSubmitted) {
                    stopTimer();
                    return;
                }
                state.timeRemaining--;
                updateTimerDisplay();

                if (state.timeRemaining <= 0) {
                    stopTimer();
                    alert("Hết thời gian làm bài! Hệ thống sẽ tự động nộp bài.");
                    submitTest(true);
                }
            } catch (err) {
                console.error("Lỗi trong vòng lặp đếm giờ:", err);
                stopTimer();
            }
        }, 1000);
    } else {
        DOM.timerDisplay.classList.add('hidden');
    }
}


// ==========================================
// 5. NẠP DỮ LIỆU BỘ ĐỀ (Exam Loader)
// ==========================================

function populateExamSelect() {
    if (!DOM.examSelect || typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) return;

    DOM.examSelect.replaceChildren();

    // Option mặc định
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Chọn bộ đề --";
    DOM.examSelect.appendChild(defaultOption);

    const subjects = [...new Set(EXAM_LIST.map(e => e.subject || "Khác"))];

    subjects.forEach(subject => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = escapeText(subject);

        const examsInSubject = EXAM_LIST.filter(e => (e.subject || "Khác") === subject);
        examsInSubject.forEach(exam => {
            if (!exam || !exam.id || !exam.name) return;
            const opt = document.createElement('option');
            opt.value = escapeText(exam.id);
            opt.textContent = escapeText(exam.name);
            optGroup.appendChild(opt);
        });

        DOM.examSelect.appendChild(optGroup);
    });
}

function loadExam() {
    if (!state.currentSubject || !state.currentExam) return;

    const safeSub = sanitizePathSegment(state.currentSubject);
    const safeExam = sanitizePathSegment(state.currentExam);

    const xlsxUrl = `./data/data/${safeSub}/${safeExam}.xlsx`;
    const csvUrl = `./data/data/${safeSub}/${safeExam}.csv`;

    // Thử nạp Excel trước, fallback sang CSV
    fetch(xlsxUrl)
        .then(response => {
            if (!response.ok) throw new Error("File XLSX không tồn tại.");
            return response.arrayBuffer();
        })
        .then(buffer => {
            if (typeof XLSX === 'undefined') throw new Error("Thư viện XLSX chưa sẵn sàng.");
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
            processExamData(jsonData);
        })
        .catch(() => {
            // Fallback sang CSV
            if (typeof Papa === 'undefined') {
                alert("Không thể tải bộ đề: Thư viện PapaParse chưa được nạp.");
                return;
            }

            Papa.parse(csvUrl, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    try {
                        processExamData(results.data);
                    } catch (err) {
                        console.error("Lỗi khi xử lý dữ liệu CSV:", err);
                        alert("Dữ liệu CSV không hợp lệ.");
                    }
                },
                error: function(err) {
                    console.error("Lỗi nạp CSV:", err);
                    alert("Không thể tải file dữ liệu cho bộ đề này.");
                }
            });
        });
}

function processExamData(data) {
    const validQuestions = validateExamData(data);

    if (validQuestions.length === 0) {
        alert("Bộ đề này không có câu hỏi hợp lệ!");
        goHome(true);
        return;
    }

    const dashView = document.getElementById('dashboard-view');
    const subView = document.getElementById('subjects-page-view');
    const examView = document.getElementById('exams-page-view');
    const quizScreen = document.getElementById('quiz-screen-view');

    if (dashView) dashView.classList.add('hidden');
    if (subView) subView.classList.add('hidden');
    if (examView) examView.classList.add('hidden');
    if (quizScreen) quizScreen.classList.remove('hidden');

    const examInfo = typeof EXAM_LIST !== 'undefined' ? EXAM_LIST.find(x => x.id === state.currentExam) : null;
    const examName = examInfo ? examInfo.name : state.currentExam;

    if (window.QuizEngine) {
        window.QuizEngine.startQuiz(state.currentExam, state.currentSubject, examName, validQuestions);
    }
}


// ==========================================
// 6. AN TOÀN RENDER DOM (Safe DOM Rendering)
// ==========================================

function resolveQuestionImageSrc(q) {
    if (!q) return '';

    // Trường hợp 1: link media tuyệt đối
    if (q.link_media && isSafeUrl(q.link_media)) {
        return q.link_media;
    }

    // Trường hợp 2: question chứa đường dẫn HTTP an toàn
    if (q.question && isSafeUrl(q.question)) {
        return q.question;
    }

    // Trường hợp 3: Nạp ảnh từ thư mục cục bộ
    const safeSubject = sanitizePathSegment(state.currentSubject);
    const safeExam = sanitizePathSegment(state.currentExam);
    const rawQId = q.question_id || `Q${state.currentIndex + 1}`;
    const safeQId = sanitizePathSegment(rawQId.replace('.webp', ''));

    return `./data/images/${safeSubject}/${safeExam}/${safeQId}.webp`;
}

function renderQuestion() {
    if (state.questions.length === 0 || state.currentIndex < 0 || state.currentIndex >= state.questions.length) {
        return;
    }

    const q = state.questions[state.currentIndex];

    // Cập nhật ảnh an toàn
    if (DOM.qImage) {
        DOM.qImage.src = resolveQuestionImageSrc(q);
        DOM.qImage.alt = `Câu hỏi ${state.currentIndex + 1}`;
    }

    // Cập nhật nhãn chỉ số câu hỏi bằng textContent
    if (DOM.qIndexLabel) {
        DOM.qIndexLabel.textContent = `Câu ${state.currentIndex + 1} / ${state.questions.length}`;
    }

    // Cập nhật trạng thái checkbox đánh dấu
    if (DOM.flagCheckbox) {
        DOM.flagCheckbox.checked = state.flaggedQuestions.has(state.currentIndex);
        DOM.flagCheckbox.disabled = state.isSubmitted;
    }

    resetQuestionUI();

    // Cập nhật trạng thái các nút chọn đáp án (A-F)
    const currentAnswers = state.userAnswers[state.currentIndex] || new Set();
    const optButtons = DOM.answerOptionsContainer ? DOM.answerOptionsContainer.querySelectorAll('.opt-btn') : [];

    optButtons.forEach(btn => {
        const char = btn.getAttribute('data-answer');
        if (currentAnswers.has(char)) {
            btn.classList.add('selected-btn');
        } else {
            btn.classList.remove('selected-btn');
        }
        btn.disabled = state.isSubmitted;
    });

    if (state.isSubmitted) {
        showFeedbackForCurrentQuestion();
    }

    // Cập nhật toàn bộ các nốt điều hướng
    state.questions.forEach((_, i) => updateNavDot(i));
}

function resetQuestionUI() {
    if (DOM.questionFeedback) {
        DOM.questionFeedback.classList.add('hidden');
        DOM.questionFeedback.textContent = "";
        DOM.questionFeedback.className = "text-center font-bold p-2 rounded hidden mt-3";
    }

    const optButtons = DOM.answerOptionsContainer ? DOM.answerOptionsContainer.querySelectorAll('.opt-btn') : [];
    optButtons.forEach(btn => {
        btn.className = 'opt-btn border-2 py-2 rounded font-bold hover:border-blue-500 transition duration-150';
    });
}

function showFeedbackForCurrentQuestion() {
    if (!DOM.questionFeedback) return;

    const q = state.questions[state.currentIndex];
    if (!q) return;

    const correctStr = q.correct_answer;
    const userStr = Array.from(state.userAnswers[state.currentIndex] || []).sort().join('');

    DOM.questionFeedback.classList.remove('hidden');

    if (userStr === correctStr) {
        DOM.questionFeedback.textContent = "CHÍNH XÁC! 🎉";
        DOM.questionFeedback.className = "text-center font-bold p-2 rounded bg-green-100 text-green-700 mt-3 block shadow-sm";
    } else {
        DOM.questionFeedback.textContent = `SAI RỒI! Đáp án đúng là: ${correctStr || "Chưa có đáp án"}`;
        DOM.questionFeedback.className = "text-center font-bold p-2 rounded bg-red-100 text-red-700 mt-3 block shadow-sm";
    }
}

function renderNavDots() {
    if (!DOM.navDots) return;

    DOM.navDots.replaceChildren();

    state.questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.textContent = String(i + 1);
        btn.setAttribute('data-index', String(i));
        btn.setAttribute('type', 'button');
        DOM.navDots.appendChild(btn);
    });

    state.questions.forEach((_, i) => updateNavDot(i));
}

function updateNavDot(index) {
    if (!DOM.navDots) return;
    const dot = DOM.navDots.children[index];
    if (!dot) return;

    let baseClass = "w-8 h-8 text-xs font-bold border rounded flex items-center justify-center transition duration-150 ";

    if (state.isSubmitted) {
        const q = state.questions[index];
        const correctStr = q ? q.correct_answer : '';
        const userStr = Array.from(state.userAnswers[index] || []).sort().join('');
        if (userStr === correctStr && correctStr !== "") {
            baseClass += "bg-green-500 text-white border-green-600 ";
        } else {
            baseClass += "bg-red-500 text-white border-red-600 ";
        }
    } else {
        if (state.flaggedQuestions.has(index)) {
            baseClass += "bg-yellow-400 text-white border-yellow-500 ";
        } else if (state.userAnswers[index] && state.userAnswers[index].size > 0) {
            baseClass += "bg-blue-500 text-white border-blue-600 ";
        } else {
            baseClass += "bg-white text-gray-700 hover:bg-gray-200 border-gray-300 ";
        }
    }

    if (index === state.currentIndex) {
        baseClass += "ring-4 ring-offset-2 ring-blue-500 ";
    }

    dot.className = baseClass;
}


// ==========================================
// 7. XỬ LÝ HÀNH ĐỘNG NGƯỜI DÙNG (User Actions)
// ==========================================

function toggleAnswer(char) {
    if (state.isSubmitted || !['A', 'B', 'C', 'D', 'E', 'F'].includes(char)) return;

    const currentSet = state.userAnswers[state.currentIndex];
    if (currentSet.has(char)) {
        currentSet.delete(char);
    } else {
        currentSet.add(char);
    }

    renderQuestion();
}

function toggleFlag() {
    if (state.isSubmitted) return;

    if (state.flaggedQuestions.has(state.currentIndex)) {
        state.flaggedQuestions.delete(state.currentIndex);
    } else {
        state.flaggedQuestions.add(state.currentIndex);
    }

    updateNavDot(state.currentIndex);
}

function submitTest(autoSubmit = false) {
    if (state.isSubmitted) return;

    if (autoSubmit !== true) {
        const confirmed = confirm("Bạn có chắc chắn muốn nộp bài?");
        if (!confirmed) return;
    }

    stopTimer();
    state.isSubmitted = true;

    if (DOM.submitBtn) DOM.submitBtn.classList.add('hidden');
    if (DOM.flagCheckbox) DOM.flagCheckbox.disabled = true;

    let correctCount = 0;
    state.questions.forEach((q, i) => {
        const correctStr = q.correct_answer;
        const userStr = Array.from(state.userAnswers[i] || []).sort().join('');
        if (userStr === correctStr && correctStr !== "") {
            correctCount++;
        }
    });

    const totalQuestions = state.questions.length;
    const score = totalQuestions > 0 ? ((correctCount / totalQuestions) * 10).toFixed(2) : "0.00";

    renderScoreBoard(score, correctCount, totalQuestions);
    renderQuestion();
}

function renderScoreBoard(score, correctCount, totalQuestions) {
    if (!DOM.scoreBoard) return;

    DOM.scoreBoard.replaceChildren();

    const titleDiv = document.createElement('div');
    titleDiv.textContent = "ĐIỂM SỐ:";

    const scoreSpan = document.createElement('span');
    scoreSpan.className = "text-3xl text-red-600 block my-2 font-bold";
    scoreSpan.textContent = score;

    const detailsSpan = document.createElement('span');
    detailsSpan.className = "text-gray-600 text-sm font-medium";
    detailsSpan.textContent = `(${correctCount} / ${totalQuestions} câu đúng)`;

    DOM.scoreBoard.appendChild(titleDiv);
    DOM.scoreBoard.appendChild(scoreSpan);
    DOM.scoreBoard.appendChild(detailsSpan);

    DOM.scoreBoard.className = "text-center font-bold p-4 rounded bg-white border-2 border-red-500 mt-4 block shadow-lg bg-green-50";
    DOM.scoreBoard.classList.remove('hidden');
}

function goHome(force = false) {
    if (!force && !state.isSubmitted && state.questions.length > 0 && DOM.quizContainer && !DOM.quizContainer.classList.contains('hidden')) {
        const confirmExit = confirm("Bạn đang trong quá trình làm bài. Bạn có chắc chắn muốn thoát về trang chủ? (Bài làm hiện tại sẽ bị hủy)");
        if (!confirmExit) return false;
    }

    stopTimer();
    state.currentExam = "";
    state.currentSubject = "";
    state.questions = [];
    state.currentIndex = 0;
    state.userAnswers = [];
    state.flaggedQuestions.clear();
    state.isSubmitted = false;

    if (DOM.examSelect) DOM.examSelect.value = "";
    if (DOM.quizContainer) DOM.quizContainer.classList.add('hidden');

    const dashView = document.getElementById('dashboard-view');
    const subView = document.getElementById('subjects-page-view');
    const examView = document.getElementById('exams-page-view');
    const quizScreen = document.getElementById('quiz-screen-view');

    if (subView) subView.classList.add('hidden');
    if (examView) examView.classList.add('hidden');
    if (quizScreen) quizScreen.classList.add('hidden');
    if (dashView) dashView.classList.remove('hidden');

    return true;
}

// Xử lý chuyển trang SPA từ Sidebar
window.addEventListener('page-change', (e) => {
    const page = e.detail ? e.detail.page : 'home';
    const dashView = document.getElementById('dashboard-view');
    const subView = document.getElementById('subjects-page-view');
    const examView = document.getElementById('exams-page-view');
    const quizScreen = document.getElementById('quiz-screen-view');
    const resultView = document.getElementById('test-result-page-view');
    const wrongView = document.getElementById('wrong-questions-page-view');
    const statsView = document.getElementById('stats-page-view');
    const historyView = document.getElementById('history-page-view');

    if (page === 'subjects') {
        if (dashView) dashView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (subView) {
            subView.classList.remove('hidden');
            if (typeof window.updateSubjectsPage === 'function') window.updateSubjectsPage();
        }
    } else if (page === 'exams') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (examView) {
            examView.classList.remove('hidden');
            if (typeof window.updateExamsPage === 'function') window.updateExamsPage();
        }
    } else if (page === 'quiz') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.remove('hidden');
    } else if (page === 'result') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (resultView) resultView.classList.remove('hidden');
    } else if (page === 'wrong') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (wrongView) {
            wrongView.classList.remove('hidden');
            if (window.WrongQuestionsModule && typeof window.WrongQuestionsModule.updatePage === 'function') {
                window.WrongQuestionsModule.updatePage();
            }
        }
    } else if (page === 'stats') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (statsView) {
            statsView.classList.remove('hidden');
            if (window.StatsModule && typeof window.StatsModule.updatePage === 'function') {
                window.StatsModule.updatePage();
            }
        }
    } else if (page === 'history') {
        if (dashView) dashView.classList.add('hidden');
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) {
            historyView.classList.remove('hidden');
            if (window.HistoryModule && typeof window.HistoryModule.updatePage === 'function') {
                window.HistoryModule.updatePage();
            }
        }
    } else {
        // 'home'
        if (subView) subView.classList.add('hidden');
        if (examView) examView.classList.add('hidden');
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultView) resultView.classList.add('hidden');
        if (wrongView) wrongView.classList.add('hidden');
        if (statsView) statsView.classList.add('hidden');
        if (historyView) historyView.classList.add('hidden');
        if (dashView) dashView.classList.remove('hidden');
    }
});

function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        renderQuestion();
    }
}

function prevQuestion() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        renderQuestion();
    }
}

function jumpTo(index) {
    if (index >= 0 && index < state.questions.length) {
        state.currentIndex = index;
        renderQuestion();
    }
}


// ==========================================
// 8. ĐĂNG KÝ EVENT LISTENERS AN TOÀN (Rule 8 & 9)
// ==========================================

function bindEventListeners() {
    try {
        // Nút trang chủ
        if (DOM.appLogo) {
            DOM.appLogo.addEventListener('click', () => goHome());
        }

        // Dropdown chọn bộ đề
        if (DOM.examSelect) {
            DOM.examSelect.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                    if (!state.isSubmitted && state.questions.length > 0 && DOM.quizContainer && !DOM.quizContainer.classList.contains('hidden')) {
                        if (!confirm("Bạn đang trong quá trình làm bài. Bạn có chắc chắn muốn đổi sang bộ đề khác?")) {
                            DOM.examSelect.value = state.currentExam;
                            return;
                        }
                    }
                    if (typeof EXAM_LIST !== 'undefined' && Array.isArray(EXAM_LIST)) {
                        const examInfo = EXAM_LIST.find(x => x.id === selectedId);
                        if (examInfo) {
                            state.currentExam = examInfo.id;
                            state.currentSubject = examInfo.subject || "Khác";
                            loadExam();
                        }
                    }
                } else {
                    if (!goHome()) {
                        DOM.examSelect.value = state.currentExam;
                    }
                }
            });
        }

        // Checkbox đánh dấu câu hỏi
        if (DOM.flagCheckbox) {
            DOM.flagCheckbox.addEventListener('change', toggleFlag);
        }

        // Nút Nộp bài
        if (DOM.submitBtn) {
            DOM.submitBtn.addEventListener('click', () => submitTest());
        }

        // Nút Câu trước & Câu tiếp
        if (DOM.prevBtn) {
            DOM.prevBtn.addEventListener('click', prevQuestion);
        }
        if (DOM.nextBtn) {
            DOM.nextBtn.addEventListener('click', nextQuestion);
        }

        // Event delegation cho các nút đáp án (A-F)
        if (DOM.answerOptionsContainer) {
            DOM.answerOptionsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.opt-btn');
                if (btn) {
                    const ansChar = btn.getAttribute('data-answer');
                    if (ansChar) toggleAnswer(ansChar);
                }
            });
        }

        // Event delegation cho danh sách nốt chuyển câu (Nav Dots)
        if (DOM.navDots) {
            DOM.navDots.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn && btn.hasAttribute('data-index')) {
                    const idx = parseInt(btn.getAttribute('data-index'), 10);
                    if (!isNaN(idx)) jumpTo(idx);
                }
            });
        }

        // Phím tắt bàn phím tiện ích
        document.addEventListener('keydown', (e) => {
            if (!DOM.quizContainer || DOM.quizContainer.classList.contains('hidden')) return;

            // Đang gõ text trong ô thời gian thì không kích hoạt phím tắt
            if (document.activeElement === DOM.timeInput) return;

            const key = e.key.toUpperCase();
            if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key)) {
                toggleAnswer(key);
            } else if (e.key === 'ArrowRight') {
                nextQuestion();
            } else if (e.key === 'ArrowLeft') {
                prevQuestion();
            }
        });

    } catch (err) {
        console.error("Lỗi khi đăng ký Event Listeners:", err);
    }
}


// ==========================================
// 9. KHỞI TẠO ỨNG DỤNG (Application Init)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (DOM.lastUpdateSpan) {
            DOM.lastUpdateSpan.textContent = new Date(document.lastModified).toLocaleString('vi-VN');
        }
        populateExamSelect();
        bindEventListeners();
    } catch (err) {
        console.error("Lỗi khởi tạo ứng dụng:", err);
    }
});
