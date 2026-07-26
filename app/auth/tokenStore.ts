// React 바깥에서도 접근해야 해서 모듈 전역 변수로 관리 (refreshToken만 "로그인 상태 유지" 여부로 저장 위치가 갈림)
const REFRESH_TOKEN_KEY = 'kxb2-refresh-token';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let rememberMe = false;

function persistRefreshToken(token: string) {
  try {
    if (rememberMe) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // 저장 공간 초과 등은 무시(메모리 값은 이미 반영됨)
  }
}

// 모듈이 처음 로드될 때(클라이언트에서만) 이전에 저장해둔 refreshToken이 있으면 복원
if (typeof window !== 'undefined') {
  try {
    const fromLocal = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (fromLocal) {
      refreshToken = fromLocal;
      rememberMe = true;
    } else {
      refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

// 로그인/회원가입/구글로그인 성공 시 호출 (remember로 저장 위치가 정해지고, 이후 재발급 때도 이 선택을 그대로 따름)
export function setAuthTokens(tokens: { accessToken: string; refreshToken: string }, remember: boolean) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  rememberMe = remember;
  persistRefreshToken(tokens.refreshToken);
}

// POST /auth/refresh 성공 시 호출 (refreshToken도 매번 새로 오므로 갱신해서 다시 저장)
export function updateTokensAfterRefresh(tokens: { accessToken: string; refreshToken: string }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  persistRefreshToken(tokens.refreshToken);
}

// notify=true면 재발급도 실패한 상황 -> AuthContext가 듣고 로그아웃 처리
export function clearTokens(notify = false) {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:session-expired'));
  }
}
