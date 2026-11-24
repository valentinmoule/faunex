import { describe, expect, it } from 'vitest';
import { navSlot, slideDirection } from '@/lib/navOrder';

describe('Sens des transitions selon la barre du bas', () => {
  it('suit l’ordre Collection, Terrain, Capture, Explorateurs, Défis', () => {
    expect([navSlot('/home'), navSlot('/home', '?tab=map'), navSlot('/capture'), navSlot('/explorers'), navSlot('/defis')]).toEqual([0, 1, 2, 3, 4]);
  });
  it('rattache l’Académie à Défis et le profil à aucun onglet', () => {
    expect(navSlot('/apprendre')).toBe(4);
    expect(navSlot('/profile')).toBe(-1);
  });
  it('Collection → Terrain glisse depuis la droite, Défis → Explorateurs depuis la gauche', () => {
    expect(slideDirection(0, 1)).toBe('right');
    expect(slideDirection(4, 3)).toBe('left');
    expect(slideDirection(-1, 2)).toBeNull();
  });
});
