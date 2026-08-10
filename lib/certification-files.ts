import sharp from 'sharp';
import {
  CERTIFICATION_PDF_TYPE,
  isCertificationImageType,
  MAX_CERTIFICATION_IMAGE_BYTES,
  MAX_CERTIFICATION_PDF_BYTES,
} from '@/lib/certification-file-policy';

export type PreparedCertificationFile = {
  data: Buffer;
  contentType: 'image/webp' | 'application/pdf';
  fileName: string;
  size: number;
};

function safeBaseName(fileName: string) {
  return (
    fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180) || 'certificate'
  );
}

export async function prepareCertificationFile(
  file: File,
): Promise<PreparedCertificationFile> {
  if (file.type === CERTIFICATION_PDF_TYPE) {
    if (file.size > MAX_CERTIFICATION_PDF_BYTES)
      throw new Error('Certificate PDF must be 10 MB or smaller');
    const data = Buffer.from(await file.arrayBuffer());
    if (data.subarray(0, 5).toString('ascii') !== '%PDF-')
      throw new Error('Certificate PDF is not a valid PDF file');
    return {
      data,
      contentType: CERTIFICATION_PDF_TYPE,
      fileName: `${safeBaseName(file.name)}.pdf`,
      size: data.byteLength,
    };
  }

  if (!isCertificationImageType(file.type))
    throw new Error('Certificate must be a PDF, JPEG, PNG, or WebP file');
  if (file.size > MAX_CERTIFICATION_IMAGE_BYTES)
    throw new Error('Certificate image must be 5 MB or smaller');

  const source = Buffer.from(await file.arrayBuffer());
  let data: Buffer;
  try {
    data = await sharp(source)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
  } catch {
    throw new Error('Certificate image could not be processed');
  }

  return {
    data,
    contentType: 'image/webp',
    fileName: `${safeBaseName(file.name)}.webp`,
    size: data.byteLength,
  };
}
