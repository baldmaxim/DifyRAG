import { describe, expect, it } from 'vitest';
import { mapDifyIndexingStatus } from './dify-status';

describe('mapDifyIndexingStatus', () => {
  it('maps the indexing lifecycle statuses', () => {
    const lifecycle = ['waiting', 'parsing', 'cleaning', 'splitting', 'indexing', 'completed'];
    for (const status of lifecycle) {
      expect(mapDifyIndexingStatus(status)).toBe(status);
    }
  });

  it('maps error and archived/disabled', () => {
    expect(mapDifyIndexingStatus('error')).toBe('error');
    expect(mapDifyIndexingStatus('archived')).toBe('archived');
    expect(mapDifyIndexingStatus('disabled')).toBe('disabled');
  });

  it('defaults unknown/empty to waiting', () => {
    expect(mapDifyIndexingStatus('something-new')).toBe('waiting');
    expect(mapDifyIndexingStatus(null)).toBe('waiting');
    expect(mapDifyIndexingStatus(undefined)).toBe('waiting');
  });
});
