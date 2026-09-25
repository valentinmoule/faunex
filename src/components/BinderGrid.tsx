import { ReactNode, useEffect, useState } from 'react';

/**
 * 3-column grid that plays a "cards slid into binder sleeves" intro
 * each time a collection is opened (introKey change). Later filter
 * changes don't replay it.
 */
export function BinderGrid({ introKey, children }: { introKey: string; children: ReactNode }) {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    setIntro(true);
    const t = window.setTimeout(() => setIntro(false), 1400);
    return () => window.clearTimeout(t);
  }, [introKey]);
  return (
    <div key={introKey} className={`grid grid-cols-3 gap-2 ${intro ? 'binder-intro' : ''}`}>
      {children}
    </div>
  );
}

export default BinderGrid;
