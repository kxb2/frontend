<div align="center">

<img src="https://raw.githubusercontent.com/kxb2/.github/main/profile/assets/genova-logo.png" width="120" alt="GeNova" />

# GeNova — Frontend

**시나리오 한 문단으로, 스토리보드 한 장까지**

[![LIVE](https://img.shields.io/badge/●_LIVE-GENOVA-1FCF6D?style=for-the-badge&labelColor=1A1230)](https://frontend-kxb-2.vercel.app)
[![BACKEND](https://img.shields.io/badge/BACKEND-REPO-7B3FE4?style=for-the-badge&logo=github&logoColor=white&labelColor=1A1230)](https://github.com/kxb2/backend)

`Next.js 16` · `React 19` · `TypeScript` · `Tailwind CSS 4` · `Konva`

</div>

---

## 로컬 실행

```bash
npm install
```

`.env.local`을 만들고 아래 값을 채웁니다.

| 변수 | 비고 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 주소 (로컬: `http://localhost:8080`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | 백엔드 `GOOGLE_CLIENT_ID`와 같은 값 |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (오픈그래프 이미지 절대경로 계산용, 없어도 로컬 실행엔 지장 없음) |

```bash
npm run dev
```

→ `http://localhost:3000`

---

## 스택 & 확정사항

- 배포: Vercel, `main` 브랜치 연동
- Next.js 16(App Router) + React 19
- Tailwind CSS v4 — `app/globals.css`의 `@theme`에 컬러·타이포 토큰이 정의돼 있고, 새 컴포넌트는 임의 값 대신 이 토큰을 씀
- 캔버스: Konva / react-konva
- 인증: 이메일 회원가입·로그인 + 구글 OAuth. accessToken은 메모리에만 보관, refreshToken은 "로그인 유지" 선택에 따라 local/sessionStorage에 보관

---

## 알려진 이슈

- `@react-pdf/renderer`가 `package.json`에 남아있음 — 클라이언트 PDF 생성 의존성 (미사용)
- `app/storyboard/image/imagegrid.tsx`, `imagecell.tsx` — 컷별 생성 컴포넌트 (미사용)

---

<div align="center">

더 자세한 아키텍처·이슈·인수인계 내용은 [조직 프로필 문서](https://github.com/kxb2/.github/blob/main/profile/README.md) 참고 · 머지된 PR은 [여기](https://github.com/kxb2/frontend/pulls?q=is%3Apr+is%3Aclosed)서 확인

</div>
