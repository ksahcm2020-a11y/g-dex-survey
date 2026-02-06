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

// 메인 페이지 - 서베이로 리다이렉트
app.get('/', (c) => {
  return c.redirect('/survey')
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
