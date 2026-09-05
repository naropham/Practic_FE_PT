/**
 * APP LUYỆN ĐỀ FE - DASHBOARD MODULE SCRIPT
 * Dữ liệu động hoàn toàn từ EXAM_LIST & LocalStorage.
 * Tuân thủ an toàn DOM API: Dùng textContent & createElement (Không innerHTML).
 */

(function () {
  'use strict';

  const HISTORY_STORAGE_KEY = 'luyenDe_exam_history';

  /**
   * 1. ĐỌC DỮ LIỆU LỊCH SỬ LÀM BÀI TỪ LOCALSTORAGE
   * @returns {Array<object>}
   */
  function getExamHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Lỗi nạp lịch sử làm bài:", err);
      return [];
    }
  }

  /**
   * 2. RENDER CÁC THẺ THỐNG KÊ TỔNG QUAN (STATISTICS CARDS)
   */
  function renderStatistics(history) {
    const totalExamsEl = document.getElementById('stat-total-exams');
    const totalQuestionsEl = document.getElementById('stat-total-questions');
    const avgScoreEl = document.getElementById('stat-avg-score');
    const streakDaysEl = document.getElementById('stat-streak-days');

    if (!totalExamsEl || !totalQuestionsEl || !avgScoreEl || !streakDaysEl) return;

    const totalExams = history.length;
    let totalQuestions = 0;
    let totalScoreSum = 0;

    history.forEach(item => {
      totalQuestions += (item.totalQuestions || 50);
      totalScoreSum += (parseFloat(item.score) || 0);
    });

    const avgScore = totalExams > 0 ? (totalScoreSum / totalExams).toFixed(2) : "0.0";
    
    // Tính chuỗi ngày học streak đơn giản
    const uniqueDays = new Set(history.map(item => item.date ? item.date.split('T')[0] : ''));
    uniqueDays.delete('');

    totalExamsEl.textContent = String(totalExams);
    totalQuestionsEl.textContent = String(totalQuestions);
    avgScoreEl.textContent = String(avgScore);
    streakDaysEl.textContent = `${uniqueDays.size} ngày`;
  }

  /**
   * 3. RENDER DANH SÁCH MÔN HỌC (SUBJECT CARDS DYNAMIC)
   */
  function renderSubjectCards(history) {
    const container = document.getElementById('subjects-grid-container');
    if (!container || typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) return;

    container.replaceChildren();

    const subjects = [...new Set(EXAM_LIST.map(e => e.subject || "Khác"))];

    subjects.forEach(subjectCode => {
      const examsInSub = EXAM_LIST.filter(e => (e.subject || "Khác") === subjectCode);
      const examCount = examsInSub.length;
      const questionEstimate = examCount * 50;

      // Tính điểm trung bình của môn học này trong lịch sử
      const subHistory = history.filter(h => h.subject === subjectCode);
      const subAvg = subHistory.length > 0
        ? (subHistory.reduce((acc, cur) => acc + (parseFloat(cur.score) || 0), 0) / subHistory.length).toFixed(2)
        : "N/A";

      // Tạo phần tử Card an toàn bằng DOM API
      const card = document.createElement('div');
      card.className = "subject-card";

      // Header card
      const headerDiv = document.createElement('div');
      headerDiv.className = "subject-header";

      const codeSpan = document.createElement('span');
      codeSpan.className = "subject-code";
      codeSpan.textContent = subjectCode;

      const badgeSpan = document.createElement('span');
      badgeSpan.className = "subject-badge";
      badgeSpan.textContent = `${examCount} Bộ đề`;

      headerDiv.appendChild(codeSpan);
      headerDiv.appendChild(badgeSpan);

      // Metrics Grid
      const metricsDiv = document.createElement('div');
      metricsDiv.className = "subject-metrics";

      // Item 1: Đề
      const m1 = document.createElement('div');
      const v1 = document.createElement('div');
      v1.className = "metric-val";
      v1.textContent = String(examCount);
      const l1 = document.createElement('div');
      l1.className = "metric-lbl";
      l1.textContent = "Bộ đề";
      m1.appendChild(v1);
      m1.appendChild(l1);

      // Item 2: Câu hỏi
      const m2 = document.createElement('div');
      const v2 = document.createElement('div');
      v2.className = "metric-val";
      v2.textContent = `~${questionEstimate}`;
      const l2 = document.createElement('div');
      l2.className = "metric-lbl";
      l2.textContent = "Câu hỏi";
      m2.appendChild(v2);
      m2.appendChild(l2);

      // Item 3: Điểm TB
      const m3 = document.createElement('div');
      const v3 = document.createElement('div');
      v3.className = "metric-val";
      v3.textContent = String(subAvg);
      const l3 = document.createElement('div');
      l3.className = "metric-lbl";
      l3.textContent = "Điểm TB";
      m3.appendChild(v3);
      m3.appendChild(l3);

      metricsDiv.appendChild(m1);
      metricsDiv.appendChild(m2);
      metricsDiv.appendChild(m3);

      // Button
      const practiceBtn = document.createElement('button');
      practiceBtn.type = "button";
      practiceBtn.className = "btn-practice";
      practiceBtn.textContent = "Luyện ngay";
      practiceBtn.setAttribute('data-subject', subjectCode);

      practiceBtn.addEventListener('click', () => {
        // Tự động chọn môn học này trong dropdown chính
        const examSelect = document.getElementById('exam-select');
        if (examSelect) {
          const firstExamInSub = examsInSub[0];
          if (firstExamInSub) {
            examSelect.value = firstExamInSub.id;
            examSelect.dispatchEvent(new Event('change'));
          }
        }
      });

      card.appendChild(headerDiv);
      card.appendChild(metricsDiv);
      card.appendChild(practiceBtn);

      container.appendChild(card);
    });
  }

  /**
   * 4. RENDER LỊCH SỬ THI GẦN ĐÂY HOẶC EMPTY STATE
   */
  function renderRecentExams(history) {
    const container = document.getElementById('recent-exams-container');
    if (!container) return;

    container.replaceChildren();

    if (history.length === 0) {
      // EMPTY STATE THIẾT KẾ ĐẸP & HIỆN ĐẠI
      const emptyDiv = document.createElement('div');
      emptyDiv.className = "empty-state-container";

      // SVG Icon
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "empty-icon");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("viewBox", "0 0 24 24");

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("d", "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z");
      svg.appendChild(path);

      const title = document.createElement('h3');
      title.className = "empty-title";
      title.textContent = "Chưa có lịch sử làm bài";

      const desc = document.createElement('p');
      desc.className = "empty-desc";
      desc.textContent = "Bạn chưa hoàn thành bộ đề thi nào. Hãy chọn một bộ đề ở trên để làm bài và ghi nhận kết quả đầu tiên nhé!";

      const actionBtn = document.createElement('button');
      actionBtn.type = "button";
      actionBtn.className = "btn-practice";
      actionBtn.style.maxWidth = "200px";
      actionBtn.textContent = "Bắt đầu làm bài";
      actionBtn.addEventListener('click', () => {
        const examSelect = document.getElementById('exam-select');
        if (examSelect) examSelect.focus();
      });

      emptyDiv.appendChild(svg);
      emptyDiv.appendChild(title);
      emptyDiv.appendChild(desc);
      emptyDiv.appendChild(actionBtn);

      container.appendChild(emptyDiv);
      return;
    }

    // BẢNG BẢN GHI LỊCH SỬ THI
    const tableWrapper = document.createElement('div');
    tableWrapper.className = "recent-table-wrapper";

    const table = document.createElement('table');
    table.className = "recent-table";

    // Header Table
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Ngày làm', 'Môn học', 'Bộ đề', 'Điểm số', 'Thời gian', 'Thao tác'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body Table
    const tbody = document.createElement('tbody');
    history.slice(0, 5).forEach(item => { // Hiển thị tối đa 5 bản ghi mới nhất
      const tr = document.createElement('tr');

      const tdDate = document.createElement('td');
      tdDate.textContent = item.dateFormatted || (item.date ? new Date(item.date).toLocaleDateString('vi-VN') : 'Mới đây');

      const tdSubject = document.createElement('td');
      tdSubject.textContent = item.subject || 'Khác';

      const tdExam = document.createElement('td');
      tdExam.textContent = item.examName || item.examId || 'Đề thi';

      const tdScore = document.createElement('td');
      const scoreBadge = document.createElement('span');
      const scoreVal = parseFloat(item.score) || 0;
      scoreBadge.className = "score-badge " + (scoreVal >= 8 ? "score-high" : scoreVal >= 5 ? "score-mid" : "score-low");
      scoreBadge.textContent = `${scoreVal.toFixed(2)} / 10`;
      tdScore.appendChild(scoreBadge);

      const tdTime = document.createElement('td');
      tdTime.textContent = item.timeSpentText || 'N/A';

      const tdAction = document.createElement('td');
      const btnView = document.createElement('button');
      btnView.type = "button";
      btnView.className = "px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition";
      btnView.textContent = "Xem kết quả";
      btnView.addEventListener('click', () => {
        alert(`Bộ đề ${item.examName || item.examId}: Đạt ${scoreVal.toFixed(2)} điểm (${item.correctCount || 0}/${item.totalQuestions || 50} câu đúng)`);
      });
      tdAction.appendChild(btnView);

      tr.appendChild(tdDate);
      tr.appendChild(tdSubject);
      tr.appendChild(tdExam);
      tr.appendChild(tdScore);
      tr.appendChild(tdTime);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  }

  /**
   * 5. ĐĂNG KÝ HÀNH ĐỘNG NHANH (QUICK ACTIONS)
   */
  function bindQuickActions() {
    const btnQuick = document.getElementById('btn-quick-exam');
    const btnPractice = document.getElementById('btn-quick-practice');
    const btnWrong = document.getElementById('btn-review-wrong');

    if (btnQuick) {
      btnQuick.addEventListener('click', () => {
        if (typeof EXAM_LIST !== 'undefined' && EXAM_LIST.length > 0) {
          const randomIndex = Math.floor(Math.random() * EXAM_LIST.length);
          const randomExam = EXAM_LIST[randomIndex];
          const examSelect = document.getElementById('exam-select');
          if (examSelect) {
            examSelect.value = randomExam.id;
            examSelect.dispatchEvent(new Event('change'));
          }
        }
      });
    }

    if (btnPractice) {
      btnPractice.addEventListener('click', () => {
        alert("Tính năng Luyện nhanh 10 câu ngẫu nhiên sẽ mở bộ đề ngẫu nhiên!");
        if (btnQuick) btnQuick.click();
      });
    }

    if (btnWrong) {
      btnWrong.addEventListener('click', () => {
        alert("Hiện tại bạn chưa có câu hỏi làm sai nào trong phiên làm việc!");
      });
    }
  }

  /**
   * 6. KHỞI TẠO DASHBOARD DỮ LIỆU ĐỘNG
   */
  function initDashboard() {
    const history = getExamHistory();
    renderStatistics(history);
    renderSubjectCards(history);
    renderRecentExams(history);
    bindQuickActions();
  }

  document.addEventListener('DOMContentLoaded', initDashboard);

  // Lắng nghe nếu có bài thi mới được nộp để làm mới Dashboard
  window.addEventListener('exam-submitted', initDashboard);
})();
