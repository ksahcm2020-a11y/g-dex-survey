import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// API 라우트
// ============================================

// 설문 제출 API
app.post('/api/survey', async (c) => {
  try {
    const data = await c.req.json()
    
    // 데이터 검증
    if (!data.company_name || !data.contact_email) {
      return c.json({ error: '필수 항목을 입력해주세요.' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO survey_responses (
        company_name, ceo_name, location, main_product, employee_count, annual_revenue,
        climate_risk_1, climate_risk_2, climate_risk_3,
        digital_urgency_1, digital_urgency_2, digital_urgency_3,
        employment_status_1, employment_status_2, employment_status_3, employment_status_4,
        readiness_level,
        support_areas,
        consulting_application,
        contact_name, contact_position, contact_email, contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.company_name,
      data.ceo_name,
      data.location,
      data.main_product,
      data.employee_count,
      data.annual_revenue || 0,
      data.climate_risk_1,
      data.climate_risk_2,
      data.climate_risk_3,
      data.digital_urgency_1,
      data.digital_urgency_2,
      data.digital_urgency_3,
      data.employment_status_1,
      data.employment_status_2,
      data.employment_status_3,
      data.employment_status_4,
      data.readiness_level,
      JSON.stringify(data.support_areas),
      data.consulting_application ? 1 : 0,
      data.contact_name,
      data.contact_position || '',
      data.contact_email,
      data.contact_phone
    ).run()

    const surveyId = result.meta.last_row_id

    return c.json({ 
      success: true, 
      message: '설문이 성공적으로 제출되었습니다.',
      survey_id: surveyId
    })
  } catch (error: unknown) {
    console.error('Survey submission error:', error)
    return c.json({ 
      error: '설문 제출 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 설문 조회 API (단일)
app.get('/api/survey/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM survey_responses WHERE id = ?
    `).bind(id).first()

    if (!result) {
      return c.json({ error: '설문을 찾을 수 없습니다.' }, 404)
    }

    return c.json(result)
  } catch (error: unknown) {
    console.error('Survey fetch error:', error)
    return c.json({ 
      error: '설문 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 설문 목록 조회 API (관리자용)
app.get('/api/surveys', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        id, company_name, ceo_name, contact_email, contact_phone,
        consulting_application, report_sent, created_at
      FROM survey_responses 
      ORDER BY created_at DESC
    `).all()

    return c.json({ 
      success: true,
      count: results.length,
      data: results 
    })
  } catch (error: unknown) {
    console.error('Surveys fetch error:', error)
    return c.json({ 
      error: '설문 목록 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 리포트 생성 API
app.get('/api/report/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const survey = await c.env.DB.prepare(`
      SELECT * FROM survey_responses WHERE id = ?
    `).bind(id).first() as any

    if (!survey) {
      return c.json({ error: '설문을 찾을 수 없습니다.' }, 404)
    }

    // 점수 계산
    const scores = {
      climate: (survey.climate_risk_1 + survey.climate_risk_2 + survey.climate_risk_3) / 3,
      digital: (survey.digital_urgency_1 + survey.digital_urgency_2 + survey.digital_urgency_3) / 3,
      employment: (survey.employment_status_1 + survey.employment_status_2 + survey.employment_status_3 + survey.employment_status_4) / 4,
      readiness: survey.readiness_level
    }

    const totalScore = (scores.climate + scores.digital + scores.employment + scores.readiness) / 4

    // 등급 판정
    let grade = '하'
    let gradeColor = '#ef4444'
    if (totalScore >= 4.0) {
      grade = '상'
      gradeColor = '#22c55e'
    } else if (totalScore >= 3.0) {
      grade = '중'
      gradeColor = '#f59e0b'
    }

    // 개선 제안 생성
    const recommendations = []
    if (scores.climate < 3.0) {
      recommendations.push('탄소중립 대응 전략 수립이 시급합니다.')
    }
    if (scores.digital < 3.0) {
      recommendations.push('디지털 전환 및 스마트공장 도입을 검토하세요.')
    }
    if (scores.employment < 3.0) {
      recommendations.push('직원 재교육 및 고용안정 프로그램이 필요합니다.')
    }
    if (scores.readiness < 3.0) {
      recommendations.push('경영진의 산업전환 의지를 강화해야 합니다.')
    }

    const report = {
      survey_id: survey.id,
      company_name: survey.company_name,
      scores,
      totalScore: totalScore.toFixed(2),
      grade,
      gradeColor,
      recommendations,
      support_areas: JSON.parse(survey.support_areas),
      consulting_application: survey.consulting_application
    }

    // 리포트 생성 완료 플래그 업데이트
    await c.env.DB.prepare(`
      UPDATE survey_responses SET report_generated = 1 WHERE id = ?
    `).bind(id).run()

    return c.json(report)
  } catch (error: unknown) {
    console.error('Report generation error:', error)
    return c.json({ 
      error: '리포트 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 통계 API (관리자용)
app.get('/api/stats', async (c) => {
  try {
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM survey_responses
    `).first() as any

    const consultingResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM survey_responses WHERE consulting_application = 1
    `).first() as any

    const reportSentResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM survey_responses WHERE report_sent = 1
    `).first() as any

    return c.json({
      total_surveys: totalResult?.total || 0,
      consulting_applications: consultingResult?.count || 0,
      reports_sent: reportSentResult?.count || 0
    })
  } catch (error: unknown) {
    console.error('Stats fetch error:', error)
    return c.json({ 
      error: '통계 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// ============================================
// 웹 페이지 라우트
// ============================================

// 메인 페이지 (설문조사 폼)
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>G-DAX 산업전환 준비도 자가진단 설문조사</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; }
          .scale-option { transition: all 0.2s; }
          .scale-option:hover { transform: scale(1.05); }
          .scale-option.selected { background-color: #3b82f6; color: white; }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen py-8 px-4">
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-blue-900 mb-2">
                        <i class="fas fa-industry mr-2"></i>
                        G-DAX 산업전환 준비도 자가진단
                    </h1>
                    <p class="text-gray-600">설문조사를 완료하시면 개별 리포트를 이메일로 발송해 드립니다.</p>
                </div>

                <form id="surveyForm" class="space-y-6">
                    <!-- 기업 기본 정보 -->
                    <div class="border-b pb-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">
                            <i class="fas fa-building mr-2 text-blue-600"></i>
                            기업 기본 정보
                        </h2>
                        
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">1. 회사명 *</label>
                                <input type="text" name="company_name" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">2. 대표자명 *</label>
                                <input type="text" name="ceo_name" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">3. 소재지 *</label>
                                <input type="text" name="location" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">4. 주생산품(업종) *</label>
                                <input type="text" name="main_product" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">5. 상시 근로자 수 *</label>
                                <select name="employee_count" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">선택하세요</option>
                                    <option value="10인 미만">10인 미만</option>
                                    <option value="10~29인">10~29인</option>
                                    <option value="30~49인">30~49인</option>
                                    <option value="50~99인">50~99인</option>
                                    <option value="100~299인">100~299인</option>
                                    <option value="300인 이상">300인 이상</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">6. 지난해 매출액 (억원)</label>
                                <input type="number" name="annual_revenue" step="0.1" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                    </div>

                    <!-- 설문 항목 -->
                    <div id="surveyQuestions"></div>

                    <!-- 지원 분야 -->
                    <div class="border-b pb-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">
                            <i class="fas fa-hands-helping mr-2 text-blue-600"></i>
                            11. 가장 시급한 지원 분야를 선택해 주세요 (중복 선택 가능)
                        </h2>
                        <div class="space-y-2">
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="사업재편 전략 수립" class="mr-3">
                                <span>사업재편 전략 수립 (신사업 발굴)</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="직무 분석 및 인력 재배치 설계" class="mr-3">
                                <span>직무 분석 및 인력 재배치 설계</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="재직자 직무 전환 교육훈련" class="mr-3">
                                <span>재직자 직무 전환 교육훈련 (AI, 자동화 등)</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="고용안정 장려금 및 인건비 지원 신청" class="mr-3">
                                <span>고용안정 장려금 및 인건비 지원 신청</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="스마트공장/설비 도입 자금 연계" class="mr-3">
                                <span>스마트공장/설비 도입 자금 연계</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="checkbox" name="support_areas" value="노사 상생 협약 및 조직문화 개선" class="mr-3">
                                <span>노사 상생 협약 및 조직문화 개선</span>
                            </label>
                        </div>
                    </div>

                    <!-- 컨설팅 신청 -->
                    <div class="border-b pb-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">
                            <i class="fas fa-clipboard-check mr-2 text-blue-600"></i>
                            12. 산업·일자리전환 컨설팅 신청
                        </h2>
                        <p class="text-sm text-gray-600 mb-4">
                            고용노동부와 한국표준협회가 전액 무료로 지원하는 컨설팅을 신청하시겠습니까?
                        </p>
                        <div class="space-y-2">
                            <label class="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer">
                                <input type="radio" name="consulting_application" value="true" required class="mr-3">
                                <span class="font-medium text-green-700">네, 신청합니다.</span>
                            </label>
                            <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <input type="radio" name="consulting_application" value="false" required class="mr-3">
                                <span>아니오.</span>
                            </label>
                        </div>
                    </div>

                    <!-- 담당자 정보 -->
                    <div>
                        <h2 class="text-xl font-bold text-gray-800 mb-4">
                            <i class="fas fa-user mr-2 text-blue-600"></i>
                            담당자 정보
                        </h2>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">13. 담당자 성함 *</label>
                                <input type="text" name="contact_name" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">직함</label>
                                <input type="text" name="contact_position" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">14. 이메일 주소 *</label>
                                <input type="email" name="contact_email" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">15. 전화번호 *</label>
                                <input type="tel" name="contact_phone" required 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                    </div>

                    <!-- 제출 버튼 -->
                    <div class="pt-6">
                        <button type="submit" 
                            class="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                            <i class="fas fa-paper-plane mr-2"></i>
                            설문 제출 및 리포트 받기
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/survey.js"></script>
    </body>
    </html>
  `)
})

// 관리자 대시보드
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 대시보드 - 설문조사 관리</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; }
        </style>
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen py-8 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
                    <h1 class="text-3xl font-bold text-gray-800 mb-6">
                        <i class="fas fa-chart-line mr-2 text-blue-600"></i>
                        관리자 대시보드
                    </h1>
                    
                    <!-- 통계 카드 -->
                    <div id="statsCards" class="grid md:grid-cols-3 gap-6 mb-8"></div>
                    
                    <!-- 설문 목록 -->
                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold text-gray-800">
                                <i class="fas fa-list mr-2"></i>
                                설문 응답 목록
                            </h2>
                            <button onclick="loadSurveys()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <i class="fas fa-sync-alt mr-2"></i>새로고침
                            </button>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full" id="surveyTable">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">회사명</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">대표자</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자 이메일</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">전화번호</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">컨설팅</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">발송</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">작성일</th>
                                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">액션</th>
                                    </tr>
                                </thead>
                                <tbody id="surveyTableBody" class="divide-y divide-gray-200">
                                    <!-- 동적 로드 -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/admin.js"></script>
    </body>
    </html>
  `)
})

// 리포트 페이지
app.get('/report/:id', (c) => {
  const id = c.req.param('id')
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>산업전환 준비도 진단 리포트</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; }
          @media print {
            .no-print { display: none; }
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen py-8 px-4">
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <div id="reportContent"></div>
                
                <div class="mt-8 no-print flex gap-4">
                    <button onclick="window.print()" class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-print mr-2"></i>인쇄하기
                    </button>
                    <button onclick="window.location.href='/'" class="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700">
                        <i class="fas fa-home mr-2"></i>홈으로
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
          const surveyId = '${id}';
        </script>
        <script src="/static/report.js"></script>
    </body>
    </html>
  `)
})

export default app
