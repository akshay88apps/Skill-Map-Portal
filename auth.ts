import NextAuth from 'next-auth';
import { db } from '@/lib/db';
import authConfig from '@/auth.config';
import { roleFromGroups } from '@/lib/roles';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const email = String(
          profile.email || profile.preferred_username || token.email || '',
        ).toLowerCase();
        const groups = Array.isArray(profile.groups)
          ? profile.groups.map(String)
          : [];
        const configured = roleFromGroups(groups);
        const existing = email
          ? await db.leader.findUnique({ where: { email } })
          : null;
        if (existing?.profileStatus === 'DEACTIVATED')
          throw new Error('Account deactivated');
        const leader = email
          ? await db.leader.upsert({
              where: { email },
              update: {
                entraObjectId: String(profile.oid || profile.sub),
                preferredName: String(
                  profile.name || token.name || existing?.preferredName || '',
                ),
                role: configured,
              },
              create: {
                email,
                fullName: String(profile.name || token.name || email),
                preferredName: String(profile.name || token.name || ''),
                entraObjectId: String(profile.oid || profile.sub),
                role: configured,
              },
            })
          : null;
        token.role = configured;
        token.leaderId = leader?.id;
        token.groups = groups;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = String(token.role || 'VIEWER') as
          'ADMIN' | 'LEADER' | 'VIEWER';
        session.user.leaderId = token.leaderId as string | undefined;
      }
      return session;
    },
  },
});
