import { useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { MoreHorizontal } from 'lucide-react';

export interface OverflowMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'destructive';
}

interface OverflowMenuProps {
  /** Libellé du bouton (accessibilité) : « Plus d'actions ». */
  label: string;
  items: OverflowMenuItem[];
  /** Conservé pour compatibilité d'API ; ignoré avec le panneau bas. */
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  /** Classes de l'icône du déclencheur (taille/couleur selon l'endroit d'usage). */
  iconClassName?: string;
  /** Conservé pour compatibilité d'API ; ignoré avec le panneau bas. */
  contentClassName?: string;
  /** Titre optionnel affiché en haut du panneau. */
  title?: string;
}

/**
 * Bouton « ⋯ » ouvrant une fenêtre basse d'actions (Renommer, Supprimer…),
 * fermable d'un swipe vers le bas. Liste à plat, sans encadré.
 * Le panneau est porté au-dessus des fiches plein écran (z 1400/1401).
 */
export function OverflowMenu({
  label,
  items,
  triggerClassName,
  iconClassName,
  title,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={
            triggerClassName ??
            'p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 hover:bg-background transition-colors'
          }
        >
          <MoreHorizontal className={iconClassName ?? 'w-4 h-4 text-foreground'} aria-hidden="true" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1401] rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />
          <div className="px-3 py-3">
            {title && (
              <h2 className="px-3 pb-2 text-sm font-display font-semibold text-muted-foreground">{title}</h2>
            )}
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={`flex w-full select-none items-center gap-3 px-3 py-3.5 text-left text-[15px] font-display font-medium outline-none transition-colors active:bg-muted ${
                      item.tone === 'destructive' ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default OverflowMenu;
