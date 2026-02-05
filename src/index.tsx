import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie } from 'hono/cookie'
import { Resend } from 'resend'
import { generateReportEmailHTML, generateReportEmailText } from './email-template'

type Bindings = {
  DB: D1Database;
  RESEND_API_KEY: string;
  BASE_URL: string;
  ADMIN_PASSWORD: string;
}



const app = new Hono<{ Bindings: Bindings }>()

// 관리자 인증 미들웨어
const adminAuth = async (c: any, next: any) => {
  const session = getCookie(c, 'admin_session')
  const adminPassword = c.env.ADMIN_PASSWORD || 'gdax2026!'
  
  // 세션이 유효한지 확인 (간단한 암호 기반)
  if (session === `admin_${adminPassword}`) {
    await next()
  } else {
    return c.redirect('/admin/login')
  }
}

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

    // 이메일 자동 발송 (비동기 - 블로킹하지 않음)
    try {
      if (c.env.BASE_URL && c.env.RESEND_API_KEY) {
        // 리포트 URL 생성
        const reportUrl = `${c.env.BASE_URL}/report/${surveyId}`
        
        // 진단일 포맷
        const diagnosisDate = new Date().toLocaleDateString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        }).replace(/\. /g, '.')

        const emailSubject = `[G-DAX] ${data.company_name} 산업전환 진단 리포트가 완성되었습니다`
        const emailHTML = generateReportEmailHTML({
          companyName: data.company_name,
          ceoName: data.ceo_name,
          contactName: data.contact_name,
          reportUrl: reportUrl,
          diagnosisType: '진단 완료',
          diagnosisDate: diagnosisDate
        })
        const emailText = generateReportEmailText({
          companyName: data.company_name,
          ceoName: data.ceo_name,
          contactName: data.contact_name,
          reportUrl: reportUrl,
          diagnosisType: '진단 완료',
          diagnosisDate: diagnosisDate
        })

        // Resend로 이메일 발송
        const resend = new Resend(c.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'G-DAX 진단시스템 <onboarding@resend.dev>',
          to: [data.contact_email],
          subject: emailSubject,
          html: emailHTML,
          text: emailText
        })

        // 이메일 발송 상태 업데이트
        await c.env.DB.prepare(`
          UPDATE survey_responses SET report_sent = 1 WHERE id = ?
        `).bind(surveyId).run()

        console.log(`Email sent successfully to ${data.contact_email}`)
      } else {
        console.warn('Email not sent: RESEND_API_KEY or BASE_URL not configured')
      }
    } catch (emailError) {
      // 이메일 발송 실패해도 설문 제출은 성공으로 처리
      console.error('Email sending error:', emailError)
    }

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

// ============================================
// 관리자 인증 API
// ============================================

// 로그인 페이지
app.get('/admin/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>관리자 로그인 - G-DAX</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; }
        </style>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
            <div class="text-center mb-8">
                <div class="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-shield-alt text-white text-2xl"></i>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">관리자 로그인</h1>
                <p class="text-gray-600 mt-2">G-DAX 진단 시스템</p>
            </div>
            
            <form id="loginForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-lock mr-2"></i>비밀번호
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="관리자 비밀번호를 입력하세요"
                        required
                    >
                </div>
                
                <div id="errorMessage" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span id="errorText"></span>
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                >
                    <i class="fas fa-sign-in-alt mr-2"></i>로그인
                </button>
            </form>
            
            <div class="mt-6 text-center text-sm text-gray-500">
                <i class="fas fa-info-circle mr-1"></i>
                비밀번호를 잊으셨다면 시스템 관리자에게 문의하세요.
            </div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const password = document.getElementById('password').value
                const errorDiv = document.getElementById('errorMessage')
                const errorText = document.getElementById('errorText')
                
                try {
                    const response = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    })
                    
                    const data = await response.json()
                    
                    if (data.success) {
                        window.location.href = '/admin'
                    } else {
                        errorDiv.classList.remove('hidden')
                        errorText.textContent = data.error || '로그인에 실패했습니다.'
                    }
                } catch (error) {
                    errorDiv.classList.remove('hidden')
                    errorText.textContent = '서버 오류가 발생했습니다.'
                }
            })
        </script>
    </body>
    </html>
  `)
})

// 로그인 API
app.post('/api/admin/login', async (c) => {
  try {
    const { password } = await c.req.json()
    const adminPassword = c.env.ADMIN_PASSWORD || 'gdax2026!'
    
    if (password === adminPassword) {
      // 세션 쿠키 설정 (7일간 유효)
      setCookie(c, 'admin_session', `admin_${adminPassword}`, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/'
      })
      
      return c.json({ success: true, message: '로그인 성공' })
    } else {
      return c.json({ success: false, error: '비밀번호가 올바르지 않습니다.' }, 401)
    }
  } catch (error: unknown) {
    return c.json({ 
      success: false, 
      error: '로그인 처리 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 로그아웃 API
app.post('/api/admin/logout', (c) => {
  setCookie(c, 'admin_session', '', {
    maxAge: 0,
    path: '/'
  })
  return c.json({ success: true, message: '로그아웃 되었습니다.' })
})

// ============================================
// 관리자 API (인증 필요)
// ============================================

// 설문 목록 조회 API (관리자용)
app.get('/api/surveys', adminAuth, async (c) => {
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

// 설문 삭제 API
app.delete('/api/survey/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id')
    
    // 설문 존재 확인
    const survey = await c.env.DB.prepare(`
      SELECT id, company_name FROM survey_responses WHERE id = ?
    `).bind(id).first() as any

    if (!survey) {
      return c.json({ error: '설문을 찾을 수 없습니다.' }, 404)
    }

    // 설문 삭제
    await c.env.DB.prepare(`
      DELETE FROM survey_responses WHERE id = ?
    `).bind(id).run()

    return c.json({ 
      success: true,
      message: '설문이 성공적으로 삭제되었습니다.',
      deleted_id: id,
      company_name: survey.company_name
    })
  } catch (error: unknown) {
    console.error('Survey delete error:', error)
    return c.json({ 
      error: '설문 삭제 중 오류가 발생했습니다.',
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
    const climateTotal = survey.climate_risk_1 + survey.climate_risk_2 + survey.climate_risk_3
    const digitalTotal = survey.digital_urgency_1 + survey.digital_urgency_2 + survey.digital_urgency_3
    const employmentTotal = survey.employment_status_1 + survey.employment_status_2 + survey.employment_status_3 + survey.employment_status_4
    
    const scores = {
      climate: climateTotal / 3,
      digital: digitalTotal / 3,
      employment: employmentTotal / 4,
      readiness: survey.readiness_level,
      climateTotal: climateTotal,
      digitalTotal: digitalTotal,
      employmentTotal: employmentTotal
    }

    // G-DAX 4분면 매트릭스 판정 (X축: 탄소리스크, Y축: 디지털시급성)
    let diagnosisType = ''
    let typeColor = ''
    let typeDescription = ''
    let matrixPosition = { x: 0, y: 0 }
    
    // X축: 탄소 리스크 (15점 만점을 100점 만점으로 환산)
    const climateRiskPercent = (climateTotal / 15) * 100
    // Y축: 디지털 시급성 (15점 만점을 100점 만점으로 환산)
    const digitalUrgencyPercent = (digitalTotal / 15) * 100
    
    matrixPosition.x = climateRiskPercent
    matrixPosition.y = digitalUrgencyPercent
    
    // 4분면 판정 (기준: 60점)
    if (climateRiskPercent >= 60 && digitalUrgencyPercent >= 60) {
      diagnosisType = 'Type I. 구조 전환형 (Structural Transformation)'
      typeColor = '#dc2626'
      typeDescription = '복합 위기: 탄소 규제 리스크가 높고, 디지털 전환의 필요성도 매우 높은 상태입니다.'
    } else if (climateRiskPercent < 60 && digitalUrgencyPercent >= 60) {
      diagnosisType = 'Type II. 디지털 선도형 (Digital Leader)'
      typeColor = '#2563eb'
      typeDescription = '디지털 우선: 탄소 리스크는 낮으나, 디지털 혁신이 시급한 상태입니다.'
    } else if (climateRiskPercent >= 60 && digitalUrgencyPercent < 60) {
      diagnosisType = 'Type III. 탄소 대응형 (Green Transition)'
      typeColor = '#16a34a'
      typeDescription = '환경 우선: 디지털 역량은 양호하나, 탄소 규제 대응이 시급한 상태입니다.'
    } else {
      diagnosisType = 'Type IV. 안정 유지형 (Stable Operation)'
      typeColor = '#0891b2'
      typeDescription = '안정 구간: 탄소 리스크와 디지털 시급성이 모두 낮은 안정적인 상태입니다.'
    }

    // 고용 이슈 분석 (설문 9번 기반)
    const employmentIssues = {
      recruitmentIssue: survey.employment_status_1 >= 4,
      jobTransitionNeed: survey.employment_status_2 >= 4,
      employeeAnxiety: survey.employment_status_3 >= 4,
      digitalSkillGap: survey.employment_status_4 >= 4
    }
    
    // 고용 이슈 메시지 생성
    const employmentMessages = []
    if (employmentIssues.recruitmentIssue) {
      employmentMessages.push({
        title: '구인난 및 기술 전수 문제',
        message: '심각한 구인난을 겪고 있거나 핵심 기술 인력의 고령화로 기술 전수가 시급합니다. 자동화 설비 도입과 동시에 기술 문서화 프로젝트가 필요합니다.',
        level: 'critical'
      })
    }
    if (employmentIssues.jobTransitionNeed) {
      employmentMessages.push({
        title: '직무 변화 압력',
        message: '새로운 설비나 기술 도입으로 기존 직원들이 수행하던 업무가 없어지거나, 새로운 기술을 배워야 할 필요성이 있습니다. 직무 전환 교육 프로그램이 필수적입니다.',
        level: 'high'
      })
    }
    if (employmentIssues.employeeAnxiety) {
      employmentMessages.push({
        title: '조직 심리 및 소통 문제',
        message: '직무 전환 배치나 근로 조건 변경과 관련하여 직원들의 불안감이 높거나 노사 간 소통 채널이 부족합니다. 투명한 커뮤니케이션 채널 구축이 선행되어야 합니다.',
        level: 'high'
      })
    }
    if (employmentIssues.digitalSkillGap) {
      employmentMessages.push({
        title: '디지털 역량 격차',
        message: '직원들이 디지털 기기나 새로운 SW를 활용하는 데 어려움을 느끼고 있어 재교육이 필요합니다. 단계적 Upskilling 프로그램을 설계하십시오.',
        level: 'medium'
      })
    }

    // 맞춤형 솔루션 처방
    const solutions = {
      business: [],
      hr: [],
      government: []
    }
    
    // 비즈니스 솔루션
    if (climateRiskPercent >= 60) {
      solutions.business.push({
        title: '사업재편 승인',
        description: '산업부의 「기업활력법」 사업재편 승인을 통해 R&D 자금과 세제 혜택을 확보하십시오.',
        keywords: ['미래차 부품 전환', '탄소포집 기술', '친환경 소재 개발']
      })
    }
    if (digitalUrgencyPercent >= 60) {
      solutions.business.push({
        title: '스마트공장 구축',
        description: '단순 전산화(ERP)를 넘어, 공정 데이터를 분석하고 제어하는 지능형 시스템 구축이 시급합니다.',
        keywords: ['스마트공장 고도화', 'AI 품질검사', '예지정비 시스템']
      })
    }
    
    // HR 솔루션
    if (employmentIssues.jobTransitionNeed) {
      solutions.hr.push({
        title: '직무 전환 배치 설계',
        description: '소멸 위기 직무 인력을 신규 장비 오퍼레이터로 전환하기 위한 교육 훈련을 설계해야 합니다.'
      })
    }
    if (employmentIssues.digitalSkillGap) {
      solutions.hr.push({
        title: '재직자 Upskilling',
        description: '디지털 기초 역량부터 고급 데이터 분석까지 단계적 교육 프로그램이 필요합니다.'
      })
    }
    if (employmentIssues.employeeAnxiety) {
      solutions.hr.push({
        title: '노사 소통 강화',
        description: '정기적인 타운홀 미팅과 익명 피드백 채널을 통해 직원 불안감을 해소해야 합니다.'
      })
    }
    
    // 정부 지원사업 매칭
    solutions.government.push({
      name: '노동전환 고용안정장려금',
      description: '직무 전환 교육 실시 시 인건비 지원',
      department: '고용노동부'
    })
    solutions.government.push({
      name: '산업구조변화대응 특화훈련(산대특)',
      description: '재직자 맞춤형 무료 기술 교육',
      department: '고용노동부'
    })
    if (climateRiskPercent >= 60) {
      solutions.government.push({
        name: '탄소중립 R&D 지원사업',
        description: '친환경 기술 개발 자금 지원',
        department: '산업통상자원부'
      })
    }

    const report = {
      survey_id: survey.id,
      company_name: survey.company_name,
      ceo_name: survey.ceo_name,
      diagnosis_date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.'),
      scores,
      diagnosisType,
      typeColor,
      typeDescription,
      matrixPosition,
      climateRiskPercent: climateRiskPercent.toFixed(1),
      digitalUrgencyPercent: digitalUrgencyPercent.toFixed(1),
      employmentMessages,
      solutions,
      support_areas: JSON.parse(survey.support_areas),
      consulting_application: survey.consulting_application,
      contact_name: survey.contact_name,
      contact_position: survey.contact_position,
      readiness_level: survey.readiness_level
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
app.get('/api/stats', adminAuth, async (c) => {
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


// Excel 내보내기 API (관리자용)
app.get('/api/export/excel', adminAuth, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM survey_responses ORDER BY created_at DESC
    `).all()

    // CSV 형식으로 데이터 생성 (Excel에서 열 수 있음)
    const headers = [
      'ID', '회사명', '대표자명', '소재지', '주생산품', '상시근로자수', '지난해매출액',
      '탄소리스크1', '탄소리스크2', '탄소리스크3',
      '디지털시급성1', '디지털시급성2', '디지털시급성3',
      '고용현황1', '고용현황2', '고용현황3', '고용현황4',
      '전환준비도', '지원분야', '컨설팅신청', 
      '담당자명', '담당자직함', '담당자이메일', '담당자전화번호',
      '리포트발송여부', '생성일시'
    ]

    const rows = results.map((survey: any) => [
      survey.id,
      survey.company_name,
      survey.ceo_name,
      survey.location,
      survey.main_product,
      survey.employee_count,
      survey.annual_revenue,
      survey.climate_risk_1,
      survey.climate_risk_2,
      survey.climate_risk_3,
      survey.digital_urgency_1,
      survey.digital_urgency_2,
      survey.digital_urgency_3,
      survey.employment_status_1,
      survey.employment_status_2,
      survey.employment_status_3,
      survey.employment_status_4,
      survey.readiness_level,
      survey.support_areas,
      survey.consulting_application === 1 ? '네' : '아니오',
      survey.contact_name,
      survey.contact_position,
      survey.contact_email,
      survey.contact_phone,
      survey.report_sent === 1 ? '발송완료' : '미발송',
      survey.created_at
    ])

    // CSV 생성 (BOM 추가로 한글 깨짐 방지)
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="G-DAX_설문조사_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error: unknown) {
    return c.json({ 
      error: 'Excel 내보내기 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 이메일 발송 API (관리자용 - 수동 재발송)
app.post('/api/send-email/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id')
    
    // 설문 데이터 조회
    const survey = await c.env.DB.prepare(`
      SELECT * FROM survey_responses WHERE id = ?
    `).bind(id).first() as any

    if (!survey) {
      return c.json({ error: '설문을 찾을 수 없습니다.' }, 404)
    }

    // API 키 확인
    if (!c.env.BASE_URL || !c.env.RESEND_API_KEY) {
      return c.json({ 
        error: 'BASE_URL 또는 이메일 설정이 되지 않았습니다.',
        details: 'Resend API 키를 설정해주세요.'
      }, 500)
    }

    // 리포트 데이터 생성 (진단 타입 계산)
    const climateTotal = survey.climate_risk_1 + survey.climate_risk_2 + survey.climate_risk_3
    const digitalTotal = survey.digital_urgency_1 + survey.digital_urgency_2 + survey.digital_urgency_3
    const climateRiskPercent = (climateTotal / 15) * 100
    const digitalUrgencyPercent = (digitalTotal / 15) * 100
    
    let diagnosisType = ''
    if (climateRiskPercent >= 60 && digitalUrgencyPercent >= 60) {
      diagnosisType = 'Type I. 구조 전환형'
    } else if (climateRiskPercent < 60 && digitalUrgencyPercent >= 60) {
      diagnosisType = 'Type II. 디지털 선도형'
    } else if (climateRiskPercent >= 60 && digitalUrgencyPercent < 60) {
      diagnosisType = 'Type III. 탄소 대응형'
    } else {
      diagnosisType = 'Type IV. 안정 유지형'
    }

    const reportUrl = `${c.env.BASE_URL}/report/${id}`
    const diagnosisDate = new Date(survey.created_at).toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\. /g, '.')

    const emailSubject = `[G-DAX] ${survey.company_name} 산업전환 진단 리포트가 완성되었습니다`
    const emailHTML = generateReportEmailHTML({
      companyName: survey.company_name,
      ceoName: survey.ceo_name,
      contactName: survey.contact_name,
      reportUrl: reportUrl,
      diagnosisType: diagnosisType,
      diagnosisDate: diagnosisDate
    })
    const emailText = generateReportEmailText({
      companyName: survey.company_name,
      ceoName: survey.ceo_name,
      contactName: survey.contact_name,
      reportUrl: reportUrl,
      diagnosisType: diagnosisType,
      diagnosisDate: diagnosisDate
    })

    // Resend로 이메일 발송
    const resend = new Resend(c.env.RESEND_API_KEY)
    const emailResult = await resend.emails.send({
      from: 'G-DAX 진단시스템 <onboarding@resend.dev>',
      to: [survey.contact_email],
      subject: emailSubject,
      html: emailHTML,
      text: emailText
    })

    // 이메일 발송 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE survey_responses SET report_sent = 1 WHERE id = ?
    `).bind(id).run()

    return c.json({ 
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.',
      email: survey.contact_email,
      email_id: emailResult.data?.id || 'resend'
    })
  } catch (error: unknown) {
    console.error('Email sending error:', error)
    return c.json({ 
      error: '이메일 발송 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 설문 삭제 API (관리자 전용)
app.delete('/api/survey/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id')
    
    // 설문 존재 확인
    const survey = await c.env.DB.prepare(`
      SELECT id, company_name FROM survey_responses WHERE id = ?
    `).bind(id).first()

    if (!survey) {
      return c.json({ error: '설문을 찾을 수 없습니다.' }, 404)
    }

    // 설문 삭제
    await c.env.DB.prepare(`
      DELETE FROM survey_responses WHERE id = ?
    `).bind(id).run()

    return c.json({ 
      success: true,
      message: '설문이 성공적으로 삭제되었습니다.',
      deleted_id: id,
      company_name: survey.company_name
    })
  } catch (error: unknown) {
    console.error('Survey deletion error:', error)
    return c.json({ 
      error: '설문 삭제 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// 여러 설문 일괄 삭제 API (관리자 전용)
app.post('/api/surveys/delete-batch', adminAuth, async (c) => {
  try {
    const { ids } = await c.req.json()
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: '삭제할 설문 ID를 제공해주세요.' }, 400)
    }

    // 플레이스홀더 생성
    const placeholders = ids.map(() => '?').join(',')
    
    // 삭제 전 개수 확인
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM survey_responses WHERE id IN (${placeholders})
    `).bind(...ids).first() as any

    // 일괄 삭제
    await c.env.DB.prepare(`
      DELETE FROM survey_responses WHERE id IN (${placeholders})
    `).bind(...ids).run()

    return c.json({ 
      success: true,
      message: `${countResult.count}개의 설문이 성공적으로 삭제되었습니다.`,
      deleted_count: countResult.count,
      deleted_ids: ids
    })
  } catch (error: unknown) {
    console.error('Batch deletion error:', error)
    return c.json({ 
      error: '일괄 삭제 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// ============================================
// 웹 페이지 라우트
// ============================================

// 메인 페이지 (포털)
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>한국표준협회 일터혁신센터</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; }
          .primary-blue { color: #0066CC; }
          .bg-primary-blue { background-color: #0066CC; }
          .border-primary-blue { border-color: #0066CC; }
          .hover-primary-blue:hover { background-color: #0052A3; }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeInUp 0.8s ease-out; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-20">
                    <!-- Logo -->
                    <div class="flex items-center gap-3">
                        <div class="bg-primary-blue w-12 h-12 rounded-lg flex items-center justify-center">
                            <i class="fas fa-building text-white text-xl"></i>
                        </div>
                        <div>
                            <div class="text-lg font-bold text-gray-900">한국표준협회 일터혁신센터</div>
                            <div class="text-xs text-gray-500">KSA WORKPLACE INNOVATION CENTER</div>
                        </div>
                    </div>
                    
                    <!-- Navigation -->
                    <nav class="hidden md:flex items-center gap-8">
                        <a href="/" class="text-gray-700 hover:text-blue-600 font-medium transition">홈</a>
                        <a href="#about" class="text-gray-700 hover:text-blue-600 font-medium transition">일터혁신 소개</a>
                        <a href="#diagnosis" class="text-gray-700 hover:text-blue-600 font-medium transition">혁신 진단</a>
                        <a href="#contact" class="text-gray-700 hover:text-blue-600 font-medium transition">상담 및 문의</a>
                        <a href="/survey" class="bg-primary-blue hover-primary-blue text-white px-6 py-2.5 rounded-full font-bold transition shadow-md">
                            진단 시작하기
                        </a>
                    </nav>

                    <!-- Mobile Menu Button -->
                    <button class="md:hidden text-gray-700">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <section class="relative py-24 bg-gradient-to-br from-blue-50 via-white to-gray-50 overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <!-- Left Content -->
                    <div class="animate-fade-in">
                        <div class="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                            한국표준협회 일터혁신센터 2026
                        </div>
                        <h1 class="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            일터혁신으로 완성하는<br/>
                            <span class="primary-blue">기업의 미래 가치</span>
                        </h1>
                        <p class="text-xl text-gray-600 mb-4 leading-relaxed">
                            한국표준협회 일터혁신센터가 노사가 함께 행복한 일터를 만듭니다.
                        </p>
                        <p class="text-lg text-gray-500 mb-10 leading-relaxed">
                            고용노동부 지원 사업을 통한 전문 컨설팅으로 귀사만의 최적화된 혁신 로드맵을 제안해 드립니다.
                        </p>
                        
                        <!-- CTA Buttons -->
                        <div class="flex flex-col sm:flex-row gap-4">
                            <a href="/survey" class="inline-flex items-center justify-center bg-primary-blue hover-primary-blue text-white px-8 py-4 rounded-full font-bold text-lg transition shadow-lg">
                                무료 진단 시작하기
                                <i class="fas fa-arrow-right ml-3"></i>
                            </a>
                            <a href="#about" class="inline-flex items-center justify-center border-2 border-primary-blue primary-blue px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition">
                                자세히 알아보기
                            </a>
                        </div>
                    </div>

                    <!-- Right Image -->
                    <div class="relative hidden md:block animate-fade-in" style="animation-delay: 0.2s">
                        <div class="relative">
                            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800" 
                                 alt="일터혁신" 
                                 class="rounded-3xl shadow-2xl w-full h-[500px] object-cover">
                            <div class="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent rounded-3xl"></div>
                        </div>
                        <!-- Floating Stats -->
                        <div class="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6">
                            <div class="text-4xl font-bold primary-blue mb-1">50+</div>
                            <div class="text-sm text-gray-600">년 전문 경험</div>
                        </div>
                        <div class="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-6">
                            <div class="text-4xl font-bold primary-blue mb-1">1,000+</div>
                            <div class="text-sm text-gray-600">기업 지원</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Stats Bar -->
        <section class="bg-white py-12 border-y">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div class="text-4xl font-bold primary-blue mb-2">15</div>
                        <div class="text-gray-600">진단 문항</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold primary-blue mb-2">4</div>
                        <div class="text-gray-600">진단 유형</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold primary-blue mb-2">10분</div>
                        <div class="text-gray-600">소요 시간</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold primary-blue mb-2">무료</div>
                        <div class="text-gray-600">진단 비용</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section id="about" class="py-20 bg-gradient-to-b from-white to-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">
                        일터혁신센터 소개
                    </h2>
                    <p class="text-xl text-gray-600">고용노동부 선정 산업일자리전환 전달기관</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                        <div class="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                            <i class="fas fa-award text-3xl primary-blue"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">50년 전문성</h3>
                        <p class="text-gray-600 leading-relaxed">
                            한국표준협회는 50년 이상 인사노무, 제조혁신 등 정부 지원사업을 수행해온 전문 기관입니다.
                        </p>
                    </div>

                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                        <div class="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                            <i class="fas fa-handshake text-3xl text-green-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">노사 상생</h3>
                        <p class="text-gray-600 leading-relaxed">
                            노사가 함께 행복한 일터를 만들기 위한 맞춤형 컨설팅과 교육을 제공합니다.
                        </p>
                    </div>

                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                        <div class="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                            <i class="fas fa-chart-line text-3xl text-purple-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-4">체계적 지원</h3>
                        <p class="text-gray-600 leading-relaxed">
                            진단부터 실행까지 체계적인 로드맵을 통해 기업의 지속가능한 성장을 지원합니다.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Diagnosis Section -->
        <section id="diagnosis" class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-gray-900 mb-4">
                        G-DAX 산업전환 준비도 진단
                    </h2>
                    <p class="text-xl text-gray-600">과학적 진단으로 귀사의 현재 위치를 파악하세요</p>
                </div>

                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 class="text-3xl font-bold mb-6">진단 프로세스</h3>
                        <div class="space-y-6">
                            <div class="flex items-start gap-4">
                                <div class="bg-primary-blue text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">1</div>
                                <div>
                                    <h4 class="font-bold text-lg mb-2">설문 응답 (10분)</h4>
                                    <p class="text-gray-600">15개 문항에 대한 5점 척도 평가</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="bg-primary-blue text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">2</div>
                                <div>
                                    <h4 class="font-bold text-lg mb-2">AI 분석</h4>
                                    <p class="text-gray-600">4분면 매트릭스 자동 진단</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="bg-primary-blue text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">3</div>
                                <div>
                                    <h4 class="font-bold text-lg mb-2">리포트 생성</h4>
                                    <p class="text-gray-600">맞춤형 솔루션 자동 매칭</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4">
                                <div class="bg-primary-blue text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">4</div>
                                <div>
                                    <h4 class="font-bold text-lg mb-2">이메일 발송</h4>
                                    <p class="text-gray-600">담당자 이메일로 즉시 전송</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-10">
                        <h3 class="text-2xl font-bold mb-6">진단 혜택</h3>
                        <ul class="space-y-4">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 text-xl mt-1"></i>
                                <span class="text-gray-700">4분면 매트릭스 기반 과학적 진단</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 text-xl mt-1"></i>
                                <span class="text-gray-700">맞춤형 개선 방안 제시</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 text-xl mt-1"></i>
                                <span class="text-gray-700">정부 지원사업 연계 안내</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 text-xl mt-1"></i>
                                <span class="text-gray-700">전문 컨설턴트 1:1 상담</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 text-xl mt-1"></i>
                                <span class="text-gray-700">완전 무료 진단 서비스</span>
                            </li>
                        </ul>
                        
                        <div class="mt-8">
                            <a href="/survey" class="block text-center bg-primary-blue hover-primary-blue text-white px-8 py-4 rounded-full font-bold text-lg transition shadow-lg">
                                지금 진단 시작하기
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Latest News & Resources Section -->
        <section class="py-20 bg-gradient-to-b from-gray-50 to-blue-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-16">
                    <h3 class="text-4xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-newspaper text-blue-600 mr-3"></i>
                        산업전환 지원사업 최신 소식
                    </h3>
                    <p class="text-gray-600 text-lg">2026년 고용노동부·중소벤처기업부 주요 지원사업</p>
                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    <!-- 정규직 전환 지원 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-blue-600">
                        <div class="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-user-tie text-3xl text-blue-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">정규직 전환 지원금</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            비정규직을 정규직으로 전환 시 1인당 월 최대 <span class="font-bold text-blue-600">60만원</span> 지원 (최대 1년)
                        </p>
                        <div class="bg-blue-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-blue-600 mr-2"></i>
                                기본 40만원 + 임금 20만원 이상 인상 시 20만원 추가
                            </p>
                        </div>
                        <a href="https://www.moel.go.kr/" target="_blank" class="text-blue-600 hover:text-blue-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- 탄소중립 사업화 지원 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-green-600">
                        <div class="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-leaf text-3xl text-green-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">탄소중립 사업화 지원</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            기후테크 등 탄소중립 혁신 중소기업의 핵심기술 사업화 및 실증 지원
                        </p>
                        <div class="bg-green-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                                기술사업화·현장실증·투자연계 3개 유형 지원
                            </p>
                        </div>
                        <a href="https://www.mss.go.kr/" target="_blank" class="text-green-600 hover:text-green-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- 사업재편 지원 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-purple-600">
                        <div class="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-sync-alt text-3xl text-purple-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">사업재편 지원</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            산업구조 변화에 대응하는 중소기업의 사업재편 및 직무전환 컨설팅 지원
                        </p>
                        <div class="bg-purple-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-purple-600 mr-2"></i>
                                경영혁신·인력재배치·교육훈련 통합 지원
                            </p>
                        </div>
                        <a href="https://www.bizinfo.go.kr/" target="_blank" class="text-purple-600 hover:text-purple-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- 중소기업 혁신바우처 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-orange-600">
                        <div class="bg-orange-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-ticket-alt text-3xl text-orange-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">중소기업 혁신바우처</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            탄소중립·디지털 전환을 위한 경영혁신 컨설팅 및 기술지원 서비스 제공
                        </p>
                        <div class="bg-orange-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-orange-600 mr-2"></i>
                                탄소중립 경영혁신·중대재해예방 지원
                            </p>
                        </div>
                        <a href="https://www.korsca.kr/" target="_blank" class="text-orange-600 hover:text-orange-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- 디지털전환 지원 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-indigo-600">
                        <div class="bg-indigo-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-microchip text-3xl text-indigo-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">디지털전환 바우처</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            스마트공장·AI·빅데이터 등 디지털 신기술 도입을 위한 자금 지원
                        </p>
                        <div class="bg-indigo-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-indigo-600 mr-2"></i>
                                최대 2억원 지원 (정부 50% + 기업 50%)
                            </p>
                        </div>
                        <a href="https://www.k-smartfactory.kr/" target="_blank" class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>

                    <!-- 중소기업 정책자금 -->
                    <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-t-4 border-pink-600">
                        <div class="bg-pink-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                            <i class="fas fa-hand-holding-usd text-3xl text-pink-600"></i>
                        </div>
                        <h4 class="text-xl font-bold mb-3 text-gray-900">중소기업 정책자금</h4>
                        <p class="text-gray-600 mb-4 leading-relaxed">
                            중소기업의 혁신성장을 위한 저금리 융자 및 보증 지원
                        </p>
                        <div class="bg-pink-50 p-4 rounded-lg mb-4">
                            <p class="text-sm text-gray-700">
                                <i class="fas fa-check-circle text-pink-600 mr-2"></i>
                                연 2~3% 저금리 융자 최대 30억원
                            </p>
                        </div>
                        <a href="https://www.kosmes.or.kr/" target="_blank" class="text-pink-600 hover:text-pink-800 font-semibold text-sm inline-flex items-center">
                            자세히 보기 <i class="fas fa-arrow-right ml-2"></i>
                        </a>
                    </div>
                </div>

                <!-- Important Notice -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
                    <div class="flex items-start gap-6">
                        <div class="bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm flex-shrink-0">
                            <i class="fas fa-bullhorn text-4xl"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-2xl font-bold mb-4">📢 2026년 주요 일정</h4>
                            <div class="grid md:grid-cols-2 gap-4">
                                <div class="bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm">
                                    <p class="font-semibold mb-2"><i class="fas fa-calendar-alt mr-2"></i>1분기 (1~3월)</p>
                                    <p class="text-sm opacity-90">정규직 전환 지원금 신청, 사업재편 지원사업 공고</p>
                                </div>
                                <div class="bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm">
                                    <p class="font-semibold mb-2"><i class="fas fa-calendar-alt mr-2"></i>2분기 (4~6월)</p>
                                    <p class="text-sm opacity-90">탄소중립 사업화 지원, 혁신바우처 2차 공고</p>
                                </div>
                            </div>
                            <div class="mt-6 bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm">
                                <p class="text-sm">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    <strong>지원 대상:</strong> 중소기업 (제조업·서비스업), 상시근로자 30인 이상 우대
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12 border-t border-gray-800">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <div class="flex items-center justify-center gap-3 mb-4">
                        <i class="fas fa-building text-2xl text-blue-400"></i>
                        <span class="text-xl font-bold">한국표준협회 산업·일자리전환 지원센터</span>
                    </div>
                    <p class="text-gray-400 mb-2">고용노동부 지원사업 | G-DAX 진단 시스템</p>
                    <p class="text-gray-500 text-sm">© 2026 Korea Standards Association. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </body>
    </html>
  `)
})
// 설문조사 페이지
app.get('/survey', (c) => {
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
app.get('/admin', adminAuth, (c) => {
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
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold text-gray-800">
                            <i class="fas fa-chart-line mr-2 text-blue-600"></i>
                            관리자 대시보드
                        </h1>
                        <div class="flex gap-3">
                            <button onclick="exportToExcel()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <i class="fas fa-file-excel mr-2"></i>Excel 내보내기
                            </button>
                            <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                            </button>
                        </div>
                    </div>
                    
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

// 디버그: 환경 변수 확인 (임시, 배포 후 삭제 예정)
app.get('/api/debug/env', (c) => {
  return c.json({
    hasResendKey: !!c.env.RESEND_API_KEY,
    hasBaseUrl: !!c.env.BASE_URL,
    hasAdminPassword: !!c.env.ADMIN_PASSWORD,
    baseUrl: c.env.BASE_URL || 'NOT_SET',
    resendKeyLength: c.env.RESEND_API_KEY?.length || 0
  })
})

export default app
