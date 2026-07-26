import { useEffect, useState } from 'react';

export interface CityResult {
  nom: string;
  code: string;
  codeDepartement: string;
  codesPostaux: string[];
}

/** Debounced commune search against geo.api.gouv.fr. */
export const useCitySearch = (enabled: boolean) => {
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const q = citySearch.trim();
    if (q.length < 2) {
      setCityResults([]);
      return;
    }
    let cancelled = false;
    setCityLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codeDepartement,codesPostaux&boost=population&limit=20`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setCityResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCityResults([]);
      } finally {
        if (!cancelled) setCityLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [citySearch, enabled]);

  return { citySearch, setCitySearch, cityResults, setCityResults, cityLoading };
};
