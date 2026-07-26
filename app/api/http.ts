// 로그인 필요한 API 공용 헬퍼: Authorization 자동 첨부, 401이면 재발급 후 한 번 재시도
import { getAccessToken, getRefreshToken, updateTokensAfterRefresh, clearTokens } from '@/app/auth/tokenStore';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// 401이 동시에 여러 번 발생해도 재발급 요청은 한 번만 나가도록 진행 중인 Promise를 공유
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false;
        updateTokensAfterRefresh(await response.json());
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// path는 API_BASE_URL 기준 상대 경로(예: '/canvases')
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const accessToken = getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status !== 401) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    clearTokens(true); // 재발급도 실패 -> 세션 만료로 보고 로그아웃 처리(로그인 화면이 다시 뜸)
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${getAccessToken()}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: retryHeaders });
}
