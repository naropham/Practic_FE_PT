/**
 * APP LUYỆN ĐỀ FE - SUBJECTS MODULE SCRIPT
 * Quản lý Tìm kiếm, Lọc, Sắp xếp và Render danh sách Môn Học.
 * Tuân thủ an toàn DOM API: Dùng textContent & createElement (Không innerHTML).
 */

(function () {
  'use strict';

  const HISTORY_STORAGE_KEY = 'luyenDe_exam_history';

  // Tên hiển thị đầy đủ của từng môn học (Friendly Subject Names)
  const SUBJECT_NAMES = {
    'MAI391': 'Toán Trí Tuệ Nhân Tạo (Artificial Intelligence Mathematics)',
    'SSG104': 'Kỹ Năng Làm Việc Nhóm (Soft Skills & Teamwork)',
    'MAE101': 'Toán Cao Cấp Cho Kỹ Thuật (Engineering Mathematics)',
    'PRN211': 'Lập Trình .NET (Basic Cross-Platform Application Programming)',
    'SWP391': 'Dự Án Phần Mềm (Software Development Project)',
    'DBI202': 'Cơ Sở Dữ Liệu (Database Systems)'
  };

  /**
   * 1. ĐỌC LỊCH SỬ THI TỪ LOCALSTORAGE AN TOÀN
   * @returns {Array<object>}
   */
  function getExamHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Lỗi nạp lịch sử thi trong trang Môn học:", err);
      return [];
    }
  }

  /**
   * 2. XÂY DỰNG DANH SÁCH DỮ LIỆU MÔN HỌC ĐỘNG TỪ EXAM_LIST
   * @returns {Array<object>}
   */
  function buildSubjectData() {
    if (typeof EXAM_LIST === 'undefined' || !Array.isArray(EXAM_LIST)) {
      return null; // Dữ liệu nguồn không hợp lệ
    }

    const history = getExamHistory();
    const uniqueSubjects = [...new Set(EXAM_LIST.map(e => e.subject || "Khác"))];

    return uniqueSubjects.map(code => {
      const examsInSubject = EXAM_LIST.filter(e => (e.subject || "Khác") === code);
      const examCount = examsInSubject.length;
      const questionCount = examCount * 50;

      // Tính điểm trung bình môn từ lịch sử
      const subHistory = history.filter(h => h.subject === code);
      const isPracticed = subHistory.length > 0;
      const avgScoreVal = isPracticed
        ? subHistory.reduce((acc, cur) => acc + (parseFloat(cur.score) || 0), 0) / subHistory.length
        : 0;

      return {
        code: code,
        name: SUBJECT_NAMES[code] || `Môn học ${code}`,
        examCount: examCount,
        questionCount: questionCount,
        avgScore: avgScoreVal,
        avgScoreText: isPracticed ? avgScoreVal.toFixed(2) : "Chưa có",
        isPracticed: isPracticed,
        exams: examsInSubject
      };
    });
  }

  /**
   * 3. AN TOÀN RENDER THẺ THÔNG BÁO RỖNG / LỖI (EMPTY & ERROR STATES)
   */
  function renderStateCard(container, titleText, descText, actionText, actionCallback) {
    container.replaceChildren();

    const card = document.createElement('div');
    card.className = "subjects-empty-card";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "subjects-empty-icon");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("viewBox", "0 0 24 24");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("d", "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
    svg.appendChild(path);

    const h3 = document.createElement('h3');
    h3.className = "subjects-empty-title";
    h3.textContent = titleText;

    const p = document.createElement('p');
    p.className = "subjects-empty-desc";
    p.textContent = descText;

    card.appendChild(svg);
    card.appendChild(h3);
    card.appendChild(p);

    if (actionText && actionCallback) {
      const btn = document.createElement('button');
      btn.type = "button";
      btn.className = "btn-practice";
      btn.style.maxWidth = "200px";
      btn.textContent = actionText;
      btn.addEventListener('click', actionCallback);
      card.appendChild(btn);
    }

    container.appendChild(card);
  }

  /**
   * 4. RENDER DANH SÁCH THẺ MÔN HỌC (SUBJECT CARDS)
   */
  function renderSubjectsList(subjectsList) {
    const container = document.getElementById('subjects-page-grid');
    if (!container) return;

    // Trường hợp 1: Dữ liệu lỗi
    if (subjectsList === null) {
      renderStateCard(
        container,
        "Lỗi nạp dữ liệu môn học",
        "Không thể tải danh sách bộ đề từ hệ thống. Vui lòng kiểm tra lại kết nối hoặc làm mới trang.",
        "Tải lại trang",
        () => window.location.reload()
      );
      return;
    }

    // Trường hợp 2: Danh sách môn học bị rỗng do không tìm thấy kết quả
    if (subjectsList.length === 0) {
      renderStateCard(
        container,
        "Không tìm thấy môn học nào",
        "Không có môn học nào phù hợp với từ khóa hoặc bộ lọc hiện tại của bạn. Vui lòng thử tìm kiếm với từ khóa khác.",
        "Xóa bộ lọc",
        () => {
          const searchInput = document.getElementById('subject-search-input');
          const filterSelect = document.getElementById('subject-filter-select');
          if (searchInput) searchInput.value = "";
          if (filterSelect) filterSelect.value = "all";
          updateSubjectsPage();
        }
      );
      return;
    }

    container.replaceChildren();

    // Dựng thẻ Card cho từng môn học
    subjectsList.forEach(sub => {
      const card = document.createElement('div');
      card.className = "subject-full-card";

      // Title & Status Tag
      const titleBox = document.createElement('div');
      titleBox.className = "subject-title-box";

      const statusBadge = document.createElement('span');
      statusBadge.className = "subject-status-badge " + (sub.isPracticed ? "status-practiced" : "status-unpracticed");
      statusBadge.textContent = sub.isPracticed ? "✓ Đã luyện" : "• Chưa luyện";

      const codeTag = document.createElement('span');
      codeTag.className = "subject-code-tag";
      codeTag.textContent = sub.code;

      const nameH3 = document.createElement('h3');
      nameH3.className = "subject-name";
      nameH3.textContent = sub.name;

      titleBox.appendChild(statusBadge);
      titleBox.appendChild(codeTag);
      titleBox.appendChild(nameH3);

      // Stats list
      const statsList = document.createElement('div');
      statsList.className = "subject-stats-list";

      // 1. Số bộ đề
      const item1 = document.createElement('div');
      const num1 = document.createElement('div');
      num1.className = "stat-item-num";
      num1.textContent = String(sub.examCount);
      const lbl1 = document.createElement('div');
      lbl1.className = "stat-item-label";
      lbl1.textContent = "Số bộ đề";
      item1.appendChild(num1);
      item1.appendChild(lbl1);

      // 2. Tổng số câu
      const item2 = document.createElement('div');
      const num2 = document.createElement('div');
      num2.className = "stat-item-num";
      num2.textContent = `~${sub.questionCount}`;
      const lbl2 = document.createElement('div');
      lbl2.className = "stat-item-label";
      lbl2.textContent = "Tổng số câu";
      item2.appendChild(num2);
      item2.appendChild(lbl2);

      // 3. Điểm trung bình
      const item3 = document.createElement('div');
      const num3 = document.createElement('div');
      num3.className = "stat-item-num";
      num3.textContent = sub.avgScoreText;
      const lbl3 = document.createElement('div');
      lbl3.className = "stat-item-label";
      lbl3.textContent = "Điểm TB";
      item3.appendChild(num3);
      item3.appendChild(lbl3);

      statsList.appendChild(item1);
      statsList.appendChild(item2);
      statsList.appendChild(item3);

      // Nút Luyện Ngay
      const practiceBtn = document.createElement('button');
      practiceBtn.type = "button";
      practiceBtn.className = "btn-practice";
      practiceBtn.textContent = "Luyện ngay";
      practiceBtn.addEventListener('click', () => {
        const examSelect = document.getElementById('exam-select');
        if (examSelect && sub.exams.length > 0) {
          examSelect.value = sub.exams[0].id;
          examSelect.dispatchEvent(new Event('change'));
        }
      });

      card.appendChild(titleBox);
      card.appendChild(statsList);
      card.appendChild(practiceBtn);

      container.appendChild(card);
    });
  }

  /**
   * 5. LỌC, TÌM KIẾM VÀ SẮP XẾP DANH SÁCH MÔN HỌC (NO PAGE RELOAD)
   */
  function updateSubjectsPage() {
    const rawData = buildSubjectData();
    if (rawData === null) {
      renderSubjectsList(null);
      return;
    }

    const searchInput = document.getElementById('subject-search-input');
    const filterSelect = document.getElementById('subject-filter-select');
    const sortSelect = document.getElementById('subject-sort-select');

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filterVal = filterSelect ? filterSelect.value : "all";
    const sortVal = sortSelect ? sortSelect.value : "name";

    // 1. TÌM KIẾM
    let filtered = rawData.filter(sub => {
      const matchCode = sub.code.toLowerCase().includes(query);
      const matchName = sub.name.toLowerCase().includes(query);
      return matchCode || matchName;
    });

    // 2. LỌC TRẠNG THÁI
    if (filterVal === "practiced") {
      filtered = filtered.filter(sub => sub.isPracticed);
    } else if (filterVal === "unpracticed") {
      filtered = filtered.filter(sub => !sub.isPracticed);
    }

    // 3. SẮP XẾP
    filtered.sort((a, b) => {
      if (sortVal === "exams-desc") {
        return b.examCount - a.examCount;
      } else if (sortVal === "score-desc") {
        return b.avgScore - a.avgScore;
      } else {
        // Mặc định sắp xếp theo tên (A-Z)
        return a.code.localeCompare(b.code);
      }
    });

    renderSubjectsList(filtered);
  }

  /**
   * 6. KHỞI TẠO VÀ RÀNG BUỘC SỰ KIỆN LỌC TRANG MÔN HỌC
   */
  function initSubjectsPage() {
    const searchInput = document.getElementById('subject-search-input');
    const filterSelect = document.getElementById('subject-filter-select');
    const sortSelect = document.getElementById('subject-sort-select');

    if (searchInput) {
      searchInput.addEventListener('input', updateSubjectsPage);
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', updateSubjectsPage);
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', updateSubjectsPage);
    }

    // Lắng nghe sự kiện tìm kiếm từ Header
    window.addEventListener('header-search', (e) => {
      if (e.detail && typeof e.detail.query === 'string' && searchInput) {
        searchInput.value = e.detail.query;
        updateSubjectsPage();
      }
    });

    // Render danh sách ban đầu
    updateSubjectsPage();
  }

  document.addEventListener('DOMContentLoaded', initSubjectsPage);

  // Export hàm để làm mới dữ liệu khi người dùng chuyển trang
  window.updateSubjectsPage = updateSubjectsPage;
})();
