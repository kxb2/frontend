# 유저 인증 연동 가이드 (프론트용)

이 문서는 백엔드에 새로 추가된 유저 인증 기능(이메일/구글 로그인, JWT)과, 그로 인해
**기존 API들이 어떻게 바뀌었는지**를 정리한 문서입니다. 이 파일만 있으면 백엔드 소스 없이도
연동 작업을 할 수 있도록 작성했습니다.

---

## 0. 제일 먼저 알아야 할 것 — 기존 API가 전부 인증 필요로 바뀜

지금까지 프론트에서 인증 없이 호출하던 아래 엔드포인트들이 **전부 로그인(Bearer 토큰) 필요**로 바뀌었습니다.

- `POST/GET/DELETE/PATCH /storyboards`, `/storyboards/{id}`, `/storyboards/{id}/prompt`
- `/storyboards/{id}/cuts/{cutId}/regeneration`, `/storyboards/{id}/exports/image`, `/storyboards/{id}/exports/pdf`
- `POST/GET/DELETE/PUT/PATCH /canvases`, `/canvases/{id}`, `/canvases/{id}/attachments`
- `GET /generations/{id}`, `GET /regenerations/{id}`, `GET /exports/{id}`

**모든 요청에 다음 헤더를 붙여야 합니다:**
```
Authorization: Bearer <accessToken>
```

붙이지 않으면 `401`, 만료/무효 토큰도 `401`이 납니다. 그리고 각 목록/조회는 이제
**"로그인한 본인이 만든 것"만** 보이고, **남이 만든 storyboardId/canvasId로 조회·삭제·수정 시도하면
403이 아니라 404**가 납니다(존재 여부 자체를 숨기는 보안 관례라 그렇습니다 — "권한 없음"과
"애초에 없음"을 구분하지 마세요).

---

## 1. 회원가입 / 로그인 API

### 1-1. 이메일 회원가입
```
POST /auth/register
```
요청 body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "nickname": "선택사항, 안 보내도 됨"
}
```
- `password`: 8자 이상, **72바이트 이하** (영문 기준 72자, 한글은 글자당 3바이트라 약 24자까지)
- `nickname`: 선택 — 프론트에서 안 쓰면 그냥 필드 자체를 안 보내면 됩니다(null로 저장됨)
- 이메일 중복이면 `409`

응답 (`201`):
```json
{
  "user": { "id": 1, "email": "user@example.com", "nickname": null, "role": "user", "createdAt": "2026-..." },
  "accessToken": "eyJ...",
  "refreshToken": "AbC123...",
  "tokenType": "bearer"
}
```

### 1-2. 이메일 로그인
```
POST /auth/login
```
요청: `{ "email": "...", "password": "..." }`
응답: 회원가입과 동일한 형태(`user`/`accessToken`/`refreshToken`). 실패 시 `401`.

### 1-3. 구글 로그인
```
POST /auth/google
```
요청: `{ "idToken": "구글에서 받은 id_token" }`

프론트 구현 방법:
1. [Google Identity Services(GIS)](https://developers.google.com/identity/gsi/web) 스크립트로 로그인 버튼 렌더링 (`client_id`는 백엔드에서 따로 전달받은 값 사용)
2. 로그인 콜백에서 `response.credential`(= id_token) 받기
3. 그 값을 그대로 `{ "idToken": response.credential }`로 이 엔드포인트에 POST

- 리다이렉트/인가코드 방식 아님 — 팝업/버튼으로 받은 id_token을 그대로 백엔드로 넘기기만 하면 됩니다.
- 응답 형태는 이메일 로그인과 동일(`user`/`accessToken`/`refreshToken`).
- 신규 유저면 자동 가입되고, 구글 프로필의 이름이 `nickname`에 자동으로 채워집니다.
- 이미 이메일로 가입된 계정과 구글 이메일이 같으면 자동으로 그 계정에 연결되어 로그인됩니다.

### 1-4. 토큰 갱신 (필수 구현!)
```
POST /auth/refresh
```
요청: `{ "refreshToken": "..." }`
응답: `{ "accessToken": "...", "refreshToken": "...", "tokenType": "bearer" }`

- **accessToken은 30분마다 만료됩니다.** 아무 API 호출에서 `401`이 뜨면, 이 엔드포인트로
  refresh부터 시도하고 → 새 토큰으로 원래 요청을 재시도하는 로직을 **반드시 넣어주세요**
  (안 그러면 사용자가 30분마다 로그아웃된 것처럼 느낍니다).
- refresh할 때마다 refreshToken도 새로 발급됩니다(로테이션) — 매번 새로 받은 값으로 저장값을 갱신하세요.
- 이전 refreshToken은 그 즉시 무효화됩니다. refresh 자체가 `401`이면 그때는 진짜 로그인 화면으로 보내주세요.

### 1-5. 로그아웃
```
POST /auth/logout
```
요청: `{ "refreshToken": "..." }` → `204` (토큰 없거나 이미 무효해도 항상 204)

### 1-6. 내 정보 조회
```
GET /auth/me
```
헤더에 `Authorization: Bearer <accessToken>`만 있으면 됨. 응답은 `user` 객체 형태 그대로.

---

## 2. 토큰 저장/사용 방식

- `accessToken`/`refreshToken` 둘 다 응답 **JSON body**로 내려줍니다(쿠키 아님) — 프론트에서
  원하는 방식으로 저장(메모리, localStorage 등)하시면 됩니다.
- API 호출 시 `Authorization: Bearer <accessToken>` 헤더 필수.

---

## 3. 새로 추가된 API — 제목 수정

스토리보드/캔버스 둘 다 제목만 따로 수정하는 API가 생겼습니다.

```
PATCH /storyboards/{storyboardId}
PATCH /canvases/{canvasId}
```
요청: `{ "title": "새 제목" }`
- 1~200자, 빈 문자열/공백만 있는 문자열은 `422`
- 응답: `{ "id": 1, "title": "새 제목" }`
- 남의 것이면 `404`

---

## 4. 에러 응답 형태

- 일반 에러(400/401/404/409): `{ "detail": "에러 메시지" }`
- 유효성 검증 실패(422, pydantic): `{ "detail": [{ "type": "...", "loc": [...], "msg": "..." }, ...] }`
  형태로 다르게 옵니다 — 단순 문자열이 아니라 배열이니 파싱 시 주의하세요.
- 로그인/토큰 검증 관련 401 응답(`/auth/login`, `/auth/refresh`, 그리고 토큰 필요한 모든 API)엔
  `WWW-Authenticate: Bearer` 헤더가 같이 옵니다. 단, `/auth/google`의 401(유효하지 않은 구글
  토큰)은 예외로 이 헤더가 없습니다 — 이 엔드포인트는 Bearer 토큰이 아니라 body로 구글 토큰을
  받는 로그인 엔드포인트라 애초에 해당 사항이 아니라서 그렇습니다.

---

## 5. 기타 참고

- `role` 필드(`user`/`admin`)는 있지만 지금은 전부 `user`로만 가입됩니다(admin 가입 경로 없음) — 신경 안 쓰셔도 됩니다.
- 비밀번호 변경/재설정, 이메일 인증 메일 같은 기능은 이번 스코프에 없습니다.
- 스토리보드/캔버스 목록(`GET /storyboards`, `GET /canvases`)은 이제 로그인한 사람 것만 나오니,
  "전체 갤러리처럼 보여주는" 화면이 있었다면 그 개념 자체가 없어진 셈입니다 — 필요하면 알려주세요.
