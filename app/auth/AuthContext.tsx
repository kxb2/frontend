'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, register as apiRegister, loginWithGoogle as apiLoginWithGoogle, logout as apiLogout, refreshTokens, getMe } from '@/app/api/auth/api';
import { getRefreshToken, setAuthTokens, clearTokens } from '@/app/auth/tokenStore';
import LoginModal from '@/app/auth/LoginModal';
import type { AuthResult, AuthUser } from '@/types/auth';

type AuthModalMode = 'login' | 'signup';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean; // 앱 시작 시 이전 세션 복원 확인 중인지
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (email: string, password: string, passwordConfirm: string, nickname: string | undefined, remember: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  requireAuth: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 로그아웃 시 홈으로 이동
function goHome() {
  window.location.href = '/';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);

  // 앱 시작 시: 저장해둔 refreshToken이 있으면 재발급 -> 내 정보 조회로 로그인 상태 복원
  useEffect(() => {
    const existingRefreshToken = getRefreshToken();
    if (!existingRefreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시점에 복원할 세션이 없다는 걸 동기적으로 아는 경우라 바로 로딩 해제
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const tokens = await refreshTokens(existingRefreshToken);
        setAuthTokens(tokens, true); // localStorage에 남아있던 토큰이었다는 뜻이라 remember=true로 유지
        setUser(await getMe());
      } catch (error) {
        console.error('세션 복원 실패:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // authorizedFetch가 재발급까지 실패했을 때(세션 만료) 보내는 이벤트 -> 로그인 상태를 해제
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      goHome();
    }
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => setAuthModalMode(mode), []);
  const closeAuthModal = useCallback(() => setAuthModalMode(null), []);

  function applyAuthResult(result: AuthResult, remember: boolean) {
    setAuthTokens(result, remember);
    setUser(result.user);
    setAuthModalMode(null);
  }

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    applyAuthResult(await apiLogin(email, password), remember);
  }, []);

  const signup = useCallback(async (email: string, password: string, passwordConfirm: string, nickname: string | undefined, remember: boolean) => {
    applyAuthResult(await apiRegister(email, password, passwordConfirm, nickname), remember);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string, remember: boolean) => {
    applyAuthResult(await apiLoginWithGoogle(idToken), remember);
  }, []);

  const logout = useCallback(async () => {
    // 하드 리로드로 페이지가 곧 사라지므로, 요청이 잘리지 않도록 서버 통지를 먼저 끝내고 나서 이동
    const currentRefreshToken = getRefreshToken();
    if (currentRefreshToken) {
      try {
        await apiLogout(currentRefreshToken);
      } catch (error) {
        console.error('로그아웃 요청 실패(로컬 세션은 이미 정리됨):', error);
      }
    }
    clearTokens();
    setUser(null);
    goHome();
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setAuthModalMode('login');
    return false;
  }, [user]);

  const value = useMemo(
    () => ({ user, isLoading, login, signup, loginWithGoogle, logout, openAuthModal, closeAuthModal, requireAuth }),
    [user, isLoading, login, signup, loginWithGoogle, logout, openAuthModal, closeAuthModal, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authModalMode && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/64 p-4" onClick={closeAuthModal}>
          <div onClick={(e) => e.stopPropagation()}>
            <LoginModal initialMode={authModalMode} onClose={closeAuthModal} />
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return context;
}
