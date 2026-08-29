import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Enveloppe les routes pour rejouer une animation d'entrée douce
 * à chaque changement de page (clé = pathname).
 */
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
      {children}
    </div>
  );
};

export default PageTransition;
