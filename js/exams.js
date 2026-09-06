/**
 * APP LUYỆN ĐỀ FE - EXAM SETS SELECTION MODULE SCRIPT
 * Lựa chọn bộ đề theo môn, lọc/tìm kiếm/sắp xếp & tính toán thống kê cá nhân.
 * Tuân thủ an toàn DOM API: Dùng textContent & createElement (Không innerHTML).
 */

(function (global) {
  'use strict';

  const HISTORY_STORAGE_KEY = 'luyenDe_exam_history';

  const SUBJECT_NAMES = {
    'MAI391': 'Toán Trí Tuệ Nhân Tạo',
    'SSG104': 'Kỹ Năng Làm Việc Nhóm',
    'MAE101': 'Toán Cao Cấp Cho Kỹ Thuật',
    'PRN211': 'Lập Trình .NET',
    'SWP391': 'Dự Án Phần Mềm',
    'DBI202': 'Cơ Sở Dữ Liệu'
  };

  /**
   * 1. VALIDATE BỘ ĐỀ AN TOÀN (Rule 7 & 11)
   * Không tin tưởng dữ liệu tham số bên ngoài. Kiểm tra ID thuộc danh sách hợp lệ.
   * @param {string} examId 
   * @returns {boolean}
   */
  function isValidExamId(examId) {
    if (typeof window !== 'undefined' && typeof window.isValidExamId === 'function') {
      return window.isValidExamId(examId);
    }
    if (typeof examId !== 'string' || !examId.trim()) return false;
    const trimmed = examId.trim();
    if (trimmed.length > 100 || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) return false;
    if (trimmed.startsWith('PRACTICE_') || trimmed.startsWith('WRONG_')) return true;
    if (typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) return false;
    return EXAM_LIST.some(item => item && item.id === trimmed);
  }

  /**
   * 2. ĐỌC LỊCH SỬ THI TỪ LOCALSTORAGE (TẬP TRUNG QUA STORAGE MODULE)
   * @returns {Array<object>}
   */
  function getExamHistory() {
    if (global.StorageModule && typeof global.StorageModule.getExamHistory === 'function') {
      return global.StorageModule.getExamHistory();
    }
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Lỗi nạp lịch sử thi:", err);
      return [];
    }
  }

  /**
   * 3. TÍNH TOÁN THỐNG KÊ CHI TIẾT TỪNG BỘ ĐỀ
   */
  function calculateExamMetrics(examItem, history) {
    const examId = examItem.id;
    const examHistory = history.filter(h => h && (h.examId === examId || h.id === examId));

    const attemptsCount = examHistory.length;
    let highestScore = 0;
    let latestScore = 0;

    if (attemptsCount > 0) {
      const scores = examHistory.map(h => parseFloat(h.score) || 0);
      highestScore = Math.max(...scores);
      latestScore = scores[scores.length - 1];
    }

    let status = 'unattempted'; // 'unattempted' | 'passed' | 'failed'
    let statusText = 'Chưa làm';

    if (attemptsCount > 0) {
      if (highestScore >= 5.0) {
        status = 'passed';
        statusText = '✓ Đạt';
      } else {
        status = 'failed';
        statusText = '✕ Chưa đạt';
      }
    }

    return {
      id: examItem.id,
      name: `${examItem.subject || 'Khác'} - ${examItem.name || examItem.id}`,
      subject: examItem.subject || 'Khác',
      questionCount: examItem.questionCount || 50,
      timeLimitText: examItem.durationMinutes ? `${examItem.durationMinutes} phút` : '60 phút',
      attemptsCount: attemptsCount,
      highestScore: attemptsCount > 0 ? highestScore.toFixed(2) : '---',
      latestScore: attemptsCount > 0 ? latestScore.toFixed(2) : '---',
      highestScoreVal: highestScore,
      status: status,
      statusText: statusText
    };
  }

  /**
   * 4. RENDER CÁC THẺ CARD BỘ ĐỀ (EXAM CARDS) AN TOÀN
   */
  function renderExamCards(examMetricsList) {
    const container = document.getElementById('exams-page-grid');
    if (!container) return;

    if (examMetricsList === null) {
      container.replaceChildren();
      const errCard = document.createElement('div');
      errCard.className = "subjects-empty-card";
      errCard.textContent = "Không thể nạp dữ liệu bộ đề. Vui lòng thử lại.";
      container.appendChild(errCard);
      return;
    }

    if (examMetricsList.length === 0) {
      container.replaceChildren();
      const emptyDiv = document.createElement('div');
      emptyDiv.className = "subjects-empty-card";

      const h3 = document.createElement('h3');
      h3.className = "subjects-empty-title";
      h3.textContent = "Không tìm thấy bộ đề nào";

      const p = document.createElement('p');
      p.className = "subjects-empty-desc";
      p.textContent = "Không có bộ đề nào phù hợp với môn học hoặc điều kiện tìm kiếm hiện tại.";

      emptyDiv.appendChild(h3);
      emptyDiv.appendChild(p);
      container.appendChild(emptyDiv);
      return;
    }

    container.replaceChildren();

    examMetricsList.forEach(item => {
      const card = document.createElement('div');
      card.className = "exam-card";

      // 1. Header Card (Tên bộ đề + Badge trạng thái)
      const headerDiv = document.createElement('div');
      headerDiv.className = "exam-card-header";

      const titleH3 = document.createElement('h3');
      titleH3.className = "exam-card-title";
      titleH3.textContent = item.name;

      const badge = document.createElement('span');
      badge.className = "exam-status-badge " + (
        item.status === 'passed' ? 'badge-passed' :
        item.status === 'failed' ? 'badge-failed' : 'badge-unattempted'
      );
      badge.textContent = item.statusText;

      headerDiv.appendChild(titleH3);
      headerDiv.appendChild(badge);

      // 2. Metrics Grid 1 (Số câu, Thời gian, Số lần làm)
      const metricsGrid1 = document.createElement('div');
      metricsGrid1.className = "exam-metrics-grid";

      [['Số câu', `~${item.questionCount}`], ['Thời gian', item.timeLimitText], ['Số lần làm', `${item.attemptsCount} lần`]].forEach(([lbl, val]) => {
        const div = document.createElement('div');
        const v = document.createElement('div');
        v.className = "metric-val-bold";
        v.textContent = val;
        const l = document.createElement('div');
        l.className = "metric-lbl-sm";
        l.textContent = lbl;
        div.appendChild(v);
        div.appendChild(l);
        metricsGrid1.appendChild(div);
      });

      // 3. Metrics Grid 2 (Điểm cao nhất & Điểm gần nhất)
      const metricsGrid2 = document.createElement('div');
      metricsGrid2.className = "exam-scores-grid";

      [['Điểm cao nhất', item.highestScore], ['Điểm gần nhất', item.latestScore]].forEach(([lbl, val]) => {
        const div = document.createElement('div');
        const v = document.createElement('div');
        v.className = "metric-val-bold";
        v.textContent = val;
        const l = document.createElement('div');
        l.className = "metric-lbl-sm";
        l.textContent = lbl;
        div.appendChild(v);
        div.appendChild(l);
        metricsGrid2.appendChild(div);
      });

      // 4. Action Buttons (Xử lý điều kiện người dùng đã từng làm hay chưa)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = "exam-card-actions";

      if (item.attemptsCount === 0) {
        // Nút "Bắt đầu" nếu chưa từng làm
        const startBtn = document.createElement('button');
        startBtn.type = "button";
        startBtn.className = "btn-exam-primary";
        startBtn.textContent = "Bắt đầu";
        startBtn.addEventListener('click', () => launchExam(item.id));
        actionsDiv.appendChild(startBtn);
      } else {
        // Nút "Làm lại" và "Xem kết quả" nếu đã từng làm
        const retryBtn = document.createElement('button');
        retryBtn.type = "button";
        retryBtn.className = "btn-exam-primary";
        retryBtn.textContent = "Làm lại";
        retryBtn.addEventListener('click', () => launchExam(item.id));

        const resultBtn = document.createElement('button');
        resultBtn.type = "button";
        resultBtn.className = "btn-exam-secondary";
        resultBtn.textContent = "Xem kết quả";
        resultBtn.addEventListener('click', () => showExamResultDetails(item));

        actionsDiv.appendChild(retryBtn);
        actionsDiv.appendChild(resultBtn);
      }

      card.appendChild(headerDiv);
      card.appendChild(metricsGrid1);
      card.appendChild(metricsGrid2);
      card.appendChild(actionsDiv);

      container.appendChild(card);
    });
  }

  /**
   * 5. CHẠY BÀI THI AN TOÀN VÀ BẮT ĐẦU LUYỆN
   * @param {string} examId 
   */
  function launchExam(examId) {
    if (!isValidExamId(examId)) {
      alert("Mã bộ đề không hợp lệ!");
      return;
    }

    const examItem = typeof EXAM_LIST !== 'undefined' && Array.isArray(EXAM_LIST) ? EXAM_LIST.find(x => x.id === examId) : null;
    const subCode = examItem ? (examItem.subject || "Khác") : "Khác";

    if (typeof window.loadExam === 'function') {
      window.loadExam(examId, subCode);
    }
  }

  /**
   * 6. HIỂN THỊ CHI TIẾT KẾT QUẢ
   */
  function showExamResultDetails(item) {
    alert(
      `📊 KẾT QUẢ BỘ ĐỀ: ${item.name}\n\n` +
      `• Số lần đã làm: ${item.attemptsCount} lần\n` +
      `• Điểm cao nhất: ${item.highestScore} / 10\n` +
      `• Điểm gần nhất: ${item.latestScore} / 10\n` +
      `• Trạng thái: ${item.statusText}`
    );
  }

  /**
   * 7. CẬP NHẬT BANNER VÀ BANNER DROPDOWN MÔN HỌC
   */
  function updateSubjectBanner(currentSubject) {
    const codeEl = document.getElementById('banner-subject-code');
    const nameEl = document.getElementById('banner-subject-name');
    const selectEl = document.getElementById('banner-subject-select');

    if (codeEl) codeEl.textContent = currentSubject === 'ALL' ? 'TẤT CẢ' : currentSubject;
    if (nameEl) nameEl.textContent = currentSubject === 'ALL' ? 'Tất cả các bộ đề thi' : (SUBJECT_NAMES[currentSubject] || `Môn học ${currentSubject}`);

    if (selectEl && selectEl.children.length <= 1 && typeof EXAM_LIST !== 'undefined') {
      selectEl.replaceChildren();
      const optAll = document.createElement('option');
      optAll.value = 'ALL';
      optAll.textContent = 'Tất cả môn học';
      selectEl.appendChild(optAll);

      const subjects = [...new Set(EXAM_LIST.map(e => e.subject || "Khác"))];
      subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = `${sub} - ${SUBJECT_NAMES[sub] || sub}`;
        selectEl.appendChild(opt);
      });
    }

    if (selectEl) selectEl.value = currentSubject;
  }

  /**
   * 8. QUẢN LÝ LỌC, TÌM KIẾM VÀ SẮP XẾP BỘ ĐỀ (NO PAGE RELOAD)
   */
  function updateExamsPage() {
    if (typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) {
      renderExamCards(null);
      return;
    }

    const history = getExamHistory();
    const bannerSelect = document.getElementById('banner-subject-select');
    const searchInput = document.getElementById('exam-search-input');
    const statusSelect = document.getElementById('exam-status-filter');
    const sortSelect = document.getElementById('exam-sort-select');

    const selectedSubject = bannerSelect ? bannerSelect.value : 'ALL';
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const statusVal = statusSelect ? statusSelect.value : 'all';
    const sortVal = sortSelect ? sortSelect.value : 'name';

    updateSubjectBanner(selectedSubject);

    // 1. Lọc theo Môn Học
    let filteredList = EXAM_LIST;
    if (selectedSubject !== 'ALL') {
      filteredList = filteredList.filter(e => (e.subject || 'Khác') === selectedSubject);
    }

    // 2. Lọc theo Từ khóa Tìm Kiếm
    if (query) {
      filteredList = filteredList.filter(e => {
        const matchName = e.name && e.name.toLowerCase().includes(query);
        const matchId = e.id && e.id.toLowerCase().includes(query);
        return matchName || matchId;
      });
    }

    // Tính toán số liệu thống kê từng bộ đề
    let metricsList = filteredList.map(item => calculateExamMetrics(item, history));

    // 3. Lọc theo Trạng thái (Tất cả / Đã làm / Chưa làm)
    if (statusVal === 'practiced') {
      metricsList = metricsList.filter(m => m.attemptsCount > 0);
    } else if (statusVal === 'unattempted') {
      metricsList = metricsList.filter(m => m.attemptsCount === 0);
    }

    // 4. Sắp xếp
    metricsList.sort((a, b) => {
      if (sortVal === 'score-desc') {
        return b.highestScoreVal - a.highestScoreVal;
      } else if (sortVal === 'attempts-desc') {
        return b.attemptsCount - a.attemptsCount;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    renderExamCards(metricsList);
  }

  /**
   * 9. KHỞI TẠO VÀ ĐĂNG KÝ EVENT LISTENERS
   */
  function initExamsPage() {
    const bannerSelect = document.getElementById('banner-subject-select');
    const searchInput = document.getElementById('exam-search-input');
    const statusSelect = document.getElementById('exam-status-filter');
    const sortSelect = document.getElementById('exam-sort-select');

    if (bannerSelect) bannerSelect.addEventListener('change', updateExamsPage);
    if (searchInput) searchInput.addEventListener('input', updateExamsPage);
    if (statusSelect) statusSelect.addEventListener('change', updateExamsPage);
    if (sortSelect) sortSelect.addEventListener('change', updateExamsPage);

    updateExamsPage();
  }

  document.addEventListener('DOMContentLoaded', initExamsPage);

  window.updateExamsPage = updateExamsPage;
  window.setSelectedSubjectForExams = function (subjectCode) {
    const bannerSelect = document.getElementById('banner-subject-select');
    if (bannerSelect) {
      bannerSelect.value = subjectCode;
      updateExamsPage();
    }
  };
})(typeof window !== 'undefined' ? window : this);
