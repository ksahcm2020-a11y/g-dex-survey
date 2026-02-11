# Resend DNS 레코드 추가 가이드 (ksa.or.kr)

## 🚨 긴급: 이메일 발송을 위해 즉시 추가해야 할 DNS 레코드

**현재 상태**: 도메인은 Resend에 등록되었으나 DNS 검증이 완료되지 않아 **이메일 발송이 불가능**합니다.

---

## 📋 추가해야 할 DNS 레코드

IT 담당자님께서 **ksa.or.kr 도메인의 DNS 관리 콘솔**에 다음 3개의 레코드를 추가해주세요.

---

### 1️⃣ DKIM 레코드 (TXT)

**이메일 서명 인증용 - 가장 중요!**

| 항목 | 값 |
|------|-----|
| **타입** | TXT |
| **호스트/이름** | `resend._domainkey` |
| **값** | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDnSbYUxop7duZPDCnUU+pm60t/P6Hiy5gytpi2j3EPYGTw6rMlUjbeIGPqNVD/VSdYHefEVldb817B1oAvpAwKipBkUFRPMtWFUv6N/s7sV9UvOGDdOJnuwMk+w2CL1ihPf6iGU1gXeN036Vf33cPUTJRVdB1Mg5WIdZZRkldECQIDAQAB` |
| **TTL** | 3600 (또는 Auto) |

**중요**: 
- 값 전체를 정확히 복사해야 합니다 (공백 없이!)
- 타입은 반드시 **TXT**여야 합니다

---

### 2️⃣ SPF 레코드 (MX)

**발신 서버 인증용**

| 항목 | 값 |
|------|-----|
| **타입** | MX |
| **호스트/이름** | `send` |
| **값** | `feedback-smtp.ap-northeast-1.amazonses.com` |
| **우선순위** | 10 |
| **TTL** | 3600 (또는 Auto) |

---

### 3️⃣ SPF 레코드 (TXT)

**발신 서버 정책 설정**

| 항목 | 값 |
|------|-----|
| **타입** | TXT |
| **호스트/이름** | `send` |
| **값** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | 3600 (또는 Auto) |

---

## 📝 DNS 제공업체별 입력 방법

### 🔹 AWS Route 53

```
1. Route 53 콘솔 → Hosted zones → ksa.or.kr
2. "Create record" 클릭
3. 위 표의 내용 입력
4. "Create records" 저장
```

### 🔹 Cloudflare

```
1. Cloudflare Dashboard → ksa.or.kr
2. DNS 탭 → "Add record"
3. 위 표의 내용 입력
4. "Save" 클릭
```

### 🔹 가비아 (Gabia)

```
1. My가비아 → 서비스 관리 → 도메인
2. ksa.or.kr → DNS 정보 관리
3. 레코드 추가
4. 위 표의 내용 입력
5. 저장
```

### 🔹 카페24

```
1. 호스팅 관리 → 도메인 관리
2. ksa.or.kr → DNS 설정
3. 레코드 추가
4. 위 표의 내용 입력
```

---

## ⏱️ DNS 전파 시간

- **일반적**: 5분 ~ 1시간
- **최대**: 24시간
- **확인**: https://dnschecker.org 에서 `ksa.or.kr` 검색

---

## ✅ 검증 방법

DNS 레코드 추가 후 개발팀에서 다음 작업을 수행합니다:

1. Resend Dashboard 접속: https://resend.com/domains
2. ksa.or.kr 도메인 클릭
3. "Verify" 버튼 클릭
4. 검증 성공 시 즉시 이메일 발송 가능

---

## 🔍 현재 상태 확인

**도메인 ID**: `8ac903c3-4a24-437b-b958-3513a233154c`
**도메인 이름**: `ksa.or.kr`
**등록일**: 2026-02-11
**검증 상태**: ❌ **not_started** (DNS 레코드 미추가)
**발송 가능**: ❌ 불가능 (DNS 검증 필요)

---

## ⚠️ 주의사항

### 기존 레코드 확인

1. **기존 SPF 레코드가 있는 경우**:
   - 덮어쓰지 말고 병합해야 합니다
   - 예: `v=spf1 include:_spf.google.com include:amazonses.com ~all`

2. **기존 MX 레코드가 있는 경우**:
   - 기존 MX 레코드는 유지하고 새로운 MX 레코드를 추가합니다
   - 우선순위 값으로 순서를 조정할 수 있습니다

### 서비스 영향

- ✅ 웹사이트: 영향 없음
- ✅ 기존 이메일 수신: 영향 없음
- ✅ 다른 서비스: 영향 없음

---

## 📧 이메일 발송 설정 변경 완료

코드에서 다음과 같이 변경되었습니다:

### Before (이전):
```typescript
from: 'G-DAX 진단시스템 <onboarding@resend.dev>'
to: [data.contact_email]  // 사용자가 입력한 이메일
```

### After (현재):
```typescript
from: 'G-DAX 진단시스템 <ksawork02@ksa.or.kr>'
to: ['ksawork02@ksa.or.kr']  // 고정 수신 주소
```

**변경 사항**:
- ✅ 발신 주소: `ksawork02@ksa.or.kr`
- ✅ 수신 주소: `ksawork02@ksa.or.kr` (고정)
- ✅ 회신 주소: `ksawork02@ksa.or.kr`

**효과**:
- 모든 설문 제출 시 자동으로 `ksawork02@ksa.or.kr`로 진단 리포트가 발송됩니다
- 사용자가 입력한 이메일 주소는 무시되고, 항상 고정된 주소로만 발송됩니다

---

## 🚀 다음 단계

### 1. IT 담당자 작업 (긴급!)
- [ ] DNS 관리 콘솔 접속
- [ ] 위 3개 레코드 추가
- [ ] DNS 전파 대기 (5분~1시간)
- [ ] 개발팀에 완료 통보

### 2. 개발팀 작업 (IT 작업 완료 후)
- [ ] Resend에서 도메인 검증
- [ ] 테스트 이메일 발송
- [ ] `ksawork02@ksa.or.kr`로 수신 확인

### 3. 최종 확인
- [ ] 설문 제출: https://g-dex-survey.pages.dev/survey
- [ ] `ksawork02@ksa.or.kr` 메일함 확인
- [ ] 진단 리포트 이메일 수신 확인

---

## 📞 지원

DNS 레코드 추가에 문제가 있으시면:

1. **Resend 문서**: https://resend.com/docs/dashboard/domains/dns-records
2. **Resend 지원**: https://resend.com/support
3. **DNS 전파 확인**: https://dnschecker.org

---

## 📌 요약

**현재 문제**: DNS 레코드가 추가되지 않아 이메일 발송 불가
**해결 방법**: 위 3개 DNS 레코드를 ksa.or.kr에 추가
**소요 시간**: DNS 레코드 추가 5-10분 + 전파 대기 5분~1시간
**비용**: 무료
**영향도**: 기존 서비스에 영향 없음

DNS 레코드 추가 후 즉시 이메일 발송이 가능합니다! 🎉

---

**작성일**: 2026-02-11
**작성자**: G-DAX 개발팀
**도메인**: ksa.or.kr
**이메일**: ksawork02@ksa.or.kr
