'use client';

import { useAuth } from '@/app/auth/AuthContext';

// 로그인 상태가 바뀌면 key로 하위 트리를 새로 마운트해서, 로그인 전에 401났던 데이터 조회를 자동 재시도하게 함
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <div key={user ? 'authed' : 'anon'} className="contents">
      {children}
    </div>
  );
}
