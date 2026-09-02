import { Link } from 'react-router-dom';
import { BookOpen, FileText, Home, Lock, LogIn, Mail, Receipt, Sparkles, Tag, UserPlus } from 'lucide-react';
import { AppStoreBadge, PlayStoreBadge } from './StoreBadges';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-12">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/pwa-icon-192.png" alt="Logo Faunex" className="w-8 h-8 rounded-xl" />
              <span className="font-display font-black text-lg text-foreground">Faunex</span>
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Photographie, identifie, collectionne. La faune sauvage autour de toi devient un bestiaire de cartes.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Explorer</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Home className="w-4 h-4" /> Accueil
                </Link>
              </li>
              <li>
                <Link to="/guides" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Tous les guides
                </Link>
              </li>
              <li>
                <Link to="/fonctionnalites" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Cas d'usage
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Télécharger l'app</h3>
            <div className="flex flex-col gap-2 mb-4">
              <a
                href="https://apps.apple.com/fr/app/faunex/id6795586686"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Télécharger Faunex sur l'App Store"
                className="inline-flex hover:scale-[1.02] transition-transform"
              >
                <AppStoreBadge className="h-9 w-auto text-foreground" />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=fr.faunex.app&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Télécharger Faunex sur Google Play"
                className="inline-flex hover:scale-[1.02] transition-transform"
              >
                <PlayStoreBadge className="h-9 w-auto text-foreground" />
              </a>
            </div>
            <ul className="space-y-2 pt-3 border-t border-border/50">
              <li>
                <Link to="/auth?mode=signup" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Créer un compte
                </Link>
              </li>
              <li>
                <Link to="/auth?mode=login" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Se connecter
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Légal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/tarifs" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Tarifs
                </Link>
              </li>
              <li>
                <Link to="/remboursement" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Remboursement
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Mentions légales & CGU
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col justify-end">
            <a href="mailto:contact@faunex.fr" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
              <Mail className="w-4 h-4" /> Contact
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground font-display">
          © {currentYear} Faunex. Fait avec passion pour les amoureux de la nature et les collectionneurs.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
