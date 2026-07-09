'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/storyboard', label: 'Storyboard' },
  { href: '/canvas', label: 'Canvas' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-background flex h-15 w-full shrink-0 items-center justify-between gap-2.5 px-3">
      <Link href="#" className="text-caption-12 text-text-disabled">
        로고
      </Link>

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
    </header>
  );
}
