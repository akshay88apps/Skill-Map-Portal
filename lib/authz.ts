import { auth } from '@/auth';
export type AppRole = 'ADMIN' | 'LEADER' | 'VIEWER';
export async function currentIdentity() {
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
