# Resend 이메일 서비스 DNS 설정 요청서

## 📋 요청 개요

**발신**: G-DAX 산업일자리전환 진단 시스템 개발팀
**수신**: IT 관리자님
**제목**: ksa.or.kr 도메인 DNS 레코드 추가 요청 (Resend 이메일 서비스)

---

## 🎯 요청 목적

G-DAX 설문조사 시스템에서 진단 리포트를 이메일로 자동 발송하기 위해 Resend 이메일 발송 서비스를 사용하고 있습니다. 

현재 테스트 이메일만 발송 가능한 상태이며, 실제 사용자(기업 담당자)에게 이메일을 발송하기 위해서는 **ksa.or.kr 도메인을 Resend에 등록**하고 **DNS 레코드를 추가**해야 합니다.

---

## 📝 작업 절차

### 1단계: Resend에서 도메인 추가 (개발팀 작업)

**개발팀이 먼저 진행합니다**:

1. Resend Dashboard 접속: https://resend.com/domains
2. "Add Domain" 버튼 클릭
3. 도메인 입력: `ksa.or.kr`
4. DNS 레코드 정보 생성

**결과**: Resend가 추가할 DNS 레코드 정보를 제공합니다 (아래 예시 참고)

---

### 2단계: DNS 레코드 추가 (IT 담당자 작업)

**IT 담당자님께서 진행해주셔야 합니다**:

ksa.or.kr 도메인의 DNS 관리 콘솔에 접속하여 다음 레코드들을 추가해주세요.

#### 추가할 DNS 레코드 (예시)

**⚠️ 주의**: 아래는 예시이며, 실제 값은 Resend에서 제공하는 값을 사용해야 합니다.

---

#### (1) SPF 레코드 (TXT 레코드)

**발신 서버 인증용**

| 항목 | 값 |
|------|-----|
| 타입 | TXT |
| 호스트/이름 | @ (또는 ksa.or.kr) |
| 값 | `v=spf1 include:_spf.resend.com ~all` |
| TTL | 3600 (기본값) |

**설명**: 이 레코드는 Resend 서버가 ksa.or.kr 도메인으로 이메일을 발송할 수 있도록 허용합니다.

---

#### (2) DKIM 레코드 (CNAME 레코드)

**이메일 서명 인증용**

| 항목 | 값 |
|------|-----|
| 타입 | CNAME |
| 호스트/이름 | `resend._domainkey` |
| 값 | `resend._domainkey.resend.com` |
| TTL | 3600 (기본값) |

**설명**: 이 레코드는 이메일이 위조되지 않았음을 증명합니다.

---

#### (3) DMARC 레코드 (TXT 레코드)

**이메일 정책 설정용**

| 항목 | 값 |
|------|-----|
| 타입 | TXT |
| 호스트/이름 | `_dmarc` |
| 값 | `v=DMARC1; p=none; rua=mailto:dmarc@ksa.or.kr` |
| TTL | 3600 (기본값) |

**설명**: 이 레코드는 인증 실패 시 처리 방법을 정의합니다.

---

#### (4) MX 레코드 (선택사항)

**이메일 수신용 - 답장을 KSA로 받으려면 필요**

| 항목 | 값 |
|------|-----|
| 타입 | MX |
| 호스트/이름 | @ (또는 ksa.or.kr) |
| 값 | `feedback-smtp.resend.com` |
| 우선순위 | 10 |
| TTL | 3600 (기본값) |

**설명**: 이 레코드는 사용자가 답장한 이메일을 Resend를 통해 수신할 수 있게 합니다.

---

### 3단계: DNS 전파 대기

**DNS 레코드 추가 후**:
- DNS 전파 시간: 보통 5분~1시간
- 최대 24시간까지 소요 가능
- 전파 확인: https://dnschecker.org

---

### 4단계: Resend에서 도메인 검증 (개발팀 작업)

**IT 담당자님이 DNS 레코드 추가를 완료하시면**:

1. 개발팀에 완료 통보
2. 개발팀이 Resend Dashboard에서 "Verify" 버튼 클릭
3. 검증 성공 시 즉시 사용 가능

---

## 🔍 DNS 레코드 추가 방법 (DNS 제공업체별)

### AWS Route 53

```
1. Route 53 콘솔 접속
2. Hosted zones → ksa.or.kr 선택
3. "Create record" 클릭
4. 각 레코드 타입과 값 입력
5. "Create records" 클릭
```

### Cloudflare

```
1. Cloudflare Dashboard 접속
2. ksa.or.kr 도메인 선택
3. DNS 탭 클릭
4. "Add record" 버튼
5. 각 레코드 입력
6. "Save" 클릭
```

### 가비아 (Gabia)

```
1. 가비아 My가비아 로그인
2. 서비스 관리 → 도메인
3. ksa.or.kr 선택 → DNS 정보 관리
4. 레코드 추가
5. 저장
```

### 카페24

```
1. 카페24 호스팅 관리
2. 도메인 관리
3. ksa.or.kr DNS 설정
4. 레코드 추가
```

---

## ⚠️ 중요 주의사항

### 기존 레코드 확인

**DNS 레코드 추가 전 반드시 확인**:

1. **기존 SPF 레코드 확인**
   - 이미 SPF 레코드가 있다면 덮어쓰지 말고 **병합**해야 합니다
   - 예: `v=spf1 include:_spf.google.com include:_spf.resend.com ~all`

2. **기존 MX 레코드 확인**
   - 이미 이메일 서버가 있다면 기존 MX 레코드를 유지하고 추가합니다
   - 우선순위 값으로 순서 조정 가능

3. **DMARC 정책 확인**
   - 기존 DMARC 레코드가 있다면 정책 충돌 방지

---

### 서비스 영향도

**걱정하지 마세요**:

- ✅ 기존 이메일 수신: 영향 없음 (MX 레코드를 변경하지 않는 한)
- ✅ 웹사이트: 영향 없음
- ✅ 기존 서비스: 영향 없음
- ⚠️ SPF 레코드 잘못 설정 시: 발신 이메일이 스팸으로 분류될 수 있음

---

## 🧪 테스트 및 검증

### DNS 레코드 추가 후 확인

**1. DNS 전파 확인**:
```
https://dnschecker.org
→ ksa.or.kr 입력
→ TXT 레코드 확인
```

**2. SPF 레코드 확인**:
```bash
nslookup -type=TXT ksa.or.kr
# 또는
dig TXT ksa.or.kr
```

**3. DKIM 레코드 확인**:
```bash
nslookup -type=CNAME resend._domainkey.ksa.or.kr
# 또는
dig CNAME resend._domainkey.ksa.or.kr
```

---

## 📞 지원 정보

### 개발팀 연락처

- **담당자**: [담당자명]
- **이메일**: [이메일]
- **전화**: [전화번호]

### Resend 지원

- **문서**: https://resend.com/docs/dashboard/domains/introduction
- **지원**: https://resend.com/support

---

## 📋 체크리스트

**IT 담당자님 작업 체크리스트**:

- [ ] DNS 관리 콘솔 접속
- [ ] 기존 SPF/MX/DMARC 레코드 확인
- [ ] SPF 레코드 추가 (TXT)
- [ ] DKIM 레코드 추가 (CNAME)
- [ ] DMARC 레코드 추가 (TXT)
- [ ] MX 레코드 추가 (선택사항)
- [ ] DNS 전파 대기 (5분~1시간)
- [ ] 개발팀에 완료 통보
- [ ] 테스트 이메일 수신 확인

---

## 🎯 기대 효과

DNS 레코드 추가 완료 후:

1. **모든 이메일 주소로 발송 가능**
   - Gmail, Naver, Daum 등 제한 없음
   - 개별 검증 불필요

2. **발신자 주소 개선**
   - 현재: `G-DAX 진단시스템 <onboarding@resend.dev>`
   - 변경 후: `G-DAX 진단시스템 <noreply@ksa.or.kr>`

3. **브랜드 신뢰도 향상**
   - KSA 공식 도메인으로 발송
   - 스팸 필터 통과율 향상

4. **운영 효율성**
   - 자동화된 이메일 발송
   - 수동 작업 불필요

---

## 📝 참고 문서

프로젝트 문서:
- **전체 가이드**: EMAIL_ISSUE_SOLUTION.md
- **즉시 테스트 방법**: IMMEDIATE_EMAIL_TEST.md
- **Reply-To 설정**: EMAIL_REPLY_TO_SETUP.md

Resend 공식 문서:
- **도메인 추가**: https://resend.com/docs/dashboard/domains/introduction
- **DNS 설정**: https://resend.com/docs/dashboard/domains/dns-records
- **검증**: https://resend.com/docs/dashboard/domains/verifying

---

## ❓ 자주 묻는 질문

**Q1: DNS 레코드 추가가 기존 서비스에 영향을 주나요?**
A: 아니요. 이메일 발송을 위한 추가 설정이며 기존 웹사이트나 이메일 수신에는 영향이 없습니다.

**Q2: 얼마나 오래 걸리나요?**
A: DNS 레코드 추가는 5-10분, DNS 전파는 5분~1시간 정도 소요됩니다.

**Q3: 실수로 잘못 설정하면 어떻게 되나요?**
A: Resend에서 검증이 실패하므로 이메일이 발송되지 않습니다. 기존 서비스는 영향 받지 않습니다.

**Q4: 나중에 제거할 수 있나요?**
A: 네, DNS 레코드를 삭제하면 즉시 제거됩니다.

**Q5: 비용이 발생하나요?**
A: 아니요. DNS 레코드 추가는 무료이며, Resend 무료 플랜(월 3,000통)으로 충분합니다.

---

**감사합니다!**

DNS 레코드 추가 작업을 도와주시면 G-DAX 시스템이 정상적으로 이메일을 발송할 수 있게 됩니다.

궁금하신 점이 있으시면 언제든지 연락 주세요.

---

**작성일**: 2026-02-10
**작성자**: G-DAX 개발팀
**프로젝트**: G-DAX 산업일자리전환 진단 시스템
