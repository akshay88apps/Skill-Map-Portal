import { randomUUID } from 'node:crypto';
import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  type UserDelegationKey,
} from '@azure/storage-blob';
import type { PreparedCertificationFile } from '@/lib/certification-files';

const containerName =
  process.env.AZURE_STORAGE_CERTIFICATIONS_CONTAINER || 'certifications';

let serviceClient: BlobServiceClient | undefined;
let cachedDelegation:
  | { key: UserDelegationKey; expiresOn: Date }
  | undefined;

function blobServiceClient() {
  if (serviceClient) return serviceClient;
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    serviceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    );
    return serviceClient;
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) throw new Error('Azure certificate storage is not configured');
  serviceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential({
      managedIdentityClientId: process.env.AZURE_CLIENT_ID,
    }),
  );
  return serviceClient;
}

function extensionFor(contentType: PreparedCertificationFile['contentType']) {
  return contentType === 'application/pdf' ? 'pdf' : 'webp';
}

export async function uploadCertificationFile(
  leaderId: string,
  file: PreparedCertificationFile,
) {
  const blobName = `${leaderId}/${randomUUID()}.${extensionFor(file.contentType)}`;
  const blob = blobServiceClient()
    .getContainerClient(containerName)
    .getBlockBlobClient(blobName);
  await blob.uploadData(file.data, {
    blobHTTPHeaders: {
      blobContentType: file.contentType,
      blobContentDisposition: `inline; filename="${file.fileName}"`,
    },
    conditions: { ifNoneMatch: '*' },
  });
  return blobName;
}

export async function deleteCertificationFile(blobName: string) {
  await blobServiceClient()
    .getContainerClient(containerName)
    .deleteBlob(blobName, { deleteSnapshots: 'include' });
}

async function userDelegationKey(service: BlobServiceClient) {
  const now = new Date();
  if (
    cachedDelegation &&
    cachedDelegation.expiresOn.getTime() > now.getTime() + 10 * 60 * 1000
  )
    return cachedDelegation.key;
  const startsOn = new Date(now.getTime() - 5 * 60 * 1000);
  const expiresOn = new Date(now.getTime() + 60 * 60 * 1000);
  const key = await service.getUserDelegationKey(startsOn, expiresOn);
  cachedDelegation = { key, expiresOn };
  return key;
}

export async function signedCertificationUrl(
  blobName: string,
  fileName: string,
  contentType: string,
) {
  const service = blobServiceClient();
  const blob = service
    .getContainerClient(containerName)
    .getBlockBlobClient(blobName);
  const startsOn = new Date(Date.now() - 60 * 1000);
  const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
  const safeFileName = fileName.replace(/["\\\r\n]/g, '');

  if (process.env.AZURE_STORAGE_CONNECTION_STRING)
    return blob.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      protocol: SASProtocol.HttpsAndHttp,
      startsOn,
      expiresOn,
      contentType,
      contentDisposition: `inline; filename="${safeFileName}"`,
    });

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      protocol: SASProtocol.Https,
      startsOn,
      expiresOn,
      contentType,
      contentDisposition: `inline; filename="${safeFileName}"`,
    },
    await userDelegationKey(service),
    accountName,
  ).toString();
  return `${blob.url}?${sas}`;
}

export function resetCertificationStorageForTests() {
  serviceClient = undefined;
  cachedDelegation = undefined;
}
