# 이메일 발송 기능 설정 가이드

## 📧 Resend API 키 발급

### 1. Resend 회원가입 및 로그인
1. https://resend.com 접속
2. 회원가입 또는 로그인
3. 무료 플랜: 월 3,000통 발송 가능

### 2. API 키 생성
1. 대시보드 접속
2. 좌측 메뉴에서 "API Keys" 클릭
3. "Create API Key" 버튼 클릭
4. 이름 입력 (예: "G-DAX Survey System")
5. 권한 선택: "Sending access" (Full Access 권장)
6. "Create" 버튼 클릭
7. **생성된 API 키 복사** (한 번만 표시됨!)

## 🔧 환경 변수 설정

### 로컬 개발 환경

1. `.dev.vars` 파일 수정:
```bash
# .dev.vars
RESEND_API_KEY=re_your_actual_api_key_here
BASE_URL=http://localhost:3000
```

2. **중요**: `.dev.vars` 파일은 절대 Git에 커밋하지 마세요!
   - 이미 `.gitignore`에 포함되어 있습니다.

### 프로덕션 환경 (Cloudflare Pages)

#### 방법 1: Wrangler CLI 사용

```bash
# Resend API Key 설정
npx wrangler pages secret put RESEND_API_KEY --project-name webapp
# 프롬프트에서 API 키 입력

# Base URL 설정 (배포 후 실제 URL로 변경)
npx wrangler pages secret put BASE_URL --project-name webapp
# 예: https://webapp.pages.dev
```

#### 방법 2: Cloudflare Dashboard 사용

1. Cloudflare 대시보드 접속
2. Pages → 프로젝트 선택
3. Settings → Environment variables
4. "Add variable" 클릭
5. 변수 추가:
   - Name: `RESEND_API_KEY`
   - Value: `re_your_actual_api_key_here`
   - Environment: `Production` 선택
6. 같은 방법으로 `BASE_URL` 추가
   - Value: `https://your-project.pages.dev`

## 📨 이메일 발송 기능 사용

### 1. 자동 발송 (설문 제출 시)
- 설문 제출 완료 시 자동으로 담당자 이메일로 발송
- 리포트 링크 포함
- 발송 실패해도 설문 제출은 성공 처리

### 2. 수동 재발송 (관리자 대시보드)
1. `/admin` 접속
2. 설문 목록에서 "발송" 또는 "재발송" 버튼 클릭
3. 확인 후 이메일 발송

### 3. 이메일 내용
- **제목**: [G-DAX] {회사명} 산업전환 진단 리포트가 완성되었습니다
- **내용**:
  - 진단 결과 요약
  - 리포트 확인 링크
  - 컨설팅 안내
  - 주관 기관 정보

## 🔍 테스트

### 로컬 환경 테스트

1. `.dev.vars` 파일에 실제 API 키 설정
2. 서버 재시작:
```bash
pm2 restart survey-system
```

3. 설문 작성 및 제출
4. 이메일 수신 확인

### API 키 확인

```bash
# 로컬
curl http://localhost:3000/api/stats

# 프로덕션
curl https://your-project.pages.dev/api/stats
```

## ⚠️ 주의사항

### Resend 발신 이메일 주소
- 기본: `onboarding@resend.dev` (Resend 제공)
- 커스텀 도메인 설정 시 변경 가능
- 프로덕션 환경에서는 커스텀 도메인 사용 권장

### 커스텀 도메인 설정 (선택사항)

1. Resend 대시보드에서 "Domains" 메뉴
2. "Add Domain" 클릭
3. 도메인 입력 (예: `gdax.co.kr`)
4. DNS 레코드 설정 (SPF, DKIM, DMARC)
5. 인증 완료 후 `src/index.tsx`에서 발신 주소 변경:
```typescript
from: 'G-DAX 진단시스템 <noreply@gdax.co.kr>'
```

### 무료 플랜 제한
- 월 3,000통
- 일일 100통
- 초과 시 유료 플랜 업그레이드 필요

## 🐛 문제 해결

### 이메일이 발송되지 않는 경우

1. **API 키 확인**
   ```bash
   # 환경 변수 확인
   echo $RESEND_API_KEY  # 로컬
   npx wrangler pages secret list --project-name webapp  # 프로덕션
   ```

2. **서버 로그 확인**
   ```bash
   pm2 logs survey-system --nostream
   ```

3. **Resend 대시보드 확인**
   - Emails 메뉴에서 발송 내역 확인
   - 에러 메시지 확인

### 스팸 폴더 확인
- 받은 이메일이 스팸 폴더로 분류될 수 있음
- 커스텀 도메인 설정 시 SPF/DKIM 레코드 설정 필수

### API 키 오류
```
Error: Missing API key
```
→ `.dev.vars` 파일 확인 및 서버 재시작

## 📚 추가 정보

- [Resend 공식 문서](https://resend.com/docs)
- [Resend API 레퍼런스](https://resend.com/docs/api-reference)
- [Cloudflare Pages 환경 변수](https://developers.cloudflare.com/pages/platform/environment-variables/)
