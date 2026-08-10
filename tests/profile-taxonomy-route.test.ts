import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    leader: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    project: { deleteMany: vi.fn(), create: vi.fn() },
    certification: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    leaderTool: { deleteMany: vi.fn(), create: vi.fn() },
    tool: { upsert: vi.fn() },
    leaderSkill: { deleteMany: vi.fn(), upsert: vi.fn() },
    skill: { findUniqueOrThrow: vi.fn() },
    reviewItem: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    transaction: vi.fn(async (callback) => callback(tx)),
    requireIdentity: vi.fn(),
    uploadCertificationFile: vi.fn(),
    deleteCertificationFile: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  db: { $transaction: mocks.transaction },
}));

vi.mock('@/lib/authz', () => ({
  requireIdentity: mocks.requireIdentity,
}));
vi.mock('@/lib/certification-storage', () => ({
  uploadCertificationFile: mocks.uploadCertificationFile,
  deleteCertificationFile: mocks.deleteCertificationFile,
}));

import { POST } from '@/app/api/profile/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireIdentity.mockResolvedValue({
    leaderId: 'leader-1',
    email: 'leader@example.com',
  });
  mocks.tx.leader.findUniqueOrThrow.mockResolvedValue({ id: 'leader-1' });
  for (const group of Object.values(mocks.tx))
    for (const method of Object.values(group))
      if (typeof method === 'function') method.mockResolvedValue({});
  mocks.tx.certification.findMany.mockResolvedValue([]);
  mocks.uploadCertificationFile.mockResolvedValue(
    'leader-1/generated-certificate.webp',
  );
});

describe('profile taxonomy submission', () => {
  it('sends Other skill and tool values to review without creating canonical rows', async () => {
    const request = new NextRequest('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Leader',
        experience: '10 years 0 months',
        ratedSkills: [],
        tools: [],
        projects: [
          {
            name: 'Cloud modernization',
            description: 'Modernized a legacy platform.',
            techStack: ['Azure Functions', 'React.js'],
          },
        ],
        otherSkills: [{ name: 'Emerging Runtime', proficiency: 4 }],
        otherTools: ['Internal Platform Tool'],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.tx.skill.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.tx.tool.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.project.create).toHaveBeenCalledWith({
      data: {
        leaderId: 'leader-1',
        name: 'Cloud modernization',
        description: 'Modernized a legacy platform.',
        techStack: ['Azure Functions', 'React.js'],
        status: 'UNKNOWN',
      },
    });
    expect(mocks.tx.reviewItem.create).toHaveBeenCalledTimes(2);
    expect(mocks.tx.reviewItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'skill',
        payload: expect.objectContaining({
          requestedName: 'Emerging Runtime',
          needsReview: true,
        }),
      }),
    });
    expect(mocks.tx.reviewItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'tool',
        payload: expect.objectContaining({
          requestedName: 'Internal Platform Tool',
          needsReview: true,
        }),
      }),
    });
  });

  it('stores repeatable certification records and returns their attachment metadata', async () => {
    mocks.tx.certification.create.mockResolvedValue({
      id: 'cert-1',
      name: 'Azure Solutions Architect',
      attachmentBlobName: null,
      attachmentFileName: null,
      attachmentContentType: null,
      attachmentSize: null,
    });
    const request = new NextRequest('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Leader',
        experience: '10 years 0 months',
        ratedSkills: [],
        projects: [],
        certifications: [
          {
            clientId: 'draft-cert-1',
            name: 'Azure Solutions Architect',
          },
        ],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.tx.certification.create).toHaveBeenCalledWith({
      data: {
        leaderId: 'leader-1',
        name: 'Azure Solutions Architect',
      },
      select: {
        id: true,
        name: true,
        attachmentBlobName: true,
        attachmentFileName: true,
        attachmentContentType: true,
        attachmentSize: true,
      },
    });
    expect(body.certifications).toEqual([
      {
        clientId: 'cert-1',
        id: 'cert-1',
        name: 'Azure Solutions Architect',
        hasAttachment: false,
      },
    ]);
  });

  it('stores a validated certificate image with its certification', async () => {
    const source = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer();
    mocks.tx.certification.create.mockImplementation(async ({ data }) => ({
      id: 'cert-image-1',
      name: data.name,
      attachmentBlobName: data.attachmentBlobName,
      attachmentFileName: data.attachmentFileName,
      attachmentContentType: data.attachmentContentType,
      attachmentSize: data.attachmentSize,
    }));
    const profile = JSON.stringify({
      fullName: 'Test Leader',
      experience: '10 years 0 months',
      ratedSkills: [],
      projects: [],
      certifications: [
        { clientId: 'draft-image-1', name: 'Cloud certification' },
      ],
    });
    const uploadedFile = {
      name: 'cloud-cert.png',
      type: 'image/png',
      size: source.byteLength,
      arrayBuffer: async () =>
        source.buffer.slice(
          source.byteOffset,
          source.byteOffset + source.byteLength,
        ),
    } as File;
    const request = {
      headers: new Headers({ 'content-type': 'multipart/form-data' }),
      formData: async () => ({
        get: (key: string) => (key === 'profile' ? profile : null),
        entries: function* () {
          yield ['profile', profile] as [string, string];
          yield [
            'certificationFile.draft-image-1',
            uploadedFile,
          ] as [string, File];
        },
      }),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.tx.certification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leaderId: 'leader-1',
          name: 'Cloud certification',
          attachmentBlobName: 'leader-1/generated-certificate.webp',
          attachmentContentType: 'image/webp',
          attachmentFileName: 'cloud-cert.webp',
          attachmentSize: expect.any(Number),
        }),
      }),
    );
    expect(mocks.uploadCertificationFile).toHaveBeenCalledWith(
      'leader-1',
      expect.objectContaining({
        data: expect.anything(),
        contentType: 'image/webp',
        fileName: 'cloud-cert.webp',
      }),
    );
    expect(
      mocks.tx.certification.create.mock.calls[0][0].data,
    ).not.toHaveProperty('imageData');
  });
});
