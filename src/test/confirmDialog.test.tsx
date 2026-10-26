import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Règle : aucun abonnement ni abonné n'est retiré sans un appui explicite sur
 * le bouton de confirmation. Fermer la modale (fond, Échap) ne doit rien faire.
 */
describe('ConfirmDialog', () => {
  it('n’exécute l’action que sur le bouton de confirmation', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Se désabonner de Léa ?"
        confirmLabel="Se désabonner"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(document.querySelector('.delete-confirm-scrim') as HTMLElement);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Se désabonner'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('reste ouverte et bloquée pendant l’exécution', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        busy
        title="Se désabonner de Léa ?"
        confirmLabel="Se désabonner"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(document.querySelector('.delete-confirm-scrim') as HTMLElement);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Se désabonner')).toBeDisabled();
  });

  it('ne rend rien quand elle est fermée', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Se désabonner de Léa ?"
        confirmLabel="Se désabonner"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );
    expect(document.querySelector('.delete-confirm-card')).toBeNull();
  });
});
