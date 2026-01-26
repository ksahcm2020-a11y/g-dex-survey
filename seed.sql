-- 테스트 데이터 삽입

INSERT INTO survey_responses (
  company_name, ceo_name, location, main_product, employee_count, annual_revenue,
  climate_risk_1, climate_risk_2, climate_risk_3,
  digital_urgency_1, digital_urgency_2, digital_urgency_3,
  employment_status_1, employment_status_2, employment_status_3, employment_status_4,
  readiness_level,
  support_areas,
  consulting_application,
  contact_name, contact_position, contact_email, contact_phone
) VALUES (
  '삼성전자',
  '이재용',
  '경기도 수원시',
  '반도체 제조',
  '300인 이상',
  50000,
  4, 5, 4,
  5, 4, 5,
  3, 4, 3, 4,
  5,
  '["사업재편 전략 수립", "스마트공장/설비 도입 자금 연계"]',
  TRUE,
  '김철수',
  '전략기획팀장',
  'cs.kim@samsung.com',
  '010-1234-5678'
);

INSERT INTO survey_responses (
  company_name, ceo_name, location, main_product, employee_count, annual_revenue,
  climate_risk_1, climate_risk_2, climate_risk_3,
  digital_urgency_1, digital_urgency_2, digital_urgency_3,
  employment_status_1, employment_status_2, employment_status_3, employment_status_4,
  readiness_level,
  support_areas,
  consulting_application,
  contact_name, contact_position, contact_email, contact_phone
) VALUES (
  '중소제조업',
  '박영희',
  '인천광역시',
  '자동차 부품',
  '30~49인',
  100,
  5, 3, 5,
  4, 2, 3,
  5, 5, 4, 5,
  3,
  '["재직자 직무 전환 교육훈련", "고용안정 장려금 및 인건비 지원 신청", "노사 상생 협약 및 조직문화 개선"]',
  TRUE,
  '이민수',
  '인사담당',
  'ms.lee@example.com',
  '010-9876-5432'
);
