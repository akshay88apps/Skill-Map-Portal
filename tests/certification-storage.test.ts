import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadData: vi.fn(),
  deleteBlob: vi.fn(),
  generateSasUrl: vi.fn(),
  getUserDelegationKey: vi.fn(),
  generateSas: vi.fn(),
  credentialOptions: undefined as unknown,
  serviceUrl: '',
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: class {
    constructor(options: unknown) {
      mocks.credentialOptions = options;
    }
  },
}));

vi.mock('@azure/storage-blob', () => {
  const blockBlob = {
    url: 'https://skillmapstore.blob.core.windows.net/certifications/blob',
    uploadData: mocks.uploadData,
    generateSasUrl: mocks.generateSasUrl,
  };
  const container = {
    getBlockBlobClient: vi.fn(() => blockBlob),
    deleteBlob: mocks.deleteBlob,
  };
  return {
    BlobServiceClient: class {
      static fromConnectionString = vi.fn();
      constructor(url: string) {
        mocks.serviceUrl = url;
      }
      getContainerClient() {
        return container;
      }
      getUserDelegationKey = mocks.getUserDelegationKey;
    },
    BlobSASPermissions: { parse: vi.fn(() => ({ read: true })) },
    generateBlobSASQueryParameters: (...args: unknown[]) => {
      mocks.generateSas(...args);
      return { toString: () => 'sp=r&sig=user-delegation-signature' };
    },
    SASProtocol: { Https: 'https', HttpsAndHttp: 'https,http' },
  };
});

import {
  resetCertificationStorageForTests,
  signedCertificationUrl,
  uploadCertificationFile,
} from '@/lib/certification-storage';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AZURE_STORAGE_ACCOUNT_NAME = 'skillmapstore';
  process.env.AZURE_CLIENT_ID = 'managed-identity-client-id';
  delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  mocks.getUserDelegationKey.mockResolvedValue({ signedOid: 'delegated' });
  resetCertificationStorageForTests();
});

afterEach(() => {
  delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
  delete process.env.AZURE_CLIENT_ID;
  resetCertificationStorageForTests();
});

describe('Azure certification blob storage', () => {
  it('uploads normalized files with managed identity and no public access key', async () => {
    const blobName = await uploadCertificationFile('leader-1', {
      data: Buffer.from('certificate'),
      contentType: 'application/pdf',
      fileName: 'credential.pdf',
      size: 11,
    });

    expect(mocks.serviceUrl).toBe(
      'https://skillmapstore.blob.core.windows.net',
    );
    expect(mocks.credentialOptions).toEqual({
      managedIdentityClientId: 'managed-identity-client-id',
    });
    expect(blobName).toMatch(/^leader-1\/[a-f0-9-]+\.pdf$/);
    expect(mocks.uploadData).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        blobHTTPHeaders: expect.objectContaining({
          blobContentType: 'application/pdf',
          blobContentDisposition: 'inline; filename="credential.pdf"',
        }),
        conditions: { ifNoneMatch: '*' },
      }),
    );
  });

  it('creates a ten-minute read-only user-delegation SAS URL', async () => {
    const url = await signedCertificationUrl(
      'leader-1/private.pdf',
      'credential.pdf',
      'application/pdf',
    );

    expect(mocks.getUserDelegationKey).toHaveBeenCalledOnce();
    expect(mocks.generateSas).toHaveBeenCalledWith(
      expect.objectContaining({
        containerName: 'certifications',
        blobName: 'leader-1/private.pdf',
        permissions: { read: true },
        contentType: 'application/pdf',
      }),
      { signedOid: 'delegated' },
      'skillmapstore',
    );
    expect(url).toContain('sp=r&sig=user-delegation-signature');
  });
});
