import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db', () => ({
  db: {
    leader: { findUnique: mocks.findUnique, update: mocks.update },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { PATCH } from '@/app/api/admin/leaders/[id]/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ email: 'admin@example.com' });
  mocks.findUnique.mockResolvedValue({
    id: 'leader-1',
    additionalCapabilityTags: [],
  });
  mocks.update.mockResolvedValue({
    id: 'leader-1',
    additionalCapabilityTags: ['CUSTOMER_ENGINEERING', 'INNOVATION_LAB'],
  });
  mocks.auditCreate.mockResolvedValue({});
});

describe('admin capability tags', () => {
  it('persists multiple approved function-based capability tags', async () => {
    const request = new NextRequest('http://localhost/api/admin/leaders/leader-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        additionalCapabilityTags: ['CUSTOMER_ENGINEERING', 'INNOVATION_LAB'],
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'leader-1' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'leader-1' },
      data: {
        additionalCapabilityTags: ['CUSTOMER_ENGINEERING', 'INNOVATION_LAB'],
      },
    });
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it('rejects tags outside the three governed function capabilities', async () => {
    const request = new NextRequest('http://localhost/api/admin/leaders/leader-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ additionalCapabilityTags: ['UNCONTROLLED'] }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'leader-1' }),
    });

    expect(response.status).toBe(422);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
