import { describe, expect, it } from 'vitest';
import { moderationVisionModels } from '../../supabase/functions/_shared/visual-identification-policy';

describe('economical visual verification', () => {
  it('moderator analyses start on the stronger vision model', () => {
    expect(moderationVisionModels('high', false)).toEqual(['google/gemini-3.8-flash']);
    expect(moderationVisionModels('standard', false)).toEqual(['google/gemini-3.8-flash', 'google/gemini-3.1-flash-lite']);
  });
  it('keeps forced documentary names on the economical text model', () => {
    expect(moderationVisionModels('high', true)[0]).toBe('google/gemini-3.1-flash-lite');
  });
});