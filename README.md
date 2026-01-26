# G-DAX 산업전환 준비도 자가진단 설문조사 시스템

## 📋 프로젝트 개요

**이름**: G-DAX 산업전환 준비도 자가진단 설문조사 시스템

**목표**: 기업의 산업전환 준비도를 진단하고, 맞춤형 리포트를 자동 생성하여 고객 DB를 구축하는 웹 애플리케이션

**주요 기능**:
- ✅ 웹 기반 설문조사 폼 (15개 문항)
- ✅ 실시간 설문 응답 저장 (Cloudflare D1 데이터베이스)
- ✅ 개별 맞춤형 리포트 자동 생성 (점수 계산, 등급 판정, 개선 제안)
- ✅ 시각화 차트 (레이더 차트)
- ✅ 관리자 대시보드 (고객 DB 조회, 통계)
- ✅ 리포트 인쇄 기능
- ⏳ 이메일 자동 발송 (추후 API 키 설정 필요)

## 🌐 URL

### 샌드박스 개발 서버
- **메인 페이지 (설문조사)**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/
- **관리자 대시보드**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/admin
- **API 엔드포인트**: https://3000-iidpghw09cie87fc4o7jc-0e616f0a.sandbox.novita.ai/api/*

### 프로덕션 배포
- **배포 플랫폼**: Cloudflare Pages
- **배포 상태**: ⏳ 준비 완료 (배포 대기)
- **배포 명령어**: `npm run deploy:prod`

## 📊 데이터 아키텍처

### 데이터 모델

**survey_responses 테이블** (Cloudflare D1 SQLite)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 고유 ID (자동 증가) |
| company_name | TEXT | 회사명 |
| ceo_name | TEXT | 대표자명 |
| location | TEXT | 소재지 |
| main_product | TEXT | 주생산품(업종) |
| employee_count | TEXT | 상시 근로자 수 |
| annual_revenue | REAL | 지난해 매출액 (억원) |
| climate_risk_1~3 | INTEGER | 탄소중립/기후변화 리스크 (1-5점) |
| digital_urgency_1~3 | INTEGER | 디지털/AI 혁신 시급성 (1-5점) |
| employment_status_1~4 | INTEGER | 고용 현황 및 일자리 질 (1-5점) |
| readiness_level | INTEGER | 전환 준비도 (1-5점) |
| support_areas | TEXT | 시급한 지원 분야 (JSON 배열) |
| consulting_application | BOOLEAN | 컨설팅 신청 여부 |
| contact_name | TEXT | 담당자 성함 |
| contact_position | TEXT | 담당자 직함 |
| contact_email | TEXT | 담당자 이메일 |
| contact_phone | TEXT | 담당자 전화번호 |
| created_at | DATETIME | 작성일시 |
| report_generated | BOOLEAN | 리포트 생성 여부 |
| report_sent | BOOLEAN | 이메일 발송 여부 |

### 스토리지 서비스
- **Cloudflare D1 Database**: 설문 응답 및 고객 정보 저장
- **로컬 개발**: `--local` 플래그로 로컬 SQLite 사용

### 데이터 흐름
1. **설문 제출**: 사용자 → 웹 폼 → API (`/api/survey`) → D1 Database
2. **리포트 생성**: 사용자 → 리포트 요청 → API (`/api/report/:id`) → 점수 계산 → HTML 렌더링
3. **관리자 조회**: 관리자 → 대시보드 → API (`/api/surveys`) → D1 Database → 목록 표시

## 👥 사용자 가이드

### 1. 설문 응답자 (기업 담당자)

#### 설문 작성 방법
1. 메인 페이지 접속
2. 기업 기본 정보 입력 (6개 항목)
3. 설문 항목 응답 (7-10번, 1-5점 척도)
   - 7번: 탄소중립/기후변화 리스크 (3개 문항)
   - 8번: 디지털/AI 혁신 시급성 (3개 문항)
   - 9번: 고용 현황 및 일자리 질 (4개 문항)
   - 10번: 전환 준비도 (1개 문항)
4. 지원 분야 선택 (11번, 중복 선택 가능)
5. 컨설팅 신청 여부 선택 (12번)
6. 담당자 정보 입력
7. "설문 제출 및 리포트 받기" 버튼 클릭
8. 자동으로 리포트 페이지로 이동

#### 리포트 확인
- **종합 준비도**: 상/중/하 등급 및 5.0 만점 점수
- **영역별 점수**: 4개 영역별 상세 점수
- **레이더 차트**: 시각화된 준비도 분석
- **맞춤형 개선 제안**: 취약 영역에 대한 구체적 제안
- **인쇄 기능**: 브라우저 인쇄로 PDF 저장 가능

### 2. 관리자

#### 대시보드 접근
- URL: `/admin`
- 기능:
  - 전체 설문 응답 수 조회
  - 컨설팅 신청 건수 확인
  - 리포트 발송 현황 파악
  - 설문 응답 목록 조회
  - 개별 응답 상세 정보 확인
  - 리포트 바로 보기

## 🛠️ 기술 스택

### 백엔드
- **프레임워크**: Hono (v4.11.5)
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **API**: RESTful API

### 프론트엔드
- **스타일링**: TailwindCSS (CDN)
- **아이콘**: Font Awesome (CDN)
- **HTTP 클라이언트**: Axios (CDN)
- **차트**: Chart.js (CDN)
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
│   └── index.tsx              # Hono 백엔드 (API + 페이지 라우트)
├── public/static/
│   ├── survey.js              # 설문조사 폼 로직
│   ├── report.js              # 리포트 페이지 로직
│   └── admin.js               # 관리자 대시보드 로직
├── migrations/
│   └── 0001_initial_schema.sql # D1 데이터베이스 스키마
├── dist/                      # 빌드 결과물
├── wrangler.jsonc             # Cloudflare 설정
├── ecosystem.config.cjs       # PM2 설정
├── package.json               # 의존성 및 스크립트
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

# 4. 빌드
npm run build

# 5. 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 6. 테스트
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
3. ✅ 리포트 자동 생성
   - 점수 계산 로직
   - 등급 판정 (상/중/하)
   - 맞춤형 개선 제안
   - 레이더 차트 시각화
4. ✅ 관리자 대시보드
   - 통계 카드 (전체 응답, 컨설팅 신청, 발송 건수)
   - 설문 응답 목록
   - 상세 정보 모달
5. ✅ 고객 DB 구축 (D1 데이터베이스)
6. ✅ Git 버전 관리

### 📋 현재 완료된 기능 요약

**설문 수집**
- 웹 기반 설문 폼 (15개 문항)
- 실시간 검증 및 저장
- 사용자 친화적 UI/UX

**개별 리포트**
- 자동 점수 계산 및 등급 판정
- 4개 영역별 상세 분석
- 시각화 차트 (레이더 차트)
- 맞춤형 개선 제안
- 인쇄/PDF 저장 기능

**고객 DB**
- Cloudflare D1 데이터베이스
- 15개 필드 저장
- 인덱스 최적화
- 관리자 대시보드 조회

### ⏳ 향후 구현 예정 기능

**이메일 자동 발송**
- 리포트 이메일 발송 (Resend/SendGrid API 연동 필요)
- API 키 설정 후 구현 가능
- 발송 상태 추적

**추가 기능**
- Excel 내보내기
- 고급 필터링 및 검색
- 대시보드 차트 추가

## 🔑 API 엔드포인트

### 설문 관련
- `POST /api/survey` - 설문 제출
- `GET /api/survey/:id` - 설문 조회 (단일)
- `GET /api/surveys` - 설문 목록 조회 (관리자)

### 리포트 관련
- `GET /api/report/:id` - 리포트 생성 및 조회

### 통계 관련
- `GET /api/stats` - 통계 데이터 조회

### 웹 페이지
- `GET /` - 설문조사 폼
- `GET /admin` - 관리자 대시보드
- `GET /report/:id` - 리포트 페이지

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

1. **이메일 발송 기능 구현**
   - Resend 또는 SendGrid API 키 발급
   - 이메일 템플릿 작성
   - 자동 발송 로직 구현

2. **Cloudflare Pages 프로덕션 배포**
   - Cloudflare API 토큰 설정
   - 프로덕션 D1 데이터베이스 생성
   - 커스텀 도메인 연결

3. **관리자 인증 추가**
   - `/admin` 경로 보호
   - 로그인 기능 구현

4. **고급 분석 기능**
   - 기업 규모별 통계
   - 업종별 평균 점수
   - 시계열 데이터 분석

5. **데이터 내보내기**
   - Excel 형식 내보내기
   - CSV 다운로드

## 📄 라이선스

이 프로젝트는 G-DAX 산업전환 준비도 자가진단 설문조사 시스템입니다.

---

**마지막 업데이트**: 2026-01-26
**개발 환경**: Sandbox (Novita.ai)
**프로덕션 배포**: 준비 완료
