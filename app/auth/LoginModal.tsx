'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/auth/AuthContext';
import { loadGoogleIdentityScript, initializeGoogleIdentity } from '@/app/auth/googleIdentity';
import EyeIcon from '@/app/components/icons/eye.svg';
import EyeOffIcon from '@/app/components/icons/eye-off.svg';
import CheckIcon from '@/app/components/icons/check.svg';
import SparkleIcon from '@/app/components/icons/sparkle.svg';
import GroupIcon from '@/app/components/icons/group.svg';
import googleLogo from '@/app/components/icons/google-logo.png';
import hero1 from '@/app/auth/images/hero-1.png';
import hero2 from '@/app/auth/images/hero-2.png';
import hero3 from '@/app/auth/images/hero-3.png';
import hero4 from '@/app/auth/images/hero-4.png';

const HERO_IMAGES = [hero1, hero2, hero3, hero4];
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// GIS 공식 라이브러리(initialize + prompt)로 우리 버튼의 진짜 클릭에서 idToken을 받음.
function GoogleSignInButton({ onCredential, disabled }: { onCredential: (idToken: string) => void; disabled?: boolean }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  async function handleClick() {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google 로그인은 준비 중입니다. 이메일로 로그인/회원가입해주세요.');
      return;
    }
    setIsRequesting(true);
    try {
      await loadGoogleIdentityScript();
      if (!window.google) throw new Error('Google 로그인 스크립트를 불러오지 못했습니다.');
      initializeGoogleIdentity(GOOGLE_CLIENT_ID, (idToken) => {
        setIsRequesting(false);
        onCredentialRef.current(idToken);
      });
      window.google.accounts.id.prompt((notification) => {
        // 계정 선택 창이 안 뜨거나 사용자가 닫은 경우엔 로딩 상태만 해제(에러 아님)
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          setIsRequesting(false);
        }
      });
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      setIsRequesting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isRequesting}
      className="text-caption-14 flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border-divider bg-surface text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Image src={googleLogo} alt="" className="size-3" />
      {isRequesting ? '연결 중...' : 'Google 계정으로 로그인'}
    </button>
  );
}

interface LoginModalProps {
  initialMode?: 'login' | 'signup';
}

// 로그인/회원가입 폼에서 공통으로 쓰는 비밀번호 입력(눈 아이콘으로 표시/숨김 전환)
function PasswordField({ placeholder, value, onChange, autoComplete }: { placeholder: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex h-13 w-full items-center justify-between rounded-xl border border-border-divider bg-surface p-5">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="text-caption-14 w-full bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none"
      />
      <button type="button" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} onClick={() => setVisible((prev) => !prev)} className="shrink-0 cursor-pointer text-text-disabled">
        {visible ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
      </button>
    </div>
  );
}

function GradientButton({ children, disabled, type = 'submit' }: { children: ReactNode; disabled?: boolean; type?: 'submit' | 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="text-label-semibold-16 flex h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-linear-to-r from-primary to-[#6878a1] text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export default function LoginModal({ initialMode = 'login' }: LoginModalProps) {
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [heroImage] = useState(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setErrorMessage(null);
  }

  async function runAuthAction(action: () => Promise<void>, fallbackMessage: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    await runAuthAction(() => loginWithGoogle(idToken, rememberMe), 'Google 로그인에 실패했습니다.');
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    await runAuthAction(() => login(loginEmail, loginPassword, rememberMe), '로그인에 실패했습니다.');
  }

  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();
    if (signupPassword !== signupPasswordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('이용약관 및 개인정보 처리방침에 동의해주세요.');
      return;
    }
    await runAuthAction(() => signup(signupEmail, signupPassword, signupPasswordConfirm, undefined, rememberMe), '회원가입에 실패했습니다.');
  }

  return (
    <div className="relative flex h-160 max-h-[90vh] w-121 max-w-[calc(100vw-2rem)] items-stretch justify-center gap-4 overflow-hidden rounded-[20px] border border-border-divider bg-background p-3 min-[836px]:w-240">
      {/* 왼쪽 히어로 이미지 (매번 랜덤하게 하나 선택) */}
      <div className="relative hidden min-w-90 max-w-115 flex-1 flex-col items-start justify-end overflow-hidden rounded-[20px] p-5 min-[836px]:flex">
        <Image src={heroImage} alt="" fill priority sizes="460px" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black to-black/0" />
        <div className="relative z-10 flex flex-col items-start gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-label-semibold-12 flex h-9 items-center gap-2 rounded-xl bg-white/13 px-3 py-2 text-text-primary">
              <SparkleIcon className="size-4" />
              Storyboard
            </span>
            <span className="text-label-semibold-12 flex h-9 items-center gap-2 rounded-xl bg-white/13 px-3 py-2 text-text-primary">
              <GroupIcon className="size-4" />
              Canvas
            </span>
          </div>
          <p className="text-[28px] font-medium leading-normal text-white">CINEMA STUDIO</p>
          <p className="text-label-semibold-12 text-white">Turn Concepts into Cinematic Storyboards</p>
        </div>
      </div>

      {/* 오른쪽 폼 */}
      <div className="flex min-w-0 max-w-115 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-10 min-[836px]:min-w-100">
        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-title-semibold text-text-primary">{mode === 'login' ? '제노바에 오신 것을 환영합니다' : '제노바에서 새 계정을 만드세요'}</p>
            <p className="text-caption-14 text-text-disabled">{mode === 'login' ? '계정으로 로그인하고 계속하세요' : '새 계정을 만들고 시작하세요'}</p>
          </div>

          {errorMessage && <p className="text-caption-14 text-error w-full text-center">{errorMessage}</p>}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex w-full flex-col items-center gap-4">
              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isSubmitting} />

              <p className="text-caption-14 text-white">또는</p>

              <div className="flex w-full flex-col items-start gap-3">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  autoComplete="email"
                  required
                  className="text-caption-14 h-13 w-full rounded-xl border border-border-divider bg-surface p-5 text-text-primary placeholder:text-text-disabled focus:outline-none"
                />
                <PasswordField placeholder="비밀번호를 입력하세요" value={loginPassword} onChange={setLoginPassword} autoComplete="current-password" />
                <div className="flex w-full items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1">
                    <span className="relative flex size-3 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="size-3 shrink-0 cursor-pointer appearance-none rounded-sm border border-border-divider bg-transparent checked:border-primary checked:bg-primary"
                      />
                      {rememberMe && <CheckIcon className="pointer-events-none absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 text-text-primary" />}
                    </span>
                    <span className="text-caption-12 text-border-divider">로그인 상태 유지</span>
                  </label>
                  <span className="text-caption-12 cursor-pointer text-primary">비밀번호 찾기</span>
                </div>
                <GradientButton disabled={isSubmitting}>{isSubmitting ? '로그인 중...' : '로그인'}</GradientButton>
              </div>

              <div className="text-caption-14 flex items-center gap-3">
                <span className="text-border-divider">계정이 없으신가요?</span>
                <button type="button" onClick={() => switchMode('signup')} className="cursor-pointer text-primary underline">
                  회원가입
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="flex w-full flex-col items-center gap-3">
              <div className="flex w-full flex-col items-start gap-3">
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  autoComplete="email"
                  required
                  className="text-caption-14 h-13 w-full rounded-xl border border-border-divider bg-surface p-5 text-text-primary placeholder:text-text-disabled focus:outline-none"
                />
                <PasswordField placeholder="비밀번호를 입력하세요" value={signupPassword} onChange={setSignupPassword} autoComplete="new-password" />
                <PasswordField placeholder="비밀번호를 다시 입력하세요" value={signupPasswordConfirm} onChange={setSignupPasswordConfirm} autoComplete="new-password" />
                <label className="flex w-full cursor-pointer items-center gap-1">
                  <span className="relative flex size-3 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="size-3 shrink-0 cursor-pointer appearance-none rounded-sm border border-border-divider bg-transparent checked:border-primary checked:bg-primary"
                    />
                    {agreedToTerms && <CheckIcon className="pointer-events-none absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 text-text-primary" />}
                  </span>
                  <span className="text-caption-12 text-primary">
                    이용약관 및 개인정보 처리방침<span className="text-border-divider">에 동의합니다</span>
                  </span>
                </label>
                <GradientButton disabled={isSubmitting}>{isSubmitting ? '가입 중...' : '회원가입'}</GradientButton>
              </div>

              <div className="text-caption-14 flex items-center gap-3">
                <span className="text-border-divider">이미 계정이 있으신가요?</span>
                <button type="button" onClick={() => switchMode('login')} className="cursor-pointer text-primary underline">
                  로그인
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
