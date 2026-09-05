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
 * Kiểm tra xem 1 chuỗi URL có hợp lệ và thuộc protocol an toàn (http/https/relative) hay không.
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
        lower.startsWith('file:') ||
        lower.startsWith('blob:')
    ) {
        return false;
    }

    if (trimmed.includes('..')) {
        return false;
    }

    try {
        const baseOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') 
            ? window.location.origin 
            : 'http://localhost';
        const parsed = new URL(trimmed, baseOrigin);
        
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return true;
        }

        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:' && (trimmed.startsWith('./') || trimmed.startsWith('/') || !trimmed.includes(':'))) {
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
// 2. STATE ROUTING UY NHẤT CHO APP CONTROLLER
// ==========================================

const appState = {
    currentExam: "",
    currentSubject: ""
};


// ==========================================
// 3. CACHE DOM ELEMENTS (Safe DOM references)
// ==========================================

const DOM = {
    appLogo: document.getElementById('app-logo'),
    examSelect: document.getElementById('exam-select'),
    lastUpdateSpan: document.getElementById('last-update')
};


// ==========================================
// 4. NẠP DỮ LIỆU BỘ ĐỀ & BẮT ĐẦU THI (Exam Loader & Controller)
// ==========================================

function populateExamSelect() {
    if (!DOM.examSelect || typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) return;

    DOM.examSelect.replaceChildren();

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

function loadExam(examId, subjectCode) {
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

    if (DOM.examSelect) {
        DOM.examSelect.value = targetExam;
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

function processExamData(data) {
    const validQuestions = validateExamData(data);

    if (validQuestions.length === 0) {
        alert("Bộ đề này không có câu hỏi hợp lệ!");
        goHome();
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

    const examInfo = typeof EXAM_LIST !== 'undefined' ? EXAM_LIST.find(x => x.id === appState.currentExam) : null;
    const examName = examInfo ? examInfo.name : appState.currentExam;

    if (window.QuizEngine) {
        window.QuizEngine.startQuiz(appState.currentExam, appState.currentSubject, examName, validQuestions);
    }
}

function goHome() {
    appState.currentExam = "";
    appState.currentSubject = "";

    if (DOM.examSelect) DOM.examSelect.value = "";

    const dashView = document.getElementById('dashboard-view');
    const subView = document.getElementById('subjects-page-view');
    const examView = document.getElementById('exams-page-view');
    const quizScreen = document.getElementById('quiz-screen-view');
    const resultView = document.getElementById('test-result-page-view');
    const wrongView = document.getElementById('wrong-questions-page-view');
    const statsView = document.getElementById('stats-page-view');
    const historyView = document.getElementById('history-page-view');

    if (subView) subView.classList.add('hidden');
    if (examView) examView.classList.add('hidden');
    if (quizScreen) quizScreen.classList.add('hidden');
    if (resultView) resultView.classList.add('hidden');
    if (wrongView) wrongView.classList.add('hidden');
    if (statsView) statsView.classList.add('hidden');
    if (historyView) historyView.classList.add('hidden');
    if (dashView) dashView.classList.remove('hidden');

    return true;
}


// ==========================================
// 5. ĐIỀU HƯỚNG TRANG SPA (SPA Page Router)
// ==========================================

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


// ==========================================
// 6. ĐĂNG KÝ EVENT LISTENERS AN TOÀN
// ==========================================

function bindEventListeners() {
    try {
        if (DOM.appLogo) {
            DOM.appLogo.addEventListener('click', () => goHome());
        }

        if (DOM.examSelect) {
            DOM.examSelect.addEventListener('change', (e) => {
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
// 7. KHỞI TẠO ỨNG DỤNG (Application Init)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (DOM.lastUpdateSpan) {
            DOM.lastUpdateSpan.textContent = new Date(document.lastModified).toLocaleString('vi-VN');
        }
        populateExamSelect();
        bindEventListeners();
        handleInitialUrlParams();
    } catch (err) {
        console.error("Lỗi khởi tạo ứng dụng:", err);
    }
});

// Xuất các API cho window để hỗ trợ làm lại bài thi & nạp đề
if (typeof window !== 'undefined') {
    window.loadExam = loadExam;
    window.goHome = goHome;
    window.appState = appState;
}
