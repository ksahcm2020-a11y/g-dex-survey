// 산업일자리전환 컨설팅 사전진단 보고서 JavaScript
// Updated: 2026-02-13

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
        <h2 class="text-lg font-bold text-gray-800 mb-2">리포트를 불러올 수 없습니다</h2>
        <p class="text-gray-600">${error.response?.data?.error || error.message}</p>
      </div>
    `;
  }
}

function renderReport(report) {
  const container = document.getElementById('reportContent');
  
  const html = `
    <!-- 1. 표지 (Cover Page) -->
    <div class="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-lg p-8 mb-6 text-center page-break-after">
      <div class="mb-4">
        <i class="fas fa-industry text-5xl mb-3"></i>
        <h1 class="text-3xl font-bold mb-2">산업일자리전환 컨설팅 사전진단 보고서</h1>
      </div>
      
      <div class="bg-white/10 backdrop-blur rounded-lg p-4 max-w-2xl mx-auto">
        <div class="grid grid-cols-2 gap-4 text-left">
          <div>
            <p class="text-blue-200 text-sm mb-1">수신</p>
            <p class="text-lg font-bold">${report.company_name}</p>
            <p class="text-lg">${report.ceo_name} 님 귀중</p>
          </div>
          <div>
            <p class="text-blue-200 text-sm mb-1">진단일</p>
            <p class="text-lg font-bold">${report.diagnosis_date}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 종합 진단 결과 -->
    <div class="bg-white border-4 rounded-lg p-4 mb-4" style="border-color: ${report.typeColor};">
      <h2 class="text-lg font-bold text-gray-800 mb-6">
        <i class="fas fa-clipboard-check mr-2"></i>
        종합 진단 결과
      </h2>
      
      <div class="bg-gray-50 rounded-lg p-3 mb-3">
        <p class="text-lg mb-4">
          "<strong>${report.company_name}</strong>의 진단 결과는 
          <span class="text-lg font-bold px-4 py-2 rounded inline-block" style="background-color: ${report.typeColor}; color: white;">
            ${report.diagnosisType}
          </span> 
          입니다."
        </p>
        <p class="text-gray-700 leading-relaxed">
          ${report.typeDescription}
        </p>
      </div>

      <!-- G-DAX 4분면 매트릭스 -->
      <div class="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">
          <i class="fas fa-chart-area mr-2 text-blue-600"></i>
          G-DAX 4분면 위치 확인
        </h3>
        
        <div class="relative" style="height: 350px;">
          <canvas id="matrixChart"></canvas>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mt-6">
          <div class="bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">탄소 리스크 (X축)</span>
              <span class="text-lg font-bold text-red-600">${report.climateRiskPercent}점</span>
            </div>
            <div class="text-sm text-gray-600">
              <strong>${report.scores.climateTotal}점</strong> / 15점 만점
              ${parseFloat(report.climateRiskPercent) >= 60 ? '<span class="text-red-600 font-bold ml-2">(심각)</span>' : '<span class="text-green-600 font-bold ml-2">(양호)</span>'}
            </div>
          </div>
          
          <div class="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">디지털 시급성 (Y축)</span>
              <span class="text-lg font-bold text-blue-600">${report.digitalUrgencyPercent}점</span>
            </div>
            <div class="text-sm text-gray-600">
              <strong>${report.scores.digitalTotal}점</strong> / 15점 만점
              ${parseFloat(report.digitalUrgencyPercent) >= 60 ? '<span class="text-red-600 font-bold ml-2">(시급)</span>' : '<span class="text-green-600 font-bold ml-2">(양호)</span>'}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 상세 분석 및 이슈 도출 -->
    <div class="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4">
      <h2 class="text-lg font-bold text-gray-800 mb-6">
        <i class="fas fa-search mr-2 text-blue-600"></i>
        상세 분석 및 이슈 도출
      </h2>

      <!-- 환경(Green) 리스크 분석 -->
      <div class="mb-6 pb-6 border-b">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-leaf mr-2 text-green-600"></i>
          ① 환경(Green) 리스크 분석
        </h3>
        <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-3">
          <p class="font-medium text-gray-800 mb-2">
            <strong>상태:</strong> 
            ${parseFloat(report.climateRiskPercent) >= 60 
              ? '원청사의 RE100 요구 및 에너지 비용 상승 압박이 심화되고 있습니다.' 
              : '현재 탄소 규제 리스크는 비교적 관리 가능한 수준입니다.'}
          </p>
          <p class="text-gray-700">
            <strong>예측:</strong> 
            ${parseFloat(report.climateRiskPercent) >= 60 
              ? '향후 3년 내 기존 내연기관/화력 관련 매출 감소가 예상되므로, 사업 모델 자체의 변화가 필요합니다.' 
              : '지속 가능한 경영을 위해 선제적인 탄소중립 전략 수립을 권장합니다.'}
          </p>
        </div>
      </div>

      <!-- 디지털(Digital) 역량 분석 -->
      <div class="mb-6 pb-6 border-b">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-microchip mr-2 text-blue-600"></i>
          ② 디지털(Digital) 역량 분석
        </h3>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-3">
          <p class="font-medium text-gray-800 mb-2">
            <strong>상태:</strong> 
            ${parseFloat(report.digitalUrgencyPercent) >= 60 
              ? '경쟁사 대비 생산성 하락 우려가 있으며, 스마트공장/AI 솔루션 도입이 시급한 상황입니다.' 
              : '디지털 역량이 비교적 양호하나, 지속적인 업그레이드가 필요합니다.'}
          </p>
          <p class="text-gray-700">
            <strong>과제:</strong> 
            ${parseFloat(report.digitalUrgencyPercent) >= 60 
              ? '단순 전산화(ERP)를 넘어, 공정 데이터를 분석하고 제어하는 지능형 시스템 구축이 시급합니다.' 
              : '현재의 디지털 역량을 유지하면서, AI 및 빅데이터 활용 역량을 점진적으로 확대하십시오.'}
          </p>
        </div>
      </div>

      <!-- 고용(HR) 및 일자리 충격 분석 -->
      <div>
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-users mr-2 text-purple-600"></i>
          ③ 고용(HR) 및 일자리 충격 분석
        </h3>
        
        ${report.employmentMessages.length > 0 ? `
          <div class="space-y-3">
            ${report.employmentMessages.map((issue, idx) => {
              const colors = {
                critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: 'fa-exclamation-triangle' },
                high: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-800', icon: 'fa-exclamation-circle' },
                medium: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', icon: 'fa-info-circle' }
              };
              const color = colors[issue.level];
              return `
                <div class="${color.bg} border-l-4 ${color.border} p-4 rounded">
                  <p class="font-bold ${color.text} mb-2 flex items-center">
                    <i class="fas ${color.icon} mr-2"></i>
                    ${issue.title}
                  </p>
                  <p class="text-gray-700">${issue.message}</p>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p class="font-medium text-gray-800">
              <i class="fas fa-check-circle mr-2 text-green-600"></i>
              현재 고용 및 일자리 측면에서 특별한 이슈가 발견되지 않았습니다. 안정적인 인력 운영이 이루어지고 있습니다.
            </p>
          </div>
        `}
      </div>
    </div>

    <!-- 4. 맞춤형 솔루션 처방 -->
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
      <h2 class="text-lg font-bold text-gray-800 mb-6">
        <i class="fas fa-prescription-bottle mr-2 text-blue-600"></i>
        맞춤형 솔루션 처방
      </h2>

      <!-- STEP 1: 비즈니스 솔루션 -->
      <div class="mb-8">
        <div class="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
          <h3 class="text-lg font-bold flex items-center">
            <i class="fas fa-briefcase mr-2"></i>
            STEP 1. 비즈니스 솔루션: 사업재편
          </h3>
        </div>
        <div class="bg-white border-2 border-blue-600 rounded-b-lg p-6">
          ${report.solutions.business.length > 0 ? report.solutions.business.map(solution => `
            <div class="mb-4 last:mb-0">
              <h4 class="text-lg font-bold text-gray-800 mb-2">
                <i class="fas fa-check-circle mr-2 text-blue-600"></i>
                ${solution.title}
              </h4>
              <p class="text-gray-700 mb-3">${solution.description}</p>
              ${solution.keywords ? `
                <div class="flex flex-wrap gap-2">
                  <span class="text-sm text-gray-600 mr-2">추천 키워드:</span>
                  ${solution.keywords.map(keyword => `
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      ${keyword}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('<hr class="my-4">') : '<p class="text-gray-600">현재 단계에서는 특별한 사업재편이 필요하지 않습니다.</p>'}
        </div>
      </div>

      <!-- STEP 2: HR 솔루션 -->
      <div class="mb-8">
        <div class="bg-purple-600 text-white px-4 py-2 rounded-t-lg">
          <h3 class="text-lg font-bold flex items-center">
            <i class="fas fa-users-cog mr-2"></i>
            STEP 2. HR 솔루션: 노동전환 고용안정
          </h3>
        </div>
        <div class="bg-white border-2 border-purple-600 rounded-b-lg p-6">
          ${report.solutions.hr.length > 0 ? report.solutions.hr.map(solution => `
            <div class="mb-4 last:mb-0">
              <h4 class="text-lg font-bold text-gray-800 mb-2">
                <i class="fas fa-arrow-right mr-2 text-purple-600"></i>
                ${solution.title}
              </h4>
              <p class="text-gray-700">${solution.description}</p>
            </div>
          `).join('<hr class="my-4">') : '<p class="text-gray-600">현재 HR 측면에서 시급한 과제가 발견되지 않았습니다.</p>'}
        </div>
      </div>

      <!-- STEP 3: 정부 지원사업 매칭 -->
      <div>
        <div class="bg-green-600 text-white px-4 py-2 rounded-t-lg">
          <h3 class="text-lg font-bold flex items-center">
            <i class="fas fa-landmark mr-2"></i>
            STEP 3. 정부 지원사업 매칭 (Policy Bridge)
          </h3>
        </div>
        <div class="bg-white border-2 border-green-600 rounded-b-lg p-6">
          <div class="space-y-4">
            ${report.solutions.government.map((program, idx) => `
              <div class="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div class="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  ${idx + 1}
                </div>
                <div class="flex-1">
                  <h4 class="text-lg font-bold text-gray-800 mb-1">${program.name}</h4>
                  <p class="text-gray-700 mb-2">${program.description}</p>
                  <p class="text-sm text-green-700 font-medium">
                    <i class="fas fa-building mr-1"></i>
                    담당: ${program.department}
                  </p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 안내 메시지 -->
    <div class="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 mb-3">
      <div class="flex items-start gap-3">
        <i class="fas fa-info-circle text-2xl text-blue-600 mt-1"></i>
        <div>
          <p class="text-lg font-bold text-gray-800 mb-2">본 보고서 저장 안내</p>
          <p class="text-gray-700 leading-relaxed">
            본 보고서는 산업일자리전환 컨설팅 신청 시 첨부되어야 하므로, 
            하단의 <strong class="text-blue-600">PDF 다운로드</strong> 또는 <strong class="text-blue-600">인쇄하기</strong> 버튼을 눌러 PDF로 저장하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>

    <!-- 리포트 푸터 -->
    <div class="text-center text-sm text-gray-500 border-t pt-4">
      <p class="mb-1">본 진단 결과는 G-DAX (Green-Digital-Aging-eXpert) 모델을 기반으로 자동 생성되었습니다.</p>
      <p>보다 정확한 진단과 맞춤형 솔루션을 원하시면 전문 컨설팅을 신청해 주세요.</p>
    </div>
  `;
  
  container.innerHTML = html;
  
  // 4분면 매트릭스 차트 렌더링
  renderMatrixChart(report);
}

function renderMatrixChart(report) {
  const ctx = document.getElementById('matrixChart').getContext('2d');
  
  // 4분면 배경 색상
  const quadrantPlugin = {
    id: 'quadrantPlugin',
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      const xMid = (chartArea.left + chartArea.right) / 2;
      const yMid = (chartArea.top + chartArea.bottom) / 2;
      
      // Type IV (좌하단) - 안정 유지형
      ctx.fillStyle = 'rgba(8, 145, 178, 0.1)';
      ctx.fillRect(chartArea.left, yMid, xMid - chartArea.left, chartArea.bottom - yMid);
      
      // Type III (좌상단) - 탄소 대응형
      ctx.fillStyle = 'rgba(22, 163, 74, 0.1)';
      ctx.fillRect(chartArea.left, chartArea.top, xMid - chartArea.left, yMid - chartArea.top);
      
      // Type II (우상단) - 디지털 선도형
      ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
      ctx.fillRect(xMid, chartArea.top, chartArea.right - xMid, yMid - chartArea.top);
      
      // Type I (우하단) - 구조 전환형
      ctx.fillStyle = 'rgba(220, 38, 38, 0.1)';
      ctx.fillRect(xMid, yMid, chartArea.right - xMid, chartArea.bottom - yMid);
    }
  };
  
  new Chart(ctx, {
    type: 'scatter',
    plugins: [quadrantPlugin],
    data: {
      datasets: [{
        label: '귀사의 위치 (You are Here)',
        data: [{
          x: parseFloat(report.climateRiskPercent),
          y: parseFloat(report.digitalUrgencyPercent)
        }],
        backgroundColor: report.typeColor,
        borderColor: report.typeColor,
        borderWidth: 3,
        pointRadius: 12,
        pointHoverRadius: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '탄소 리스크 (Climate Risk) →',
            font: {
              size: 14,
              weight: 'bold',
              family: "'맑은 고딕', 'Malgun Gothic', sans-serif"
            }
          },
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '점';
            }
          },
          grid: {
            color: (context) => {
              if (context.tick.value === 60) {
                return 'rgba(0, 0, 0, 0.5)';
              }
              return 'rgba(0, 0, 0, 0.1)';
            },
            lineWidth: (context) => {
              if (context.tick.value === 60) {
                return 2;
              }
              return 1;
            }
          }
        },
        y: {
          title: {
            display: true,
            text: '↑ 디지털 시급성 (Digital Urgency)',
            font: {
              size: 14,
              weight: 'bold',
              family: "'맑은 고딕', 'Malgun Gothic', sans-serif"
            }
          },
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '점';
            }
          },
          grid: {
            color: (context) => {
              if (context.tick.value === 60) {
                return 'rgba(0, 0, 0, 0.5)';
              }
              return 'rgba(0, 0, 0, 0.1)';
            },
            lineWidth: (context) => {
              if (context.tick.value === 60) {
                return 2;
              }
              return 1;
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              size: 14,
              weight: 'bold',
              family: "'맑은 고딕', 'Malgun Gothic', sans-serif"
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return [
                `탄소 리스크: ${context.parsed.x.toFixed(1)}점`,
                `디지털 시급성: ${context.parsed.y.toFixed(1)}점`
              ];
            }
          }
        },
        annotation: {
          annotations: {
            type1: {
              type: 'label',
              xValue: 80,
              yValue: 80,
              content: ['Type I.', '구조 전환형'],
              font: {
                size: 11,
                weight: 'bold'
              }
            },
            type2: {
              type: 'label',
              xValue: 30,
              yValue: 80,
              content: ['Type II.', '디지털 선도형'],
              font: {
                size: 11,
                weight: 'bold'
              }
            },
            type3: {
              type: 'label',
              xValue: 80,
              yValue: 30,
              content: ['Type III.', '탄소 대응형'],
              font: {
                size: 11,
                weight: 'bold'
              }
            },
            type4: {
              type: 'label',
              xValue: 30,
              yValue: 30,
              content: ['Type IV.', '안정 유지형'],
              font: {
                size: 11,
                weight: 'bold'
              }
            }
          }
        }
      }
    }
  });
}

// 페이지 로드 시 리포트 불러오기
loadReport();

// PDF 다운로드 함수
async function downloadPDF() {
  // 버튼 비활성화
  const buttons = document.querySelectorAll('.no-print button');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
  });
  
  // 로딩 메시지 표시
  const originalText = buttons[0].innerHTML;
  buttons[0].innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>PDF 생성중...';
  
  try {
    // PDF 생성 옵션 - 2페이지 최적화
    const element = document.getElementById('reportContent');
    const opt = {
      margin: [8, 8, 8, 8],  // 여백 축소 (상하좌우 8mm)
      filename: `산업일자리전환_사전진단보고서_${surveyId}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1.5,  // 해상도 조정 (2배에서 1.5배로 축소하여 파일 크기 최적화)
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        windowWidth: 1200,  // 렌더링 너비 고정
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: ['avoid-all', 'css'],  // CSS 페이지 브레이크 우선
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['.no-break', 'canvas']  // 차트와 특정 요소는 페이지 나누기 방지
      }
    };
    
    // PDF 생성 및 다운로드
    await html2pdf().set(opt).from(element).save();
    
    // 성공 메시지
    buttons[0].innerHTML = '<i class="fas fa-check mr-2"></i>다운로드 완료!';
    setTimeout(() => {
      buttons[0].innerHTML = originalText;
      buttons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
      });
    }, 2000);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    
    // 버튼 복원
    buttons[0].innerHTML = originalText;
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
  }
}
