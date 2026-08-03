import NextAuth from 'next-auth';
import type { NextFetchEvent, NextMiddleware, NextRequest } from 'next/server';
import authConfig from '@/auth.config';
const { auth } = NextAuth(authConfig);
const handler = auth as unknown as NextMiddleware;
export function proxy(request: NextRequest, event: NextFetchEvent) {
  return handler(request, event);
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
