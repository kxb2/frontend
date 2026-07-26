// 인증 API (/auth/me만 로그인이 필요해서 authorizedFetch, 나머지는 로그인 전이라 그냥 fetch)
import { API_BASE_URL, authorizedFetch } from '@/app/api/http';
import type { AuthResult, AuthUser, TokenResult } from '@/types/auth';

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // ignore
  }
  return fallback;
}

// 이메일 회원가입 (POST /auth/register)
export async function register(email: string, password: string, passwordConfirm: string, nickname?: string): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, passwordConfirm, nickname: nickname ?? null }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, '회원가입에 실패했습니다.'));
  }
  return response.json();
}

// 이메일 로그인 (POST /auth/login)
export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, '이메일 또는 비밀번호가 올바르지 않습니다.'));
  }
  return response.json();
}

// 구글 로그인 (POST /auth/google)
export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Google 로그인에 실패했습니다.'));
  }
  return response.json();
}

// accessToken 재발급 (POST /auth/refresh)
export async function refreshTokens(refreshToken: string): Promise<TokenResult> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('세션 재발급에 실패했습니다.');
  }
  return response.json();
}

// 로그아웃 (POST /auth/logout)
export async function logout(refreshToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok && response.status !== 401) {
    throw new Error('로그아웃에 실패했습니다.');
  }
}

// 내 정보 조회 (GET /auth/me)
export async function getMe(): Promise<AuthUser> {
  const response = await authorizedFetch('/auth/me');
  if (!response.ok) {
    throw new Error('사용자 정보 조회에 실패했습니다.');
  }
  return response.json();
}
