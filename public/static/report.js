// 리포트 페이지 JavaScript

async function loadReport() {
  try {
    const response = await axios.get(`/api/report/${surveyId}`);
    const report = response.data;
    
    renderReport(report);
  } catch (error) {
    console.error('Error loading report:', error);
    document.getElementById('reportContent').innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">리포트를 불러올 수 없습니다</h2>
        <p class="text-gray-600">${error.response?.data?.error || error.message}</p>
      </div>
    `;
  }
}

function renderReport(report) {
  const container = document.getElementById('reportContent');
  
  const html = `
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-blue-900 mb-2">
        <i class="fas fa-file-alt mr-2"></i>
        산업전환 준비도 진단 리포트
      </h1>
      <p class="text-gray-600">${report.company_name}</p>
    </div>

    <!-- 종합 점수 -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-8 text-center">
      <h2 class="text-xl font-bold text-gray-800 mb-4">종합 준비도</h2>
      <div class="flex items-center justify-center gap-4">
        <div class="text-6xl font-bold" style="color: ${report.gradeColor};">
          ${report.totalScore}
        </div>
        <div>
          <div class="text-4xl font-bold mb-2" style="color: ${report.gradeColor};">
            ${report.grade}등급
          </div>
          <div class="text-sm text-gray-600">5.0 만점</div>
        </div>
      </div>
    </div>

    <!-- 영역별 점수 -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-chart-bar mr-2 text-blue-600"></i>
        영역별 준비도 분석
      </h2>
      <div class="grid md:grid-cols-2 gap-6">
        ${renderScoreCard('탄소중립/기후변화', report.scores.climate, 'fa-leaf', 'green')}
        ${renderScoreCard('디지털/AI 혁신', report.scores.digital, 'fa-microchip', 'blue')}
        ${renderScoreCard('고용 현황/일자리 질', report.scores.employment, 'fa-users', 'purple')}
        ${renderScoreCard('전환 준비도', report.scores.readiness, 'fa-chart-line', 'orange')}
      </div>
    </div>

    <!-- 레이더 차트 -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-chart-area mr-2 text-blue-600"></i>
        종합 분석 차트
      </h2>
      <div class="bg-gray-50 rounded-lg p-6">
        <canvas id="radarChart" width="400" height="300"></canvas>
      </div>
    </div>

    <!-- 개선 제안 -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>
        맞춤형 개선 제안
      </h2>
      <div class="space-y-3">
        ${report.recommendations.length > 0 ? 
          report.recommendations.map((rec, idx) => `
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p class="font-medium text-gray-800">
                <span class="bg-yellow-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">${idx + 1}</span>
                ${rec}
              </p>
            </div>
          `).join('') :
          '<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded"><p class="font-medium text-gray-800"><i class="fas fa-check-circle mr-2 text-green-500"></i>우수한 준비도를 갖추고 있습니다!</p></div>'
        }
      </div>
    </div>

    <!-- 지원 분야 -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-hands-helping mr-2 text-blue-600"></i>
        선택하신 지원 분야
      </h2>
      <div class="flex flex-wrap gap-2">
        ${report.support_areas.map(area => `
          <span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            <i class="fas fa-check mr-1"></i>${area}
          </span>
        `).join('')}
      </div>
    </div>

    <!-- 컨설팅 신청 -->
    <div class="${report.consulting_application ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'} border-2 rounded-lg p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-2">
        <i class="fas ${report.consulting_application ? 'fa-check-circle text-green-600' : 'fa-info-circle text-gray-600'} mr-2"></i>
        산업·일자리전환 컨설팅
      </h2>
      <p class="text-gray-700">
        ${report.consulting_application ? 
          '✅ 신청이 완료되었습니다. 담당자가 곧 연락드릴 예정입니다.' :
          '아직 신청하지 않으셨습니다.'
        }
      </p>
    </div>

    <div class="mt-8 text-center text-sm text-gray-500">
      <p>본 진단 결과는 자가진단 설문을 기반으로 자동 생성되었습니다.</p>
      <p>보다 정확한 진단을 원하시면 전문 컨설팅을 신청해 주세요.</p>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 차트 렌더링
  renderRadarChart(report.scores);
}

function renderScoreCard(title, score, icon, color) {
  const percentage = (score / 5) * 100;
  const colorClasses = {
    green: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-600', bar: 'bg-green-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600', bar: 'bg-blue-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-600', bar: 'bg-purple-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600', bar: 'bg-orange-500' }
  };
  const colors = colorClasses[color];
  
  return `
    <div class="${colors.bg} border-2 ${colors.border} rounded-lg p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-gray-800">
          <i class="fas ${icon} mr-2 ${colors.text}"></i>
          ${title}
        </h3>
        <span class="text-2xl font-bold ${colors.text}">${score.toFixed(1)}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div class="${colors.bar} h-3 rounded-full transition-all" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

function renderRadarChart(scores) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['탄소중립/기후변화', '디지털/AI 혁신', '고용 현황/일자리 질', '전환 준비도'],
      datasets: [{
        label: '준비도 점수',
        data: [scores.climate, scores.digital, scores.employment, scores.readiness],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
      }]
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// 페이지 로드 시 리포트 불러오기
loadReport();
