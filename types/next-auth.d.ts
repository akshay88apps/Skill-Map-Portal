import 'next-auth';
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'ADMIN' | 'LEADER' | 'VIEWER';
      leaderId?: string;
    };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'LEADER' | 'VIEWER';
    leaderId?: string;
    groups?: string[];
  }
}
