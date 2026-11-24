import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { peekPendingShelve } from '@/lib/shelveAnimation';
import { navSlot, slideDirection } from '@/lib/navOrder';

/**
 * Rejoue une animation d'entrée à chaque changement de page.
 * Entre deux onglets de la barre du bas, la page glisse dans le sens de la
 * navigation : depuis la droite si l'onglet est à droite, depuis la gauche sinon.
 * Collection et Terrain partagent la même page : on rejoue le glissement sans
 * la remonter, pour garder son état.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const slot = navSlot(location.pathname, location.search);
  const prevPath = useRef(location.pathname);
  const prevSlot = useRef(slot);
  const dir = useRef('');
  const ref = useRef<HTMLDivElement>(null);
  const [completedPath, setCompletedPath] = useState<string | null>(null);

  if (prevPath.current !== location.pathname) {
    const d = slideDirection(prevSlot.current, slot);
    dir.current = d ? `page-transition-${d}` : '';
    prevPath.current = location.pathname;
    prevSlot.current = slot;
  }

  // Même page, autre onglet (Collection ↔ Terrain) : glissement sans remontage.
  useEffect(() => {
    if (prevSlot.current === slot) return;
    const d = slideDirection(prevSlot.current, slot);
    prevSlot.current = slot;
    const el = ref.current;
    if (!d || !el?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const x = d === 'right' ? 28 : -28;
    el.animate(
      [{ opacity: 0, transform: `translate3d(${x}px,0,0)` }, { opacity: 1, transform: 'none' }],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [slot]);

  // Le rangement d'une capture se joue sur Mon Faunex : aucune transformation
  // autour de la page, sinon la carte volante (position fixe) serait décalée.
  const skip = location.pathname === '/home' && peekPendingShelve();
  return (
    <div
      ref={ref}
      key={location.pathname}
      className={skip || completedPath === location.pathname ? '' : dir.current || 'page-transition'}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setCompletedPath(location.pathname);
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
