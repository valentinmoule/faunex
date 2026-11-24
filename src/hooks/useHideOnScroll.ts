import { useEffect, useState } from 'react';

/** Vrai quand l'utilisateur défile vers le bas (au-delà de `offset`), faux dès qu'il remonte. */
export function useHideOnScroll(enabled: boolean, offset = 80) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) { setHidden(false); return; }
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < offset) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, offset]);
  return hidden;
}
