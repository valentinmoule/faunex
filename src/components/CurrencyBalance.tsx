import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GameCounter from '@/components/GameCounter';
import SeedIcon from '@/components/SeedIcon';
import { useWallet } from '@/hooks/useWallet';

/** Solde de Graines, affiché dans les en-têtes comme le compteur de captures. */
export default function CurrencyBalance() {
  const { data } = useWallet();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  if (!data?.enabled) return null;
  return (
    <GameCounter
      icon={<SeedIcon className="h-4 w-4" />}
      value={data.balance.toLocaleString(i18n.language)}
      label={t('economy.balance', { amount: data.balance })}
      title={t('economy.balance', { amount: data.balance })}
      onClick={() => navigate('/eclats')}
    />
  );
}
