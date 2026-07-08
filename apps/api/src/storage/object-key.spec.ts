import { describe, expect, it } from 'vitest';
import { buildObjectKey } from './object-key';

describe('buildObjectKey', () => {
  const date = new Date(Date.UTC(2026, 5, 30)); // 2026-06

  it('builds the documented key layout', () => {
    const key = buildObjectKey({
      scope: 'project',
      projectCode: 'zilart-lot-31',
      documentId: 'doc-1',
      versionNo: 2,
      fileName: 'КС-2 june.pdf',
      date,
    });
    expect(key).toBe('documents/project/zilart-lot-31/2026/06/doc-1/2/КС-2_june.pdf');
  });

  it('uses "global" when no project code', () => {
    const key = buildObjectKey({
      scope: 'company',
      projectCode: null,
      documentId: 'doc-9',
      versionNo: 1,
      fileName: 'policy.pdf',
      date,
    });
    expect(key).toBe('documents/company/global/2026/06/doc-9/1/policy.pdf');
  });

  it('sanitizes path traversal in filenames', () => {
    const key = buildObjectKey({
      scope: 'project',
      projectCode: 'p1',
      documentId: 'd1',
      versionNo: 1,
      fileName: '../../etc/passwd',
      date,
    });
    expect(key).toContain('/d1/1/passwd');
    expect(key).not.toContain('..');
  });
});
