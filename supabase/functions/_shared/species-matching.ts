/** A failed catalogue lookup is not evidence that a species is new. */
export async function matchCatalogueSpecies(client: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> }, name: string, scientific: string | null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await client.rpc('match_animal', { p_name: name, p_scientific: scientific });
    if (!result.error) return Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    const retryable = result.error.code === '57014' || /timeout/i.test(result.error.message ?? '');
    if (!retryable || attempt === 2) throw new Error(`Catalogue lookup failed: ${result.error.code ?? 'unknown'}`);
    await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw new Error('Catalogue lookup failed');
}