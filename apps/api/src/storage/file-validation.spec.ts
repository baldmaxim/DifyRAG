import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { getExtension, isAllowedExtension, safeFileName, validateUpload } from './file-validation';

describe('file-validation', () => {
  it('accepts allowed extensions', () => {
    expect(isAllowedExtension('pdf')).toBe(true);
    expect(isAllowedExtension('xlsx')).toBe(true);
    expect(isAllowedExtension('exe')).toBe(false);
  });

  it('extracts extensions case-insensitively', () => {
    expect(getExtension('Doc.PDF')).toBe('pdf');
    expect(getExtension('noext')).toBe('');
  });

  it('validates a good upload', () => {
    expect(() =>
      validateUpload({
        fileName: 'ks2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
        maxFileSizeBytes: 524_288_000,
      }),
    ).not.toThrow();
  });

  it('rejects disallowed extensions', () => {
    expect(() =>
      validateUpload({ fileName: 'x.exe', mimeType: 'application/octet-stream', maxFileSizeBytes: 1000 }),
    ).toThrow(BadRequestException);
  });

  it('rejects oversized files', () => {
    expect(() =>
      validateUpload({ fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 2000, maxFileSizeBytes: 1000 }),
    ).toThrow(BadRequestException);
  });

  it('rejects a mismatched mime type', () => {
    expect(() =>
      validateUpload({ fileName: 'x.pdf', mimeType: 'image/png', maxFileSizeBytes: 1000 }),
    ).toThrow(BadRequestException);
  });

  it('preserves Cyrillic and strips path traversal in safeFileName', () => {
    expect(safeFileName('../../КС-2 июнь.pdf')).toBe('КС-2_июнь.pdf');
    expect(safeFileName('C:\\temp\\report.xlsx')).toBe('report.xlsx');
  });
});
