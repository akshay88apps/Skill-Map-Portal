import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { prepareCertificationFile } from '@/lib/certification-files';
import {
  MAX_CERTIFICATION_IMAGE_BYTES,
  MAX_CERTIFICATION_PDF_BYTES,
} from '@/lib/certification-file-policy';

function imageFile(
  bytes: Buffer,
  name = 'certificate.png',
  type = 'image/png',
) {
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as File;
}

describe('certification file processing', () => {
  it('validates and normalizes an uploaded certificate to WebP', async () => {
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

    const prepared = await prepareCertificationFile(imageFile(source));

    expect(prepared.contentType).toBe('image/webp');
    expect(prepared.fileName).toBe('certificate.webp');
    await expect(sharp(prepared.data).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 20,
      height: 20,
    });
  });

  it('preserves valid PDFs without re-encoding', async () => {
    const source = Buffer.from('%PDF-1.7\ncertificate-content');

    const prepared = await prepareCertificationFile(
      imageFile(source, 'credential.pdf', 'application/pdf'),
    );

    expect(prepared.contentType).toBe('application/pdf');
    expect(prepared.fileName).toBe('credential.pdf');
    expect(prepared.data).toEqual(source);
  });

  it('rejects unsupported types, fake PDFs, and oversized files', async () => {
    await expect(
      prepareCertificationFile(
        imageFile(Buffer.from('text'), 'cert.txt', 'text/plain'),
      ),
    ).rejects.toThrow('PDF, JPEG, PNG, or WebP');
    await expect(
      prepareCertificationFile(
        imageFile(Buffer.from('not-pdf'), 'cert.pdf', 'application/pdf'),
      ),
    ).rejects.toThrow('not a valid PDF');
    await expect(
      prepareCertificationFile({
        name: 'large.png',
        type: 'image/png',
        size: MAX_CERTIFICATION_IMAGE_BYTES + 1,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as File),
    ).rejects.toThrow('5 MB or smaller');
    await expect(
      prepareCertificationFile({
        name: 'large.pdf',
        type: 'application/pdf',
        size: MAX_CERTIFICATION_PDF_BYTES + 1,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as File),
    ).rejects.toThrow('10 MB or smaller');
  });
});
