/**
 * APP LUYỆN ĐỀ FE - EXAM HISTORY MODULE (js/history.js)
 * Quản lý nhật ký lịch sử thi: Bảng Table trên Desktop, Card trên Mobile,
 * Tìm kiếm, Lọc theo môn học, Sắp xếp ngày, Phân trang (Pagination) & Làm lại.
 * Đảm bảo: Không hiển thị dữ liệu hỏng / không tồn tại.
 */

(function (global) {
  'use strict';

  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let currentSearch = '';
  let currentSubject = 'ALL';
  let currentSort = 'date-desc';

  /**
   * 1. KHỞI TẠO VÀ CẬP NHẬT TRANG LỊCH SỬ THI
   */
  function updatePage() {
    const rawHistory = global.StorageModule ? global.StorageModule.getExamHistory() : [];
    
    // Lọc bỏ dữ liệu rác/hỏng không tồn tại (Data Sanitization)
    const validHistory = rawHistory.filter(item => {
      return item && typeof item === 'object' && (item.examId || item.examName) && item.score !== undefined;
    });

    populateSubjectFilter(validHistory);
    renderHistoryUI(validHistory);
  }

  /**
   * 2. ĐỔ DỮ LIỆU DROPDOWN BỘ LỌC MÔN HỌC
   */
  function populateSubjectFilter(historyList) {
    const filterSelect = document.getElementById('history-subject-filter');
    if (!filterSelect) return;

    const selectedVal = filterSelect.value || 'ALL';
    filterSelect.replaceChildren();

    const optAll = document.createElement('option');
    optAll.value = 'ALL';
    optAll.textContent = 'Tất cả môn học';
    filterSelect.appendChild(optAll);

    const subjects = Array.from(new Set(historyList.map(item => item.subject || 'Khác'))).sort();
    subjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = `Môn ${sub}`;
      filterSelect.appendChild(opt);
    });

    filterSelect.value = subjects.includes(selectedVal) ? selectedVal : 'ALL';
    currentSubject = filterSelect.value;
  }

  /**
   * 3. LỌC, SẮP XẾP & RENDER GIAO DIỆN LỊCH SỬ THI
   */
  function renderHistoryUI(historyList) {
    const tableSection = document.getElementById('history-table-section');
    const cardsSection = document.getElementById('history-cards-section');
    const paginationSection = document.getElementById('history-pagination-section');
    const emptyView = document.getElementById('history-empty-view');

    // 1. Tìm kiếm theo Tên bộ đề hoặc Mã môn
    let filtered = historyList.filter(item => {
      const examName = String(item.examName || item.examId || '').toLowerCase();
      const subject = String(item.subject || '').toLowerCase();
      const search = currentSearch.toLowerCase().trim();
      return examName.includes(search) || subject.includes(search);
    });

    // 2. Lọc theo Môn học
    if (currentSubject !== 'ALL') {
      filtered = filtered.filter(item => (item.subject || 'Khác') === currentSubject);
    }

    // 3. Sắp xếp dữ liệu
    filtered.sort((a, b) => {
      if (currentSort === 'date-asc') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      } else if (currentSort === 'score-desc') {
        return parseFloat(b.score || 0) - parseFloat(a.score || 0);
      } else {
        // date-desc (Mặc định mới nhất trước)
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
    });

    // TRƯỜNG HỢP EMPTY STATE: Dữ liệu rỗng hoặc không khớp tìm kiếm
    if (filtered.length === 0) {
      if (tableSection) tableSection.classList.add('hidden');
      if (cardsSection) cardsSection.classList.add('hidden');
      if (paginationSection) paginationSection.classList.add('hidden');
      if (emptyView) emptyView.classList.remove('hidden');
      return;
    }

    if (tableSection) tableSection.classList.remove('hidden');
    if (cardsSection) cardsSection.classList.remove('hidden');
    if (paginationSection) paginationSection.classList.remove('hidden');
    if (emptyView) emptyView.classList.add('hidden');

    // 4. Tính toán Phân trang (Pagination)
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    renderTableRows(pageItems);
    renderMobileCards(pageItems);
    renderPaginationControls(totalItems, totalPages);
  }

  /**
   * 4. RENDER BẢNG TABLE CHO DESKTOP
   */
  function renderTableRows(pageItems) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    tbody.replaceChildren();

    pageItems.forEach(item => {
      const tr = document.createElement('tr');

      const totalQ = item.totalQuestions || 0;
      const correctQ = item.correctCount || 0;
      const wrongQ = (typeof item.wrongCount === 'number' && Number.isFinite(item.wrongCount))
        ? item.wrongCount
        : Math.max(0, totalQ - correctQ);

      // Ngày làm bài
      const tdDate = document.createElement('td');
      tdDate.textContent = item.dateFormatted || (item.date ? new Date(item.date).toLocaleString('vi-VN') : 'N/A');

      // Môn
      const tdSub = document.createElement('td');
      const subBadge = document.createElement('span');
      subBadge.className = 'badge-subject';
      subBadge.textContent = item.subject || 'Khác';
      tdSub.appendChild(subBadge);

      // Bộ đề
      const tdExam = document.createElement('td');
      tdExam.className = 'font-bold';
      tdExam.textContent = item.examName || item.examId || 'N/A';

      // Điểm
      const tdScore = document.createElement('td');
      tdScore.className = 'history-score-badge';
      tdScore.textContent = `${item.score || '0.00'} điểm`;

      // Đúng
      const tdCorrect = document.createElement('td');
      tdCorrect.className = 'text-green-600 font-bold';
      tdCorrect.textContent = `${correctQ} câu`;

      // Sai
      const tdWrong = document.createElement('td');
      tdWrong.className = 'text-red-600 font-bold';
      tdWrong.textContent = `${wrongQ} câu`;

      // Thời gian
      const tdTime = document.createElement('td');
      tdTime.textContent = item.timeSpentText || 'N/A';

      // Thao tác (Xem kết quả & Làm lại)
      const tdActions = document.createElement('td');
      const actionBox = document.createElement('div');
      actionBox.className = 'history-action-btns';

      const btnView = document.createElement('button');
      btnView.type = 'button';
      btnView.className = 'btn-history-view';
      btnView.textContent = 'Xem chi tiết';
      btnView.addEventListener('click', () => viewHistoryResult(item));

      const btnRetry = document.createElement('button');
      btnRetry.type = 'button';
      btnRetry.className = 'btn-history-retry';
      btnRetry.textContent = 'Làm lại';
      btnRetry.addEventListener('click', () => retryExam(item));

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'btn-history-delete';
      btnDelete.title = 'Xóa lượt thi này';
      btnDelete.setAttribute('aria-label', 'Xóa lượt thi này');

      const svgTrash = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgTrash.setAttribute('width', '16');
      svgTrash.setAttribute('height', '16');
      svgTrash.setAttribute('fill', 'none');
      svgTrash.setAttribute('stroke', 'currentColor');
      svgTrash.setAttribute('viewBox', '0 0 24 24');

      const pathTrash = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathTrash.setAttribute('stroke-linecap', 'round');
      pathTrash.setAttribute('stroke-linejoin', 'round');
      pathTrash.setAttribute('stroke-width', '2');
      pathTrash.setAttribute('d', 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16');
      svgTrash.appendChild(pathTrash);
      btnDelete.appendChild(svgTrash);

      btnDelete.addEventListener('click', () => {
        const examName = item.examName || item.examId || 'Bộ đề';
        const dateFormatted = item.dateFormatted || item.date || 'N/A';
        const confirmed = window.confirm(`Bạn có chắc muốn xóa lượt thi "${examName}" ngày ${dateFormatted} không?\nHành động này không thể hoàn tác.`);
        if (confirmed && global.StorageModule) {
          global.StorageModule.deleteExamHistoryItem(item.date);
          updatePage();
        }
      });

      actionBox.appendChild(btnView);
      actionBox.appendChild(btnRetry);
      actionBox.appendChild(btnDelete);
      tdActions.appendChild(actionBox);

      tr.appendChild(tdDate);
      tr.appendChild(tdSub);
      tr.appendChild(tdExam);
      tr.appendChild(tdScore);
      tr.appendChild(tdCorrect);
      tr.appendChild(tdWrong);
      tr.appendChild(tdTime);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  /**
   * 5. RENDER CARDS CHO MOBILE
   */
  function renderMobileCards(pageItems) {
    const container = document.getElementById('history-cards-section');
    if (!container) return;

    container.replaceChildren();

    pageItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-mobile-card';

      const totalQ = item.totalQuestions || 0;
      const correctQ = item.correctCount || 0;
      const wrongQ = (typeof item.wrongCount === 'number' && Number.isFinite(item.wrongCount))
        ? item.wrongCount
        : Math.max(0, totalQ - correctQ);

      const header = document.createElement('div');
      header.className = 'history-mobile-header';

      const titleBox = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'history-mobile-title';
      title.textContent = item.examName || item.examId || 'Bộ đề';

      const dateStr = document.createElement('div');
      dateStr.className = 'history-mobile-date';
      dateStr.textContent = item.dateFormatted || 'N/A';

      titleBox.appendChild(title);
      titleBox.appendChild(dateStr);

      const scoreBadge = document.createElement('div');
      scoreBadge.className = 'history-score-badge';
      scoreBadge.textContent = `${item.score || '0.00'} điểm`;

      header.appendChild(titleBox);
      header.appendChild(scoreBadge);

      const grid = document.createElement('div');
      grid.className = 'history-mobile-grid';

      const divSub = document.createElement('div');
      divSub.append('Môn: ');
      const strongSub = document.createElement('strong');
      strongSub.textContent = item.subject || 'Khác';
      divSub.appendChild(strongSub);

      const divTime = document.createElement('div');
      divTime.append('Thời gian: ');
      const strongTime = document.createElement('strong');
      strongTime.textContent = item.timeSpentText || 'N/A';
      divTime.appendChild(strongTime);

      const divCorrect = document.createElement('div');
      divCorrect.append('Đúng: ');
      const strongCorrect = document.createElement('strong');
      strongCorrect.className = 'text-green-600';
      strongCorrect.textContent = `${correctQ} câu`;
      divCorrect.appendChild(strongCorrect);

      const divWrong = document.createElement('div');
      divWrong.append('Sai: ');
      const strongWrong = document.createElement('strong');
      strongWrong.className = 'text-red-600';
      strongWrong.textContent = `${wrongQ} câu`;
      divWrong.appendChild(strongWrong);

      grid.append(divSub, divTime, divCorrect, divWrong);

      const actions = document.createElement('div');
      actions.className = 'history-action-btns';
      actions.style.marginTop = '0.5rem';

      const btnView = document.createElement('button');
      btnView.type = 'button';
      btnView.className = 'btn-history-view';
      btnView.textContent = 'Xem chi tiết';
      btnView.addEventListener('click', () => viewHistoryResult(item));

      const btnRetry = document.createElement('button');
      btnRetry.type = 'button';
      btnRetry.className = 'btn-history-retry';
      btnRetry.textContent = 'Làm lại';
      btnRetry.addEventListener('click', () => retryExam(item));

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'btn-history-delete';
      btnDelete.title = 'Xóa lượt thi này';
      btnDelete.setAttribute('aria-label', 'Xóa lượt thi này');

      const svgTrashMob = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgTrashMob.setAttribute('width', '16');
      svgTrashMob.setAttribute('height', '16');
      svgTrashMob.setAttribute('fill', 'none');
      svgTrashMob.setAttribute('stroke', 'currentColor');
      svgTrashMob.setAttribute('viewBox', '0 0 24 24');

      const pathTrashMob = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathTrashMob.setAttribute('stroke-linecap', 'round');
      pathTrashMob.setAttribute('stroke-linejoin', 'round');
      pathTrashMob.setAttribute('stroke-width', '2');
      pathTrashMob.setAttribute('d', 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16');
      svgTrashMob.appendChild(pathTrashMob);
      btnDelete.appendChild(svgTrashMob);

      btnDelete.addEventListener('click', () => {
        const examName = item.examName || item.examId || 'Bộ đề';
        const dateFormatted = item.dateFormatted || item.date || 'N/A';
        const confirmed = window.confirm(`Bạn có chắc muốn xóa lượt thi "${examName}" ngày ${dateFormatted} không?\nHành động này không thể hoàn tác.`);
        if (confirmed && global.StorageModule) {
          global.StorageModule.deleteExamHistoryItem(item.date);
          updatePage();
        }
      });

      actions.appendChild(btnView);
      actions.appendChild(btnRetry);
      actions.appendChild(btnDelete);

      card.appendChild(header);
      card.appendChild(grid);
      card.appendChild(actions);

      container.appendChild(card);
    });
  }

  /**
   * 6. RENDER NÚT BẤM PHÂN TRANG (Pagination Controls)
   */
  function renderPaginationControls(totalItems, totalPages) {
    const infoEl = document.getElementById('history-pagination-info');
    const btnsEl = document.getElementById('history-pagination-buttons');
    if (!infoEl || !btnsEl) return;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    infoEl.textContent = `Hiển thị ${startItem} - ${endItem} trên tổng số ${totalItems} lượt thi`;
    btnsEl.replaceChildren();

    if (totalPages <= 1) return;

    // Nút Trang trước (Prev)
    const btnPrev = document.createElement('button');
    btnPrev.type = 'button';
    btnPrev.className = 'btn-page-step';
    btnPrev.textContent = '← Trước';
    btnPrev.disabled = (currentPage === 1);
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updatePage();
      }
    });
    btnsEl.appendChild(btnPrev);

    // Nút số trang
    for (let i = 1; i <= totalPages; i++) {
      const btnNum = document.createElement('button');
      btnNum.type = 'button';
      btnNum.className = `btn-page-num ${i === currentPage ? 'active' : ''}`;
      btnNum.textContent = String(i);
      btnNum.addEventListener('click', () => {
        currentPage = i;
        updatePage();
      });
      btnsEl.appendChild(btnNum);
    }

    // Nút Trang tiếp (Next)
    const btnNext = document.createElement('button');
    btnNext.type = 'button';
    btnNext.className = 'btn-page-step';
    btnNext.textContent = 'Tiếp →';
    btnNext.disabled = (currentPage === totalPages);
    btnNext.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        updatePage();
      }
    });
    btnsEl.appendChild(btnNext);
  }

  /**
   * 7. HÀNH ĐỘNG XEM KẾT QUẢ THI
   */
  function viewHistoryResult(item) {
    const panel = document.getElementById('history-detail-panel');
    const title = document.getElementById('history-detail-title');
    const summary = document.getElementById('history-detail-summary');
    const list = document.getElementById('history-detail-list');
    if (!panel || !title || !summary || !list) return;

    title.textContent = item.examName || item.examId || 'Chi tiết bài thi';
    summary.textContent = `${item.subject || 'Khác'} | ${item.dateFormatted || item.date || 'N/A'} | ${item.score || '0.00'} điểm`;
    list.replaceChildren();

    const details = Array.isArray(item.questionDetails) ? item.questionDetails : [];
    if (details.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'history-detail-empty';
      empty.textContent = 'Bài thi này được lưu trước khi hệ thống hỗ trợ xem chi tiết từng câu.';
      list.appendChild(empty);
    } else {
      details.forEach((detail, index) => {
        const itemEl = document.createElement('article');
        itemEl.className = `history-detail-item ${detail.isCorrect ? 'is-correct' : 'is-wrong'}`;

        const header = document.createElement('div');
        header.className = 'history-detail-item-header';

        const questionLabel = document.createElement('strong');
        questionLabel.textContent = detail.questionId || `Câu ${index + 1}`;
        header.appendChild(questionLabel);

        const isBlank = !detail.userAnswer;
        const status = document.createElement('span');
        status.className = `history-detail-status ${isBlank ? 'status-blank' : detail.isCorrect ? 'status-correct' : 'status-wrong'}`;
        status.textContent = isBlank ? 'Bỏ trống' : detail.isCorrect ? 'Đúng' : 'Sai';
        header.appendChild(status);

        if (detail.isMarked) {
          const marked = document.createElement('span');
          marked.className = 'history-detail-marked';
          marked.textContent = 'Đã đánh dấu';
          header.appendChild(marked);
        }

        const answers = document.createElement('div');
        answers.className = 'history-detail-answers';
        answers.appendChild(createAnswerLine('Bạn chọn', detail.userAnswer || 'Chưa trả lời'));
        answers.appendChild(createAnswerLine('Đáp án đúng', detail.correctAnswer || 'N/A'));

        itemEl.appendChild(header);
        if (detail.questionText) {
          const questionText = document.createElement('p');
          questionText.className = 'history-detail-question';
          questionText.textContent = detail.questionText;
          itemEl.appendChild(questionText);
        }
        const image = document.createElement('img');
        image.className = 'history-detail-image history-detail-image-zoomable';
        image.src = detail.linkMedia || `./data/images/${item.subject || 'Khac'}/${item.examId || ''}/${detail.questionId || `Q${index + 1}`}.webp`;
        image.alt = `Ảnh câu hỏi ${detail.questionId || `câu ${index + 1}`}`;
        image.addEventListener('click', () => openHistoryImage(image.src, image.alt));
        image.addEventListener('error', () => {
          image.classList.add('history-detail-image-missing');
          image.alt = 'Không tải được ảnh câu hỏi';
        });
        itemEl.appendChild(image);
        itemEl.appendChild(answers);
        list.appendChild(itemEl);
      });
    }

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openHistoryImage(src, alt) {
    if (!src) return;

    const overlay = document.createElement('div');
    overlay.className = 'history-image-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Ảnh câu hỏi phóng to');

    const image = document.createElement('img');
    image.className = 'history-image-lightbox-content';
    image.src = src;
    image.alt = alt || 'Ảnh câu hỏi phóng to';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'history-image-lightbox-close';
    closeButton.setAttribute('aria-label', 'Đóng ảnh phóng to');
    closeButton.textContent = 'Đóng';

    const close = () => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
    };
    const handleKeydown = event => {
      if (event.key === 'Escape') close();
    };

    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', handleKeydown);

    overlay.append(image, closeButton);
    document.body.appendChild(overlay);
  }

  function createAnswerLine(label, value) {
    const line = document.createElement('div');
    const labelEl = document.createElement('span');
    labelEl.className = 'history-detail-answer-label';
    labelEl.textContent = `${label}:`;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    line.append(labelEl, valueEl);
    return line;
  }

  function closeHistoryDetails() {
    const panel = document.getElementById('history-detail-panel');
    if (panel) panel.classList.add('hidden');
  }

  /**
   * 8. HÀNH ĐỘNG LÀM LẠI BÀI THI
   */
  function retryExam(item) {
    if (!item.examId) return;

    if (typeof EXAM_LIST !== 'undefined' && Array.isArray(EXAM_LIST)) {
      const examInfo = EXAM_LIST.find(x => x.id === item.examId);
      if (examInfo) {
        const subjectCode = examInfo.subject || item.subject || "Khác";
        if (typeof window.loadExam === 'function') {
          window.loadExam(examInfo.id, subjectCode);
          window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'quiz' } }));
        }
      } else {
        alert("Bộ đề này không có trong danh sách hiện tại.");
      }
    }
  }

  /**
   * 9. ĐĂNG KÝ EVENT LISTENERS
   */
  function bindEventListeners() {
    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        updatePage();
      });
    }

    const subjectFilter = document.getElementById('history-subject-filter');
    if (subjectFilter) {
      subjectFilter.addEventListener('change', (e) => {
        currentSubject = e.target.value;
        currentPage = 1;
        updatePage();
      });
    }

    const sortSelect = document.getElementById('history-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        updatePage();
      });
    }

    const btnClearAll = document.getElementById('btn-history-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        const historyList = global.StorageModule ? global.StorageModule.getExamHistory() : [];
        if (historyList.length === 0) {
          alert('Không có lịch sử làm bài để xóa.');
          return;
        }
        const confirmed = window.confirm(`XÓA TOÀN BỘ lịch sử làm bài?\nToàn bộ ${historyList.length} lượt thi đã lưu sẽ bị mất vĩnh viễn và không thể khôi phục.`);
        if (confirmed && global.StorageModule) {
          global.StorageModule.clearAllExamHistory();
          updatePage();
        }
      });
    }

    const btnStartExam = document.getElementById('btn-history-start-exam');
    if (btnStartExam) {
      btnStartExam.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'exams' } }));
      });
    }

    const detailClose = document.getElementById('history-detail-close');
    if (detailClose) detailClose.addEventListener('click', closeHistoryDetails);

    // Lắng nghe sự kiện nộp bài để cập nhật trang lịch sử tự động
    window.addEventListener('exam-submitted', () => {
      updatePage();
    });
  }

  document.addEventListener('DOMContentLoaded', bindEventListeners);

  global.HistoryModule = {
    updatePage: updatePage
  };
})(window);
