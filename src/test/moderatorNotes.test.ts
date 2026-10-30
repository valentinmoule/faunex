import { describe, expect, it } from 'vitest';
import { moderatorNotesPrompt } from '../../supabase/functions/enrich-capture/moderator-notes';

describe('moderator identification observations', () => {
  it('includes the moderator observation without replacing observer input', () => {
    const observation = 'Coq au plumage coucou, crête simple rouge, plumage barré gris et blanc';
    expect(moderatorNotesPrompt(observation)).toContain(JSON.stringify(observation));
  });
  it('does not add observations when the field is empty', () => {
    expect(moderatorNotesPrompt(undefined)).toBe('');
    expect(moderatorNotesPrompt('   ')).toBe('');
  });
  it('rejects invalid input rather than inserting it into an AI prompt', () => {
    expect(() => moderatorNotesPrompt({ description: 'coq' })).toThrow();
    expect(() => moderatorNotesPrompt('a'.repeat(1501))).toThrow();
  });
});