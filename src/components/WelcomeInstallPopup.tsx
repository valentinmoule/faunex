import { useState, useEffect, useRef } from 'react';
import { Smartphone, X, Download, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { Trans, useTranslation } from 'react-i18next';

const FIRST_LOGIN_KEY = 'faunex_first_login_done';

export const isFirstLogin = (userId: string) => {
  return !localStorage.getItem(`${FIRST_LOGIN_KEY}_${userId}`);
};

export const markFirstLoginDone = (userId: string) => {
  localStorage.setItem(`${FIRST_LOGIN_KEY}_${userId}`, '1');
};

const WelcomeInstallPopup = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { promptInstall, canInstall, isIos, isInstalled, guideOpen, closeInstallGuide } = usePwaInstall();
  const hasShown = useRef(false);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'hidden' | 'in' | 'visible' | 'out'>('hidden');
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);

  const open = (delay: number) => {
    const timer = setTimeout(() => {
      setVisible(true);
      setPhase('in');
      setTimeout(() => setPhase('visible'), 50);
    }, delay);
    return () => clearTimeout(timer);
  };

  // Première connexion après création du compte
  useEffect(() => {
    if (!session?.user || hasShown.current) return;
    if (!isFirstLogin(session.user.id)) return;
    // Déjà installée en standalone → inutile de proposer
    if (isInstalled) {
      markFirstLoginDone(session.user.id);
      return;
    }

    hasShown.current = true;
    return open(800);
  }, [session, isInstalled]);

  // Ouverture manuelle (Réglages → Installer l'application)
  useEffect(() => {
    if (!guideOpen || visible) return;
    return open(0);
  }, [guideOpen]);

  const dismiss = () => {
    if (session?.user) markFirstLoginDone(session.user.id);
    closeInstallGuide();
    setPhase('out');
    setTimeout(() => {
      setVisible(false);
      setShowIosHelp(false);
      setShowAndroidHelp(false);
    }, 400);
  };

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
      dismiss();
    } else if (isIos) {
      setShowIosHelp(true);
      setShowAndroidHelp(false);
    } else {
      // Android sans prompt natif (déjà refusé, Firefox, etc.) → guide manuel
      setShowAndroidHelp(true);
      setShowIosHelp(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[110] flex items-center justify-center px-6 transition-all duration-400
      ${phase === 'in' || phase === 'hidden' ? 'opacity-0' : phase === 'out' ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />

      <div className={`relative z-10 w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl overflow-hidden transition-all duration-500 ease-out
        ${phase === 'visible' ? 'scale-100 translate-y-0' : phase === 'out' ? 'scale-90 translate-y-8' : 'scale-75 translate-y-12'}`}>

        <button onClick={dismiss} className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
              <Smartphone className="w-9 h-9 text-primary" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-primary/60 animate-pulse" style={{ animationDelay: '500ms' }} />
          </div>

          <h3 className="text-lg font-display font-black text-foreground mb-1.5">
            {t('map.welcomeInstall.title')}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {t('map.welcomeInstall.description')}
          </p>

          <button
            onClick={handleInstall}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold text-sm shadow-[0_4px_15px_hsla(var(--primary),0.3)] hover:shadow-[0_6px_20px_hsla(var(--primary),0.4)] transition-all active:scale-[0.97] transform flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isIos ? t('map.welcomeInstall.howToInstall') : t('map.welcomeInstall.install')}
          </button>

          {showIosHelp && (
            <div className="mt-3 p-3 rounded-xl bg-primary-foreground/5 border border-primary/20 text-xs text-muted-foreground text-left">
              <p className="font-semibold text-foreground mb-1">{t('map.welcomeInstall.ios.title')}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><Trans i18nKey="map.welcomeInstall.ios.step1" components={{ strong: <strong /> }} /></li>
                <li><Trans i18nKey="map.welcomeInstall.ios.step2" components={{ strong: <strong /> }} /></li>
                <li><Trans i18nKey="map.welcomeInstall.ios.step3" components={{ strong: <strong /> }} /></li>
                <li><Trans i18nKey="map.welcomeInstall.ios.step4" components={{ strong: <strong /> }} /></li>
              </ol>
            </div>
          )}

          {showAndroidHelp && (
            <div className="mt-3 p-3 rounded-xl bg-primary-foreground/5 border border-primary/20 text-xs text-muted-foreground text-left">
              <p className="font-semibold text-foreground mb-1">{t('map.welcomeInstall.android.title')}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><Trans i18nKey="map.welcomeInstall.android.step1" components={{ strong: <strong /> }} /></li>
                <li><Trans i18nKey="map.welcomeInstall.android.step2" components={{ strong: <strong /> }} /></li>
                <li><Trans i18nKey="map.welcomeInstall.android.step3" components={{ strong: <strong /> }} /></li>
              </ol>
            </div>
          )}

          <button onClick={dismiss} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-display">
            {t('map.welcomeInstall.continueWithoutInstall')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeInstallPopup;
