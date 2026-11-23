import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RevealStage from '@/components/capture/RevealStage';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/useSpeciesLocale', () => ({ useSpeciesName: () => ({ speciesName: (n: string) => n }) }));

const animal = { animal_name: 'Lapin hollandais', scientific_name: 'Oryctolagus cuniculus', rarity: 'ultra_rare', category: 'Mammifères' } as never;

/** Règle : sur la carte révélée, on peut quitter sans ranger ni corriger la capture. */
describe('RevealStage — quitter sans rien faire', () => {
  it('propose une croix qui quitte la révélation', () => {
    const onClose = vi.fn();
    render(<RevealStage phase="burst" rarity="ultra_rare" animal={animal} photo={null} onSkip={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas la croix pendant la montée de la révélation", () => {
    render(<RevealStage phase="charging" rarity="ultra_rare" animal={animal} photo={null} onSkip={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'common.close' })).toBeNull();
  });
});
