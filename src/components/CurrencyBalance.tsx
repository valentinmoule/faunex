import { Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';

export default function CurrencyBalance() {
  const { data } = useWallet();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  if (!data?.enabled) return null;
  return <Button variant="ghost" size="sm" className="gap-1 px-1.5 font-semibold tabular-nums text-primary" onClick={() => navigate('/eclats')} aria-label={t('economy.balance', { amount: data.balance })}>
    <Gem className="h-4 w-4" /><span>{data.balance.toLocaleString(i18n.language)}</span>
  </Button>;
}