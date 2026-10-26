import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: ReactNode;
  /** Empêche la fermeture et les doubles validations pendant l'action. */
  busy?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modale de confirmation centrée (même carte que la libération d'une capture).
 * Portée au-dessus de la page pour échapper aux enveloppes animées.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  icon,
  busy = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[10001] flex items-center justify-center px-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="delete-confirm-scrim" onClick={() => !busy && onOpenChange(false)} />
      <div className="delete-confirm-card bg-background">
        {icon && (
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <h4 className="font-display font-bold text-base leading-tight text-foreground">{title}</h4>
        {description && (
          <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{description}</p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => !busy && onOpenChange(false)}
            disabled={busy}
            className="py-3 rounded-2xl bg-muted text-foreground font-display font-semibold text-sm transition-colors hover:bg-muted/70 disabled:opacity-50"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="py-3 rounded-2xl bg-primary text-primary-foreground font-display font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
