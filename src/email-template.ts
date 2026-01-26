// 이메일 템플릿 생성 함수

export function generateReportEmailHTML(data: {
  companyName: string;
  ceoName: string;
  contactName: string;
  reportUrl: string;
  diagnosisType: string;
  diagnosisDate: string;
}) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>G-DAX 진단 리포트가 완성되었습니다</title>
</head>
<body style="margin: 0; padding: 0; font-family: '맑은 고딕', 'Malgun Gothic', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
                🏭 G-DAX 진단 리포트
              </h1>
              <p style="color: #e0e7ff; font-size: 16px; margin: 0;">
                산업·일자리 전환 진단 결과가 완성되었습니다
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${companyName}</strong> ${ceoName} 님 귀중
              </p>

              <p style="font-size: 15px; color: #4b5563; line-height: 1.8; margin: 0 0 30px 0;">
                안녕하세요, ${contactName} 님.<br>
                귀사의 G-DAX 산업·일자리 전환 진단이 완료되었습니다.
              </p>

              <!-- Diagnosis Result Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 0 0 30px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="color: #1e3a8a; font-size: 18px; margin: 0 0 15px 0;">
                      📊 진단 결과
                    </h2>
                    <p style="color: #1f2937; font-size: 15px; margin: 0 0 10px 0; line-height: 1.6;">
                      <strong>진단 유형:</strong> ${diagnosisType}
                    </p>
                    <p style="color: #1f2937; font-size: 15px; margin: 0; line-height: 1.6;">
                      <strong>진단일:</strong> ${diagnosisDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Report Content -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 25px; margin: 0 0 30px 0;">
                <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 15px 0;">
                  📄 리포트 내용
                </h3>
                <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>종합 진단 결과 (G-DAX 4분면 매트릭스)</li>
                  <li>상세 분석 (환경/디지털/고용 이슈)</li>
                  <li>맞춤형 솔루션 처방 (3단계)</li>
                  <li>정부 지원사업 매칭</li>
                  <li>향후 추진 계획</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.reportUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      📊 진단 리포트 확인하기
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Additional Info -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  💡 <strong>컨설팅 신청 안내</strong><br>
                  보다 정확한 진단과 맞춤형 솔루션을 원하시면 전문 컨설턴트가 <strong>3일 이내</strong>에 연락드립니다.
                </p>
              </div>

              <!-- Footer Info -->
              <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
                본 진단 결과는 G-DAX (Green-Digital-Aging-eXpert) 모델을 기반으로 자동 생성되었습니다.<br>
                문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                주관: 고용노동부 / 한국표준협회
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                이 이메일은 G-DAX 산업·일자리 전환 진단 시스템에서 자동 발송되었습니다.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateReportEmailText(data: {
  companyName: string;
  ceoName: string;
  contactName: string;
  reportUrl: string;
  diagnosisType: string;
  diagnosisDate: string;
}) {
  return `
G-DAX 산업·일자리 전환 진단 리포트

${companyName} ${ceoName} 님 귀중

안녕하세요, ${data.contactName} 님.
귀사의 G-DAX 산업·일자리 전환 진단이 완료되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 진단 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

진단 유형: ${data.diagnosisType}
진단일: ${data.diagnosisDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 리포트 내용
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 종합 진단 결과 (G-DAX 4분면 매트릭스)
• 상세 분석 (환경/디지털/고용 이슈)
• 맞춤형 솔루션 처방 (3단계)
• 정부 지원사업 매칭
• 향후 추진 계획

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 진단 리포트 확인하기:
${data.reportUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 컨설팅 신청 안내
보다 정확한 진단과 맞춤형 솔루션을 원하시면 
전문 컨설턴트가 3일 이내에 연락드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

본 진단 결과는 G-DAX (Green-Digital-Aging-eXpert) 
모델을 기반으로 자동 생성되었습니다.

주관: 고용노동부 / 한국표준협회

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
}
