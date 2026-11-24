import { describe, it, expect } from 'vitest';
import { callLabelKey, licenseRank, pickBest } from './speciesCall';

const c = (license: string, author = 'A', url = 'https://x/a.mp3') => ({ url, author, license, format: 'audio/mpeg' });

describe('species call selection', () => {
  it('prefers public domain over attribution over non-commercial', () => {
    expect(licenseRank('cc0')).toBeLessThan(licenseRank('cc-by'));
    expect(licenseRank('http://creativecommons.org/licenses/by/4.0/')).toBeLessThan(licenseRank('cc-by-nc'));
    expect(pickBest([c('cc-by-nc'), c('cc0', 'B')])?.author).toBe('B');
  });
  it('rejects sounds without author or licence', () => {
    expect(pickBest([c('cc-by', ''), c('', 'B')])).toBeNull();
  });
  it('names the sound after the animal group', () => {
    expect(callLabelKey('Oiseaux')).toBe('labelSong');
    expect(callLabelKey('Insectes (monde)')).toBe('labelSong');
    expect(callLabelKey('Amphibiens')).toBe('labelSong');
    expect(callLabelKey('Mammifères')).toBe('labelCries');
    expect(callLabelKey('Poissons')).toBe('labelSounds');
    expect(callLabelKey(undefined)).toBe('labelSounds');
  });
});
