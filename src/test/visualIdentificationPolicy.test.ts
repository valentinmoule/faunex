import { describe, expect, it } from 'vitest';
import { moderationVisionModels, needsIndependentVisualCheck } from '../../supabase/functions/_shared/visual-identification-policy';

describe('economical visual verification', () => {
  it('checks bedbug claims regardless of self-reported certainty', () => {
    expect(needsIndependentVisualCheck({ animal_name: 'Punaise de lit', scientific_name: 'Cimex lectularius' })).toBe(true);
    expect(needsIndependentVisualCheck({ animal_name: 'Punaise des lits', scientific_name: 'Cimicidae' })).toBe(true);
  });
  it('does not add a paid verification to ordinary clear identifications', () => {
    expect(needsIndependentVisualCheck({ animal_name: 'Dromadaire', scientific_name: 'Camelus dromedarius' })).toBe(false);
  });
  it('uses stronger vision only for an explicitly advanced moderation request', () => {
    expect(moderationVisionModels('high', false)).toEqual(['google/gemini-3.8-flash']);
    expect(moderationVisionModels('standard', false)[0]).toBe('google/gemini-3.1-flash-lite');
  });
  it('keeps forced documentary names on the economical text model', () => {
    expect(moderationVisionModels('high', true)[0]).toBe('google/gemini-3.1-flash-lite');
  });
});