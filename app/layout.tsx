import './globals.css';
import Link from 'next/link';
import { signOut } from '@/auth';
import { SidebarNav } from '@/components/sidebar-nav';
import { currentIdentity } from '@/lib/authz';
import { RoleBadge } from '@/components/ui';
export const metadata = {
  title: 'Skillmap — Tech Leaders',
  description: 'Discover expertise, grow capability, build stronger teams.',
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentIdentity();
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen lg:flex">
          <aside className="border-r border-primary-800 bg-primary-900 text-neutral-50 lg:fixed lg:inset-y-0 lg:w-[var(--sidebar-width)]">
            <div className="px-6 py-6">
              <Link href="/" className="text-xl font-semibold tracking-tight">
                skill<span className="text-primary-300">map</span>
              </Link>
              <p className="mt-1 text-xs font-medium tracking-wide text-neutral-50/60">
                TECH LEADERS PORTAL
              </p>
            </div>
            <SidebarNav isAdmin={user?.role === 'ADMIN'} />
            <div className="absolute bottom-4 left-4 right-4 hidden rounded-panel border border-primary-700 bg-primary-800 p-3 text-xs text-neutral-50/75 shadow-flat lg:block">
              <span className="block truncate text-neutral-50">
                {user?.email || 'Secure workspace'}
              </span>
              <span className="mt-2 block">
                <RoleBadge role={user?.role} />
              </span>
              {user && (
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/signin' });
                  }}
                >
                  <button className="mt-2 rounded-control px-1 text-neutral-50/75 hover:bg-primary-700 hover:text-neutral-50">
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </aside>
          <main className="grid-bg min-h-screen flex-1 lg:ml-[var(--sidebar-width)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
