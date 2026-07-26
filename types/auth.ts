// 인증 관련 백엔드 wire 타입

export type UserRole = 'user' | 'admin';

// 로그인한 유저 정보 (GET /auth/me, AuthResponse.user)
export interface AuthUser {
  id: number;
  email: string;
  nickname: string | null;
  role: UserRole;
  createdAt: string;
}

// 로그인/회원가입/구글로그인 공통 응답 (accessToken 30분 만료)
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

// POST /auth/refresh 응답 (user 정보 없이 토큰만)
export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}
