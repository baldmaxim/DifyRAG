import { describe, expect, it } from 'vitest';
import { QdrantReadonlyClient } from './qdrant-readonly.client';

/**
 * The app must NEVER write to Qdrant (Dify owns it). The read-only client must
 * not expose upsert / delete points / update vectors / overwrite payload.
 */
describe('QdrantReadonlyClient is read-only', () => {
  const methods = Object.getOwnPropertyNames(QdrantReadonlyClient.prototype);

  it('has none of the forbidden write methods', () => {
    const forbidden = ['upsert', 'deletePoints', 'updateVectors', 'overwritePayload', 'delete', 'setPayload'];
    for (const name of forbidden) {
      expect(methods).not.toContain(name);
    }
  });

  it('has no method whose name implies a mutation', () => {
    const mutating = methods.filter((m) =>
      /upsert|delete|update|overwrite|create|put|patch|set|remove|drop/i.test(m),
    );
    expect(mutating).toEqual([]);
  });

  it('exposes only read operations', () => {
    const publicApi = methods.filter(
      (m) => m !== 'constructor' && !['headers', 'base', 'get'].includes(m),
    );
    expect(publicApi.sort()).toEqual(['getCollection', 'health', 'isConfigured', 'listCollections'].sort());
  });
});
