import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CancelSurveySheet } from '@/components/CancelSurveySheet';

/**
 * Modèle fidèle du client PostgREST : `insert()` seul ne déclenche aucune
 * requête, elle ne part que si le composant branche un `.then()`. Ce test
 * échoue donc si l'écriture redevient un `void builder` sans suite.
 */
let executed = false;
let insertedRow: Record<string, unknown> | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertedRow = row;
        return {
          then: (cb: (value: { data: null; error: null }) => void) => {
            executed = true;
            cb({ data: null, error: null });
          },
        };
      },
    }),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CancelSurveySheet', () => {
  beforeEach(() => {
    executed = false;
    insertedRow = null;
  });

  it('envoie le motif choisi en base quand on continue', async () => {
    const onOpenChange = vi.fn();
    const onContinue = vi.fn();

    render(<CancelSurveySheet open onOpenChange={onOpenChange} userId="u-1" onContinue={onContinue} />);

    fireEvent.click(screen.getByText('profile.premium.cancelSurvey.reasons.too_expensive'));
    fireEvent.click(screen.getByText('profile.premium.cancelSurvey.continue'));

    await waitFor(() => expect(executed).toBe(true));
    expect(insertedRow).toMatchObject({ user_id: 'u-1', reason: 'too_expensive' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onContinue).toHaveBeenCalled();
  });
});
