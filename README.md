# G-DAX 산업전환 준비도 자가진단 설문조사 시스템

## 📋 프로젝트 개요

**이름**: G-DAX 산업·일자리 전환 진단 시스템

**목표**: 기업의 산업전환 준비도를 진단하고, G-DAX 4분면 매트릭스 기반의 맞춤형 리포트를 자동 생성하여 고객 DB를 구축하는 웹 애플리케이션

**주요 기능**:
- ✅ 웹 기반 설문조사 폼 (15개 문항)
- ✅ 실시간 설문 응답 저장 (Cloudflare D1 데이터베이스)
- ✅ **G-DAX 4분면 매트릭스 진단** (탄소 리스크 × 디지털 시급성)
- ✅ **Type I~IV 자동 판정** (구조 전환형/디지털 선도형/탄소 대응형/안정 유지형)
- ✅ **맞춤형 솔루션 처방** (비즈니스/HR/정부 지원사업 매칭)
- ✅ 고용 이슈 동적 분석 (설문 9번 기반)
- ✅ 시각화 차트 (4분면 매트릭스)
- ✅ **이메일 자동 발송** (Resend API - 리포트 링크 포함)
- ✅ **관리자 인증** (비밀번호 로그인, 세션 관리)
- ✅ 관리자 대시보드 (고객 DB 조회, 통계, 이메일 재발송)
- ✅ **Excel 내보내기** (CSV 형식, UTF-8 BOM)
- ✅ 리포트 인쇄 기능 (PDF 저장)

## 🌐 URL

### 샌드박스 개발 서버
- **메인 페이지 (설문조사)**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/
- **관리자 로그인**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/admin/login
- **관리자 대시보드**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/admin (비밀번호: `gdax2026!`)
- **API 엔드포인트**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/api/*

### 프로덕션 배포
- **배포 플랫폼**: Cloudflare Pages
- **배포 상태**: ⏳ 준비 완료 (배포 대기)
- **배포 명령어**: `npm run deploy:prod`

## 🎯 G-DAX 진단 모델

### 4분면 매트릭스 (4-Quadrant Matrix)

**X축: 탄소 리스크 (Climate Risk)** - 15점 만점
- 설문 7번 (탄소중립/기후변화 리스크) 3개 문항 합산
- 기준: 60점(9점/15점) 이상 = High 리스크

**Y축: 디지털 시급성 (Digital Urgency)** - 15점 만점
- 설문 8번 (디지털/AI 혁신 시급성) 3개 문항 합산
- 기준: 60점(9점/15점) 이상 = High 시급성

### 진단 유형 (Diagnosis Types)

| 유형 | 위치 | 탄소 리스크 | 디지털 시급성 | 상태 | 색상 |
|------|------|------------|--------------|------|------|
| **Type I. 구조 전환형** | 우하단 | High (≥60점) | High (≥60점) | 복합 위기 | 빨강 (#dc2626) |
| **Type II. 디지털 선도형** | 우상단 | Low (<60점) | High (≥60점) | 디지털 우선 | 파랑 (#2563eb) |
| **Type III. 탄소 대응형** | 좌상단 | High (≥60점) | Low (<60점) | 환경 우선 | 초록 (#16a34a) |
| **Type IV. 안정 유지형** | 좌하단 | Low (<60점) | Low (<60점) | 안정 구간 | 청록 (#0891b2) |

## 📊 리포트 구조

### 1. 표지 (Cover Page)
- **제목**: G-DAX 산업·일자리 전환 진단 리포트
- **수신**: {{회사명}} ({{대표자명}} 님)
- **진단일**: 2026.01.27
- **주관**: 고용노동부 / 한국표준협회

### 2. 종합 진단 결과 (Diagnosis Summary)
- **진단 유형**: [Type I~IV] 자동 판정
- **상태 설명**: 복합 위기 / 디지털 우선 / 환경 우선 / 안정 구간
- **G-DAX 4분면 차트**: 
  - X축: 탄소 리스크 점수 (0~100점)
  - Y축: 디지털 시급성 점수 (0~100점)
  - 귀사 위치 표시 (You are Here)

### 3. 상세 분석 및 이슈 도출 (Detailed Analysis)

#### ① 환경(Green) 리스크 분석
- **상태**: 탄소 규제 압박 수준 평가
- **예측**: 향후 3년 매출 영향 분석

#### ② 디지털(Digital) 역량 분석
- **상태**: 경쟁사 대비 생산성 평가
- **과제**: 스마트공장/AI 도입 필요성

#### ③ 고용(HR) 및 일자리 충격 분석
**설문 9번 응답 기반 동적 메시지 출력**:
- 구인난 및 기술 전수 문제 (9-1번 ≥4점)
- 직무 변화 압력 (9-2번 ≥4점)
- 조직 심리 및 소통 문제 (9-3번 ≥4점)
- 디지털 역량 격차 (9-4번 ≥4점)

### 4. 맞춤형 솔루션 처방 (Prescription)

#### STEP 1. 비즈니스 솔루션: 사업재편
- **사업재편 승인**: 탄소 리스크 ≥60점 시 표시
  - 산업부 「기업활력법」 승인
  - 추천 키워드: 미래차 부품 전환, 탄소포집 기술, 친환경 소재 개발
- **스마트공장 구축**: 디지털 시급성 ≥60점 시 표시
  - 지능형 시스템 구축
  - 추천 키워드: 스마트공장 고도화, AI 품질검사, 예지정비 시스템

#### STEP 2. HR 솔루션: 노동전환 고용안정
- **직무 전환 배치 설계**: 9-2번 ≥4점 시 표시
- **재직자 Upskilling**: 9-4번 ≥4점 시 표시
- **노사 소통 강화**: 9-3번 ≥4점 시 표시

#### STEP 3. 정부 지원사업 매칭 (Policy Bridge)
- 노동전환 고용안정장려금 (고용노동부)
- 산업구조변화대응 특화훈련(산대특) (고용노동부)
- 탄소중립 R&D 지원사업 (산업통상자원부) - 탄소 리스크 ≥60점 시

### 5. 향후 추진 계획 (Action Plan)
- **선택 지원 분야**: 설문 11번 응답 반영
- **담당 컨설턴트**: G-DAX 전문위원
- **다음 절차**: 방문 인터뷰 → 심층 진단 → 이행 계획 수립
- **컨설팅 신청 상태**: 설문 12번 기반 표시

## 📊 데이터 아키텍처

### 데이터 모델

**survey_responses 테이블** (Cloudflare D1 SQLite)

| 필드 | 타입 | 설명 | 리포트 활용 |
|------|------|------|------------|
| company_name | TEXT | 회사명 | 표지, 진단 결과 |
| ceo_name | TEXT | 대표자명 | 표지 |
| climate_risk_1~3 | INTEGER | 탄소중립/기후변화 리스크 (1-5점) | X축 계산 (합산/15*100) |
| digital_urgency_1~3 | INTEGER | 디지털/AI 혁신 시급성 (1-5점) | Y축 계산 (합산/15*100) |
| employment_status_1~4 | INTEGER | 고용 현황 및 일자리 질 (1-5점) | 고용 이슈 동적 메시지 |
| readiness_level | INTEGER | 전환 준비도 (1-5점) | 통계용 |
| support_areas | TEXT | 시급한 지원 분야 (JSON 배열) | 향후 추진 계획 |
| consulting_application | BOOLEAN | 컨설팅 신청 여부 | 향후 추진 계획 |
| contact_name | TEXT | 담당자 성함 | 향후 추진 계획 |

### 점수 계산 로직

```javascript
// 탄소 리스크 점수 (X축)
climateTotal = climate_risk_1 + climate_risk_2 + climate_risk_3  // 3~15점
climateRiskPercent = (climateTotal / 15) * 100  // 0~100점

// 디지털 시급성 점수 (Y축)
digitalTotal = digital_urgency_1 + digital_urgency_2 + digital_urgency_3  // 3~15점
digitalUrgencyPercent = (digitalTotal / 15) * 100  // 0~100점

// 4분면 판정
if (climateRiskPercent >= 60 && digitalUrgencyPercent >= 60) {
  type = "Type I. 구조 전환형"
} else if (climateRiskPercent < 60 && digitalUrgencyPercent >= 60) {
  type = "Type II. 디지털 선도형"
} else if (climateRiskPercent >= 60 && digitalUrgencyPercent < 60) {
  type = "Type III. 탄소 대응형"
} else {
  type = "Type IV. 안정 유지형"
}
```

### 고용 이슈 판정 로직

```javascript
// 설문 9번 응답이 4점 이상이면 해당 이슈 메시지 표시
if (employment_status_1 >= 4) {
  메시지: "구인난 및 기술 전수 문제"
}
if (employment_status_2 >= 4) {
  메시지: "직무 변화 압력"
}
if (employment_status_3 >= 4) {
  메시지: "조직 심리 및 소통 문제"
}
if (employment_status_4 >= 4) {
  메시지: "디지털 역량 격차"
}
```

## 👥 사용자 가이드

### 1. 설문 응답자 (기업 담당자)

#### 설문 작성 방법
1. 메인 페이지 접속
2. 기업 기본 정보 입력 (6개 항목)
3. 설문 항목 응답 (7-10번, 1-5점 척도)
4. 지원 분야 선택 (11번, 중복 선택 가능)
5. 컨설팅 신청 여부 선택 (12번)
6. 담당자 정보 입력
7. "설문 제출 및 리포트 받기" 버튼 클릭
8. **자동으로 G-DAX 진단 리포트 페이지로 이동**

#### 리포트 확인
- **표지**: 회사명, 대표자명, 진단일
- **종합 진단**: Type I~IV 판정 + 4분면 차트
- **상세 분석**: 환경/디지털/고용 이슈 분석
- **맞춤형 솔루션**: 3단계 처방 (비즈니스/HR/정부사업)
- **향후 계획**: 선택 지원 분야 + 컨설팅 신청 상태
- **인쇄 기능**: 브라우저 인쇄로 PDF 저장 가능

### 2. 관리자

#### 로그인
- URL: `/admin/login`
- 기본 비밀번호: `gdax2026!`
- 세션 유효기간: 7일

#### 대시보드 접근
- URL: `/admin` (인증 필요)
- 기능:
  - 전체 설문 응답 수 조회
  - 컨설팅 신청 건수 확인
  - 리포트 발송 현황 파악
  - 설문 응답 목록 조회
  - 개별 응답 상세 정보 확인
  - 리포트 바로 보기
  - **Excel 내보내기** (CSV 형식, 한글 지원)
  - **로그아웃**

## 🛠️ 기술 스택

### 백엔드
- **프레임워크**: Hono (v4.11.5)
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **이메일**: Resend API
- **API**: RESTful API

### 프론트엔드
- **스타일링**: TailwindCSS (CDN)
- **아이콘**: Font Awesome (CDN)
- **HTTP 클라이언트**: Axios (CDN)
- **차트**: Chart.js (CDN) - 4분면 매트릭스
- **UI**: 반응형 디자인, 맑은 고딕 폰트

### 개발 도구
- **빌드 도구**: Vite
- **배포 도구**: Wrangler
- **프로세스 관리**: PM2
- **버전 관리**: Git

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx              # Hono 백엔드 (API + 페이지 라우트)
│   └── email-template.ts      # 이메일 템플릿 (HTML/Text)
├── public/static/
│   ├── survey.js              # 설문조사 폼 로직
│   ├── report.js              # G-DAX 진단 리포트 로직 (4분면 차트)
│   └── admin.js               # 관리자 대시보드 로직 (이메일 재발송)
├── migrations/
│   └── 0001_initial_schema.sql # D1 데이터베이스 스키마
├── dist/                      # 빌드 결과물
├── .dev.vars                  # 로컬 환경 변수 (gitignore)
├── wrangler.jsonc             # Cloudflare 설정
├── ecosystem.config.cjs       # PM2 설정
├── package.json               # 의존성 및 스크립트
├── EMAIL_SETUP.md             # 이메일 설정 가이드
└── seed.sql                   # 테스트 데이터
```

## 🚀 배포 방법

### 로컬 개발 환경

```bash
# 1. 의존성 설치
npm install

# 2. D1 로컬 데이터베이스 마이그레이션
npm run db:migrate:local

# 3. (선택) 테스트 데이터 삽입
npm run db:seed

# 4. 환경 변수 설정
# .dev.vars 파일에 다음 내용 추가:
# RESEND_API_KEY=re_your_api_key_here
# BASE_URL=http://localhost:3000
# ADMIN_PASSWORD=gdax2026!
# 자세한 내용은 EMAIL_SETUP.md 참고

# 5. 빌드
npm run build

# 6. 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 7. 테스트
npm run test
```

### Cloudflare Pages 프로덕션 배포

```bash
# 1. Cloudflare 인증 설정 (최초 1회)
# setup_cloudflare_api_key 도구 호출 필요

# 2. 프로덕션 D1 데이터베이스 생성
npx wrangler d1 create webapp-production
# 출력된 database_id를 wrangler.jsonc에 업데이트

# 3. 프로덕션 마이그레이션
npm run db:migrate:prod

# 4. 빌드 및 배포
npm run deploy:prod
```

## 🔧 주요 기능 완료 상태

### ✅ 완료된 기능
1. ✅ 설문조사 웹 폼 (15개 문항, 반응형 디자인)
2. ✅ 설문 응답 저장 (Cloudflare D1)
3. ✅ **G-DAX 4분면 매트릭스 진단**
   - X축: 탄소 리스크 (0~100점)
   - Y축: 디지털 시급성 (0~100점)
   - Type I~IV 자동 판정
4. ✅ **맞춤형 진단 리포트**
   - 표지 (회사명, 대표자, 진단일)
   - 종합 진단 (4분면 차트)
   - 상세 분석 (환경/디지털/고용 이슈)
   - 맞춤형 솔루션 (3단계 처방)
   - 향후 추진 계획
5. ✅ **동적 메시지 생성**
   - 설문 9번 응답 기반 고용 이슈 분석
   - 점수별 맞춤형 솔루션 표시
6. ✅ **이메일 자동 발송 시스템**
   - Resend API 연동
   - 설문 제출 시 자동 발송
   - 전문적인 HTML 이메일 템플릿
   - 리포트 링크 포함
   - 관리자 대시보드에서 수동 재발송 기능
7. ✅ **관리자 인증 시스템**
   - 비밀번호 로그인 페이지
   - 쿠키 기반 세션 관리 (7일간 유효)
   - 로그아웃 기능
   - 모든 관리자 API 보호
8. ✅ 관리자 대시보드
   - 통계 카드 (전체 응답, 컨설팅 신청, 발송 건수)
   - 설문 응답 목록
   - 상세 정보 모달
   - 이메일 발송/재발송 버튼
   - **Excel 내보내기** (CSV, UTF-8 BOM)
9. ✅ 고객 DB 구축 (D1 데이터베이스)
10. ✅ Git 버전 관리

### 🔐 관리자 인증 기능

**로그인**:
- URL: `/admin/login`
- 기본 비밀번호: `gdax2026!`
- 환경 변수로 변경 가능: `ADMIN_PASSWORD`

**세션 관리**:
- 쿠키 기반 세션 (HttpOnly, Secure, SameSite)
- 유효기간: 7일
- 자동 로그아웃: 세션 만료 또는 수동 로그아웃

**보호되는 경로**:
- `/admin` - 관리자 대시보드
- `/api/surveys` - 설문 목록 조회
- `/api/stats` - 통계 조회
- `/api/send-email/:id` - 이메일 발송
- `/api/export/excel` - Excel 내보내기

### 📊 Excel 내보내기 기능

**내보내기 형식**:
- CSV 형식 (Excel에서 직접 열기 가능)
- UTF-8 BOM 인코딩 (한글 깨짐 방지)
- 파일명: `G-DAX_설문조사_YYYY-MM-DD.csv`

**포함 데이터** (26개 컬럼):
- 기본 정보: ID, 회사명, 대표자명, 소재지, 주생산품, 상시근로자수, 지난해매출액
- 설문 응답: 탄소리스크(1-3), 디지털시급성(1-3), 고용현황(1-4), 전환준비도
- 메타 정보: 지원분야, 컨설팅신청, 담당자정보, 리포트발송여부, 생성일시

**사용 방법**:
1. 관리자 대시보드 로그인
2. 우측 상단 "Excel 내보내기" 버튼 클릭
3. 자동 다운로드 (브라우저 기본 다운로드 폴더)

### 📧 이메일 발송 기능

**자동 발송**:
- 설문 제출 완료 시 담당자 이메일로 자동 발송
- 리포트 링크, 진단 결과 요약 포함
- 발송 실패해도 설문 제출은 성공 처리
- ✅ 버그 수정 완료 (2026.01.27 14:00): 이메일 템플릿 변수 참조 오류 해결

**수동 발송** (관리자):
- 관리자 대시보드에서 "발송" 또는 "재발송" 버튼
- 개별 또는 일괄 발송 가능

**이메일 템플릿**:
- **제목**: [G-DAX] {회사명} 산업전환 진단 리포트가 완성되었습니다
- **내용**:
  - 회사명, 대표자명, 담당자명 개인화
  - 진단 결과 (Type I~IV)
  - 리포트 확인 버튼 (CTA)
  - 컨설팅 안내
  - 주관 기관 정보

**설정 방법**:
- 자세한 설정 가이드는 `EMAIL_SETUP.md` 참고
- Resend API 키 발급 및 환경 변수 설정 필요
- 무료 플랜: 월 3,000통 발송 가능

### ⏳ 향후 구현 예정 기능

**추가 기능 (선택)**
- ~~Excel 내보내기~~ ✅ 완료
- 고급 필터링 및 검색
- 대시보드 차트 추가
- 커스텀 도메인 이메일 발송

## 🔑 API 엔드포인트

### 인증 관련
- `GET /admin/login` - 관리자 로그인 페이지
- `POST /api/admin/login` - 로그인 API
- `POST /api/admin/logout` - 로그아웃 API

### 설문 관련
- `POST /api/survey` - 설문 제출
- `GET /api/survey/:id` - 설문 조회 (단일)
- `GET /api/surveys` - 설문 목록 조회 (관리자, 인증 필요)

### 리포트 관련
- `GET /api/report/:id` - **G-DAX 진단 리포트 생성 및 조회**
  - 4분면 매트릭스 판정
  - 맞춤형 솔루션 처방
  - 고용 이슈 동적 분석

### 이메일 관련
- `POST /api/send-email/:id` - **이메일 발송/재발송** (관리자, 인증 필요)
  - 설문 ID 기반 리포트 이메일 발송
  - 진단 타입 자동 계산 포함
  - 고용 이슈 동적 분석

### 통계 관련
- `GET /api/stats` - 통계 데이터 조회 (관리자, 인증 필요)

### Excel 내보내기
- `GET /api/export/excel` - **Excel 내보내기** (관리자, 인증 필요)
  - CSV 형식, UTF-8 BOM
  - 전체 설문 데이터

### 웹 페이지
- `GET /` - 설문조사 폼
- `GET /admin/login` - 관리자 로그인
- `GET /admin` - 관리자 대시보드 (인증 필요)
- `GET /report/:id` - G-DAX 진단 리포트 페이지

## 📝 개발 스크립트

```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name webapp",
  "db:migrate:local": "wrangler d1 migrations apply webapp-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply webapp-production",
  "db:seed": "wrangler d1 execute webapp-production --local --file=./seed.sql",
  "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed",
  "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
  "test": "curl http://localhost:3000"
}
```

## 🎯 다음 단계 권장 사항

1. **이메일 발송 기능 활성화** ✅
   - ✅ Resend API 키 발급 (`EMAIL_SETUP.md` 참고)
   - ✅ `.dev.vars` 파일에 API 키 설정
   - ✅ 프로덕션 환경 변수 설정 (Cloudflare Pages)
   - 커스텀 도메인 이메일 설정 (선택)

2. **Cloudflare Pages 프로덕션 배포**
   - Cloudflare API 토큰 설정
   - 프로덕션 D1 데이터베이스 생성
   - 환경 변수 설정 (RESEND_API_KEY, BASE_URL)
   - 커스텀 도메인 연결

3. **관리자 인증 추가**
   - `/admin` 경로 보호
   - 로그인 기능 구현

4. **고급 분석 기능**
   - 기업 규모별 통계
   - 업종별 평균 점수
   - 시계열 데이터 분석
   - Type별 분포 차트

5. **데이터 내보내기**
   - Excel 형식 내보내기
   - CSV 다운로드
   - 리포트 PDF 다운로드

## 📄 라이선스

이 프로젝트는 G-DAX 산업·일자리 전환 진단 시스템입니다.

---

**마지막 업데이트**: 2026-01-27
**개발 환경**: Sandbox (Novita.ai)
**프로덕션 배포**: 준비 완료
**진단 모델**: G-DAX 4분면 매트릭스
**이메일 발송**: Resend API 연동 완료

---

**마지막 업데이트**: 2026-01-27
**개발 환경**: Sandbox (Novita.ai)
**프로덕션 배포**: 준비 완료
**진단 모델**: G-DAX 4분면 매트릭스
