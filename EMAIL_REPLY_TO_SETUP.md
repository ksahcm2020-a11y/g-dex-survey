# Reply-To 주소 설정 완료

## ✅ 설정 완료 사항

**Reply-To 주소가 `ksawork02@ksa.or.kr`로 설정되었습니다.**

### 📧 이메일 헤더 구성

이제 발송되는 모든 이메일은 다음과 같이 구성됩니다:

| 필드 | 주소 | 설명 |
|------|------|------|
| **From** (발신자) | `G-DAX 진단시스템 <onboarding@resend.dev>` | 실제 발송 주소 (Resend 기본) |
| **Reply-To** (회신 주소) | `ksawork02@ksa.or.kr` | 수신자가 답장할 때 사용되는 주소 |
| **To** (수신자) | `{사용자 이메일}` | 설문 제출 시 입력한 이메일 |

### 🔄 작동 방식

1. **발송**: `onboarding@resend.dev`에서 발송
2. **수신**: 사용자 이메일로 도착
3. **답장**: 사용자가 "답장" 버튼 클릭
4. **회신 주소**: 자동으로 `ksawork02@ksa.or.kr`로 설정됨

### 📋 사용자 경험

**수신자가 보는 내용**:
```
발신자: G-DAX 진단시스템 <onboarding@resend.dev>
제목: [G-DAX] {회사명} 산업전환 진단 리포트가 완성되었습니다
```

**답장 버튼 클릭 시**:
```
받는 사람: ksawork02@ksa.or.kr
제목: Re: [G-DAX] {회사명} 산업전환 진단 리포트가 완성되었습니다
```

### ⚠️ 중요 참고사항

#### Reply-To vs From의 차이

**From 주소를 변경하려면** (예: `noreply@ksa.or.kr`):
- KSA 도메인을 Resend에 등록해야 함
- DNS 레코드 설정 필요 (TXT, MX, DMARC)
- IT 관리자 협조 필요

**Reply-To 주소 (현재 방식)**:
- ✅ 즉시 사용 가능
- ✅ DNS 설정 불필요
- ✅ 사용자 답장은 KSA 이메일로 수신
- ⚠️ 발신자는 여전히 Resend로 표시됨

### 🎯 권장 사용 시나리오

**Reply-To 방식이 적합한 경우**:
- 빠른 배포가 필요한 경우
- DNS 설정 권한이 없는 경우
- 사용자 답장만 KSA로 받으면 되는 경우

**커스텀 도메인이 필요한 경우**:
- 완전한 브랜드 일관성이 필요한 경우
- 발신자도 KSA 주소로 표시되어야 하는 경우
- 대규모 이메일 캠페인인 경우

### 🧪 테스트 방법

#### 1. 설문 제출
```
https://g-dex-survey.pages.dev/survey 접속
설문 작성 및 제출
이메일 주소: delivered@resend.dev (테스트용)
```

#### 2. 이메일 확인
Resend Dashboard에서 확인:
```
https://resend.com/emails
→ 최신 이메일 클릭
→ "View Raw" 클릭
→ Reply-To 헤더 확인
```

#### 3. 답장 테스트
실제 이메일 클라이언트에서:
```
delivered@resend.dev로 발송된 이메일 확인
답장 버튼 클릭
받는 사람이 ksawork02@ksa.or.kr인지 확인
```

### 📊 적용 위치

Reply-To 주소가 적용된 코드 위치:

1. **설문 제출 시 자동 발송** (`src/index.tsx` 127줄)
   ```typescript
   reply_to: ['ksawork02@ksa.or.kr']
   ```

2. **관리자 대시보드 재발송** (`src/index.tsx` 745줄)
   ```typescript
   reply_to: ['ksawork02@ksa.or.kr']
   ```

### 🔍 문제 해결

**Q1: Reply-To가 작동하지 않는 경우**
- 이메일 클라이언트가 Reply-To 헤더를 지원하는지 확인
- 대부분의 현대적인 이메일 클라이언트는 지원함
- Gmail, Outlook, Apple Mail 모두 지원

**Q2: 발신자를 KSA로 변경하고 싶은 경우**
- `EMAIL_ISSUE_SOLUTION.md`의 "옵션 2: 커스텀 도메인 연결" 참고
- IT 관리자와 DNS 설정 협의 필요

**Q3: 여러 개의 회신 주소가 필요한 경우**
- Reply-To 배열에 여러 주소 추가 가능:
  ```typescript
  reply_to: ['ksawork02@ksa.or.kr', 'support@ksa.or.kr']
  ```

### 📝 배포 정보

- **배포 일시**: 2026-02-10
- **배포 상태**: ✅ 완료
- **프로덕션 URL**: https://g-dex-survey.pages.dev
- **GitHub 커밋**: "feat: Add reply-to address (ksawork02@ksa.or.kr) for email responses"

### 🔗 관련 문서

- **이메일 문제 해결**: `EMAIL_ISSUE_SOLUTION.md`
- **환경 변수 설정**: `CLOUDFLARE_ENV_SETUP.md`
- **프로젝트 README**: `README.md`

---

**요약**: 
- ✅ Reply-To가 `ksawork02@ksa.or.kr`로 설정됨
- ✅ DNS 설정 없이 즉시 사용 가능
- ✅ 사용자 답장은 KSA 이메일로 수신됨
- ℹ️ 발신자는 Resend로 표시되지만 답장은 KSA로 도착함
