'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuIcon from '@/app/components/icons/menu.svg';
import BellIcon from '@/app/components/icons/bell.svg';
import logoMark from '@/app/components/icons/logo-mark.png';
import logoText from '@/app/components/icons/logo-text.png';
import Library from '@/app/components/Library';
import { useAuth } from '@/app/auth/AuthContext';
import { PROTECTED_PATHS } from '@/app/auth/protectedPaths';

const NAV_LINKS = [
  { href: '/storyboard', label: 'Storyboard' },
  { href: '/canvas', label: 'Canvas' },
];

export default function Header() {
  const pathname = usePathname();
  const { user, logout, openAuthModal, requireAuth } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // 프로필 드롭다운이 열려있을 때 바깥 클릭하면 닫기
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isProfileMenuOpen]);

  return (
    <>
      <header className="bg-background sticky top-0 z-55 flex h-15 w-full shrink-0 items-center justify-between gap-2.5 px-3">
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="메뉴"
            onClick={() => {
              // 로그인해야 볼 수 있는 라이브러리라 안 돼있으면 로그인창부터 띄움
              if (!requireAuth()) return;
              setIsMenuOpen((prev) => !prev);
            }}
            className="text-text-primary size-6 shrink-0 cursor-pointer"
          >
            <MenuIcon className="size-6" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src={logoMark} alt="" className="size-10" priority />
            <Image src={logoText} alt="GeNova" className="h-[22.862px] w-25.5" priority />
          </Link>
        </div>

        <nav className="flex items-center gap-17.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={(e) => {
                  if (PROTECTED_PATHS.includes(href) && !requireAuth()) e.preventDefault();
                }}
                className={`flex flex-col items-center ${isActive ? 'text-label-semibold-16 text-text-primary' : 'text-body text-text-disabled'}`}
              >
                {label}
                <span className={`mt-1 h-px w-full ${isActive ? 'bg-white' : 'bg-transparent'}`} />
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="relative flex items-center gap-5" ref={profileMenuRef}>
            <BellIcon className="text-text-disabled size-6 shrink-0" />
            <button type="button" aria-label="프로필" onClick={() => setIsProfileMenuOpen((prev) => !prev)} className="border-secondary flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border">
              <div className="bg-text-primary size-6 rounded-full" />
            </button>
            {isProfileMenuOpen && (
              <div className="bg-surface absolute right-0 top-full z-20 mt-2 flex w-52 flex-col gap-3 rounded-2xl border border-border-divider p-4 shadow-lg">
                <div className="flex flex-col gap-0.5">
                  <p className="text-label-regular-14 truncate text-text-primary">{user.nickname ?? user.email}</p>
                  <p className="text-caption-12 truncate text-text-disabled">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="text-label-regular-14 cursor-pointer self-start text-text-secondary"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => openAuthModal('login')} className="text-label-regular-14 cursor-pointer text-text-primary">
              Login
            </button>
            <button type="button" onClick={() => openAuthModal('signup')} className="bg-secondary text-card-secondary text-label-regular-14 cursor-pointer rounded-2xl px-2 py-1">
              Sign up
            </button>
          </div>
        )}
      </header>

      <div
        className={`fixed inset-0 z-60 bg-black/50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <div className="h-full w-fit pr-3" onClick={(e) => e.stopPropagation()}>
          <div className={`h-full transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Library isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
          </div>
        </div>
      </div>
    </>
  );
}
