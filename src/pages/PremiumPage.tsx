import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Crown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import { PREMIUM_MONTHLY_PRICE_ID, PREMIUM_YEARLY_PRICE_ID } from '@/lib/paddle';
import { supabase } from '@/integrations/supabase/client';

interface FeatureRow {
  label: string;
  free: ReactNode;
  premium: ReactNode;
}

const FEATURES: FeatureRow[] = [
  {
    label: 'Identification des animaux',
    free: <span className="text-sm font-medium">4 / jour</span>,
    premium: <span className="text-sm font-semibold text-primary">Illimitée</span>,
  },
  {
    label: 'Recherche de zones',
    free: <span className="text-sm font-medium">4 / jour</span>,
    premium: <span className="text-sm font-semibold text-primary">Illimitée</span>,
  },
  {
    label: 'Collections et territoires',
    free: <span className="text-sm font-medium">3 maximum</span>,
    premium: <span className="text-sm font-semibold text-primary">Illimités</span>,
  },
  {
    label: 'Badge Premium sur le profil',
    free: <Minus className="h-4 w-4 text-muted-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: 'Notes et localisation',
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: 'Quêtes et objectifs',
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: 'Classement et badges',
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
];


const PLANS = {
  monthly: {
    priceId: PREMIUM_MONTHLY_PRICE_ID,
    label: 'Mensuel',
    price: '2,40 €',
    period: '/ mois',
    note: 'Facturation mensuelle, annulez à tout moment.',
    cta: "S'abonner pour 2,40 €/mois",
  },
  yearly: {
    priceId: PREMIUM_YEARLY_PRICE_ID,
    label: 'Annuel',
    price: '24 €',
    period: '/ an',
    note: 'Soit 2 € par mois — 2 mois offerts par rapport au mensuel.',
    cta: "S'abonner pour 24 €/an",
  },
} as const;

const PremiumPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const { isPremium, subscription, loading, refresh } = useSubscription(session?.user?.id);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const selected = PLANS[plan];

  useEffect(() => {
    if (params.get('checkout') === 'success') {
      toast.success('Merci ! Ton abonnement est en cours d\'activation.');
      params.delete('checkout');
      setParams(params, { replace: true });
      const timer = setTimeout(refresh, 2500);
      return () => clearTimeout(timer);
    }
  }, [params, setParams, refresh]);

  const handleSubscribe = async () => {
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    try {
      await openCheckout({
        priceId: selected.priceId,
        customerEmail: session.user.email ?? undefined,
        customData: { userId: session.user.id },
        successUrl: `${window.location.origin}/premium?checkout=success`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'ouvrir le paiement pour le moment.");
    }
  };

  const handleManage = async () => {
    // Ouvre l'onglet immédiatement (dans le geste utilisateur) pour éviter le blocage de popup
    const tab = window.open('', '_blank');
    const { data, error } = await supabase.functions.invoke('paddle-portal');
    if (error || !data?.url) {
      tab?.close();
      toast.error("Impossible d'ouvrir la gestion de l'abonnement.");
      return;
    }
    if (tab) {
      tab.location.href = data.url as string;
    } else {
      window.location.href = data.url as string;
    }
  };


  return (
    <div className="min-h-screen bg-background pb-28">
      <PaymentTestModeBanner />
      <PageHeader className="px-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </PageHeader>

      <main className="px-5 pt-2">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="h-3.5 w-3.5" /> Faunex Premium
          </span>
          <h1 className="relative mt-4 font-display text-2xl font-bold leading-tight">
            Soutenez Faunex et débloquez le meilleur de l'application.
          </h1>
          <p className="relative mt-2 text-sm text-muted-foreground">
            Faunex est un petit projet indépendant qui grandit grâce à vous. Votre abonnement aide
            directement à financer les serveurs, les modèles d'IA et le développement de nouvelles
            fonctionnalités.
          </p>


          {!isPremium && (
            <div className="relative mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
              {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => (
                <button
                  key={key}
                  onClick={() => setPlan(key)}
                  className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    plan === key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {PLANS[key].label}
                  {key === 'yearly' && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      -17%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="relative mt-5 flex items-end gap-1.5">
            <span className="font-display text-4xl font-bold">{selected.price}</span>
            <span className="pb-1 text-sm text-muted-foreground">{selected.period}</span>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground">
            {selected.note}
          </p>
        </section>

        <ul className="mt-5 space-y-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-3">
          {loading ? (
            <Button disabled className="h-12 w-full rounded-2xl">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isPremium ? (
            <>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                <Check className="h-4 w-4" /> Abonnement actif
              </div>
              {subscription?.current_period_end && (
                <p className="text-center text-xs text-muted-foreground">
                  {subscription.cancel_at_period_end ? 'Accès jusqu\'au ' : 'Prochain renouvellement le '}
                  {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
                </p>
              )}
              <Button variant="outline" onClick={handleManage} className="h-12 w-full rounded-2xl">
                Gérer mon abonnement
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="h-12 w-full rounded-2xl text-base font-semibold"
            >
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.cta}
            </Button>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Paiement sécurisé. Sans engagement, résiliable en un clic.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PremiumPage;
