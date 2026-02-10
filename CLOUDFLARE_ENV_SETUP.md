# Cloudflare Pages 환경 변수 설정 방법

## 메일 발송이 작동하지 않는 이유
Cloudflare Pages 프로덕션 환경에 필요한 환경 변수가 설정되지 않았습니다.

## 필요한 환경 변수
1. **RESEND_API_KEY**: 이메일 발송을 위한 Resend API 키
2. **BASE_URL**: 리포트 URL 생성을 위한 기본 URL

## 설정 방법

### 1단계: Cloudflare Dashboard 접속
1. https://dash.cloudflare.com/ 접속
2. 로그인

### 2단계: Pages 프로젝트 선택
1. 좌측 메뉴에서 "Workers & Pages" 클릭
2. "g-dex-survey" 프로젝트 선택

### 3단계: 환경 변수 설정
1. "Settings" 탭 클릭
2. "Environment variables" 섹션으로 스크롤
3. "Add variable" 버튼 클릭

### 4단계: 변수 추가

#### RESEND_API_KEY 추가
- **Variable name**: `RESEND_API_KEY`
- **Value**: `re_Ms3UnGiz_NiNc71xowQtBUyRrMNBX6ZGd`
- **Environment**: Production (체크)
- "Save" 클릭

#### BASE_URL 추가
- **Variable name**: `BASE_URL`
- **Value**: `https://g-dex-survey.pages.dev`
- **Environment**: Production (체크)
- "Save" 클릭

#### ADMIN_PASSWORD 추가 (선택사항)
- **Variable name**: `ADMIN_PASSWORD`
- **Value**: `gdax2026!`
- **Environment**: Production (체크)
- "Save" 클릭

### 5단계: 재배포
환경 변수를 추가한 후 다음 중 하나를 수행:
1. GitHub에 새로운 커밋을 푸시 (자동 재배포)
2. Cloudflare Dashboard에서 "View deployment" > "Manage deployment" > "Retry deployment"

### 6단계: 확인
1. https://g-dex-survey.pages.dev/survey 접속
2. 설문조사 작성 및 제출
3. 입력한 이메일로 리포트가 발송되는지 확인

## 현재 상태
- ✅ 로컬 개발 환경 변수: .dev.vars에 설정됨
- ❌ 프로덕션 환경 변수: Cloudflare Dashboard에서 설정 필요

## Resend API 키 정보
- 현재 API 키: `re_Ms3UnGiz_NiNc71xowQtBUyRrMNBX6ZGd`
- Resend 계정: https://resend.com/api-keys

## 문제 해결
환경 변수 설정 후에도 메일이 발송되지 않는다면:
1. Cloudflare Dashboard > g-dex-survey > Settings > Environment variables에서 변수가 올바르게 설정되었는지 확인
2. 최신 배포가 이루어졌는지 확인
3. Resend API 키가 유효한지 확인: https://resend.com/api-keys

## 보안 주의사항
- API 키는 절대 GitHub에 커밋하지 마세요
- .dev.vars 파일은 .gitignore에 포함되어 있어 커밋되지 않습니다
- 프로덕션 환경 변수는 Cloudflare Dashboard에서만 설정하세요
