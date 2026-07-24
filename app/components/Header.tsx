'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuIcon from '@/app/components/icons/menu.svg';
import BellIcon from '@/app/components/icons/bell.svg';
import logoMark from '@/app/components/icons/logo-mark.png';
import logoText from '@/app/components/icons/logo-text.png';
import Library from '@/app/components/Library';

const NAV_LINKS = [
  { href: '/storyboard', label: 'Storyboard' },
  { href: '/canvas', label: 'Canvas' },
];

interface HeaderProps {
  // 실제 로그인 연동 전까지는 로그아웃 상태를 기본값으로 둔다.
  isLoggedIn?: boolean;
}

export default function Header({ isLoggedIn = false }: HeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-background sticky top-0 z-55 flex h-15 w-full shrink-0 items-center justify-between gap-2.5 px-3">
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="메뉴"
            onClick={() => setIsMenuOpen((prev) => !prev)}
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
              <Link key={href} href={href} className={`flex flex-col items-center ${isActive ? 'text-label-semibold-16 text-text-primary' : 'text-body text-text-disabled'}`}>
                {label}
                <span className={`mt-1 h-px w-full ${isActive ? 'bg-white' : 'bg-transparent'}`} />
              </Link>
            );
          })}
        </nav>

        {isLoggedIn ? (
          <div className="flex items-center gap-5">
            <BellIcon className="text-text-disabled size-6 shrink-0" />
            {/* 실제 유저 아바타가 생기면 이 원 안에 이미지로 채우면 됨 */}
            <div className="border-secondary flex size-7 shrink-0 items-center justify-center rounded-full border">
              <div className="bg-text-primary size-6 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="#" className="text-label-regular-14 text-text-primary">
              Login
            </Link>
            <Link href="#" className="bg-secondary text-card-secondary text-label-regular-14 rounded-2xl px-2 py-1">
              Sign up
            </Link>
          </div>
        )}
      </header>

      <div
        className={`fixed inset-x-0 top-15 bottom-0 z-60 bg-black/50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
