import { BadRequestException } from '@nestjs/common';

/** Allowlisted upload extensions (see CLAUDE.md / prompt 03). */
export const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'md',
  'jpg',
  'jpeg',
  'png',
  'zip',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const EXTENSION_MIME: Record<AllowedExtension, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain', 'text/x-markdown'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}

export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Sanitize a filename for safe use in an S3 object key (no path traversal).
 * Unicode letters/digits (incl. Cyrillic) are preserved; only unsafe characters
 * are collapsed to underscores.
 */
export function safeFileName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '');
  const cleaned = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+/, '');
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'file';
}

export interface FileValidationInput {
  fileName: string;
  mimeType: string;
  sizeBytes?: number | bigint | null;
  maxFileSizeBytes: number;
}

/** Validate extension allowlist, mime type plausibility and size. Throws BadRequest on failure. */
export function validateUpload(input: FileValidationInput): void {
  const ext = getExtension(input.fileName);
  if (!isAllowedExtension(ext)) {
    throw new BadRequestException(
      `File extension ".${ext}" is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }

  const allowedMimes = EXTENSION_MIME[ext];
  const mime = input.mimeType?.toLowerCase().split(';')[0]?.trim() ?? '';
  if (mime && !allowedMimes.includes(mime) && mime !== 'application/octet-stream') {
    throw new BadRequestException(`MIME type "${input.mimeType}" does not match ".${ext}"`);
  }

  if (input.sizeBytes != null) {
    const size = typeof input.sizeBytes === 'bigint' ? input.sizeBytes : BigInt(input.sizeBytes);
    if (size <= 0n) {
      throw new BadRequestException('File size must be positive');
    }
    if (size > BigInt(input.maxFileSizeBytes)) {
      throw new BadRequestException(
        `File exceeds max size of ${input.maxFileSizeBytes} bytes`,
      );
    }
  }
}
