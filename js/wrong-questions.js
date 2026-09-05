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
    if (qObj.link_media || (qObj.question && qObj.question.startsWith('http'))) {
      const img = document.createElement('img');
      img.className = 'wrong-question-media';
      img.src = qObj.link_media || qObj.question;
      img.alt = `Câu hỏi ${item.qId}`;
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
    timeRow.innerHTML = `<span>Lần sai gần nhất:</span> <strong>${item.lastFailedFormatted || 'N/A'}</strong>`;

    const ansRow = document.createElement('div');
    ansRow.className = 'wrong-meta-item';
    const userAnsStr = item.userAnswer ? `Lựa chọn: <span class="text-red-600 font-bold">${item.userAnswer}</span>` : '<span class="text-gray-400">Bỏ trống</span>';
    const correctAnsStr = item.correctAnswer ? `Đáp án đúng: <span class="text-green-600 font-bold">${item.correctAnswer}</span>` : '';
    ansRow.innerHTML = `<span>${userAnsStr}</span> <span>${correctAnsStr}</span>`;

    metaDiv.appendChild(timeRow);
    metaDiv.appendChild(ansRow);
    cardBody.appendChild(metaDiv);

    // --- CARD ACTIONS ---
    const cardActions = document.createElement('div');
    cardActions.className = 'wrong-card-actions';

    // Nút Ôn từng câu
    const btnPractice = document.createElement('button');
    btnPractice.type = 'button';
    btnPractice.className = 'btn-card-practice';
    btnPractice.innerHTML = `
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
      </svg>
      <span>Ôn câu này</span>
    `;
    btnPractice.addEventListener('click', () => practiceSingleQuestion(item));

    // Nút Xóa câu khỏi danh sách (Không mất lịch sử)
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn-card-delete';
    btnDelete.innerHTML = `
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
      <span>Xóa khỏi danh sách</span>
    `;
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
