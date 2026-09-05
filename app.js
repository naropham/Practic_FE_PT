/**
 * APP LUYỆN ĐỀ FE - MAIN APPLICATION MODULE (app.js)
 * Kiến trúc code tuân thủ 20 nguyên tắc bảo mật và tối ưu hóa DOM.
 * Đóng vai trò App Router & Data Loader Controller trung tâm.
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
    return str.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Kiểm tra xem 1 chuỗi URL có hợp lệ và thuộc protocol an toàn hay không.
 * @param {string} urlString 
 * @returns {boolean}
 */
function isSafeUrl(urlString) {
    if (typeof urlString !== 'string' || !urlString.trim()) return false;
    const trimmed = urlString.trim();
    const lower = trimmed.toLowerCase();

    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:')
    ) {
        return false;
    }

    if (trimmed.includes('..')) {
        return false;
    }

    const isLocalFileContext = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';

    if (lower.startsWith('file:')) {
        return isLocalFileContext;
    }

    try {
        const baseOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') 
            ? window.location.origin 
            : 'http://localhost';
        const parsed = new URL(trimmed, baseOrigin);
        
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return true;
        }

        if (parsed.protocol === 'file:' && isLocalFileContext) {
            return true;
        }

        if (isLocalFileContext && (trimmed.startsWith('./') || trimmed.startsWith('/') || !trimmed.includes(':'))) {
            return true;
        }

        return false;
    } catch (_) {
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.isSafeUrl = isSafeUrl;
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
 * Kiểm tra xem examId có hợp lệ và thuộc danh sách bộ đề chính thức EXAM_LIST hay không.
 * @param {string} examId 
 * @returns {boolean}
 */
function isValidExamId(examId) {
    if (typeof examId !== 'string' || !examId.trim()) return false;
    const trimmed = examId.trim();
    if (trimmed.length > 100 || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
        return false;
    }
    if (sanitizePathSegment(trimmed) !== trimmed) {
        return false;
    }
    if (trimmed.startsWith('PRACTICE_') || trimmed.startsWith('WRONG_')) {
        return true;
    }
    if (typeof EXAM_LIST !== 'undefined' && Array.isArray(EXAM_LIST)) {
        return EXAM_LIST.some(item => item && item.id === trimmed);
    }
    return false;
}

function isValidSubject(subjectCode) {
    if (typeof subjectCode !== 'string' || !subjectCode.trim()) return false;
    const trimmed = subjectCode.trim();
    if (trimmed.length > 100 || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
        return false;
    }
    return sanitizePathSegment(trimmed) === trimmed;
}

function isValidQuestionId(qId) {
    if (qId === null || qId === undefined) return false;
    const str = String(qId).trim();
    if (!str || str.length > 150 || str.includes('..') || str.includes('/') || str.includes('\\')) {
        return false;
    }
    return true;
}

function validateQuestionItem(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') return null;

    const rawId = rawItem.question_id || rawItem['question_id.webp'] || rawItem['link_media'] || rawItem.question;
    if (!rawId) return null;

    const strId = String(rawId).trim();
    if (!isValidQuestionId(strId)) return null;

    const rawAns = rawItem.correct_answer || rawItem['correct_answer'] || rawItem.answer || '';
    const cleanAns = String(rawAns).toUpperCase().replace(/[^A-F]/g, '').split('').sort().join('');

    const rawMedia = typeof rawItem.link_media === 'string' ? rawItem.link_media.trim() : '';
    const safeMedia = (rawMedia && isSafeUrl(rawMedia)) ? rawMedia : '';

    const rawQText = typeof rawItem.question === 'string' ? rawItem.question.trim() : '';

    return {
        question_id: strId,
        correct_answer: cleanAns,
        link_media: safeMedia,
        question: rawQText
    };
}

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

function parseCsvText(csvText, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
        const character = csvText[index];

        if (inQuotes) {
            if (character === '"') {
                if (csvText[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += character;
            }
        } else if (character === '"' && field.length === 0) {
            inQuotes = true;
        } else if (character === delimiter) {
            row.push(field);
            field = '';
        } else if (character === '\n' || character === '\r') {
            if (character === '\r' && csvText[index + 1] === '\n') index += 1;
            row.push(field);
            if (row.some(value => value.trim() !== '')) rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some(value => value.trim() !== '')) rows.push(row);
    }

    if (rows.length < 2) return [];

    const headers = rows.shift().map(header => header.replace(/^\uFEFF/, '').trim());
    return rows.map(values => headers.reduce((item, header, index) => {
        item[header] = values[index] || '';
        return item;
    }, {}));
}

if (typeof window !== 'undefined') {
    window.InputValidator = {
        sanitizePathSegment: sanitizePathSegment,
        isSafeUrl: isSafeUrl,
        isValidExamId: isValidExamId,
        isValidSubject: isValidSubject,
        isValidQuestionId: isValidQuestionId,
        escapeText: escapeText,
        validateExamData: validateExamData
    };
    window.isValidExamId = isValidExamId;
}


// ==========================================
// 2. STATE ROUTING CHO APP CONTROLLER
// ==========================================

const appState = {
    currentExam: "",
    currentSubject: ""
};

let currentPageName = 'home';
let examLoadToken = 0;
let pendingNavigation = null;
let allowQuizExitOnce = false;

function initializeNavigationHistory() {
    if (!window.history || !window.history.replaceState) return;
    window.history.replaceState({ appPage: 'home', appRoot: true }, '', window.location.href);
    window.history.pushState({ appPage: 'home', appRoot: true }, '', window.location.href);
}

function confirmQuizExit() {
    if (allowQuizExitOnce) {
        allowQuizExitOnce = false;
        return true;
    }
    return currentPageName !== 'quiz' || !window.QuizEngine || !window.QuizEngine.hasActiveQuiz();
}

function requestQuizExit(navigation) {
    pendingNavigation = navigation;
    const dialog = document.getElementById('quiz-exit-confirm');
    if (dialog) {
        dialog.classList.remove('hidden');
        document.getElementById('quiz-exit-cancel')?.focus();
    }
}

function closeQuizExitDialog() {
    const dialog = document.getElementById('quiz-exit-confirm');
    if (dialog) dialog.classList.add('hidden');
    pendingNavigation = null;
}

function acceptQuizExit() {
    const navigation = pendingNavigation;
    closeQuizExitDialog();
    if (!navigation) return;
    allowQuizExitOnce = true;
    if (navigation.type === 'history') {
        showPage(navigation.page, { fromHistory: true });
    } else {
        showPage(navigation.page, navigation.options || {});
    }
}


// ==========================================
// 3. NẠP DỮ LIỆU BỘ ĐỀ & BẮT ĐẦU THI (Exam Loader & Controller)
// ==========================================

function populateExamSelect() {
    const examSelect = document.getElementById('exam-select');
    if (!examSelect || typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) return;

    examSelect.replaceChildren();

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Chọn bộ đề --";
    examSelect.appendChild(defaultOption);

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

        examSelect.appendChild(optGroup);
    });
}

function loadExam(examId, subjectCode, limitCount) {
    const currentLoadToken = ++examLoadToken;
    const targetExam = examId || appState.currentExam;
    const targetSubject = subjectCode || appState.currentSubject;

    if (!targetSubject || !targetExam) return;

    if (!isValidExamId(targetExam)) {
        console.warn("Mã bộ đề không hợp lệ hoặc không thuộc hệ thống:", targetExam);
        alert("Bộ đề không hợp lệ hoặc không tồn tại!");
        goHome();
        return;
    }

    appState.currentExam = targetExam;
    appState.currentSubject = targetSubject;

    const examSelect = document.getElementById('exam-select');
    if (examSelect) {
        examSelect.value = targetExam;
    }

    const safeSub = sanitizePathSegment(targetSubject);
    const safeExam = sanitizePathSegment(targetExam);

    if (!safeSub || !safeExam) {
        alert("Thông tin bộ đề không hợp lệ!");
        goHome();
        return;
    }

    const xlsxUrl = `./data/data/${safeSub}/${safeExam}.xlsx`;
    const csvUrl = `./data/data/${safeSub}/${safeExam}.csv`;

    if (!isSafeUrl(xlsxUrl) || !isSafeUrl(csvUrl)) {
        alert("Đường dẫn dữ liệu không an toàn!");
        goHome();
        return;
    }

    // Thử nạp Excel trước, fallback sang CSV
    fetch(xlsxUrl)
        .then(response => {
            if (!response.ok) throw new Error("File XLSX không tồn tại.");
            return response.arrayBuffer();
        })
        .then(buffer => {
            if (currentLoadToken !== examLoadToken) return;
            if (typeof XLSX === 'undefined') throw new Error("Thư viện XLSX chưa sẵn sàng.");
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
            if (!jsonData || jsonData.length === 0) {
                throw new Error("File XLSX không chứa dữ liệu câu hỏi, chuyển sang nạp CSV.");
            }
            processExamData(jsonData, limitCount);
        })
        .catch(() => {
            // Fallback sang CSV
            fetch(csvUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);
                    return response.text();
                })
                .then(csvText => {
                    if (currentLoadToken !== examLoadToken) return;
                    const firstLine = csvText.split(/\r?\n/, 1)[0] || '';
                    const delimiter = firstLine.includes(';') ? ';' : ',';
                    const parsedData = parseCsvText(csvText, delimiter);
                    processExamData(parsedData, limitCount);
                })
                .catch(err => {
                    console.error("Lỗi nạp CSV:", err);
                    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
                        alert("Trình duyệt đang chặn nạp file dữ liệu cục bộ do chính sách CORS (file://).\nVui lòng khởi chạy ứng dụng qua Local Web Server (ví dụ: Live Server hoặc 'npx serve').");
                    } else {
                        alert("Không thể tải file dữ liệu cho bộ đề này.");
                    }
                });
        });
}

function handleInitialUrlParams() {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return;
        const params = new URLSearchParams(window.location.search);
        const rawExamParam = params.get('examId') || params.get('exam');
        if (rawExamParam) {
            const cleanExamId = sanitizePathSegment(rawExamParam);
            if (isValidExamId(cleanExamId)) {
                const examInfo = typeof EXAM_LIST !== 'undefined' ? EXAM_LIST.find(x => x.id === cleanExamId) : null;
                if (examInfo) {
                    loadExam(examInfo.id, examInfo.subject || "Khác");
                }
            } else {
                console.warn("Cảnh báo an toàn: Tham số URL examId không hợp lệ hoặc chứa path traversal:", rawExamParam);
            }
        }
    } catch (err) {
        console.error("Lỗi khi đọc tham số URL:", err);
    }
}

function processExamData(data, limitCount) {
    let validQuestions = validateExamData(data);

    if (validQuestions.length === 0) {
        alert("Bộ đề này không có câu hỏi hợp lệ!");
        goHome();
        return;
    }

    const examInfo = typeof EXAM_LIST !== 'undefined' ? EXAM_LIST.find(x => x.id === appState.currentExam) : null;
    let examName = examInfo
        ? `${examInfo.subject || appState.currentSubject} - ${examInfo.name}`
        : appState.currentExam;
    let examId = appState.currentExam;

    if (typeof limitCount === 'number' && limitCount > 0 && validQuestions.length > limitCount) {
        const shuffled = [...validQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        validQuestions = shuffled.slice(0, limitCount);
        examName = `${examName} (Luyện nhanh ${limitCount} câu)`;
        examId = `PRACTICE_QUICK_${limitCount}_${examId}`;
    }

    showPage('quiz');

    if (window.QuizEngine) {
        window.QuizEngine.startQuiz(examId, appState.currentSubject, examName, validQuestions);
    }
}


// ==========================================
// 4. ĐIỀU HƯỚNG TRANG SPA (SPA Router Engine)
// ==========================================

function hideAllViews() {
    const viewIds = [
        'dashboard-view',
        'subjects-page-view',
        'exams-page-view',
        'quiz-screen-view',
        'test-result-page-view',
        'wrong-questions-page-view',
        'stats-page-view',
        'history-page-view'
    ];
    viewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function showPage(pageName, options = {}) {
    if (pageName !== currentPageName && !confirmQuizExit()) {
        requestQuizExit({ type: 'page', page: pageName, options });
        return false;
    }

    if (!options.fromHistory && pageName !== currentPageName && window.history && window.history.pushState) {
        window.history.pushState({ appPage: pageName }, '', window.location.href);
    }
    if (pageName !== 'quiz') examLoadToken += 1;
    currentPageName = pageName;
    hideAllViews();

    let targetId = 'dashboard-view';

    if (pageName === 'subjects') {
        targetId = 'subjects-page-view';
    } else if (pageName === 'exams') {
        targetId = 'exams-page-view';
    } else if (pageName === 'quiz') {
        targetId = 'quiz-screen-view';
    } else if (pageName === 'result') {
        targetId = 'test-result-page-view';
    } else if (pageName === 'wrong' || pageName === 'flagged') {
        targetId = 'wrong-questions-page-view';
    } else if (pageName === 'stats') {
        targetId = 'stats-page-view';
    } else if (pageName === 'history') {
        targetId = 'history-page-view';
    } else {
        // 'home', 'settings' hoặc các trang mặc định
        targetId = 'dashboard-view';
    }

    // Đảm bảo luôn hiển thị màn hình đích trước tiên
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }

    // Bọc trong try-catch để ngoại lệ của 1 module không làm đứng việc chuyển trang
    try {
        if (pageName === 'subjects') {
            if (typeof window.updateSubjectsPage === 'function') window.updateSubjectsPage();
        } else if (pageName === 'exams') {
            if (typeof window.updateExamsPage === 'function') window.updateExamsPage();
        } else if (pageName === 'wrong' || pageName === 'flagged') {
            if (window.WrongQuestionsModule && typeof window.WrongQuestionsModule.updatePage === 'function') {
                window.WrongQuestionsModule.updatePage();
            }
        } else if (pageName === 'stats') {
            if (window.StatsModule && typeof window.StatsModule.updatePage === 'function') {
                window.StatsModule.updatePage();
            }
        } else if (pageName === 'history') {
            if (window.HistoryModule && typeof window.HistoryModule.updatePage === 'function') {
                window.HistoryModule.updatePage();
            }
        }
    } catch (err) {
        console.error(`Lỗi khi làm mới dữ liệu màn hình ${pageName}:`, err);
    }

    window.dispatchEvent(new CustomEvent('page-rendered', {
        detail: { page: pageName }
    }));
}

function goHome() {
    if (!confirmQuizExit()) {
        requestQuizExit({ type: 'page', page: 'home' });
        return false;
    }

    appState.currentExam = "";
    appState.currentSubject = "";

    const examSelect = document.getElementById('exam-select');
    if (examSelect) examSelect.value = "";

    showPage('home');
    return true;
}

function goBack() {
    if (currentPageName === 'home') return true;
    if (window.history && window.history.back) {
        window.history.back();
    } else {
        goHome();
    }
    return true;
}

window.addEventListener('popstate', (event) => {
    if (!confirmQuizExit()) {
        if (window.history && window.history.pushState) {
            window.history.pushState({ appPage: currentPageName }, '', window.location.href);
        }
        requestQuizExit({ type: 'history', page: event.state && event.state.appPage ? event.state.appPage : 'home' });
        return;
    }

    if (!event.state || event.state.appRoot) {
        if (window.history && window.history.pushState) {
            window.history.pushState({ appPage: 'home', appRoot: true }, '', window.location.href);
        }
        showPage('home', { fromHistory: true });
        return;
    }

    const page = event.state && event.state.appPage ? event.state.appPage : 'home';
    showPage(page, { fromHistory: true });
});

window.addEventListener('page-change', (e) => {
    const page = e.detail ? e.detail.page : 'home';
    showPage(page);
});


// ==========================================
// 5. ĐĂNG KÝ EVENT LISTENERS AN TOÀN
// ==========================================

function bindEventListeners() {
    try {
        const appLogo = document.getElementById('header-logo') || document.getElementById('app-logo');
        if (appLogo) {
            appLogo.addEventListener('click', (e) => {
                e.preventDefault();
                goHome();
            });
        }

        const examSelect = document.getElementById('exam-select');
        if (examSelect) {
            examSelect.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                    if (typeof EXAM_LIST !== 'undefined' && Array.isArray(EXAM_LIST)) {
                        const examInfo = EXAM_LIST.find(x => x.id === selectedId);
                        if (examInfo) {
                            loadExam(examInfo.id, examInfo.subject || "Khác");
                        }
                    }
                } else {
                    goHome();
                }
            });
        }
    } catch (err) {
        console.error("Lỗi khi đăng ký Event Listeners trong app.js:", err);
    }
}


// ==========================================
// 6. KHỞI TẠO ỨNG DỤNG (Application Init)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeNavigationHistory();
        document.getElementById('quiz-exit-cancel')?.addEventListener('click', closeQuizExitDialog);
        document.getElementById('quiz-exit-accept')?.addEventListener('click', acceptQuizExit);
        populateExamSelect();
        bindEventListeners();
        handleInitialUrlParams();
    } catch (err) {
        console.error("Lỗi khởi tạo ứng dụng:", err);
    }
});

// Xuất các API cho window
if (typeof window !== 'undefined') {
    window.loadExam = loadExam;
    window.goHome = goHome;
    window.goBack = goBack;
    window.confirmQuizExit = confirmQuizExit;
    window.showPage = showPage;
    window.appState = appState;
}
