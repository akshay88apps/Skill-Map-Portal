import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  beginSend: vi.fn(),
  pollUntilDone: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@azure/communication-email', () => ({
  EmailClient: class {
    beginSend = mocks.beginSend;
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    notificationJob: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
    invitation: { updateMany: mocks.updateMany },
  },
}));

import {
  azureEmailConfig,
  invitationEmailContent,
  processNotifications,
} from '@/lib/notifications';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv(
    'ACS_EMAIL_CONNECTION_STRING',
    'endpoint=https://example/;accesskey=x',
  );
  vi.stubEnv(
    'ACS_EMAIL_SENDER_ADDRESS',
    'DoNotReply@example.azurecomm.net',
  );
});

afterEach(() => vi.unstubAllEnvs());

describe('Azure Communication Services email configuration', () => {
  it('reads provider details exclusively from environment values', () => {
    expect(
      azureEmailConfig({
        ACS_EMAIL_CONNECTION_STRING: 'endpoint=https://example/;accesskey=x',
        ACS_EMAIL_SENDER_ADDRESS: 'DoNotReply@example.azurecomm.net',
      }),
    ).toEqual({
      connectionString: 'endpoint=https://example/;accesskey=x',
      senderAddress: 'DoNotReply@example.azurecomm.net',
    });
  });

  it('fails closed when email credentials or sender are missing', () => {
    expect(() => azureEmailConfig({})).toThrow(
      'ACS_EMAIL_CONNECTION_STRING is not configured',
    );
    expect(() =>
      azureEmailConfig({ ACS_EMAIL_CONNECTION_STRING: 'configured' }),
    ).toThrow('ACS_EMAIL_SENDER_ADDRESS is not configured');
  });
});

describe('invitation email content', () => {
  it('includes the configured sign-in URL and optional due date', () => {
    expect(
      invitationEmailContent({
        signinUrl: 'https://portal.example/signin',
        dueAt: '2026-08-20T00:00:00.000Z',
      }).plainText,
    ).toContain('https://portal.example/signin');
    expect(
      invitationEmailContent({
        signinUrl: 'https://portal.example/signin',
        dueAt: '2026-08-20T00:00:00.000Z',
      }).plainText,
    ).toContain('2026-08-20T00:00:00.000Z');
  });

  it('rejects malformed queued invitations without a sign-in URL', () => {
    expect(() => invitationEmailContent({})).toThrow(
      'Invitation payload has no sign-in URL',
    );
  });
});

describe('queued invitation delivery', () => {
  it('sends through Azure Communication Services and marks the job sent', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'job-1',
        recipient: 'leader@example.com',
        payload: {
          signinUrl: 'https://portal.example/signin',
          dueAt: '2026-08-20T00:00:00.000Z',
        },
      },
    ]);
    mocks.pollUntilDone.mockResolvedValue({ status: 'Succeeded' });
    mocks.beginSend.mockResolvedValue({
      pollUntilDone: mocks.pollUntilDone,
    });

    await expect(processNotifications()).resolves.toEqual({
      processed: 1,
      sent: 1,
    });
    expect(mocks.beginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        senderAddress: 'DoNotReply@example.azurecomm.net',
        recipients: { to: [{ address: 'leader@example.com' }] },
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ attempts: { increment: 1 } }),
      }),
    );
  });
});
