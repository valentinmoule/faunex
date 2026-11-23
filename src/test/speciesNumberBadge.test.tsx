import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpeciesNumberBadge from '@/components/SpeciesNumberBadge';
import frBestiary from '@/i18n/locales/fr/bestiary.json';

// Le libellé de grande famille est localisé ailleurs : on le rend tel quel ici.
vi.mock('@/lib/bestiary', () => ({ categoryLabel: (cat: string) => cat }));

// On réutilise le vrai modèle français « N° {{number}} » pour que le test
// échoue si le libellé ou le format du numéro change.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'bestiary.speciesNumber'
        ? String(frBestiary.bestiary.speciesNumber).replace('{{number}}', String(opts?.number ?? ''))
        : key,
  }),
}));

/**
 * Règle : la pastille affiche le numéro d'espèce (3 chiffres minimum) suivi de
 * la grande famille, et rien du tout tant que la fiche n'a pas de numéro.
 */
describe('SpeciesNumberBadge', () => {
  it('affiche le numéro et la grande famille', () => {
    render(<SpeciesNumberBadge speciesNumber={8} category="Oiseaux" />);
    expect(screen.getByText('N° 008')).toBeTruthy();
    expect(screen.getByText('Oiseaux')).toBeTruthy();
  });

  it('ne remplit pas les numéros à 4 chiffres', () => {
    render(<SpeciesNumberBadge speciesNumber={9910} category="Insectes" />);
    expect(screen.getByText('N° 9910')).toBeTruthy();
  });

  it('n’affiche rien sans numéro', () => {
    const { container } = render(<SpeciesNumberBadge speciesNumber={null} category="Oiseaux" />);
    expect(container.textContent).toBe('');
  });
});
