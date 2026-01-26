// 관리자 대시보드 JavaScript

// 로그아웃 함수
async function logout() {
  try {
    await axios.post('/api/admin/logout');
    window.location.href = '/admin/login';
  } catch (error) {
    console.error('Logout error:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// Excel 내보내기 함수
function exportToExcel() {
  window.location.href = '/api/export/excel';
}

async function loadStats() {
  try {
    const response = await axios.get('/api/stats');
    const stats = response.data;
    
    const statsHtml = `
      <div class="bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">전체 설문 응답</p>
            <p class="text-3xl font-bold text-blue-600">${stats.total_surveys}</p>
          </div>
          <i class="fas fa-clipboard-list text-4xl text-blue-600"></i>
        </div>
      </div>
      
      <div class="bg-green-50 border-2 border-green-500 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">컨설팅 신청</p>
            <p class="text-3xl font-bold text-green-600">${stats.consulting_applications}</p>
          </div>
          <i class="fas fa-user-check text-4xl text-green-600"></i>
        </div>
      </div>
      
      <div class="bg-purple-50 border-2 border-purple-500 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">리포트 발송</p>
            <p class="text-3xl font-bold text-purple-600">${stats.reports_sent}</p>
          </div>
          <i class="fas fa-paper-plane text-4xl text-purple-600"></i>
        </div>
      </div>
    `;
    
    document.getElementById('statsCards').innerHTML = statsHtml;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadSurveys() {
  try {
    const response = await axios.get('/api/surveys');
    const surveys = response.data.data;
    
    const tbody = document.getElementById('surveyTableBody');
    
    if (surveys.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="px-4 py-8 text-center text-gray-500">
            <i class="fas fa-inbox text-4xl mb-2"></i>
            <p>아직 제출된 설문이 없습니다.</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = surveys.map(survey => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm text-gray-900">${survey.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${survey.company_name}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${survey.ceo_name}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${survey.contact_email}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${survey.contact_phone}</td>
        <td class="px-4 py-3 text-sm">
          ${survey.consulting_application ? 
            '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-check mr-1"></i>신청</span>' : 
            '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">미신청</span>'
          }
        </td>
        <td class="px-4 py-3 text-sm">
          ${survey.report_sent ? 
            '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-check mr-1"></i>발송</span>' : 
            '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">대기</span>'
          }
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${new Date(survey.created_at).toLocaleDateString('ko-KR')}</td>
        <td class="px-4 py-3 text-sm">
          <div class="flex gap-2">
            <button onclick="viewReport(${survey.id})" 
              class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs">
              <i class="fas fa-file-alt mr-1"></i>리포트
            </button>
            <button onclick="viewDetails(${survey.id})" 
              class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 text-xs">
              <i class="fas fa-info-circle mr-1"></i>상세
            </button>
            <button onclick="sendEmail(${survey.id}, '${survey.contact_email}')" 
              class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
              title="이메일 ${survey.report_sent ? '재' : ''}발송">
              <i class="fas fa-envelope mr-1"></i>${survey.report_sent ? '재발송' : '발송'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading surveys:', error);
    const tbody = document.getElementById('surveyTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-red-500">
          <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
          <p>데이터를 불러올 수 없습니다: ${error.message}</p>
        </td>
      </tr>
    `;
  }
}

function viewReport(surveyId) {
  window.open(`/report/${surveyId}`, '_blank');
}

async function sendEmail(surveyId, email) {
  if (!confirm(`${email}로 리포트 이메일을 발송하시겠습니까?`)) {
    return;
  }

  const button = event.target.closest('button');
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>발송중...';

  try {
    const response = await axios.post(`/api/send-email/${surveyId}`);
    
    if (response.data.success) {
      alert('이메일이 성공적으로 발송되었습니다!');
      // 목록 새로고침
      loadSurveys();
    }
  } catch (error) {
    console.error('Email sending error:', error);
    
    let errorMessage = '이메일 발송 중 오류가 발생했습니다.';
    if (error.response?.data?.error) {
      errorMessage += '\n\n' + error.response.data.error;
      if (error.response.data.details) {
        errorMessage += '\n\n상세: ' + error.response.data.details;
      }
    }
    
    alert(errorMessage);
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

async function viewDetails(surveyId) {
  try {
    const response = await axios.get(`/api/survey/${surveyId}`);
    const survey = response.data;
    
    const detailsHtml = `
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-gray-800 border-b pb-2">
          <i class="fas fa-building mr-2 text-blue-600"></i>
          ${survey.company_name}
        </h3>
        
        <div class="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600">대표자</p>
            <p class="font-medium">${survey.ceo_name}</p>
          </div>
          <div>
            <p class="text-gray-600">소재지</p>
            <p class="font-medium">${survey.location}</p>
          </div>
          <div>
            <p class="text-gray-600">주생산품(업종)</p>
            <p class="font-medium">${survey.main_product}</p>
          </div>
          <div>
            <p class="text-gray-600">근로자 수</p>
            <p class="font-medium">${survey.employee_count}</p>
          </div>
          <div>
            <p class="text-gray-600">매출액</p>
            <p class="font-medium">${survey.annual_revenue || 0}억원</p>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <h4 class="font-bold text-gray-800 mb-2">담당자 정보</h4>
          <div class="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-600">성함</p>
              <p class="font-medium">${survey.contact_name} ${survey.contact_position || ''}</p>
            </div>
            <div>
              <p class="text-gray-600">이메일</p>
              <p class="font-medium">${survey.contact_email}</p>
            </div>
            <div>
              <p class="text-gray-600">전화번호</p>
              <p class="font-medium">${survey.contact_phone}</p>
            </div>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <h4 class="font-bold text-gray-800 mb-2">설문 점수</h4>
          <div class="grid md:grid-cols-4 gap-4 text-sm">
            <div class="bg-green-50 p-3 rounded">
              <p class="text-gray-600 text-xs">탄소중립</p>
              <p class="font-bold text-lg">${((survey.climate_risk_1 + survey.climate_risk_2 + survey.climate_risk_3) / 3).toFixed(1)}</p>
            </div>
            <div class="bg-blue-50 p-3 rounded">
              <p class="text-gray-600 text-xs">디지털/AI</p>
              <p class="font-bold text-lg">${((survey.digital_urgency_1 + survey.digital_urgency_2 + survey.digital_urgency_3) / 3).toFixed(1)}</p>
            </div>
            <div class="bg-purple-50 p-3 rounded">
              <p class="text-gray-600 text-xs">고용 현황</p>
              <p class="font-bold text-lg">${((survey.employment_status_1 + survey.employment_status_2 + survey.employment_status_3 + survey.employment_status_4) / 4).toFixed(1)}</p>
            </div>
            <div class="bg-orange-50 p-3 rounded">
              <p class="text-gray-600 text-xs">전환 준비도</p>
              <p class="font-bold text-lg">${survey.readiness_level}.0</p>
            </div>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <h4 class="font-bold text-gray-800 mb-2">지원 분야</h4>
          <div class="flex flex-wrap gap-2">
            ${JSON.parse(survey.support_areas).map(area => `
              <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">${area}</span>
            `).join('')}
          </div>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button onclick="viewReport(${survey.id})" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            <i class="fas fa-file-alt mr-2"></i>리포트 보기
          </button>
          <button onclick="closeModal()" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
            닫기
          </button>
        </div>
      </div>
    `;
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'detailsModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        ${detailsHtml}
      </div>
    `;
    document.body.appendChild(modal);
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  } catch (error) {
    console.error('Error loading survey details:', error);
    alert('상세 정보를 불러올 수 없습니다: ' + error.message);
  }
}

function closeModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.remove();
  }
}

// 페이지 로드 시 데이터 불러오기
loadStats();
loadSurveys();
