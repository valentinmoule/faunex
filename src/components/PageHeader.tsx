import { cn } from '@/lib/utils';
import { useEffect, useRef, type ReactNode } from 'react';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  /** Replie l'en-tête au défilement vers le bas, le réaffiche à la remontée. */
  autoHide?: boolean;
  /** Signalée à chaque changement d'état : les barres collées sous l'en-tête suivent le mouvement. */
  onHiddenChange?: (hidden: boolean) => void;
}

export function PageHeader({ children, className, sticky = false, autoHide = false, onHiddenChange }: PageHeaderProps) {
  const hidden = useHideOnScroll(sticky && autoHide);
  const notify = useRef(onHiddenChange);
  notify.current = onHiddenChange;
  useEffect(() => {
    notify.current?.(hidden);
  }, [hidden]);
  return (
    <header
      className={cn(
        'pt-[max(env(safe-area-inset-top),1rem)]',
        sticky && 'page-header-sticky sticky top-0 z-40',
        autoHide && 'transition-transform duration-300 ease-out will-change-transform',
        hidden && '-translate-y-full',
        className
      )}
    >
      {children}
    </header>
  );
}
