/**
 * Supabase caps every request at 1000 rows. This helper pages through a query
 * until every row is loaded, so users with large collections see everything.
 */
export const fetchAllRows = async <T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<{ data: T[]; error: any }> => {
  let all: T[] = [];
  let page = 0;
  // Hard safety bound (100k rows) to avoid infinite loops.
  while (page < 100) {
    const { data, error } = await build(page * pageSize, (page + 1) * pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return { data: all, error: null };
};
