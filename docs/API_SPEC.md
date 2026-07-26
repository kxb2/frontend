# API 명세

> 2026-07-09 회의 결정: "스토리보드 생성"과 "9컷 생성 요청"은 프론트에서 하나의 버튼(스토리보드 생성) 클릭으로 발생하는 동작이라 `POST /storyboards` 하나로 통합한다. 조회(GET)는 기존대로 스토리보드/생성 결과를 분리해서 각자 유지한다.
>
> 2026-07-26 업데이트: 유저 인증(이메일/구글 로그인, JWT) 기능이 추가되면서 아래 표의 `/storyboards`, `/canvases`, `/generations`, `/regenerations`, `/exports` 전 엔드포인트가 **로그인 필요**로 바뀌었습니다. 프론트 연동 상세는 [FRONTEND_USER_AUTH_GUIDE.md] 참고.

## 0. 공통 사항

- **인증**: `/auth/*`, `/health`를 제외한 모든 엔드포인트는 헤더에 `Authorization: Bearer <accessToken>`이 필요합니다. 없거나 만료/무효하면 `401`(+ `WWW-Authenticate: Bearer` 헤더).
- **소유권**: 목록/조회/수정/삭제는 전부 "로그인한 본인이 만든 것"만 대상입니다. 남의 storyboardId/canvasId/generationId 등으로 접근하면 `403`이 아니라 **`404`**로 응답합니다(존재 여부 자체를 숨기는 정책).
- **JSON 필드명**: 모든 요청/응답 JSON은 camelCase입니다(내부 구현은 snake_case, `CamelModel`이 자동 변환). 단, 스토리보드 생성(`POST /storyboards`)만 `multipart/form-data`라 폼 필드명은 snake_case 그대로입니다.
- **에러 응답 형태**:
  - 일반 에러(400/401/404/409): `{ "detail": "에러 메시지" }`
  - 유효성 검증 실패(422, pydantic): `{ "detail": [{ "type": "...", "loc": [...], "msg": "..." }, ...] }` — 배열 형태.

**공통 status 값** (`generations` / `regenerations` / `exports` 조회 응답에 공통 적용 — 백로그 "대기/생성/완료/실패"와 매핑)

| status 값 | 의미 |
|---|---|
| `pending` | 대기 — job은 등록됐지만 아직 처리 시작 전 |
| `processing` | 생성 중 — AI 호출(이미지/프롬프트 모델) 진행 중 |
| `completed` | 완료 — 결과(이미지·프롬프트·다운로드 링크 등) 조회 가능 |
| `failed` | 실패 — 실패 사유와 함께 재시도 필요 |

## 1. 인증 (Auth) — 인증 불필요

| 기능 | Method | URL | 설명 |
|---|---|---|---|
| 이메일 회원가입 | POST | `/auth/register` | `email`, `password`(8자 이상, UTF-8 72바이트 이하), `passwordConfirm`, `nickname`(선택). 이메일 중복 시 `409`. 응답(`201`): `{ user, accessToken, refreshToken, tokenType }` |
| 이메일 로그인 | POST | `/auth/login` | `email`, `password`. 실패 시 `401`. 응답: 회원가입과 동일 형태 |
| 구글 로그인 | POST | `/auth/google` | `{ idToken }`(Google Identity Services에서 받은 id_token). 신규 유저면 자동 가입(닉네임은 구글 프로필 이름), 기존 이메일과 같으면 자동 연결. 유효하지 않은 토큰이면 `401`(단, 이 401엔 `WWW-Authenticate` 헤더 없음). 응답: 이메일 로그인과 동일 형태 |
| 토큰 갱신 | POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken, tokenType }`. accessToken은 30분 만료. refresh할 때마다 refreshToken도 로테이션(이전 토큰은 즉시 무효화)됨. 만료/무효 시 `401` |
| 로그아웃 | POST | `/auth/logout` | `{ refreshToken }` → `204`(토큰이 없거나 이미 무효해도 항상 204) |
| 내 정보 조회 | GET | `/auth/me` | Bearer 토큰 필요. 응답: `{ id, email, nickname, role, createdAt }`(`role`은 현재 전부 `"user"`, admin 가입 경로 없음) |

## 2. 스토리보드

| 기능 | Method | Param | URL | 설명 |
|---|---|---|---|---|
| 스토리보드 생성 + 9컷 생성 요청 | POST | - | `/storyboards` | `multipart/form-data`. 필드: `scenario_text`(필수), `genre`(필수, 드라마/액션/로맨스/스릴러/코미디), `style`/`tone`/`aspect_ratio`/`era`(선택), `image_model`(`gpt_image`\|`gemini_3_1_flash_image`, 기본 `gpt_image`), `generation_mode`(`per_cut`\|`single_image`, 기본 `per_cut` — 컷별로 각각 생성할지 한 장의 3×3 그리드 이미지로 한 번에 생성할지), `reference_images`(0~10장 초과 시 `400`, jpeg/png/webp만 허용, 장당 최대 10MB, 서버에서 긴 변 1024px로 자동 축소). 응답(`201`): `{ storyboardId, generationId, title, status: "pending", generationMode }` |
| 스토리보드 전체목록 조회 | GET | - | `/storyboards` | 본인 것만, 요약 정보(`id`, `title`, `genre`, `status`, `generationMode`, `createdAt`, `updatedAt`)로 조회. 최신 수정순, 기본 100개(최대 500개, `limit` 쿼리 파라미터) |
| 스토리보드 조회 | GET | storyboardId | `/storyboards/{storyboardId}` | 저장된 스토리보드 입력값, 레퍼런스 이미지, 생성 결과(`generation`)를 함께 조회 |
| 스토리보드 제목 수정 | PATCH | storyboardId | `/storyboards/{storyboardId}` | `{ title }`(1~200자, 공백만 있는 문자열은 `422`) → `{ id, title }` |
| 스토리보드 삭제 | DELETE | storyboardId | `/storyboards/{storyboardId}` | 스토리보드를 삭제합니다. 관련 R2 파일(레퍼런스 이미지, 컷 이미지, 그리드, export)도 함께 정리됩니다. 진행 중인 생성/재생성/Export 작업이 있으면 삭제가 거부됩니다(409) |
| 프롬프트 조회 | GET | storyboardId | `/storyboards/{storyboardId}/prompt` | 생성된 통합 프롬프트(Shot 1~9 구분 포함, 영어 고정)를 조회합니다 |

## 3. 생성 / 재생성

| 기능 | Method | Param | URL | 설명 |
|---|---|---|---|---|
| 9컷 생성 상태/결과 조회 | GET | generationId | `/generations/{generationId}` | 9컷 생성 진행 상태(status)를 조회하고, `completed`면 결과(그리드 이미지, 컷 목록)를 함께 반환합니다 |
| 특정 컷 재생성 | POST | storyboardId, cutId | `/storyboards/{storyboardId}/cuts/{cutId}/regeneration` | 특정 컷 1개만 재생성합니다(현재 선택된 이미지 모델로만 수행). `generation_mode`가 `single_image`인 스토리보드는 지원 안 함(`400`). 응답(`201`): `{ regenerationId, status: "pending" }` |
| 재생성 결과 확인 | GET | regenerationId | `/regenerations/{regenerationId}` | 특정 컷 재생성 작업의 진행 상태(status)와 결과를 조회합니다 |

## 4. 캔버스

| 기능 | Method | Param | URL | 설명 |
|---|---|---|---|---|
| 캔버스 생성 | POST | - | `/canvases` | `{ storyboardId }`(선택) — 빈 캔버스를 새로 생성합니다. storyboard와 무관하게 독립적으로 생성 가능. 응답(`201`): `{ canvasId, title }` |
| 캔버스 목록조회 | GET | - | `/canvases` | 본인 것만, 요약 정보(`id`, `title`, `storyboardId`, `createdAt`, `updatedAt`)로 조회. 최신 수정순, 기본 100개(최대 500개, `limit` 쿼리 파라미터) |
| 캔버스 조회 | GET | canvasId | `/canvases/{canvasId}` | 생성된 컷과 프롬프트의 캔버스 배치 정보(`elements`, `connections`)를 조회합니다 |
| 캔버스 제목 수정 | PATCH | canvasId | `/canvases/{canvasId}` | `{ title }`(1~200자, 공백만 있는 문자열은 `422`) → `{ id, title }` |
| 캔버스 저장 | PUT | canvasId | `/canvases/{canvasId}` | `{ storyboardId, elements, connections }` — 캔버스 요소·연결 전체를 요청 내용으로 교체 저장합니다(전체 교체 방식). 요소는 `clientKey`로 식별되고, 응답에서 실제 DB id로 매핑되어 돌아옵니다. `parentClientKey`로 요소 간 그룹핑(부모-자식) 지정 가능. `IMAGE`/`MEMO` 타입만 `storyboardId`/`cutId` 참조 가능(이 캔버스에 연결된 스토리보드 소속만 허용, 아니면 `400`). `clientKey`/`parentClientKey` 중복/미존재 참조/순환 참조도 `400` |
| 캔버스 이미지/영상 업로드 | POST | canvasId | `/canvases/{canvasId}/attachments` | `multipart/form-data`. `file`(필수), `thumbnail`(선택, 영상일 때 프론트가 만든 썸네일). 이미지는 jpeg/png/webp만, 최대 10MB / 영상은 mp4·webm·mov(quicktime)만, 최대 50MB — 형식·용량 위반 시 `400`. 파일을 R2에 업로드하고 url만 반환(요소로 저장하려면 이후 캔버스 저장 PUT에 포함해서 호출). 응답(`201`): `{ contentUrl, thumbnailUrl, type }` |
| 캔버스 삭제 | DELETE | canvasId | `/canvases/{canvasId}` | 캔버스를 삭제합니다. 캔버스가 소유한 첨부 이미지/영상(R2)도 함께 정리됩니다 |

## 5. Export

| 기능 | Method | Param | URL | 설명 |
|---|---|---|---|---|
| PDF Export | POST | storyboardId | `/storyboards/{storyboardId}/exports/pdf` | 이미지와 프롬프트를 PDF로 생성합니다. 응답(`201`): `{ exportId, status: "pending" }` |
| 이미지 Export | POST | storyboardId | `/storyboards/{storyboardId}/exports/image` | `{ includeIndividualCuts }`(기본 false) — 3×3 그리드 이미지 1장을 Export합니다. 옵션으로 개별 컷 이미지도 포함할 수 있습니다. 응답(`201`): `{ exportId, status: "pending" }` |
| Export 결과 조회 | GET | exportId | `/exports/{exportId}` | PDF 또는 이미지 Export 완료 여부(status)와 다운로드 링크를 조회합니다 |

## 6. 헬스체크 — 인증 불필요 (이거 그냥 백엔드용이니까 무시하세요)

| 기능 | Method | URL | 설명 |
|---|---|---|---|
| 헬스체크 | GET | `/health` | `{ status, db }` — DB 연결 상태 포함 |

## 7. 백엔드 base URL: kxb2-backend.duckdns.org
