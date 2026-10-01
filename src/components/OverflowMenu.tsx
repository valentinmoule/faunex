import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

export interface OverflowMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'destructive';
}

interface OverflowMenuProps {
  /** Libellé du bouton (accessibilité) : « Plus d’actions ». */
  label: string;
  items: OverflowMenuItem[];
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
}

/**
 * Bouton « ⋯ » ouvrant une petite liste d'actions (Renommer, Supprimer…).
 * Le panneau est rendu dans un portail (Radix) : il n'est jamais enfermé
 * dans un conteneur animé de la page.
 */
export function OverflowMenu({
  label,
  items,
  align = 'end',
  triggerClassName,
}: OverflowMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={
            triggerClassName ??
            'p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 hover:bg-background transition-colors'
          }
        >
          <MoreHorizontal className="w-4 h-4 text-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="z-50 min-w-[13.5rem] rounded-2xl border border-border bg-background p-1 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.label}
              onSelect={item.onSelect}
              className={`flex select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-display font-medium outline-none cursor-default transition-colors ${
                item.tone === 'destructive'
                  ? 'text-destructive data-[highlighted]:bg-destructive/10'
                  : 'text-foreground data-[highlighted]:bg-muted'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export default OverflowMenu;
