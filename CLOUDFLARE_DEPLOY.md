# Cloudflare Pages 자동 배포 설정

## 빌드 설정
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js version**: 22 (.nvmrc 파일에 지정됨)

## 필요한 환경 변수
Cloudflare Pages 대시보드에서 Settings → Environment variables에 추가:

```
ADMIN_PASSWORD=gdax2026!
RESEND_API_KEY=re_Ms3UnGiz_NiNc71xowQtBUyRrMNBX6ZGd
BASE_URL=https://webapp.pages.dev
```

## D1 데이터베이스 바인딩
Settings → Functions → D1 database bindings:
- Variable name: `DB`
- D1 database: `webapp-production` 선택
