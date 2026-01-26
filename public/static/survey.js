// 설문조사 폼 JavaScript

// 설문 항목 데이터
const surveyQuestions = [
  {
    number: 7,
    title: '탄소중립/기후변화 리스크',
    icon: 'fa-leaf',
    questions: [
      {
        id: 'climate_risk_1',
        text: '우리 회사의 주력 생산품은 내연기관, 석탄화력 등 탄소 감축 정책에 따라 향후 매출 감소가 예상된다.'
      },
      {
        id: 'climate_risk_2',
        text: '원청사(대기업)나 해외 바이어로부터 탄소 배출량 데이터 제출이나 RE100 이행을 요구받고 있다.'
      },
      {
        id: 'climate_risk_3',
        text: '제조 원가 중 전기료, 연료비 등 에너지 비용이 차지하는 비중이 높아 경영에 부담이 된다.'
      }
    ]
  },
  {
    number: 8,
    title: '디지털/AI 혁신 시급성',
    icon: 'fa-microchip',
    questions: [
      {
        id: 'digital_urgency_1',
        text: '경쟁사들은 자동화 설비나 AI 등을 도입하고 있어, 우리 회사의 생산성이나 품질 경쟁력이 뒤처질 우려가 있다.'
      },
      {
        id: 'digital_urgency_2',
        text: '우리 회사는 생산, 재고, 고객 관리 등을 수기(종이/엑셀)가 아닌, 전산 시스템(ERP/MES 등)으로 실시간 관리하고 있다.'
      },
      {
        id: 'digital_urgency_3',
        text: '향후 1~2년 내에 스마트공장, 로봇, AI 솔루션 등을 도입할 계획이나 예산이 확보되어 있다.'
      }
    ]
  },
  {
    number: 9,
    title: '고용 현황 및 일자리 질',
    icon: 'fa-users',
    questions: [
      {
        id: 'employment_status_1',
        text: '현재 심각한 구인난을 겪고 있거나, 핵심 기술 인력의 고령화로 인해 기술 전수가 시급하다.'
      },
      {
        id: 'employment_status_2',
        text: '새로운 설비나 기술 도입으로 인해 기존 직원들이 수행하던 업무가 없어지거나, 새로운 기술을 배워야 할 필요성이 있다.'
      },
      {
        id: 'employment_status_3',
        text: '직무 전환 배치나 근로 조건 변경과 관련하여 직원들의 불안감이 높거나 노사 간 소통 채널이 부족하다.'
      },
      {
        id: 'employment_status_4',
        text: '우리 회사 직원들은 디지털 기기나 새로운 SW를 활용하는 데 어려움을 느끼고 있어 재교육이 필요하다.'
      }
    ]
  },
  {
    number: 10,
    title: '전환 준비도 및 지원 니즈',
    icon: 'fa-chart-line',
    questions: [
      {
        id: 'readiness_level',
        text: '경영진은 산업전환(사업재편, DX 등)을 최우선 과제로 인식하고 강력하게 추진할 의사가 있다.'
      }
    ]
  }
];

// 척도 옵션
const scaleOptions = [
  { value: 1, label: '전혀 아님' },
  { value: 2, label: '아님' },
  { value: 3, label: '보통' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' }
];

// 설문 항목 렌더링
function renderSurveyQuestions() {
  const container = document.getElementById('surveyQuestions');
  
  surveyQuestions.forEach((section) => {
    const sectionHtml = `
      <div class="border-b pb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas ${section.icon} mr-2 text-blue-600"></i>
          ${section.number}. ${section.title}
        </h2>
        ${section.questions.map((q, idx) => `
          <div class="mb-6">
            <p class="text-gray-700 font-medium mb-3">${section.questions.length > 1 ? `${idx + 1}. ` : ''}${q.text}</p>
            <div class="flex flex-wrap gap-2">
              ${scaleOptions.map(option => `
                <button type="button" 
                  class="scale-option px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-blue-500"
                  data-question="${q.id}"
                  data-value="${option.value}"
                  onclick="selectScale('${q.id}', ${option.value})">
                  ${option.value}. ${option.label}
                </button>
              `).join('')}
            </div>
            <input type="hidden" name="${q.id}" required>
          </div>
        `).join('')}
      </div>
    `;
    container.innerHTML += sectionHtml;
  });
}

// 척도 선택
function selectScale(questionId, value) {
  // 같은 질문의 다른 버튼 선택 해제
  document.querySelectorAll(`[data-question="${questionId}"]`).forEach(btn => {
    btn.classList.remove('selected', 'border-blue-500', 'bg-blue-600', 'text-white');
    btn.classList.add('border-gray-300');
  });
  
  // 선택된 버튼 활성화
  const selectedBtn = document.querySelector(`[data-question="${questionId}"][data-value="${value}"]`);
  selectedBtn.classList.add('selected', 'border-blue-500', 'bg-blue-600', 'text-white');
  selectedBtn.classList.remove('border-gray-300');
  
  // hidden input에 값 설정
  document.querySelector(`input[name="${questionId}"]`).value = value;
}

// 폼 제출
document.getElementById('surveyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 모든 설문 항목이 선택되었는지 확인
  const allQuestions = surveyQuestions.flatMap(s => s.questions.map(q => q.id));
  const missingQuestions = allQuestions.filter(id => !document.querySelector(`input[name="${id}"]`).value);
  
  if (missingQuestions.length > 0) {
    alert('모든 설문 항목에 응답해 주세요.');
    return;
  }
  
  const formData = new FormData(e.target);
  const data = {
    company_name: formData.get('company_name'),
    ceo_name: formData.get('ceo_name'),
    location: formData.get('location'),
    main_product: formData.get('main_product'),
    employee_count: formData.get('employee_count'),
    annual_revenue: parseFloat(formData.get('annual_revenue')) || 0,
    climate_risk_1: parseInt(formData.get('climate_risk_1')),
    climate_risk_2: parseInt(formData.get('climate_risk_2')),
    climate_risk_3: parseInt(formData.get('climate_risk_3')),
    digital_urgency_1: parseInt(formData.get('digital_urgency_1')),
    digital_urgency_2: parseInt(formData.get('digital_urgency_2')),
    digital_urgency_3: parseInt(formData.get('digital_urgency_3')),
    employment_status_1: parseInt(formData.get('employment_status_1')),
    employment_status_2: parseInt(formData.get('employment_status_2')),
    employment_status_3: parseInt(formData.get('employment_status_3')),
    employment_status_4: parseInt(formData.get('employment_status_4')),
    readiness_level: parseInt(formData.get('readiness_level')),
    support_areas: formData.getAll('support_areas'),
    consulting_application: formData.get('consulting_application') === 'true',
    contact_name: formData.get('contact_name'),
    contact_position: formData.get('contact_position') || '',
    contact_email: formData.get('contact_email'),
    contact_phone: formData.get('contact_phone')
  };
  
  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>제출 중...';
    
    const response = await axios.post('/api/survey', data);
    
    if (response.data.success) {
      alert('설문이 성공적으로 제출되었습니다!\n\n리포트 페이지로 이동합니다.');
      window.location.href = `/report/${response.data.survey_id}`;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('설문 제출 중 오류가 발생했습니다.\n' + (error.response?.data?.error || error.message));
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>설문 제출 및 리포트 받기';
  }
});

// 페이지 로드 시 설문 항목 렌더링
renderSurveyQuestions();
