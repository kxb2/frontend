'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/auth/AuthContext';
import { loadGoogleIdentityScript, initializeGoogleIdentity } from '@/app/auth/googleIdentity';
import XIcon from '@/app/components/icons/x.svg';
import EyeIcon from '@/app/components/icons/eye.svg';
import EyeOffIcon from '@/app/components/icons/eye-off.svg';
import SparkleIcon from '@/app/components/icons/sparkle.svg';
import GroupIcon from '@/app/components/icons/group.svg';
import googleLogo from '@/app/components/icons/google-logo.png';
import logoMark from '@/app/components/icons/logo-mark.png';
import hero1 from '@/app/auth/images/hero-1.png';
import hero2 from '@/app/auth/images/hero-2.png';
import hero3 from '@/app/auth/images/hero-3.png';
import hero4 from '@/app/auth/images/hero-4.png';

const HERO_IMAGES = [hero1, hero2, hero3, hero4];
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// 커스텀 버튼 모양은 유지하고, 그 위에 투명한 실제 Google 버튼(iframe)을 겹쳐서 클릭을 가로챔
function GoogleSignInButton({ onCredential, onUnavailable, disabled }: { onCredential: (idToken: string) => void; onUnavailable: () => void; disabled?: boolean }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !overlayRef.current) return;
    let cancelled = false;
    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !overlayRef.current || !window.google) return;
        initializeGoogleIdentity(GOOGLE_CLIENT_ID, (idToken) => onCredentialRef.current(idToken));
        window.google.accounts.id.renderButton(overlayRef.current, { type: 'standard', size: 'large', width: 400 });
        const rendered = overlayRef.current.firstElementChild as HTMLElement | null;
        if (rendered) {
          const renderedRect = rendered.getBoundingClientRect();
          const containerRect = overlayRef.current.getBoundingClientRect();
          if (renderedRect.width > 0 && renderedRect.height > 0) {
            rendered.style.transformOrigin = 'top left';
            rendered.style.transform = `scale(${containerRect.width / renderedRect.width}, ${containerRect.height / renderedRect.height})`;
          }
        }
      })
      .catch((error) => console.error('Google 로그인 스크립트 로드 실패:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative h-18.75 w-full">
      <button
        type="button"
        onClick={onUnavailable}
        disabled={disabled}
        className="text-title-medium flex h-18.75 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-border-divider bg-text-primary text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Image src={googleLogo} alt="" className="size-6" />
        Google 계정으로 로그인
      </button>
      {GOOGLE_CLIENT_ID && !disabled && <div ref={overlayRef} className="absolute inset-0 overflow-hidden opacity-0" />}
    </div>
  );
}

interface LoginModalProps {
  onClose?: () => void; // 없으면 닫기 버튼을 숨김(로그인 필수 상황에서 사용)
  initialMode?: 'login' | 'signup';
}

// 로그인/회원가입 폼에서 공통으로 쓰는 비밀번호 입력(눈 아이콘으로 표시/숨김 전환)
function PasswordField({ placeholder, value, onChange, autoComplete }: { placeholder: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex h-18.75 w-full items-center justify-between rounded-2xl border border-border-divider bg-surface p-5">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="text-title-medium w-full bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none"
      />
      <button type="button" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} onClick={() => setVisible((prev) => !prev)} className="shrink-0 cursor-pointer text-text-disabled">
        {visible ? <EyeIcon className="size-6" /> : <EyeOffIcon className="size-6" />}
      </button>
    </div>
  );
}

function GradientButton({ children, disabled, type = 'submit' }: { children: ReactNode; disabled?: boolean; type?: 'submit' | 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="text-title-medium flex h-18.75 w-full cursor-pointer items-center justify-center rounded-2xl bg-linear-to-r from-primary to-[#6878a1] text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export default function LoginModal({ onClose, initialMode = 'login' }: LoginModalProps) {
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

  // Client ID 없을 때만 노출되는 안내
  function handleGoogleUnavailable() {
    alert('Google 로그인은 준비 중입니다. 이메일로 로그인/회원가입해주세요.');
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
    <div className="relative flex h-229.5 max-h-[90vh] w-[1560px] max-w-[95vw] gap-2.5 overflow-hidden rounded-[20px] border border-border-divider bg-background p-4">
      {/* 왼쪽 히어로 이미지 (매번 랜덤하게 하나 선택) */}
      <div className="relative hidden h-full w-188.75 shrink-0 overflow-hidden rounded-[20px] lg:flex lg:flex-col lg:items-start lg:justify-end lg:p-10">
        <Image src={heroImage} alt="" fill priority sizes="755px" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black to-black/0" />
        <div className="relative z-10 flex flex-col items-start gap-5">
          <div className="flex items-start gap-2.5">
            <span className="text-label-semibold-14 flex items-center gap-2.5 rounded-xl bg-white/13 px-3 py-2 text-text-primary">
              <SparkleIcon className="size-5" />
              Storyboard
            </span>
            <span className="text-label-semibold-14 flex items-center gap-2.5 rounded-xl bg-white/13 px-3 py-2 text-text-primary">
              <GroupIcon className="size-5" />
              Canvas
            </span>
          </div>
          <p className="text-[52px] leading-none text-white">CINEMA STUDIO</p>
          <p className="text-caption-14 text-white">UNLOCK THE POWER TO TURN CONCEPTS INTO CINEMATIC STORYBOARDS</p>
        </div>
      </div>

      {/* 오른쪽 폼 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-10">
        <div className="flex w-125 max-w-full flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-4">
              <Image src={logoMark} alt="" className="size-10" />
              <p className="text-[32px] font-semibold text-white">{mode === 'login' ? '로그인' : '회원가입'}</p>
            </div>
            <p className="text-title-medium text-text-disabled">{mode === 'login' ? '계정으로 로그인하고 계속하세요' : '새 계정을 만들고 시작하세요'}</p>
          </div>

          {errorMessage && <p className="text-caption-14 text-error w-full text-center">{errorMessage}</p>}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex w-full flex-col items-center gap-3">
              <GoogleSignInButton onCredential={handleGoogleCredential} onUnavailable={handleGoogleUnavailable} disabled={isSubmitting} />

              <p className="text-caption-14 text-white">또는</p>

              <div className="flex w-full flex-col items-start gap-2">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  autoComplete="email"
                  required
                  className="text-title-medium h-18.75 w-full rounded-2xl border border-border-divider bg-surface p-5 text-text-primary placeholder:text-text-disabled focus:outline-none"
                />
                <PasswordField placeholder="비밀번호를 입력하세요" value={loginPassword} onChange={setLoginPassword} autoComplete="current-password" />
                <div className="flex w-full items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-primary size-4 rounded" />
                    <span className="text-caption-14 text-border-divider">로그인 상태 유지</span>
                  </label>
                  <span className="text-caption-14 cursor-pointer text-primary">비밀번호 찾기</span>
                </div>
                <GradientButton disabled={isSubmitting}>{isSubmitting ? '로그인 중...' : '로그인'}</GradientButton>
              </div>

              <div className="text-title-medium flex items-center gap-3">
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
                  className="text-title-medium h-18.75 w-full rounded-2xl border border-border-divider bg-surface p-5 text-text-primary placeholder:text-text-disabled focus:outline-none"
                />
                <PasswordField placeholder="비밀번호를 입력하세요" value={signupPassword} onChange={setSignupPassword} autoComplete="new-password" />
                <PasswordField placeholder="비밀번호를 다시 입력하세요" value={signupPasswordConfirm} onChange={setSignupPasswordConfirm} autoComplete="new-password" />
                <label className="flex w-full cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="accent-primary size-4 shrink-0 rounded" />
                  <span className="text-caption-14 text-primary">
                    이용약관 및 개인정보 처리방침<span className="text-border-divider">에 동의합니다</span>
                  </span>
                </label>
                <GradientButton disabled={isSubmitting}>{isSubmitting ? '가입 중...' : '회원가입'}</GradientButton>
              </div>

              <div className="text-title-medium flex items-center gap-3">
                <span className="text-border-divider">이미 계정이 있으신가요?</span>
                <button type="button" onClick={() => switchMode('login')} className="cursor-pointer text-primary underline">
                  로그인
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-10 top-10 flex size-13 cursor-pointer items-center justify-center rounded-full border border-border-divider bg-background/80 text-text-primary"
        >
          <XIcon className="size-6" />
        </button>
      )}
    </div>
  );
}
