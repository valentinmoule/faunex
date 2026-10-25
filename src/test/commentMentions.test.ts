import { describe, expect, it } from 'vitest';
import { activeMention, insertMention, mentionSearchFilter } from '@/lib/commentMentions';

describe('comment mentions', () => {
  it('finds an @username in a reply', () => {
    expect(activeMention('Merci @valentin')).toEqual({ query: 'valentin', start: 6, end: 15 });
  });
  it('does not treat an email address as a mention', () => {
    expect(activeMention('test@valentin')).toBeNull();
  });
  it('inserts the selected username with exactly one @', () => {
    expect(insertMention('Merci @val !', { start: 6, end: 10 }, '@valentin')).toBe('Merci @valentin  !');
  });
  it('search matches the displayed pseudo, not only the handle', () => {
    const filter = mentionSearchFilter('pepette');
    expect(filter).toContain('display_name.ilike.pepette%');
    expect(filter).toContain('username.ilike.pepette%');
  });
  it('escapes underscores in the search pattern', () => {
    expect(mentionSearchFilter('val_en')).toContain('display_name.ilike.val\\_en%');
    expect(mentionSearchFilter('val_en')).toContain('username.ilike.@val\\_en%');
  });
});
