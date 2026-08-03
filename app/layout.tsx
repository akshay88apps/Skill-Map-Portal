import './globals.css';
import Link from 'next/link';
import {
  BarChart3,
  Grid3X3,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
export const metadata = {
  title: 'Skillmap — Tech Leaders',
  description: 'Discover expertise, grow capability, build stronger teams.',
};
const nav = [
  ['/', LayoutDashboard, 'Overview'],
  ['/directory', Search, 'Directory'],
  ['/matrix', Grid3X3, 'Skill matrix'],
  ['/my-profile', UserRound, 'My profile'],
  ['/analytics', BarChart3, 'Analytics'],
  ['/admin', ShieldCheck, 'Admin'],
] as const;
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen lg:flex">
          <aside className="bg-forest text-white lg:fixed lg:inset-y-0 lg:w-64">
            <div className="p-7">
              <Link href="/" className="text-2xl font-black tracking-tight">
                skill<span className="text-[#9fd9bd]">map</span>
              </Link>
              <p className="mt-1 text-xs text-white/55">TECH LEADERS PORTAL</p>
            </div>
            <nav className="flex gap-1 overflow-auto px-3 pb-4 lg:block">
              {nav.map(([href, Icon, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="mb-1 flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="hidden absolute bottom-6 left-5 right-5 rounded-xl bg-white/10 p-4 text-xs text-white/65 lg:block">
              Secure employee skills workspace
              <br />
              <span className="text-[#9fd9bd]">Entra ID ready</span>
            </div>
          </aside>
          <main className="grid-bg min-h-screen flex-1 lg:ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
