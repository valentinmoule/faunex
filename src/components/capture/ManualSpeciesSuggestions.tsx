import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { isVagueGroupName } from '@/lib/placeholderNames';

type Suggestion = { name: string; scientific_name: string | null };

interface Props {
  query: string;
  onPick: (s: Suggestion) => void;
}

/** Existing Bestiary tiles matching the typed name, so manual entries reuse them. */
const ManualSpeciesSuggestions = ({ query, onPick }: Props) => {
  const { t } = useTranslation('capture');
  const [items, setItems] = useState<Suggestion[]>([]);
  const term = query.trim();

  useEffect(() => {
    if (term.length < 3) { setItems([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      const safe = term.replace(/[%_,()]/g, ' ');
      const { data } = await supabase
        .from('animals')
        .select('name, scientific_name')
        .ilike('name', `%${safe}%`)
        .order('name')
        .limit(6);
      if (!cancelled) setItems(((data ?? []) as Suggestion[]).filter(s => s.name.toLowerCase() !== term.toLowerCase()));
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [term]);

  const vague = isVagueGroupName(term);
  if (!items.length && !vague) return null;

  return (
    <div className="space-y-1">
      {vague && <p className="text-primary-foreground/80 text-xs font-body">{t('manual.vagueHint')}</p>}
      {items.length > 0 && (
        <>
          <p className="text-primary-foreground/60 text-[10px] uppercase tracking-wide font-body">{t('manual.nameSuggestions')}</p>
          <ul className="divide-y divide-primary-foreground/10">
            {items.map(s => (
              <li key={`${s.name}-${s.scientific_name}`}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="w-full text-left py-2 text-sm text-primary-foreground font-body"
                >
                  {s.name}
                  {s.scientific_name && <span className="italic text-primary-foreground/60"> · {s.scientific_name}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ManualSpeciesSuggestions;
