/** A failed catalogue lookup is not evidence that a species is new. */

/**
 * Transient database errors worth retrying: statement timeout during heavy
 * jobs (57014) and connection saturation/failure (53300 "remaining connection
 * slots", 08000/08006 connection exceptions, pooler disconnects).
 * These must never be treated as "the species cannot be verified".
 */
export function isTransientDbError(code?: string, message?: string): boolean {
  if (code === '57014' || code === '53300' || code === '08000' || code === '08006') return true;
  return /timeout|remaining connection slots|too many connections|connection.*(refused|terminated|failure)|terminating connection/i
    .test(message ?? '');
}

export async function matchCatalogueSpecies(client: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> }, name: string, scientific: string | null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await client.rpc('match_animal', { p_name: name, p_scientific: scientific });
    if (!result.error) return Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    if (!isTransientDbError(result.error.code, result.error.message) || attempt === 2)
      throw new Error(`Catalogue lookup failed: ${result.error.code ?? 'unknown'}`);
    await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw new Error('Catalogue lookup failed');
}
