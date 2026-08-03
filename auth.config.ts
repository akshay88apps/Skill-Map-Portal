import type { NextAuthConfig } from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
export default {
  providers: [MicrosoftEntraID],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/signin', error: '/signin' },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (
        path.startsWith('/api/auth') ||
        path === '/signin' ||
        path === '/api/health'
      )
        return true;
      if (
        process.env.AUTH_DEV_BYPASS === 'true' &&
        process.env.NODE_ENV !== 'production'
      )
        return true;
      if (!session?.user) return false;
      if (
        (path.startsWith('/admin') || path.startsWith('/api/admin')) &&
        session.user.role !== 'ADMIN'
      )
        return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
