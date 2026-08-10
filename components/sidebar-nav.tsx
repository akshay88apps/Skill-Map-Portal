'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Grid3X3,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const navigation = [
  ['/', LayoutDashboard, 'Overview', false],
  ['/directory', Search, 'Directory', false],
  ['/matrix', Grid3X3, 'Skill matrix', false],
  ['/my-profile', UserRound, 'My profile', false],
  ['/analytics', BarChart3, 'Analytics', true],
  ['/admin', ShieldCheck, 'Admin', true],
] as const;

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-auto px-3 pb-4 lg:block" aria-label="Primary navigation">
      {navigation
        .filter(([, , , adminOnly]) => !adminOnly || isAdmin)
        .map(([href, Icon, label]) => {
          const active =
            href === '/' ? pathname === href : pathname.startsWith(`${href}/`) || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative mb-1 flex min-w-max items-center gap-3 rounded-control border px-3 py-3 text-sm transition-colors ${
                active
                  ? 'border-primary-700 bg-primary-800 font-semibold text-neutral-50 before:absolute before:-left-3 before:h-6 before:w-1 before:rounded-r before:bg-primary-300'
                  : 'border-transparent text-neutral-50/75 hover:bg-primary-800 hover:text-neutral-50 active:bg-primary-700'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
