import { describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

/**
 * POLICY: physical deletion of S3 objects is forbidden. The StorageService must
 * never expose any delete method.
 */
describe('StorageService delete policy', () => {
  const methodNames = Object.getOwnPropertyNames(StorageService.prototype);

  it('has no deleteObject method', () => {
    expect(methodNames).not.toContain('deleteObject');
  });

  it('has no method whose name mentions delete/remove/destroy', () => {
    const forbidden = methodNames.filter((m) => /delete|remove|destroy/i.test(m));
    expect(forbidden).toEqual([]);
  });

  it('exposes only the allowed storage operations', () => {
    const publicApi = methodNames.filter(
      (m) => !m.startsWith('_') && m !== 'constructor' && m !== 'getClient',
    );
    expect(publicApi.sort()).toEqual(
      [
        'bucket',
        'copyObject',
        'createPresignedGetUrl',
        'createPresignedPutUrl',
        'getObjectMetadata',
        'headObject',
        'isConfigured',
      ].sort(),
    );
  });
});
