/**
 * APP LUYỆN ĐỀ FE - WRONG QUESTIONS MODULE (js/wrong-questions.js)
 * Quản lý trang "Câu sai của tôi": Lọc môn học, hiển thị thông tin chi tiết,
 * ôn từng câu, luyện toàn bộ câu sai và xóa câu sai (không mất lịch sử).
 */

(function (global) {
  'use strict';

  let currentSubjectFilter = 'ALL';

  const DOM = {
    viewContainer: document.getElementById('wrong-questions-page-view'),
    filterSelect: document.getElementById('wrong-subject-filter'),
    btnPracticeAll: document.getElementById('btn-practice-all-wrong'),
    gridContainer: document.getElementById('wrong-questions-grid'),
    emptyContainer: document.getElementById('wrong-questions-empty')
  };

  /**
   * 1. KHỞI TẠO VÀ CẬP NHẬT TRANG CÂU SAI
   */
  function updatePage() {
    const allWrongList = global.StorageModule ? global.StorageModule.getWrongQuestions() : [];

    populateSubjectFilter(allWrongList);
    renderGrid(allWrongList);
  }

  /**
   * 2. ĐỔ DỮ LIỆU VÀO DROPDOWN BỘ LỌC MÔN HỌC
   */
  function populateSubjectFilter(allWrongList) {
    const filterSelect = document.getElementById('wrong-subject-filter');
    if (!filterSelect) return;

    const selectedVal = filterSelect.value || 'ALL';
    filterSelect.replaceChildren();

    // Option mặc định Tất cả
    const optAll = document.createElement('option');
    optAll.value = 'ALL';
    optAll.textContent = 'Tất cả môn học';
    filterSelect.appendChild(optAll);

    // Tìm danh sách các môn học độc bản có câu sai
    const subjects = Array.from(new Set(allWrongList.map(item => item.subject || 'Khác'))).sort();

    subjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = `Môn ${sub}`;
      filterSelect.appendChild(opt);
    });

    filterSelect.value = subjects.includes(selectedVal) ? selectedVal : 'ALL';
    currentSubjectFilter = filterSelect.value;
  }

  /**
   * 3. RENDER DANH SÁCH CÂU SAI HOẶC EMPTY STATE
   */
  function renderGrid(allWrongList) {
    const gridContainer = document.getElementById('wrong-questions-grid');
    const emptyContainer = document.getElementById('wrong-questions-empty');
    if (!gridContainer || !emptyContainer) return;

    // Lọc theo môn học
    const filteredList = (currentSubjectFilter === 'ALL')
      ? allWrongList
      : allWrongList.filter(item => (item.subject || 'Khác') === currentSubjectFilter);

    // TRƯỜNG HỢP EMPTY STATE: Không có câu sai
    if (filteredList.length === 0) {
      gridContainer.classList.add('hidden');
      gridContainer.replaceChildren();
      emptyContainer.classList.remove('hidden');
      return;
    }

    // Hiển thị danh sách card câu sai
    emptyContainer.classList.add('hidden');
    gridContainer.classList.remove('hidden');
    gridContainer.replaceChildren();

    filteredList.forEach(item => {
      const card = createWrongCard(item);
      gridContainer.appendChild(card);
    });
  }

  /**
   * 4. TẠO CARD HIỂN THỊ 1 CÂU SAI CHUẨN DOM API AN TOÀN
   */
  function createWrongCard(item) {
    const card = document.createElement('div');
    card.className = 'wrong-card';
    card.setAttribute('data-id', item.id);

    // --- TOP BADGES ---
    const cardTop = document.createElement('div');
    cardTop.className = 'wrong-card-top';

    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'wrong-badges';

    const subBadge = document.createElement('span');
    subBadge.className = 'badge-subject';
    subBadge.textContent = item.subject || 'Môn học';

    const examBadge = document.createElement('span');
    examBadge.className = 'badge-exam';
    examBadge.textContent = item.examName || item.examId || 'Bộ đề';

    badgesDiv.appendChild(subBadge);
    badgesDiv.appendChild(examBadge);

    const wrongTag = document.createElement('span');
    wrongTag.className = 'wrong-count-tag';
    wrongTag.textContent = `Sai ${item.wrongCount || 1} lần`;

    cardTop.appendChild(badgesDiv);
    cardTop.appendChild(wrongTag);

    // --- CARD BODY ---
    const cardBody = document.createElement('div');
    cardBody.className = 'wrong-card-body';

    // Ảnh câu hỏi nếu có
    const qObj = item.question || {};
    const checkSafe = (typeof global.isSafeUrl === 'function')
      ? global.isSafeUrl
      : (typeof window !== 'undefined' && typeof window.isSafeUrl === 'function' ? window.isSafeUrl : function (url) {
          if (typeof url !== 'string' || !url.trim()) return false;
          const lower = url.trim().toLowerCase();
          return !lower.startsWith('javascript:') && !lower.startsWith('data:') && !lower.startsWith('file:') && !lower.startsWith('vbscript:') && !url.includes('..');
        });

    let candidateSrc = '';
    if (qObj.link_media && checkSafe(qObj.link_media)) {
      candidateSrc = qObj.link_media;
    } else if (qObj.question && typeof qObj.question === 'string' && checkSafe(qObj.question) && (qObj.question.startsWith('http://') || qObj.question.startsWith('https://'))) {
      candidateSrc = qObj.question;
    } else {
      const sub = item.subject || qObj.subject || '';
      const exam = item.examId || qObj.examId || '';
      const qId = item.qId || qObj.question_id || '';
      if (sub && exam && qId) {
        const safeSub = String(sub).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeExam = String(exam).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeQId = String(qId).replace('.webp', '').replace(/[^a-zA-Z0-9_-]/g, '');
        const localPath = `./data/images/${safeSub}/${safeExam}/${safeQId}.webp`;
        if (checkSafe(localPath)) {
          candidateSrc = localPath;
        }
      }
    }

    if (candidateSrc) {
      const img = document.createElement('img');
      img.className = 'wrong-question-media';
      img.src = candidateSrc;
      img.alt = `Câu hỏi ${item.qId || ''}`;
      img.onerror = function () {
        this.style.display = 'none';
      };
      cardBody.appendChild(img);
    }

    const titleEl = document.createElement('h3');
    titleEl.className = 'wrong-question-title';
    titleEl.textContent = `Câu hỏi: ${item.qId || 'Mã câu'}`;
    cardBody.appendChild(titleEl);

    // Thông tin chi tiết: Lần sai gần nhất & Đáp án
    const metaDiv = document.createElement('div');
    metaDiv.className = 'wrong-meta-info';

    const timeRow = document.createElement('div');
    timeRow.className = 'wrong-meta-item';
    const spanTimeLabel = document.createElement('span');
    spanTimeLabel.textContent = 'Lần sai gần nhất: ';
    const strongTimeVal = document.createElement('strong');
    strongTimeVal.textContent = item.lastFailedFormatted || 'N/A';
    timeRow.appendChild(spanTimeLabel);
    timeRow.appendChild(strongTimeVal);

    const ansRow = document.createElement('div');
    ansRow.className = 'wrong-meta-item';

    const spanUserAns = document.createElement('span');
    if (item.userAnswer) {
      spanUserAns.append('Lựa chọn: ');
      const strongUserAns = document.createElement('span');
      strongUserAns.className = 'text-red-600 font-bold';
      strongUserAns.textContent = item.userAnswer;
      spanUserAns.appendChild(strongUserAns);
    } else {
      const spanEmpty = document.createElement('span');
      spanEmpty.className = 'text-gray-400';
      spanEmpty.textContent = 'Bỏ trống';
      spanUserAns.appendChild(spanEmpty);
    }

    ansRow.appendChild(spanUserAns);

    if (item.correctAnswer) {
      const spanCorrectAns = document.createElement('span');
      spanCorrectAns.append('Đáp án đúng: ');
      const strongCorrectAns = document.createElement('span');
      strongCorrectAns.className = 'text-green-600 font-bold';
      strongCorrectAns.textContent = item.correctAnswer;
      spanCorrectAns.appendChild(strongCorrectAns);

      ansRow.append(' ');
      ansRow.appendChild(spanCorrectAns);
    }

    metaDiv.appendChild(timeRow);
    metaDiv.appendChild(ansRow);
    cardBody.appendChild(metaDiv);

    // --- CARD ACTIONS ---
    const cardActions = document.createElement('div');
    cardActions.className = 'wrong-card-actions';

    const svgNS = 'http://www.w3.org/2000/svg';

    // Nút Ôn từng câu
    const btnPractice = document.createElement('button');
    btnPractice.type = 'button';
    btnPractice.className = 'btn-card-practice';

    const svgPractice = document.createElementNS(svgNS, 'svg');
    svgPractice.setAttribute('width', '14');
    svgPractice.setAttribute('height', '14');
    svgPractice.setAttribute('fill', 'none');
    svgPractice.setAttribute('stroke', 'currentColor');
    svgPractice.setAttribute('viewBox', '0 0 24 24');

    const pathPractice = document.createElementNS(svgNS, 'path');
    pathPractice.setAttribute('stroke-linecap', 'round');
    pathPractice.setAttribute('stroke-linejoin', 'round');
    pathPractice.setAttribute('stroke-width', '2');
    pathPractice.setAttribute('d', 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z');
    svgPractice.appendChild(pathPractice);

    const spanPractice = document.createElement('span');
    spanPractice.textContent = 'Ôn câu này';

    btnPractice.appendChild(svgPractice);
    btnPractice.appendChild(spanPractice);
    btnPractice.addEventListener('click', () => practiceSingleQuestion(item));

    // Nút Xóa câu khỏi danh sách (Không mất lịch sử)
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn-card-delete';

    const svgDelete = document.createElementNS(svgNS, 'svg');
    svgDelete.setAttribute('width', '14');
    svgDelete.setAttribute('height', '14');
    svgDelete.setAttribute('fill', 'none');
    svgDelete.setAttribute('stroke', 'currentColor');
    svgDelete.setAttribute('viewBox', '0 0 24 24');

    const pathDelete = document.createElementNS(svgNS, 'path');
    pathDelete.setAttribute('stroke-linecap', 'round');
    pathDelete.setAttribute('stroke-linejoin', 'round');
    pathDelete.setAttribute('stroke-width', '2');
    pathDelete.setAttribute('d', 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16');
    svgDelete.appendChild(pathDelete);

    const spanDelete = document.createElement('span');
    spanDelete.textContent = 'Xóa khỏi danh sách';

    btnDelete.appendChild(svgDelete);
    btnDelete.appendChild(spanDelete);
    btnDelete.addEventListener('click', () => deleteWrongQuestion(item.id));

    cardActions.appendChild(btnPractice);
    cardActions.appendChild(btnDelete);

    card.appendChild(cardTop);
    card.appendChild(cardBody);
    card.appendChild(cardActions);

    return card;
  }

  /**
   * 5. HÀNH ĐỘNG ÔN TỪNG CÂU
   */
  function practiceSingleQuestion(item) {
    if (!item || !item.question || !global.QuizEngine) return;

    const singleQList = [item.question];
    global.QuizEngine.startQuiz(
      item.examId || 'WRONG_RETRY',
      item.subject || 'Khác',
      `Ôn tập: ${item.qId} (${item.examName || 'Bộ đề'})`,
      singleQList
    );

    window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
  }

  /**
   * 6. HÀNH ĐỘNG LUYỆN TOÀN BỘ CÂU SAI DƯỚI BỘ LỌC HẠN ĐỊNH
   */
  function practiceAllFilteredWrong() {
    const allWrongList = global.StorageModule ? global.StorageModule.getWrongQuestions() : [];
    const filteredList = (currentSubjectFilter === 'ALL')
      ? allWrongList
      : allWrongList.filter(item => (item.subject || 'Khác') === currentSubjectFilter);

    if (filteredList.length === 0) {
      alert("Không có câu sai nào để luyện tập.");
      return;
    }

    const questionArray = filteredList.map(item => item.question).filter(Boolean);

    if (global.QuizEngine) {
      const subjectTag = currentSubjectFilter === 'ALL' ? 'Tất cả môn' : currentSubjectFilter;
      global.QuizEngine.startQuiz(
        'PRACTICE_ALL_WRONG',
        subjectTag,
        `Luyện toàn bộ câu sai (${questionArray.length} câu)`,
        questionArray
      );
      window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
    }
  }

  /**
   * 7. HÀNH ĐỘNG XÓA 1 CÂU KHỎI DANH SÁCH (KHÔNG LÀM MẤT DỮ LIỆU LỊCH SỬ THI)
   */
  function deleteWrongQuestion(targetId) {
    const confirmed = confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi danh sách câu sai? (Lịch sử làm bài thi của bạn vẫn được giữ nguyên)");
    if (!confirmed) return;

    if (global.StorageModule) {
      global.StorageModule.removeWrongQuestion(targetId);
      updatePage();
    }
  }

  /**
   * 8. ĐĂNG KÝ EVENT LISTENERS
   */
  function bindEventListeners() {
    const filterSelect = document.getElementById('wrong-subject-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        currentSubjectFilter = e.target.value;
        const allWrongList = global.StorageModule ? global.StorageModule.getWrongQuestions() : [];
        renderGrid(allWrongList);
      });
    }

    const btnPracticeAll = document.getElementById('btn-practice-all-wrong');
    if (btnPracticeAll) {
      btnPracticeAll.addEventListener('click', practiceAllFilteredWrong);
    }

    const btnEmptyGoHome = document.getElementById('btn-wrong-empty-gohome');
    if (btnEmptyGoHome) {
      btnEmptyGoHome.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'exams' } }));
      });
    }

    // Lắng nghe sự kiện cập nhật danh sách câu sai từ hệ thống
    window.addEventListener('wrong-questions-updated', () => {
      updatePage();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEventListeners();
  });

  global.WrongQuestionsModule = {
    updatePage: updatePage
  };
})(window);
