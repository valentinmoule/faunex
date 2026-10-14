import { ReactNode, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { peekPendingShelve } from '@/lib/shelveAnimation';

// Ordre des onglets de la barre de navigation (gauche → droite).
const TAB_ORDER = ['/home', '/bestiaire', '/capture', '/explorers', '/leaderboard', '/profile'];
const tabIndex = (path: string) => TAB_ORDER.findIndex((p) => path === p || path.startsWith(p + '/'));

/**
 * Rejoue une animation d'entrée à chaque changement de page.
 * Entre deux onglets du menu, la page glisse dans le sens de la navigation :
 * depuis la droite si l'onglet est à droite, depuis la gauche sinon.
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prev = useRef(location.pathname);
  const dir = useRef('');
  const [completedPath, setCompletedPath] = useState<string | null>(null);

  if (prev.current !== location.pathname) {
    const from = tabIndex(prev.current);
    const to = tabIndex(location.pathname);
    dir.current = from >= 0 && to >= 0 && from !== to ? (to > from ? 'page-transition-right' : 'page-transition-left') : '';
    prev.current = location.pathname;
  }

  const skip = location.pathname === '/bestiaire' && peekPendingShelve();
  return (
    <div
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
