import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/PageHeader';
import Footer from '@/components/Footer';

const RefundPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Politique de remboursement — Faunex</title>
        <meta name="description" content="Garantie satisfait ou remboursé de 30 jours sur l'abonnement Faunex Premium. Comment demander un remboursement auprès de Paddle, notre Merchant of Record." />
        <link rel="canonical" href="https://faunex.fr/remboursement" />
        <meta property="og:url" content="https://faunex.fr/remboursement" />
        <meta property="og:title" content="Politique de remboursement — Faunex" />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Retour à la page précédente" className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Politique de remboursement</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">
        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="font-display font-semibold text-foreground text-sm">
              ✅ Garantie satisfait ou remboursé de 30 jours sur l'abonnement Faunex Premium.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">1. Délai de remboursement</h2>
          <p>
            Si l'abonnement <strong>Faunex Premium</strong> (1,99 €/mois) ne vous convient pas, vous pouvez demander
            un remboursement intégral dans un délai de <strong>30 jours</strong> à compter de la date de la commande,
            sans avoir à justifier votre décision.
          </p>
          <p className="mt-2">
            Ce délai s'applique également à chaque renouvellement mensuel : un renouvellement peut être remboursé
            dans les 30 jours suivant son prélèvement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">2. Comment demander un remboursement</h2>
          <p>
            Les paiements de Faunex sont traités par notre revendeur <strong>Paddle.com</strong>, Merchant of Record de
            toutes nos commandes. Paddle prend en charge les demandes de remboursement et les questions de facturation.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              Rendez-vous sur <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{' '}
              avec l'adresse e-mail utilisée lors de l'achat, ou utilisez le lien présent sur votre reçu.
            </li>
            <li>
              Ou écrivez-nous à <strong>contact@faunex.fr</strong> : nous transmettons votre demande et vous
              accompagnons jusqu'au traitement.
            </li>
          </ul>
          <p className="mt-2">
            Le remboursement est effectué sur le moyen de paiement d'origine, généralement sous 5 à 10 jours ouvrés
            selon votre banque.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">3. Annulation de l'abonnement</h2>
          <p>
            Vous pouvez annuler votre abonnement à tout moment depuis <strong>Réglages → Faunex Premium → Gérer mon
            abonnement</strong>. L'annulation met fin aux prélèvements futurs ; l'accès Premium reste actif jusqu'à la
            fin de la période déjà payée.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Informations complémentaires</h2>
          <p>
            Les conditions de paiement, de facturation, de taxes et de remboursement appliquées par notre revendeur
            sont détaillées dans les{' '}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              conditions d'achat Paddle
            </a>{' '}
            et la{' '}
            <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              politique de remboursement Paddle
            </a>.
          </p>
          <p className="mt-2">
            Voir aussi nos <Link to="/legal" className="text-primary underline">mentions légales et conditions générales</Link>{' '}
            et nos <Link to="/tarifs" className="text-primary underline">tarifs</Link>.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">Dernière mise à jour : 12 août 2026</p>
      </div>

      <Footer />
    </main>
  );
};

export default RefundPolicyPage;
