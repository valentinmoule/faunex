import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

import { useSpeciesNaturalHistory } from '@/hooks/useSpeciesNaturalHistory';

/** Reproduit la forme d'une réponse HTTP rejetée par la fonction de recherche. */
const httpError = (status: number, code: string) =>
  Object.assign(new Error(`Edge function returned ${status}: Error, {"error":"${code}"}`), {
    name: 'FunctionsHttpError',
    context: { status },
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('Recherche des mensurations et de la classification', () => {
  beforeEach(() => invoke.mockReset());

  it('traite une identité non résolue comme une donnée absente, jamais comme un plantage', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(404, 'unresolved_identity') });
    const { result } = renderHook(() => useSpeciesNaturalHistory('Xysticus', 'Xysticus sp.', true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('traite une fiche hors catalogue comme une donnée absente', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(400, 'invalid_species') });
    const { result } = renderHook(() => useSpeciesNaturalHistory('Espèce inventée', 'Novus novus', true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('signale toujours une panne réelle de la source', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(503, 'source_unavailable') });
    const { result } = renderHook(() => useSpeciesNaturalHistory('Requin-renard', 'Alopias vulpinus', true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
