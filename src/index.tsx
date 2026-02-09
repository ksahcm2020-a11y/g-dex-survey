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

// 메인 페이지 - 포털 페이지
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KSA 산업일자리전환 컨설팅 포털</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React & ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <!-- Babel for JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; }
        html { scroll-behavior: smooth; }
        .ksa-blue { color: #004ea2; }
        .bg-ksa-blue { background-color: #004ea2; }
        .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect } = React;

        // Icons
        const ArrowRight = () => <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>;
        const Check = () => <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
        const ChevronRight = () => <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>;
        const Plus = () => <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"></path></svg>;
        const Refresh = () => <svg className="w-10 h-10 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>;
        const TrendingUp = () => <svg className="w-10 h-10 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>;
        const Briefcase = () => <svg className="w-12 h-12 text-[#004ea2] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>;
        const Users = () => <svg className="w-12 h-12 text-[#004ea2] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>;
        const LightBulb = () => <svg className="w-12 h-12 text-[#004ea2] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>;
        const Search = () => <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
        const Layers = () => <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>;
        const Link = () => <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>;
        const Handshake = () => <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
        const Target = () => <svg className="w-6 h-6 text-[#004ea2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>;

        const Portal = () => {
            const [scrolled, setScrolled] = useState(false);

            useEffect(() => {
                const handleScroll = () => setScrolled(window.scrollY > 50);
                window.addEventListener('scroll', handleScroll);
                return () => window.removeEventListener('scroll', handleScroll);
            }, []);

            return (
                <div className="min-h-screen bg-white text-slate-800">
                    {/* Header */}
                    <header className={\`sticky top-0 z-50 bg-white transition-all duration-300 \${scrolled ? 'shadow-md py-2' : 'border-b border-slate-100 py-4'}\`}>
                        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                {/* KSA Official Logo - Larger Size */}
                                <svg className="h-16 md:h-20 w-auto" viewBox="0 0 480 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* KSA Text - Teal/Dark Green */}
                                    <text x="5" y="55" fontFamily="Georgia, Times New Roman, serif" fontSize="58" fontWeight="bold" fill="#006666" letterSpacing="-1">KSA</text>
                                    {/* Korean Text - Dark Gray */}
                                    <text x="165" y="35" fontFamily="Noto Sans KR, Malgun Gothic, sans-serif" fontSize="20" fontWeight="600" fill="#333333">한국표준협회</text>
                                    {/* English Text - Dark Gray */}
                                    <text x="165" y="57" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="400" fill="#333333" letterSpacing="0.3">KOREAN STANDARDS ASSOCIATION</text>
                                </svg>
                                <span className="hidden md:inline text-slate-300 mx-2">|</span>
                                <span className="hidden md:inline text-lg font-bold text-slate-800 pt-1">산업일자리전환지원센터</span>
                            </div>
                            <nav className="hidden md:flex gap-8 text-[15px] font-medium text-slate-600">
                                <a href="#background" className="hover:text-[#004ea2]">배경 및 필요성</a>
                                <a href="#urgency" className="hover:text-[#004ea2]">시급성 및 솔루션</a>
                                <a href="#consulting" className="hover:text-[#004ea2]">컨설팅 분야</a>
                                <a href="#process" className="hover:text-[#004ea2]">진행절차</a>
                            </nav>
                            <a href="#contact-footer" className="bg-[#004ea2] hover:bg-[#003d80] text-white px-5 py-2 rounded font-bold text-sm transition-colors">
                                상담 문의
                            </a>
                        </div>
                    </header>

                    {/* Hero Section */}
                    <section className="relative h-[640px] bg-slate-900 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900"></div>
                        
                        <div className="relative z-10 text-center max-w-5xl px-4">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight text-shadow">
                                Green-Digital AI의 파고를 넘는<br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">G-DAX 네비게이터</span>
                            </h1>
                            <p className="text-xl text-slate-200 mb-10 font-light">
                                대한민국 일자리 전환의 새로운 표준,<br/>
                                한국표준협회가 기업의 지속가능한 성장을 위한 나침반이 되겠습니다.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <a 
                                    href="/survey" 
                                    className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-lg font-bold text-lg shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center"
                                >
                                    산업전환 준비도 진단 <ChevronRight />
                                </a>
                                <a 
                                    href="https://www.ksa.or.kr" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 bg-[#004ea2] hover:bg-[#003d80] text-white rounded-lg font-bold text-lg shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center"
                                >
                                    무료 컨설팅 신청하기 <ArrowRight />
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Background (Complex Crisis) */}
                    <section id="background" className="py-24 bg-slate-50">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl font-bold text-slate-900 mb-4">왜 지금 '일자리 전환'인가?</h2>
                                <p className="text-slate-600">G-DAX 변화 동인과 인구구조 변화가 결합된 <span className="font-bold text-red-600">'복합 위기(Perfect Storm)'</span>가 도래했습니다.</p>
                            </div>

                            {/* 1. G-DAX Row */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                                    <span className="w-2 h-6 bg-[#004ea2] mr-2 rounded-sm"></span>
                                    G-DAX 3대 변화 동인 (External Shock)
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Green */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-green-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-2xl font-black text-green-600">Green</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">존립 위기</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">탄소 규제 강화로 인한<br/>전통 제조업 사업 존립 위기</p>
                                    </div>
                                    {/* Digital */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-blue-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-2xl font-black text-blue-600">Digital</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">경쟁력 상실</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">데이터 기반 경영 미흡에 따른<br/>시장 경쟁력 상실 가속화</p>
                                    </div>
                                    {/* AI */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-purple-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-2xl font-black text-purple-600">AI</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">고용 불안</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">급격한 자동화 도입에 따른<br/>기존 인력 직무 부적응 심화</p>
                                    </div>
                                </div>
                            </div>

                            {/* Connector */}
                            <div className="flex justify-center my-4">
                                <Plus />
                            </div>

                            {/* 2. Demographic Row */}
                            <div className="mb-12">
                                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                                    <span className="w-2 h-6 bg-red-500 mr-2 rounded-sm"></span>
                                    인구구조 변화 리스크 (Internal Shock)
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Aging */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-red-400">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xl font-bold text-slate-800">초고령화</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">숙련 단절</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">베이비부머 은퇴로 인한<br/>핵심 기술 전수 중단 위기</p>
                                    </div>
                                    {/* Skill Loss */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-red-500">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xl font-bold text-slate-800">암묵지 소실</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">자산 손실</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">경험 기반 노하우의<br/>디지털화 부재로 인한 소실</p>
                                    </div>
                                    {/* Labor Shortage */}
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all border-t-4 border-t-red-600">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xl font-bold text-slate-800">인력난 심화</span>
                                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">채용 난항</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium">생산가능인구 급감에 따른<br/>신규 인력 채용 어려움</p>
                                    </div>
                                </div>
                            </div>

                            {/* Result Alert */}
                            <div className="bg-slate-800 rounded-xl p-6 text-center text-white shadow-lg max-w-3xl mx-auto">
                                <h3 className="text-xl font-bold mb-2">🚨 산업·노동시장의 구조적 위기 (Perfect Storm)</h3>
                                <p className="text-slate-300 text-sm">외부의 기술 충격(G-DAX)과 내부의 인력 충격(인구구조)이 동시에 발생하여 기업 생존을 위협하고 있습니다.</p>
                            </div>
                        </div>
                    </section>

                    {/* Urgency & Solution */}
                    <section id="urgency" className="py-24 bg-white">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl font-bold text-slate-900 mb-4">근본적 변화와 시급한 대응</h2>
                                <p className="text-slate-600">산업 구조의 대전환기, 직무 재설계는 선택이 아닌 생존의 필수 조건입니다.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 mb-16">
                                {/* Left: Industrial Structure Change */}
                                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                                    <div className="flex items-center mb-6">
                                        <Refresh />
                                        <h3 className="text-2xl font-bold text-slate-900 ml-4">산업구조의 근본적 변화</h3>
                                    </div>
                                    <ul className="space-y-4">
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                                            <div className="font-bold text-slate-800 mb-1">전통 산업의 축소</div>
                                            <p className="text-sm text-slate-600">내연기관, 오프라인 유통 등 기존 주력 산업의 구조적 쇠퇴</p>
                                        </li>
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                                            <div className="font-bold text-slate-800 mb-1">신기술 일자리 팽창</div>
                                            <p className="text-sm text-slate-600">친환경, AI, 바이오 등 신산업 분야의 급격한 성장</p>
                                        </li>
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
                                            <div className="font-bold text-slate-800 mb-1">Big Blur (경계 붕괴)</div>
                                            <p className="text-sm text-slate-600">제조-서비스, 온-오프라인 경계가 사라지는 융합 가속화</p>
                                        </li>
                                    </ul>
                                </div>

                                {/* Right: Job Redesign Urgency */}
                                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                                    <div className="flex items-center mb-6">
                                        <TrendingUp />
                                        <h3 className="text-2xl font-bold text-slate-900 ml-4">직무 재설계의 시급성</h3>
                                    </div>
                                    <ul className="space-y-4">
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
                                            <div className="font-bold text-slate-800 mb-1">대규모 스킬 재설계</div>
                                            <p className="text-sm text-slate-600">기존 직무의 40% 이상이 핵심 스킬 변화 직면</p>
                                        </li>
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                                            <div className="font-bold text-slate-800 mb-1">신속한 Reskilling</div>
                                            <p className="text-sm text-slate-600">변화 속도를 따라잡기 위한 재직자 직무 전환 훈련 시급</p>
                                        </li>
                                        <li className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                                            <div className="font-bold text-slate-800 mb-1">고부가가치 인력 재배치</div>
                                            <p className="text-sm text-slate-600">저숙련/단순 반복 직무 인력을 고부가가치 직무로 이동</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* The Solution Bridge */}
                            <div className="relative">
                                <div className="absolute left-1/2 -top-8 -translate-x-1/2 z-10">
                                    <div className="bg-[#004ea2] rounded-full p-3 shadow-lg animate-bounce">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                    </div>
                                </div>
                                <div className="bg-[#004ea2] rounded-2xl p-10 text-center text-white shadow-xl">
                                    <h3 className="text-3xl font-bold mb-4">정부지원 무료 컨설팅을 활용해서 해결책을 찾으세요</h3>
                                    <p className="text-blue-100 text-lg mb-8">
                                        복잡한 산업 전환의 과제, 개별 기업 혼자서는 해결하기 어렵습니다.<br/>
                                        정부의 전폭적인 지원을 통해 비용 부담 없이 전문가의 솔루션을 받으세요.
                                    </p>
                                    <div className="flex justify-center gap-8 text-sm font-bold">
                                        <div className="bg-white/10 px-6 py-3 rounded-full border border-white/30">💰 비용 부담 0원 (전액 국비)</div>
                                        <div className="bg-white/10 px-6 py-3 rounded-full border border-white/30">🎓 최고 전문가 지원</div>
                                        <div className="bg-white/10 px-6 py-3 rounded-full border border-white/30">✅ 철저한 이행 점검</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Government Supported Consulting */}
                    <section id="consulting" className="py-24 bg-slate-50">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl font-bold text-slate-900 mb-4">정부지원 컨설팅</h2>
                                <p className="text-slate-600">기업의 당면 과제에 따라 최적화된 솔루션을 선택하세요.</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mb-16">
                                {/* Card 1 */}
                                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-[#004ea2] transition-colors"></div>
                                    <div className="mb-6">
                                        <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">운영 혁신</span>
                                    </div>
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#004ea2] transition-colors">
                                        <LightBulb />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">일터혁신 상생 컨설팅</h3>
                                    <p className="text-slate-500 text-sm">인사/노무 리스크 관리 및<br/>운영 체계 혁신</p>
                                </div>
                                {/* Card 2 */}
                                <div className="bg-white rounded-2xl p-8 border-2 border-[#004ea2] shadow-lg text-center relative overflow-hidden transform scale-105 z-10">
                                    <div className="absolute top-0 right-0 bg-[#004ea2] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">추천</div>
                                    <div className="mb-6">
                                        <span className="bg-blue-100 text-[#004ea2] font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">미래 대비</span>
                                    </div>
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Briefcase />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#004ea2] mb-2">산업일자리 전환 컨설팅</h3>
                                    <p className="text-slate-600 text-sm font-medium">G-DAX 대응 전략 수립 및<br/>직무 재설계 지원</p>
                                </div>
                                {/* Card 3 */}
                                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all text-center group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-[#004ea2] transition-colors"></div>
                                    <div className="mb-6">
                                        <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">인력 최적화</span>
                                    </div>
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#004ea2] transition-colors">
                                        <Users />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">재취업지원서비스 컨설팅</h3>
                                    <p className="text-slate-500 text-sm">고령화 시대, 장년층 인력의<br/>효율적 운영 지원</p>
                                </div>
                            </div>

                            {/* Industrial Job Transition Detail (Image 5 Content) */}
                            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-lg">
                                <div className="text-center mb-10">
                                    <span className="bg-blue-100 text-[#004ea2] font-bold px-3 py-1 rounded-full text-sm">핵심 지원 분야</span>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-3">산업일자리 전환 컨설팅 주요 지원 내용</h3>
                                </div>
                                
                                <div className="grid md:grid-cols-4 gap-6 relative">
                                    {/* Connecting Line */}
                                    <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-slate-200 z-0"></div>

                                    {/* Step 1 */}
                                    <div className="relative z-10 bg-white p-4">
                                        <div className="w-16 h-16 bg-[#004ea2] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 border-4 border-white shadow-sm">1</div>
                                        <h4 className="text-lg font-bold text-center mb-3">기본 컨설팅 (진단)</h4>
                                        <ul className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>기업 내·외부 환경 진단</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>사업 전환 전략 수립</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>신사업 진출 타당성 검토</li>
                                        </ul>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="relative z-10 bg-white p-4">
                                        <div className="w-16 h-16 bg-[#004ea2] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 border-4 border-white shadow-sm">2</div>
                                        <h4 className="text-lg font-bold text-center mb-3">심화 컨설팅 (재설계)</h4>
                                        <ul className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>미래 유망 직무 발굴</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>직무 재설계 (Redesign)</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>신규 직무기술서 도출</li>
                                        </ul>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="relative z-10 bg-white p-4">
                                        <div className="w-16 h-16 bg-[#004ea2] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 border-4 border-white shadow-sm">3</div>
                                        <h4 className="text-lg font-bold text-center mb-3">HRD 체계 (교육)</h4>
                                        <ul className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>직무 전환 교육훈련 설계</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>필요 역량 정의</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>역량 평가 체계 수립</li>
                                        </ul>
                                    </div>

                                    {/* Step 4 */}
                                    <div className="relative z-10 bg-white p-4">
                                        <div className="w-16 h-16 bg-[#004ea2] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 border-4 border-white shadow-sm">4</div>
                                        <h4 className="text-lg font-bold text-center mb-3">노사 지원 (관계)</h4>
                                        <ul className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>직무 개편 갈등 관리</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>근로자 심리 안정 (EAP)</li>
                                            <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>노사 상생 문화 구축</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Process */}
                    <section id="process" className="py-24 bg-white">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl font-bold text-slate-900">컨설팅 수행 절차</h2>
                            </div>

                            <div className="relative mb-24">
                                <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
                                    {[
                                        { step: "01", title: "신청 접수", sub: "사업주 → KSA", icon: "📝" },
                                        { step: "02", title: "심사 및 승인", sub: "KSA → 사업주", icon: "⚖️" },
                                        { step: "03", title: "컨설턴트 배정", sub: "전문가 매칭", icon: "🤝" },
                                        { step: "04", title: "컨설팅 수행", sub: "기본/심화 (3~4개월)", icon: "💡" },
                                        { step: "05", title: "사후 지원", sub: "이행점검/교육연계", icon: "🚀" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center hover:-translate-y-2 transition-transform">
                                            <div className="w-12 h-12 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-blue-100">
                                                {item.icon}
                                            </div>
                                            <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                                            <p className="text-xs text-slate-500">{item.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Strategy & Philosophy (Image 7 & 9) */}
                            <div className="bg-slate-50 rounded-3xl p-10 md:p-16 border border-slate-200">
                                <div className="text-center mb-12">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">KSA만의 차별화된 수행 전략</h3>
                                    <p className="text-slate-600">성공적인 전환을 위한 KSA의 미션과 전략입니다.</p>
                                </div>

                                {/* Mission (Image 7) */}
                                <div className="grid md:grid-cols-2 gap-6 mb-12">
                                    <div className="bg-white p-8 rounded-2xl shadow-sm border-l-8 border-[#004ea2] flex items-center">
                                        <div className="mr-6 bg-blue-50 p-4 rounded-full">
                                            <Briefcase />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-[#004ea2] mb-1">MISSION 01</div>
                                            <h4 className="text-xl font-bold text-slate-900">기업의 지속가능한 생존 실현</h4>
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-2xl shadow-sm border-l-8 border-green-500 flex items-center">
                                        <div className="mr-6 bg-green-50 p-4 rounded-full">
                                            <Users />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-green-600 mb-1">MISSION 02</div>
                                            <h4 className="text-xl font-bold text-slate-900">근로자의 정의로운 전환 실현</h4>
                                        </div>
                                    </div>
                                </div>

                                {/* 4 Strategies (Image 7) */}
                                <div className="grid md:grid-cols-4 gap-4 mb-16">
                                    <div className="bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 text-white">
                                            <Search />
                                        </div>
                                        <h5 className="font-bold text-slate-900 mb-2">선제적 발굴</h5>
                                        <p className="text-xs text-slate-500">사전진단 기반<br/>위기 징후 포착</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 text-white">
                                            <Layers />
                                        </div>
                                        <h5 className="font-bold text-slate-900 mb-2">융합 솔루션</h5>
                                        <p className="text-xs text-slate-500">Biz-Tech-People<br/>통합 컨설팅</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 text-white">
                                            <Link />
                                        </div>
                                        <h5 className="font-bold text-slate-900 mb-2">범부처 연계</h5>
                                        <p className="text-xs text-slate-500">정부 지원사업<br/>브릿지 역할</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 text-white">
                                            <Handshake />
                                        </div>
                                        <h5 className="font-bold text-slate-900 mb-2">노사 상생</h5>
                                        <p className="text-xs text-slate-500">정의로운 전환<br/>모델 구축</p>
                                    </div>
                                </div>

                                {/* Customized Consulting (Image 9 - Enhanced) */}
                                <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl">
                                    <div className="text-center mb-10">
                                        <h4 className="text-2xl font-bold text-slate-900 mb-2">"각 기업의 특수성을 반영한 맞춤형 컨설팅"</h4>
                                        <p className="text-slate-600">획일적인 솔루션은 지양합니다. 기업의 위기 유형에 따른 최적의 HR 솔루션을 매칭합니다.</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-stretch gap-4">
                                        {/* Input: Crisis Types */}
                                        <div className="flex-1 bg-red-50 rounded-2xl p-6 border border-red-100">
                                            <div className="flex items-center justify-center mb-4">
                                                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">STEP 1</span>
                                                <span className="ml-2 font-bold text-red-800">위기 유형 분류</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-red-400">구조전환형 (사업재편)</div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-red-400">공정혁신형 (자동화)</div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-red-400">가치창출형 (신사업)</div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-red-400">강소기반형 (성장)</div>
                                            </div>
                                        </div>

                                        {/* Process: Arrow */}
                                        <div className="flex items-center justify-center">
                                            <div className="bg-[#004ea2] rounded-full p-3 shadow-lg z-10">
                                                <Target />
                                            </div>
                                        </div>

                                        {/* Output: Solution Types */}
                                        <div className="flex-1 bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                            <div className="flex items-center justify-center mb-4">
                                                <span className="bg-[#004ea2] text-white text-xs font-bold px-3 py-1 rounded-full">STEP 2</span>
                                                <span className="ml-2 font-bold text-[#004ea2]">최적 솔루션 매칭</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-blue-500 flex justify-between">
                                                    <span>전직지원형</span>
                                                    <span className="text-xs text-slate-400">Outplacement</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-blue-500 flex justify-between">
                                                    <span>직무재배치형</span>
                                                    <span className="text-xs text-slate-400">Relocation</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-blue-500 flex justify-between">
                                                    <span>직무고도화형</span>
                                                    <span className="text-xs text-slate-400">Upskilling</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg shadow-sm text-sm font-medium text-slate-700 border-l-4 border-blue-500 flex justify-between">
                                                    <span>고용보호형</span>
                                                    <span className="text-xs text-slate-400">Retention</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer id="contact-footer" className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="mb-8">
                                <h4 className="text-white font-bold mb-4 text-lg">문의처</h4>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <p className="flex items-center"><span className="font-bold text-slate-300 mr-2">Tel</span> 02-6240-4805 / 4818</p>
                                    <p className="flex items-center"><span className="font-bold text-slate-300 mr-2">Email</span> ksawork02@ksa.or.kr</p>
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-800 pt-8">
                                <p className="mb-1">
                                    <span className="font-bold text-slate-300">위탁기관</span> 고용노동부 
                                    <span className="mx-3 text-slate-700">|</span> 
                                    <span className="font-bold text-slate-300">운영기관</span> 한국표준협회 산업일자리전환지원센터
                                </p>
                                <p className="text-xs text-slate-600 mt-2">Copyright © KOREAN STANDARDS ASSOCIATION. All rights reserved.</p>
                            </div>
                        </div>
                    </footer>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Portal />);
    </script>
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
        <title>산업일자리전환 준비도 진단 설문조사</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; }
          html { scroll-behavior: smooth; }
          .scale-option { transition: all 0.3s; }
          .scale-option:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 78, 162, 0.15); }
          .scale-option.selected { background-color: #004ea2; color: white; border-color: #004ea2; }
          .section-card { background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.3s; }
          .section-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body class="bg-slate-50">
        <!-- Header matching portal design -->
        <header class="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
                <a href="/" class="flex items-center gap-3">
                    <svg class="h-16 md:h-20 w-auto" viewBox="0 0 480 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <text x="5" y="55" fontFamily="Georgia, Times New Roman, serif" fontSize="58" fontWeight="bold" fill="#006666" letterSpacing="-1">KSA</text>
                        <text x="165" y="35" fontFamily="Noto Sans KR, Malgun Gothic, sans-serif" fontSize="20" fontWeight="600" fill="#333333">한국표준협회</text>
                        <text x="165" y="57" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="400" fill="#333333" letterSpacing="0.3">KOREAN STANDARDS ASSOCIATION</text>
                    </svg>
                </a>
                <a href="/" class="text-sm font-medium text-slate-600 hover:text-[#004ea2] transition-colors">
                    <i class="fas fa-home mr-1"></i> 포털로 돌아가기
                </a>
            </div>
        </header>

        <div class="min-h-screen py-12 px-4">
            <div class="max-w-5xl mx-auto">
                <!-- Hero Section -->
                <div class="text-center mb-12">
                    <div class="inline-block bg-blue-50 text-[#004ea2] px-4 py-2 rounded-full text-sm font-bold mb-4">
                        <i class="fas fa-clipboard-list mr-2"></i>준비도 진단
                    </div>
                    <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                        산업일자리전환 준비도 진단
                    </h1>
                    <p class="text-lg text-slate-600 mb-6">
                        설문조사를 완료하시면 <span class="font-bold text-[#004ea2]">개별 맞춤형 리포트</span>를 이메일로 발송해 드립니다.
                    </p>
                    <div class="flex justify-center gap-2 text-sm text-slate-500">
                        <div class="flex items-center">
                            <i class="fas fa-clock mr-1 text-[#004ea2]"></i>
                            <span>소요시간 약 5분</span>
                        </div>
                        <span class="text-slate-300">|</span>
                        <div class="flex items-center">
                            <i class="fas fa-file-alt mr-1 text-[#004ea2]"></i>
                            <span>총 15개 문항</span>
                        </div>
                    </div>
                </div>

                <form id="surveyForm" class="space-y-8">
                    <!-- 기업 기본 정보 -->
                    <div class="section-card p-8">
                        <div class="flex items-center mb-6 pb-4 border-b border-slate-100">
                            <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-building text-[#004ea2] text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-slate-900">기업 기본 정보</h2>
                                <p class="text-sm text-slate-500 mt-1">귀사의 기본 정보를 입력해 주세요</p>
                            </div>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">1. 회사명 <span class="text-red-500">*</span></label>
                                <input type="text" name="company_name" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">2. 대표자명 <span class="text-red-500">*</span></label>
                                <input type="text" name="ceo_name" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">3. 소재지 <span class="text-red-500">*</span></label>
                                <input type="text" name="location" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">4. 주생산품(업종) <span class="text-red-500">*</span></label>
                                <input type="text" name="main_product" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">5. 상시 근로자 수 <span class="text-red-500">*</span></label>
                                <select name="employee_count" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
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
                                <label class="block text-sm font-bold text-slate-700 mb-2">6. 지난해 매출액 (억원)</label>
                                <input type="number" name="annual_revenue" step="0.1" 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                        </div>
                    </div>

                    <!-- 설문 항목 -->
                    <div id="surveyQuestions"></div>

                    <!-- 지원 분야 -->
                    <div class="section-card p-8">
                        <div class="flex items-center mb-6 pb-4 border-b border-slate-100">
                            <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-hands-helping text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-slate-900">지원 분야 선택</h2>
                                <p class="text-sm text-slate-500 mt-1">가장 시급한 지원 분야를 선택해 주세요 (중복 선택 가능)</p>
                            </div>
                        </div>
                        <div class="grid md:grid-cols-2 gap-3">
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="사업재편 전략 수립" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">사업재편 전략 수립 (신사업 발굴)</span>
                            </label>
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="직무 분석 및 인력 재배치 설계" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">직무 분석 및 인력 재배치 설계</span>
                            </label>
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="재직자 직무 전환 교육훈련" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">재직자 직무 전환 교육훈련 (AI, 자동화 등)</span>
                            </label>
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="고용안정 장려금 및 인건비 지원 신청" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">고용안정 장려금 및 인건비 지원 신청</span>
                            </label>
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="스마트공장/설비 도입 자금 연계" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">스마트공장/설비 도입 자금 연계</span>
                            </label>
                            <label class="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-[#004ea2] transition-all">
                                <input type="checkbox" name="support_areas" value="노사 상생 협약 및 조직문화 개선" class="mr-3 w-5 h-5 text-[#004ea2] rounded focus:ring-[#004ea2]">
                                <span class="font-medium text-slate-700">노사 상생 협약 및 조직문화 개선</span>
                            </label>
                        </div>
                    </div>

                    <!-- 컨설팅 신청 -->
                    <div class="section-card p-8">
                        <div class="flex items-center mb-6 pb-4 border-b border-slate-100">
                            <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-clipboard-check text-[#004ea2] text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-slate-900">컨설팅 신청</h2>
                                <p class="text-sm text-slate-500 mt-1">산업·일자리전환 무료 컨설팅 신청 여부</p>
                            </div>
                        </div>
                        <div class="bg-blue-50 border-l-4 border-[#004ea2] p-4 mb-6 rounded-r-lg">
                            <p class="text-sm text-slate-700">
                                <i class="fas fa-info-circle text-[#004ea2] mr-2"></i>
                                고용노동부와 한국표준협회가 <span class="font-bold text-[#004ea2]">전액 무료</span>로 지원하는 컨설팅을 신청하시겠습니까?
                            </p>
                        </div>
                        <div class="grid md:grid-cols-2 gap-4">
                            <label class="flex items-center p-5 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl hover:from-green-100 hover:to-blue-100 cursor-pointer border-2 border-transparent hover:border-green-500 transition-all">
                                <input type="radio" name="consulting_application" value="true" required class="mr-4 w-5 h-5 text-green-600 focus:ring-green-500">
                                <div>
                                    <span class="font-bold text-green-700 text-lg block">네, 신청합니다</span>
                                    <span class="text-xs text-green-600">무료 컨설팅을 받고 싶습니다</span>
                                </div>
                            </label>
                            <label class="flex items-center p-5 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer border-2 border-transparent hover:border-slate-300 transition-all">
                                <input type="radio" name="consulting_application" value="false" required class="mr-4 w-5 h-5 text-slate-600 focus:ring-slate-500">
                                <div>
                                    <span class="font-medium text-slate-700 text-lg block">아니오</span>
                                    <span class="text-xs text-slate-500">진단 결과만 받겠습니다</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 담당자 정보 -->
                    <div class="section-card p-8">
                        <div class="flex items-center mb-6 pb-4 border-b border-slate-100">
                            <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-user text-purple-600 text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-slate-900">담당자 정보</h2>
                                <p class="text-sm text-slate-500 mt-1">리포트를 받으실 담당자 정보를 입력해 주세요</p>
                            </div>
                        </div>
                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">13. 담당자 성함 <span class="text-red-500">*</span></label>
                                <input type="text" name="contact_name" required 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">직함</label>
                                <input type="text" name="contact_position" 
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">14. 이메일 주소 <span class="text-red-500">*</span></label>
                                <input type="email" name="contact_email" required placeholder="example@company.com"
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">15. 전화번호 <span class="text-red-500">*</span></label>
                                <input type="tel" name="contact_phone" required placeholder="010-0000-0000"
                                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ea2] focus:border-[#004ea2] transition-all">
                            </div>
                        </div>
                    </div>

                    <!-- 제출 버튼 -->
                    <div class="text-center">
                        <button type="submit" 
                            class="inline-flex items-center justify-center px-12 py-5 bg-[#004ea2] hover:bg-[#003d80] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                            <i class="fas fa-paper-plane mr-3"></i>
                            설문 제출 및 리포트 받기
                        </button>
                        <p class="text-sm text-slate-500 mt-4">
                            <i class="fas fa-lock mr-1"></i>
                            입력하신 정보는 안전하게 보호됩니다
                        </p>
                    </div>
                </form>
            </div>
        </div>

        <!-- Footer -->
        <footer class="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-sm mt-12">
            <div class="max-w-7xl mx-auto px-4 text-center">
                <p class="text-xs">
                    <span class="font-bold text-slate-300">위탁기관</span> 고용노동부 
                    <span class="mx-2 text-slate-700">|</span> 
                    <span class="font-bold text-slate-300">운영기관</span> 한국표준협회 산업일자리전환지원센터
                </p>
            </div>
        </footer>

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
