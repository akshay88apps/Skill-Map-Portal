import { auth } from '@/auth';
export type { AppRole } from '@/lib/roles';
export async function currentIdentity() {
  if (
    process.env.AUTH_DEV_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
    return {
      id: 'development-admin',
      name: 'Development Admin',
      email: 'development-admin@localhost',
      role: 'ADMIN' as const,
      leaderId: undefined,
    };
  const session = await auth();
  return session?.user || null;
}
export async function requireIdentity() {
  const user = await currentIdentity();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}
export async function requireAdmin() {
  const user = await requireIdentity();
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return user;
}
