import { Link } from 'react-router-dom';
import { BookOpen, FileText, Home, Mail, Sparkles, UserPlus } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-12">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/pwa-icon-192.png" alt="Faunex" className="w-8 h-8 rounded-xl" />
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
            <h3 className="font-display font-bold text-sm text-foreground mb-3">Légal & compte</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/auth?mode=signup" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Créer un compte
                </Link>
              </li>
              <li>
                <a href="mailto:valentinmoulay@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors font-body inline-flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Contact
                </a>
              </li>
            </ul>
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
