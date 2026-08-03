import { NextRequest } from 'next/server';
export type AppRole = 'ADMIN' | 'LEADER' | 'VIEWER';
export function roleFrom(req: NextRequest): AppRole {
  return (
    (req.headers.get('x-portal-role')?.toUpperCase() as AppRole) || 'VIEWER'
  );
}
export function isAdmin(req: NextRequest) {
  return roleFrom(req) === 'ADMIN';
}
