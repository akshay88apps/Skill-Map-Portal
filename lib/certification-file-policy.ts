export const CERTIFICATION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const CERTIFICATION_PDF_TYPE = 'application/pdf';

export const MAX_CERTIFICATION_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CERTIFICATION_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_CERTIFICATION_UPLOAD_BYTES = 30 * 1024 * 1024;

export function isCertificationImageType(value: string) {
  return CERTIFICATION_IMAGE_TYPES.includes(
    value as (typeof CERTIFICATION_IMAGE_TYPES)[number],
  );
}

export function isCertificationFileType(value: string) {
  return isCertificationImageType(value) || value === CERTIFICATION_PDF_TYPE;
}
