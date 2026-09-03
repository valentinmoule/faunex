import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppStoreBadge, PlayStoreBadge } from './StoreBadges';

const linkClass =
  'text-sm text-muted-foreground hover:text-primary transition-colors font-body';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-12">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/pwa-icon-192.png" alt={t('marketing.footer.logoAlt')} className="w-8 h-8 rounded-xl" />
              <span className="font-display font-black text-lg text-foreground">Faunex</span>
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
              {t('marketing.footer.tagline')}
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">{t('marketing.footer.explore')}</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" className={linkClass}>{t('marketing.footer.home')}</Link></li>
              <li><Link to="/guides" className={linkClass}>{t('marketing.footer.allGuides')}</Link></li>
              <li><Link to="/fonctionnalites" className={linkClass}>{t('marketing.footer.useCases')}</Link></li>
              <li><Link to="/tarifs" className={linkClass}>{t('marketing.footer.pricing')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">{t('marketing.footer.account')}</h3>
            <ul className="space-y-2.5">
              <li><Link to="/auth?mode=signup" className={linkClass}>{t('marketing.footer.createAccount')}</Link></li>
              <li><Link to="/auth?mode=login" className={linkClass}>{t('marketing.footer.login')}</Link></li>
              <li>
                <a href="mailto:contact@faunex.fr" className={linkClass}>{t('marketing.footer.contact')}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-foreground mb-3">{t('marketing.footer.legal')}</h3>
            <ul className="space-y-2.5">
              <li><Link to="/legal" className={linkClass}>{t('marketing.footer.legalLink')}</Link></li>
              <li><Link to="/confidentialite" className={linkClass}>{t('marketing.footer.privacy')}</Link></li>
              <li><Link to="/remboursement" className={linkClass}>{t('marketing.footer.refund')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border/50 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground font-display">
            {t('marketing.footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://apps.apple.com/fr/app/faunex/id6795586686"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('marketing.footer.downloadAppStore')}
              className="inline-flex hover:scale-[1.02] transition-transform"
            >
              <AppStoreBadge className="block h-10 w-auto" />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=fr.faunex.app&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('marketing.footer.downloadPlayStore')}
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
