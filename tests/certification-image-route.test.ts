import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentIdentity: vi.fn(),
  findUnique: vi.fn(),
  signedCertificationUrl: vi.fn(),
}));

vi.mock('@/lib/authz', () => ({ currentIdentity: mocks.currentIdentity }));
vi.mock('@/lib/db', () => ({
  db: { certification: { findUnique: mocks.findUnique } },
}));
vi.mock('@/lib/certification-storage', () => ({
  signedCertificationUrl: mocks.signedCertificationUrl,
}));

import { GET } from '@/app/api/certifications/[id]/file/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentIdentity.mockResolvedValue({
    role: 'LEADER',
    leaderId: 'leader-1',
  });
  mocks.findUnique.mockResolvedValue({
    leaderId: 'leader-1',
    name: 'Azure certification',
    attachmentBlobName: 'leader-1/private-blob.webp',
    attachmentContentType: 'image/webp',
    attachmentFileName: 'azure.webp',
    leader: { profileStatus: 'SUBMITTED' },
  });
  mocks.signedCertificationUrl.mockResolvedValue(
    'https://storage.example/certifications/leader-1/private-blob.webp?sp=r&sig=signed',
  );
});

describe('certification file access', () => {
  it('redirects the owner to a short-lived signed blob URL', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/certifications/cert-1/file'),
      { params: Promise.resolve({ id: 'cert-1' }) },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('sig=signed');
    expect(mocks.signedCertificationUrl).toHaveBeenCalledWith(
      'leader-1/private-blob.webp',
      'azure.webp',
      'image/webp',
    );
  });

  it('blocks other users while the profile is not published', async () => {
    mocks.currentIdentity.mockResolvedValue({
      role: 'LEADER',
      leaderId: 'leader-2',
    });

    const response = await GET(
      new NextRequest('http://localhost/api/certifications/cert-1/file'),
      { params: Promise.resolve({ id: 'cert-1' }) },
    );

    expect(response.status).toBe(403);
  });
});
