import type { ReactNode } from 'react';

export default function DetailRow({ icon, label, value, action }: {
  icon: ReactNode; label: string; value: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground/85 leading-snug mt-0.5 break-words">{value}</p>
      </div>
      {action}
    </div>
  );
}