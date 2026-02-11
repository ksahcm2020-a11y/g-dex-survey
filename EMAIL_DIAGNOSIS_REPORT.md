# 이메일 발송 문제 진단 보고서

## 📊 진단 결과

**진단일시**: 2026-02-11  
**시스템**: G-DAX 산업일자리전환 진단 시스템  
**문제**: 이메일 발송 불가  

---

## ✅ 완료된 작업

### 1. 도메인 등록
- ✅ **ksa.or.kr** 도메인이 Resend에 등록되었습니다
- 도메인 ID: `8ac903c3-4a24-437b-b958-3513a233154c`
- 등록일: 2026-02-11 00:38:37
- 지역: ap-northeast-1 (서울)

### 2. 코드 수정 완료
- ✅ **발신 주소**: `ksawork02@ksa.or.kr`
- ✅ **수신 주소**: `ksawork02@ksa.or.kr` (고정)
- ✅ **회신 주소**: `ksawork02@ksa.or.kr`
- ✅ GitHub 저장소에 push 완료
- ✅ Cloudflare Pages에 배포 완료

### 3. 환경 변수 확인
- ✅ RESEND_API_KEY: 설정됨 (36자)
- ✅ BASE_URL: https://g-dex-survey.pages.dev
- ✅ ADMIN_PASSWORD: 설정됨

---

## ❌ 현재 문제

### DNS 검증 미완료

**문제 원인**: DNS 레코드가 추가되지 않아 Resend가 도메인 검증을 완료하지 못했습니다.

**현재 상태**:
```
도메인 검증 상태: not_started ❌
발송 가능 여부: 불가능 ❌
```

**영향**:
- `ksawork02@ksa.or.kr`로 이메일을 발송하려고 하면 Resend가 차단합니다
- Resend는 검증되지 않은 도메인에서의 발송을 허용하지 않습니다
- 현재는 `onboarding@resend.dev`로만 발송 가능합니다

---

## 🔧 해결 방법

### 즉시 조치사항: DNS 레코드 추가

IT 담당자님께서 ksa.or.kr 도메인의 DNS 관리 콘솔에 **다음 3개 레코드를 추가**해주셔야 합니다.

---

#### 1️⃣ DKIM 레코드 (TXT) - 가장 중요!

| 항목 | 값 |
|------|-----|
| **타입** | TXT |
| **호스트** | `resend._domainkey` |
| **값** | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDnSbYUxop7duZPDCnUU+pm60t/P6Hiy5gytpi2j3EPYGTw6rMlUjbeIGPqNVD/VSdYHefEVldb817B1oAvpAwKipBkUFRPMtWFUv6N/s7sV9UvOGDdOJnuwMk+w2CL1ihPf6iGU1gXeN036Vf33cPUTJRVdB1Mg5WIdZZRkldECQIDAQAB` |
| **TTL** | 3600 |

---

#### 2️⃣ SPF 레코드 (MX)

| 항목 | 값 |
|------|-----|
| **타입** | MX |
| **호스트** | `send` |
| **값** | `feedback-smtp.ap-northeast-1.amazonses.com` |
| **우선순위** | 10 |
| **TTL** | 3600 |

---

#### 3️⃣ SPF 레코드 (TXT)

| 항목 | 값 |
|------|-----|
| **타입** | TXT |
| **호스트** | `send` |
| **값** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | 3600 |

---

## 📝 DNS 제공업체별 가이드

### AWS Route 53
```
1. Route 53 콘솔 → Hosted zones → ksa.or.kr
2. "Create record" 클릭
3. 위 표의 내용 입력
4. "Create records" 저장
```

### Cloudflare
```
1. Cloudflare Dashboard → ksa.or.kr
2. DNS 탭 → "Add record"
3. 위 표의 내용 입력
4. "Save" 클릭
```

### 가비아 (Gabia)
```
1. My가비아 → 서비스 관리 → 도메인
2. ksa.or.kr → DNS 정보 관리
3. 레코드 추가
4. 위 표의 내용 입력
5. 저장
```

---

## ⏱️ 예상 소요 시간

| 작업 | 소요 시간 |
|------|----------|
| DNS 레코드 추가 | 5-10분 |
| DNS 전파 | 5분 ~ 1시간 |
| Resend 도메인 검증 | 1분 |
| **총 소요 시간** | **15분 ~ 1.5시간** |

---

## 🧪 검증 절차

### DNS 레코드 추가 후

1. **DNS 전파 확인**:
   - https://dnschecker.org
   - `ksa.or.kr` 입력
   - TXT 레코드 확인

2. **Resend 도메인 검증**:
   - https://resend.com/domains
   - ksa.or.kr 클릭
   - "Verify" 버튼 클릭
   - 검증 성공 확인

3. **테스트 이메일 발송**:
   ```bash
   # 설문 제출
   https://g-dex-survey.pages.dev/survey
   
   # ksawork02@ksa.or.kr 메일함 확인
   ```

---

## 📧 이메일 발송 흐름

### DNS 검증 전 (현재)
```
설문 제출 → 코드 실행 → Resend 발송 시도
                         ↓
                      ❌ 차단됨
                      (도메인 미검증)
```

### DNS 검증 후 (목표)
```
설문 제출 → 코드 실행 → Resend 발송
                         ↓
                      ✅ 발송 성공
                      ↓
           ksawork02@ksa.or.kr 수신
```

---

## 🎯 변경된 이메일 설정

### Before (과거)
```typescript
from: 'G-DAX 진단시스템 <onboarding@resend.dev>'
to: [data.contact_email]  // 사용자 입력 이메일
reply_to: ['ksawork02@ksa.or.kr']
```

### After (현재)
```typescript
from: 'G-DAX 진단시스템 <ksawork02@ksa.or.kr>'
to: ['ksawork02@ksa.or.kr']  // 고정된 수신 주소
reply_to: ['ksawork02@ksa.or.kr']
```

**효과**:
- 모든 설문 제출 알림이 `ksawork02@ksa.or.kr`로만 전송됩니다
- 사용자가 설문에서 입력한 이메일 주소는 무시됩니다
- 필요 시 사용자에게 별도로 연락하는 방식으로 운영

---

## ⚠️ 중요 주의사항

### 기존 레코드 확인 필수

**1. 기존 SPF 레코드가 있는 경우**:
- ❌ 덮어쓰지 마세요!
- ✅ 병합해야 합니다
- 예: `v=spf1 include:_spf.google.com include:amazonses.com ~all`

**2. 기존 MX 레코드가 있는 경우**:
- ❌ 삭제하지 마세요!
- ✅ 기존 MX 유지하고 새 MX 추가
- 우선순위로 순서 조정

**3. 서비스 영향도**:
- ✅ 웹사이트: 영향 없음
- ✅ 기존 이메일 수신: 영향 없음
- ✅ 다른 서비스: 영향 없음

---

## 📚 참고 문서

### 프로젝트 문서
- **DNS 레코드 가이드**: `RESEND_DNS_RECORDS.md`
- **IT 담당자 요청서**: `DNS_SETUP_REQUEST_FOR_IT.md`
- **이메일 문제 해결**: `EMAIL_ISSUE_SOLUTION.md`
- **즉시 테스트 방법**: `IMMEDIATE_EMAIL_TEST.md`

### Resend 공식 문서
- **도메인 추가**: https://resend.com/docs/dashboard/domains/introduction
- **DNS 설정**: https://resend.com/docs/dashboard/domains/dns-records
- **검증 가이드**: https://resend.com/docs/dashboard/domains/verifying

### 유용한 도구
- **DNS 전파 확인**: https://dnschecker.org
- **Resend Dashboard**: https://resend.com/domains
- **설문 페이지**: https://g-dex-survey.pages.dev/survey

---

## 📋 체크리스트

### IT 담당자 작업
- [ ] DNS 관리 콘솔 접속
- [ ] 기존 SPF/MX 레코드 확인
- [ ] DKIM 레코드 추가 (TXT)
- [ ] SPF 레코드 추가 (MX)
- [ ] SPF 레코드 추가 (TXT)
- [ ] DNS 전파 대기 (5분~1시간)
- [ ] 개발팀에 완료 통보

### 개발팀 작업 (IT 완료 후)
- [x] 코드 수정 완료
- [x] GitHub push 완료
- [x] Cloudflare 배포 완료
- [ ] Resend 도메인 검증
- [ ] 테스트 이메일 발송
- [ ] 수신 확인

### 최종 확인
- [ ] DNS 레코드 전파 확인
- [ ] Resend 도메인 검증 성공
- [ ] 설문 제출 테스트
- [ ] ksawork02@ksa.or.kr 수신 확인

---

## 🚀 다음 단계

### 1. 즉시 (IT 담당자)
DNS 레코드 3개를 ksa.or.kr 도메인에 추가해주세요.
- DKIM (TXT)
- SPF (MX)
- SPF (TXT)

### 2. 대기 (5분~1시간)
DNS 전파를 기다립니다.
- https://dnschecker.org 에서 확인

### 3. 검증 (개발팀)
Resend에서 도메인 검증을 수행합니다.
- https://resend.com/domains → ksa.or.kr → Verify

### 4. 테스트
실제 설문 제출로 이메일 수신을 확인합니다.
- https://g-dex-survey.pages.dev/survey
- ksawork02@ksa.or.kr 메일함 확인

---

## 📞 문의

DNS 레코드 추가 또는 검증에 문제가 있으시면:

1. **개발팀 문서**: 프로젝트의 MD 파일 참고
2. **Resend 지원**: https://resend.com/support
3. **DNS 전파 확인**: https://dnschecker.org

---

## 📌 요약

**현재 상태**:
- ✅ 도메인 등록됨
- ✅ 코드 수정 완료
- ✅ 배포 완료
- ❌ DNS 검증 미완료 ← **이것 때문에 이메일 발송 안됨**

**해결 방법**:
DNS 레코드 3개를 ksa.or.kr에 추가하면 즉시 해결됩니다!

**예상 소요 시간**:
15분 ~ 1.5시간

**비용**:
무료

**영향도**:
기존 서비스에 영향 없음

---

**작성일**: 2026-02-11  
**작성자**: G-DAX 개발팀  
**도메인**: ksa.or.kr  
**이메일**: ksawork02@ksa.or.kr  
**프로젝트**: G-DAX 산업일자리전환 진단 시스템  
