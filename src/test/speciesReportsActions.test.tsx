import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ remove: vi.fn(), update: vi.fn(), toastError: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'admin' } } }) }));
vi.mock('@/hooks/useSpeciesLocale', () => ({ useSpeciesName: () => ({ speciesName: (name: string) => name }) }));
vi.mock('@/hooks/useCatalogueModeration', () => ({ useCatalogueModeration: () => ({ canDeleteSpecies: true }), deleteBestiarySpecies: mocks.remove }));
vi.mock('@/components/CardDetailSheet', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.toastError, info: vi.fn(), warning: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/data/mockData', () => ({ normalizeRarity: (value: string) => value }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
 const query: any = {
  select: () => query, eq: () => query, in: () => query,
  order: async () => ({ data: [{ id: 'report-1', species_name: 'Lion', scientific_name: 'Panthera leo', reason: 'incorrect', report_type: 'wrong_species', created_at: '2026-10-29' }] }),
  maybeSingle: async () => ({ data: { name: 'Lion', scientific_name: 'Panthera leo', category: 'Mammifères', rarity: 'common' } }),
  update: (value: unknown) => { mocks.update(value); return { in: (field: string, ids: string[]) => ({ eq: () => ({ select: async () => ({ data: ids.map(id => ({ id })) }) }) }) }; },
 };
 return query;
} } }));
import SpeciesReportsPanel from '@/components/SpeciesReportsPanel';
async function confirmDelete() {
 render(<SpeciesReportsPanel />);
 fireEvent.click(await screen.findByRole('button', { name: 'species.reportsAdmin.delete' }));
 fireEvent.click(await screen.findByRole('button', { name: 'species.adminDelete.confirm' }));
}
describe('Reported entry deletion', () => {
 beforeEach(() => { vi.clearAllMocks(); mocks.remove.mockResolvedValue(undefined); });
 it('uses the guarded deletion with the current exact catalogue identity', async () => {
  await confirmDelete();
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('Lion', 'Panthera leo'));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ status: 'resolved' }));
 });
 it('keeps reports pending when catalogue deletion fails', async () => {
  mocks.remove.mockRejectedValue(new Error('permission denied'));
  await confirmDelete();
  await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
  expect(mocks.update).not.toHaveBeenCalled();
  expect(screen.getByText('Lion')).toBeInTheDocument();
 });
});
