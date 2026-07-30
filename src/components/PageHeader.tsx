import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({ children, className, sticky = false }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'pt-[max(env(safe-area-inset-top),1rem)]',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      {children}
    </header>
  );
}
