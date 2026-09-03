import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AppLocale,
  clearAppLocale,
  detectDeviceLocale,
  getStoredLocale,
  setAppLocale,
} from '@/i18n';

/**
 * Langue courante + persistance.
 *
 * Priorité : préférence explicite locale > langue enregistrée sur le compte
 * > langue de l'appareil. La valeur est aussi stockée sur le profil pour que
 * les e-mails transactionnels puissent être envoyés dans la bonne langue.
 */
export const useAppLocale = () => {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const [isAuto, setIsAuto] = useState(() => !getStoredLocale());

  const locale = (i18n.language?.split('-')[0] || 'fr') as AppLocale;

  const persist = useCallback(
    async (value: AppLocale) => {
      if (!session?.user) return;
      await supabase.from('profiles').update({ locale: value } as any).eq('user_id', session.user.id);
    },
    [session],
  );

  const changeLocale = useCallback(
    (value: AppLocale | 'auto') => {
      if (value === 'auto') {
        clearAppLocale();
        setIsAuto(true);
        void persist(detectDeviceLocale());
        return;
      }
      setAppLocale(value);
      setIsAuto(false);
      void persist(value);
    },
    [persist],
  );

  return { locale, isAuto, changeLocale };
};

/**
 * Applique la langue du compte à la connexion lorsque l'utilisateur n'a pas
 * de préférence locale, et remonte la préférence locale vers le compte sinon.
 */
export const useSyncAccountLocale = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    const stored = getStoredLocale();

    (async () => {
      if (stored) {
        await supabase.from('profiles').update({ locale: stored } as any).eq('user_id', session.user.id);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('locale')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const accountLocale = (data as any)?.locale as AppLocale | undefined;
      const device = detectDeviceLocale();
      if (accountLocale && accountLocale !== device) {
        setAppLocale(accountLocale);
      } else if (!accountLocale || accountLocale !== device) {
        await supabase.from('profiles').update({ locale: device } as any).eq('user_id', session.user.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);
};
