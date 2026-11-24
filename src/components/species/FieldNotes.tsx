import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Bandeau de repères rapides : colonnes à plat séparées par un filet. */
export function FieldStatStrip({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="field-stats grid divide-x divide-border/70" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col items-center gap-1 px-2 py-1 text-center">
          <span className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{it.label}</span>
          <span className="min-w-0 max-w-full truncate text-sm font-display font-extrabold text-foreground">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Titre de section du carnet, texte simple sans icône. */
export function FieldSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="field-section-title px-1 text-[13px] font-display font-black uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Entrée de carnet : libellé fort puis texte courant, filet vert à gauche. */
export function FieldEntry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field-entry pl-4">
      <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-primary">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">{children}</p>
    </div>
  );
}

const IUCN = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'] as const;
export function parseIucn(raw?: string | null): (typeof IUCN)[number] | 'DD' | null {
  const m = raw?.trim().toUpperCase().match(/^(LC|NT|VU|EN|CR|EW|EX|DD)\b/);
  return (m?.[1] as (typeof IUCN)[number] | 'DD') ?? null;
}

/** Échelle UICN visuelle, statut courant surligné ; texte brut sinon. */
export function IucnScale({ status }: { status?: string | null }) {
  const { t } = useTranslation();
  const code = parseIucn(status);
  if (!code || code === 'DD') {
    return <p className="px-1 text-[15px] text-foreground/85">{code === 'DD' ? t('capture.detail.iucn.DD') : status || t('capture.detail.notSet')}</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-1" role="img" aria-label={t(`capture.detail.iucn.${code}`)}>
        {IUCN.map((c) => (
          <span key={c} data-active={c === code} data-code={c} className="iucn-step flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-display font-black">
            {c}
          </span>
        ))}
      </div>
      <p className="px-1 text-sm font-display font-bold text-foreground">{t(`capture.detail.iucn.${code}`)}</p>
    </div>
  );
}
