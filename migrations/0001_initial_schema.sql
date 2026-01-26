-- G-DAX 산업전환 준비도 자가진단 설문조사 데이터베이스

-- 설문 응답 테이블
CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 기업 기본 정보
  company_name TEXT NOT NULL,
  ceo_name TEXT NOT NULL,
  location TEXT NOT NULL,
  main_product TEXT NOT NULL,
  employee_count TEXT NOT NULL,  -- '10인 미만', '10~29인', '30~49인', '50~99인', '100~299인', '300인 이상'
  annual_revenue REAL,  -- 억원
  
  -- 설문 응답 (7-10번, 각 3개 문항, 5점 척도: 1-전혀아님, 2-아님, 3-보통, 4-그렇다, 5-매우그렇다)
  -- 7. 탄소중립/기후변화 리스크
  climate_risk_1 INTEGER NOT NULL CHECK(climate_risk_1 >= 1 AND climate_risk_1 <= 5),  -- 매출 감소 예상
  climate_risk_2 INTEGER NOT NULL CHECK(climate_risk_2 >= 1 AND climate_risk_2 <= 5),  -- 탄소 배출량 데이터 요구
  climate_risk_3 INTEGER NOT NULL CHECK(climate_risk_3 >= 1 AND climate_risk_3 <= 5),  -- 에너지 비용 부담
  
  -- 8. 디지털/AI 혁신 시급성
  digital_urgency_1 INTEGER NOT NULL CHECK(digital_urgency_1 >= 1 AND digital_urgency_1 <= 5),  -- 경쟁력 우려
  digital_urgency_2 INTEGER NOT NULL CHECK(digital_urgency_2 >= 1 AND digital_urgency_2 <= 5),  -- 전산 시스템 관리
  digital_urgency_3 INTEGER NOT NULL CHECK(digital_urgency_3 >= 1 AND digital_urgency_3 <= 5),  -- 도입 계획
  
  -- 9. 고용 현황 및 일자리 질
  employment_status_1 INTEGER NOT NULL CHECK(employment_status_1 >= 1 AND employment_status_1 <= 5),  -- 구인난/기술전수
  employment_status_2 INTEGER NOT NULL CHECK(employment_status_2 >= 1 AND employment_status_2 <= 5),  -- 업무 변화 필요성
  employment_status_3 INTEGER NOT NULL CHECK(employment_status_3 >= 1 AND employment_status_3 <= 5),  -- 직원 불안감
  employment_status_4 INTEGER NOT NULL CHECK(employment_status_4 >= 1 AND employment_status_4 <= 5),  -- 재교육 필요성
  
  -- 10. 전환 준비도
  readiness_level INTEGER NOT NULL CHECK(readiness_level >= 1 AND readiness_level <= 5),  -- 경영진 의지
  
  -- 11. 가장 시급한 지원 분야 (JSON 배열로 저장)
  support_areas TEXT NOT NULL,  -- ['사업재편 전략 수립', '직무 분석 및 인력 재배치 설계', ...]
  
  -- 12. 컨설팅 신청 여부
  consulting_application BOOLEAN NOT NULL,  -- true: 신청, false: 미신청
  
  -- 담당자 정보
  contact_name TEXT NOT NULL,
  contact_position TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  
  -- 메타 정보
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  report_generated BOOLEAN DEFAULT FALSE,  -- 리포트 생성 여부
  report_sent BOOLEAN DEFAULT FALSE  -- 이메일 발송 여부
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_company_name ON survey_responses(company_name);
CREATE INDEX IF NOT EXISTS idx_contact_email ON survey_responses(contact_email);
CREATE INDEX IF NOT EXISTS idx_created_at ON survey_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_consulting_application ON survey_responses(consulting_application);
CREATE INDEX IF NOT EXISTS idx_report_sent ON survey_responses(report_sent);
