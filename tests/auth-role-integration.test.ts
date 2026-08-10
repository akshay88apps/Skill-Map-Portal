import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: null as any,
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('next-auth', () => ({
  default: vi.fn((config) => {
    mocks.config = config;
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    leader: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

import '@/auth';

const adminGroupId = '1353375d-4bbc-45a7-aa31-fac6d3b0564e';
const leaderGroupId = '9879fb2d-d8aa-47cc-849f-4bc6ec07096f';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('AUTH_ADMIN_GROUP_ID', adminGroupId);
  vi.stubEnv('AUTH_LEADER_GROUP_ID', leaderGroupId);
  mocks.findUnique.mockResolvedValue({
    id: 'leader-record',
    role: 'VIEWER',
    profileStatus: 'PUBLISHED',
    preferredName: 'Existing User',
  });
  mocks.upsert.mockResolvedValue({ id: 'leader-record', role: 'LEADER' });
});

describe('Auth.js Entra role integration', () => {
  it('uses the Leader group claim even when the stored role was Viewer', async () => {
    const token = await mocks.config.callbacks.jwt({
      token: { email: 'leader@example.com' },
      profile: {
        oid: 'entra-object-id',
        name: 'Leader User',
        preferred_username: 'leader@example.com',
        groups: [leaderGroupId],
      },
    });

    expect(token).toMatchObject({
      role: 'LEADER',
      leaderId: 'leader-record',
      groups: [leaderGroupId],
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ role: 'LEADER' }),
      }),
    );
  });

  it('fails closed and removes a stored Admin role when no RBAC group is claimed', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'admin-record',
      role: 'ADMIN',
      profileStatus: 'PUBLISHED',
      preferredName: 'Former Admin',
    });
    mocks.upsert.mockResolvedValue({ id: 'admin-record', role: 'VIEWER' });

    const token = await mocks.config.callbacks.jwt({
      token: { email: 'former-admin@example.com' },
      profile: {
        oid: 'entra-object-id',
        name: 'Former Admin',
        preferred_username: 'former-admin@example.com',
        groups: [],
      },
    });

    expect(token.role).toBe('VIEWER');
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ role: 'VIEWER' }),
      }),
    );
  });
});
