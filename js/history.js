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
      const wrongQ = Math.max(0, totalQ - correctQ);

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
      btnView.textContent = 'Xem kết quả';
      btnView.addEventListener('click', () => viewHistoryResult(item));

      const btnRetry = document.createElement('button');
      btnRetry.type = 'button';
      btnRetry.className = 'btn-history-retry';
      btnRetry.textContent = 'Làm lại';
      btnRetry.addEventListener('click', () => retryExam(item));

      actionBox.appendChild(btnView);
      actionBox.appendChild(btnRetry);
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
      const wrongQ = Math.max(0, totalQ - correctQ);

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
      btnView.textContent = 'Xem kết quả';
      btnView.addEventListener('click', () => viewHistoryResult(item));

      const btnRetry = document.createElement('button');
      btnRetry.type = 'button';
      btnRetry.className = 'btn-history-retry';
      btnRetry.textContent = 'Làm lại';
      btnRetry.addEventListener('click', () => retryExam(item));

      actions.appendChild(btnView);
      actions.appendChild(btnRetry);

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
    alert(`📊 THÔNG TIN BÀI THI\n\n• Bộ đề: ${item.examName || item.examId}\n• Môn học: ${item.subject}\n• Ngày làm: ${item.dateFormatted || item.date}\n• Điểm số: ${item.score} / 10\n• Số câu đúng: ${item.correctCount || 0} / ${item.totalQuestions || 0}\n• Thời gian làm: ${item.timeSpentText}`);
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

    const btnStartExam = document.getElementById('btn-history-start-exam');
    if (btnStartExam) {
      btnStartExam.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'exams' } }));
      });
    }

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
