import { describe, expect, it } from 'vitest';
import { moderatorNotesPrompt, needsBreedClarification } from '../../supabase/functions/enrich-capture/moderator-notes';

describe('moderator identification observations', () => {
  it('blocks a certain duplicate verdict when the AI cannot distinguish breeds mentioned in notes', () => {
    expect(needsBreedClarification(false, true, { breed_uncertain: true })).toBe(true);
    expect(needsBreedClarification(false, true, { breed_uncertain: false })).toBe(false);
  });
  it('preserves explicit forced identification and ordinary previews', () => {
    expect(needsBreedClarification(true, true, { breed_uncertain: true })).toBe(false);
    expect(needsBreedClarification(false, false, { breed_uncertain: true })).toBe(false);
  });
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