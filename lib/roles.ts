export type AppRole = 'ADMIN' | 'LEADER' | 'VIEWER';

const labels: Record<AppRole, string> = {
  ADMIN: 'Admin',
  LEADER: 'Leader',
  VIEWER: 'Viewer',
};

export function roleLabel(role?: AppRole | null) {
  return role ? labels[role] : 'Microsoft SSO';
}

export function roleFromGroups(
  groups: string[] = [],
  env: Record<string, string | undefined> = process.env,
): AppRole {
  const adminGroupId = env.AUTH_ADMIN_GROUP_ID?.trim();
  const leaderGroupId = env.AUTH_LEADER_GROUP_ID?.trim();
  if (adminGroupId && groups.includes(adminGroupId)) return 'ADMIN';
  if (leaderGroupId && groups.includes(leaderGroupId)) return 'LEADER';
  return 'VIEWER';
}
