import { describe, expect, it } from 'vitest';
import { activeMention, insertMention } from '@/lib/commentMentions';

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
});