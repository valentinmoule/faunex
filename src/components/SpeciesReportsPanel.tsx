import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  species_name: string;
  scientific_name: string | null;
  reason: string | null;
  created_at: string;
}

/** Backoffice : fiches du Bestiaire signalées par les explorateurs, regroupées par espèce. */
export default function SpeciesReportsPanel() {
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('species_reports')
      .select('id,species_name,scientific_name,reason,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setReports(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const close = async (name: string, status: 'resolved' | 'dismissed') => {
    const ids = (reports ?? []).filter(r => r.species_name.toLowerCase() === name.toLowerCase()).map(r => r.id);
    const { error } = await supabase.from('species_reports').update({ status }).in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(status === 'resolved' ? 'Signalement traité' : 'Signalement ignoré');
    void load();
  };

  if (!reports) return <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  if (reports.length === 0) return <p className="py-16 text-center font-display text-muted-foreground">Aucune fiche signalée</p>;

  const groups = new Map<string, Report[]>();
  for (const r of reports) {
    const k = r.species_name.toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <div className="mx-auto max-w-lg divide-y divide-border">
      {[...groups.values()].map(list => (
        <div key={list[0].id} className="space-y-2 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="font-display font-bold text-foreground">{list[0].species_name}</p>
              {list[0].scientific_name && <p className="text-xs italic text-muted-foreground">{list[0].scientific_name}</p>}
            </div>
            <span className="text-xs text-muted-foreground">{list.length} signalement{list.length > 1 ? 's' : ''}</span>
          </div>
          {list.filter(r => r.reason).map(r => <p key={r.id} className="text-sm text-muted-foreground">« {r.reason} »</p>)}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => close(list[0].species_name, 'resolved')}>Marquer traité</Button>
            <Button size="sm" variant="outline" onClick={() => close(list[0].species_name, 'dismissed')}>Ignorer</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
