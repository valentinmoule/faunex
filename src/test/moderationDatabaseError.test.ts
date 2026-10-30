import { describe, expect, it } from 'vitest';
import { moderationDatabaseFailure } from '../../supabase/functions/enrich-capture/database-error';

describe('moderation database timeouts', () => {
  it('returns a recoverable business result for cancelled statements', () => {
    expect(moderationDatabaseFailure({ code: '57014', message: 'canceling statement due to statement timeout' })?.code).toBe('database_busy');
    expect(moderationDatabaseFailure({ message: 'canceling statement due to statement timeout' })?.code).toBe('database_busy');
  });
  it('does not hide unrelated database failures', () => {
    expect(moderationDatabaseFailure({ code: '23505', message: 'duplicate key' })).toBeNull();
  });
});