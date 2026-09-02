import { Link } from 'react-router-dom';
import { AppStoreBadge, PlayStoreBadge } from './StoreBadges';

const linkClass =
  'text-sm text-muted-foreground hover:text-primary transition-colors font-body';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-12">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/pwa-icon-192.png" alt="Logo Faunex" className="w-8 h-8 rounded-xl" />
              <span className="font-display font-black text-lg text-foreground">Faunex</span>
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
              Photographie, identifie, collectionne. La faune sauvage autour de toi devient un
              bestiaire de cartes.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Explorer</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" className={linkClass}>Accueil</Link></li>
              <li><Link to="/guides" className={linkClass}>Tous les guides</Link></li>
              <li><Link to="/fonctionnalites" className={linkClass}>Cas d'usage</Link></li>
              <li><Link to="/tarifs" className={linkClass}>Tarifs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Compte</h3>
            <ul className="space-y-2.5">
              <li><Link to="/auth?mode=signup" className={linkClass}>Créer un compte</Link></li>
              <li><Link to="/auth?mode=login" className={linkClass}>Se connecter</Link></li>
              <li>
                <a href="mailto:contact@faunex.fr" className={linkClass}>Contact</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Légal</h3>
            <ul className="space-y-2.5">
              <li><Link to="/legal" className={linkClass}>Mentions légales & CGU</Link></li>
              <li><Link to="/confidentialite" className={linkClass}>Confidentialité</Link></li>
              <li><Link to="/remboursement" className={linkClass}>Remboursement</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground font-display">
            © {currentYear} Faunex. Fait avec passion pour les amoureux de la nature.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://apps.apple.com/fr/app/faunex/id6795586686"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Télécharger Faunex sur l'App Store"
              className="inline-flex hover:scale-[1.02] transition-transform"
            >
              <AppStoreBadge className="block h-10 w-auto" />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=fr.faunex.app&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Télécharger Faunex sur Google Play"
              className="inline-flex hover:scale-[1.02] transition-transform"
            >
              <PlayStoreBadge className="block h-10 w-auto" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
