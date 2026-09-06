/**
 * APP LUYỆN ĐỀ FE - STATISTICS MODULE (js/stats.js)
 * Điều phối dữ liệu Báo cáo Thống kê Học tập, vẽ biểu đồ Chart.js & Bảng Xếp Hạng Môn Học.
 * Đảm bảo: Không hard-code, không crash khi dữ liệu rỗng, responsive 100%.
 */

(function (global) {
  'use strict';

  // Quản lý các thể hiện Chart.js để hủy (destroy) trước khi vẽ lại
  const chartInstances = {
    scoreOverTime: null,
    rightWrongRatio: null,
    dailyQuestions: null,
    scoreBySubject: null
  };

  /**
   * 1. KHỞI TẠO VÀ CẬP NHẬT TRANG THỐNG KÊ
   */
  function updatePage() {
    const history = global.StorageModule ? global.StorageModule.getExamHistory() : [];

    const chartsSection = document.getElementById('stats-charts-section');
    const rankingsSection = document.getElementById('stats-rankings-section');
    const emptyView = document.getElementById('stats-empty-view');

    // TRƯỜNG HỢP EMPTY STATE: Chưa có lịch sử thi nào
    if (!Array.isArray(history) || history.length === 0) {
      if (chartsSection) chartsSection.classList.add('hidden');
      if (rankingsSection) rankingsSection.classList.add('hidden');
      if (emptyView) emptyView.classList.remove('hidden');

      updateSummaryMetrics([]);
      destroyAllCharts();
      return;
    }

    // HIỂN THỊ CÁC KHU VỰC THỐNG KÊ
    if (chartsSection) chartsSection.classList.remove('hidden');
    if (rankingsSection) rankingsSection.classList.remove('hidden');
    if (emptyView) emptyView.classList.add('hidden');

    updateSummaryMetrics(history);
    renderCharts(history);
    renderRankings(history);
  }

  /**
   * HỦY TẤT CẢ BIỂU ĐỒ HIỆN TẠI (Tránh lỗi Canvas in use của Chart.js)
   */
  function destroyAllCharts() {
    Object.keys(chartInstances).forEach(key => {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
        chartInstances[key] = null;
      }
    });
  }

  /**
   * 2. CẬP NHẬT THÔNG SỐ TỔNG QUAN (Summary Metrics)
   */
  function updateSummaryMetrics(history) {
    const totalExams = history.length;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalScoreSum = 0;

    history.forEach(item => {
      totalQuestions += (item.totalQuestions || 0);
      totalCorrect += (item.correctCount || 0);
      totalScoreSum += parseFloat(item.score || 0);
    });

    const avgScore = totalExams > 0 ? (totalScoreSum / totalExams).toFixed(1) : "0.0";
    const accuracyRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const elAvgScore = document.getElementById('st-avg-score');
    if (elAvgScore) elAvgScore.textContent = avgScore;

    const elAccuracyRate = document.getElementById('st-accuracy-rate');
    if (elAccuracyRate) elAccuracyRate.textContent = `${accuracyRate}%`;

    const elTotalExams = document.getElementById('st-total-exams');
    if (elTotalExams) elTotalExams.textContent = String(totalExams);

    const elTotalQuestions = document.getElementById('st-total-questions');
    if (elTotalQuestions) elTotalQuestions.textContent = String(totalQuestions);
  }

  /**
   * 3. VẼ CÁC BIỂU ĐỒ CHART.JS
   */
  function renderCharts(history) {
    if (typeof global.Chart === 'undefined') {
      console.warn("Thư viện Chart.js chưa nạp. Không thể vẽ biểu đồ.");
      return;
    }

    destroyAllCharts();

    // Sắp xếp lịch sử theo thứ tự thời gian tăng dần (cũ nhất -> mới nhất)
    const chronoHistory = [...history].reverse();

    renderLineScoreOverTime(chronoHistory);
    renderDoughnutRightWrong(history);
    renderBarDailyQuestions(chronoHistory);
    renderBarScoreBySubject(history);
  }

  /**
   * BIỂU ĐỒ 1: Line Chart - Điểm số theo thời gian
   */
  function renderLineScoreOverTime(chronoHistory) {
    const ctx = document.getElementById('chart-score-over-time');
    if (!ctx) return;

    const labels = chronoHistory.map((item, i) => {
      if (item.dateFormatted) {
        return item.dateFormatted.split(' ')[0] || `Lần ${i + 1}`;
      }
      return `Lần ${i + 1}`;
    });

    const data = chronoHistory.map(item => parseFloat(item.score || 0));

    chartInstances.scoreOverTime = new global.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Điểm thi (/10)',
          data: data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 10,
            ticks: { stepSize: 2 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /**
   * BIỂU ĐỒ 2: Doughnut Chart - Tỷ lệ đúng / sai
   */
  function renderDoughnutRightWrong(history) {
    const ctx = document.getElementById('chart-right-wrong-ratio');
    if (!ctx) return;

    let totalCorrect = 0;
    let totalQuestions = 0;

    history.forEach(item => {
      totalQuestions += (item.totalQuestions || 0);
      totalCorrect += (item.correctCount || 0);
    });

    const totalWrong = Math.max(0, totalQuestions - totalCorrect);

    chartInstances.rightWrongRatio = new global.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Số câu đúng', 'Số câu sai / bỏ trống'],
        datasets: [{
          data: [totalCorrect, totalWrong],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 14, font: { weight: '600' } }
          }
        }
      }
    });
  }

  /**
   * BIỂU ĐỒ 3: Bar Chart - Số câu đã làm mỗi ngày
   */
  function renderBarDailyQuestions(chronoHistory) {
    const ctx = document.getElementById('chart-daily-questions');
    if (!ctx) return;

    const dailyMap = {};
    chronoHistory.forEach(item => {
      let dateKey = 'Khác';
      if (item.dateFormatted) {
        dateKey = item.dateFormatted.split(' ')[0];
      } else if (item.date) {
        const d = new Date(item.date);
        dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + (item.totalQuestions || 0);
    });

    const labels = Object.keys(dailyMap);
    const data = Object.values(dailyMap);

    chartInstances.dailyQuestions = new global.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số câu làm',
          data: data,
          backgroundColor: '#9333ea',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 10 } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /**
   * BIỂU ĐỒ 4: Bar Chart - Điểm trung bình theo môn
   */
  function renderBarScoreBySubject(history) {
    const ctx = document.getElementById('chart-score-by-subject');
    if (!ctx) return;

    const subjectMap = {};
    history.forEach(item => {
      const sub = item.subject || 'Khác';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { totalScore: 0, count: 0 };
      }
      subjectMap[sub].totalScore += parseFloat(item.score || 0);
      subjectMap[sub].count += 1;
    });

    const labels = Object.keys(subjectMap);
    const data = labels.map(sub => (subjectMap[sub].totalScore / subjectMap[sub].count).toFixed(2));

    chartInstances.scoreBySubject = new global.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Điểm TB (/10)',
          data: data,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 10 }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /**
   * 4. RENDER TOP MÔN MẠNH NHẤT & MÔN CẦN CẢI THIỆN
   */
  function renderRankings(history) {
    const strongListContainer = document.getElementById('top-strong-subjects-list');
    const weakListContainer = document.getElementById('top-weak-subjects-list');
    if (!strongListContainer || !weakListContainer) return;

    strongListContainer.replaceChildren();
    weakListContainer.replaceChildren();

    // Gom nhóm thống kê theo môn
    const subjectMap = {};
    history.forEach(item => {
      const sub = item.subject || 'Khác';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { subject: sub, totalScore: 0, count: 0 };
      }
      subjectMap[sub].totalScore += parseFloat(item.score || 0);
      subjectMap[sub].count += 1;
    });

    const statsList = Object.keys(subjectMap).map(sub => ({
      subject: sub,
      avgScore: subjectMap[sub].totalScore / subjectMap[sub].count,
      count: subjectMap[sub].count
    }));

    // Sắp xếp giảm dần theo điểm trung bình
    const sortedDesc = [...statsList].sort((a, b) => b.avgScore - a.avgScore);
    // Sắp xếp tăng dần theo điểm trung bình
    const sortedAsc = [...statsList].sort((a, b) => a.avgScore - b.avgScore);

    // Top Môn mạnh nhất (Lấy tối đa 3 môn điểm cao nhất)
    const topStrong = sortedDesc.slice(0, 3);
    topStrong.forEach((item, idx) => {
      const el = createRankingItem(item, idx, true);
      strongListContainer.appendChild(el);
    });

    // Top Môn cần cải thiện (Lấy tối đa 3 môn điểm thấp nhất)
    const topWeak = sortedAsc.slice(0, 3);
    topWeak.forEach((item, idx) => {
      const el = createRankingItem(item, idx, false);
      weakListContainer.appendChild(el);
    });
  }

  function createRankingItem(item, idx, isStrong) {
    const div = document.createElement('div');
    div.className = 'ranking-item';

    const left = document.createElement('div');
    left.className = 'ranking-item-left';

    const badge = document.createElement('div');
    let badgeClass = 'badge-gold';
    if (idx === 1) badgeClass = 'badge-silver';
    if (idx === 2) badgeClass = 'badge-bronze';
    badge.className = `ranking-badge ${badgeClass}`;
    badge.textContent = String(idx + 1);

    const info = document.createElement('div');
    const code = document.createElement('div');
    code.className = 'ranking-subject-code';
    code.textContent = item.subject;

    const count = document.createElement('div');
    count.className = 'ranking-subject-exams';
    count.textContent = `Đã làm ${item.count} lượt thi`;

    info.appendChild(code);
    info.appendChild(count);

    left.appendChild(badge);
    left.appendChild(info);

    const scoreVal = document.createElement('div');
    scoreVal.className = `ranking-score-value ${isStrong ? 'score-high' : 'score-low'}`;
    scoreVal.textContent = `${item.avgScore.toFixed(1)} điểm`;

    div.appendChild(left);
    div.appendChild(scoreVal);

    return div;
  }

  /**
   * 5. ĐĂNG KÝ EVENT LISTENERS
   */
  function bindEventListeners() {
    const btnStartExam = document.getElementById('btn-stats-start-exam');
    if (btnStartExam) {
      btnStartExam.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('page-change', { detail: { page: 'exams' } }));
      });
    }

    // Lắng nghe sự kiện nộp bài thi để cập nhật báo cáo ngay lập tức
    window.addEventListener('exam-submitted', () => {
      updatePage();
    });
  }

  document.addEventListener('DOMContentLoaded', bindEventListeners);

  global.StatsModule = {
    updatePage: updatePage
  };
})(window);
