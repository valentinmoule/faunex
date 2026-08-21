import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';

const LegalPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Mentions légales & confidentialité — Faunex</title>
        <meta name="description" content="Mentions légales, politique de confidentialité et conditions d'utilisation de Faunex, l'application d'identification et de collection de la faune sauvage." />
        <link rel="canonical" href="https://faunex.fr/legal" />
        <meta property="og:url" content="https://faunex.fr/legal" />
        <meta property="og:title" content="Mentions légales & confidentialité — Faunex" />
      </Helmet>
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Retour à la page précédente" className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Mentions légales</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">

        {/* Éditeur */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">1. Éditeur du site</h2>
          <p>
            Le site et l'application <strong>Faunex</strong> sont édités par :
          </p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>Nom :</strong> Valentin Moulay</li>
            <li><strong>Statut :</strong> Personne physique</li>
            <li><strong>Contact :</strong> contact@faunex.fr</li>
          </ul>
        </section>

        {/* Hébergeur */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">2. Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>Hébergeur :</strong> Lovable (via Cloudflare)</li>
            <li>San Francisco, CA, États-Unis</li>
            <li>Site : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary underline">lovable.dev</a></li>
          </ul>
          <p className="mt-3">Le nom de domaine est enregistré auprès de :</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>OVHcloud</strong></li>
            <li>2, rue Kellermann – 59100 Roubaix, France</li>
            <li>Site : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ovhcloud.com</a></li>
          </ul>
        </section>

        {/* Propriété intellectuelle */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">3. Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur Faunex (textes, images, logos, design, code source) est la propriété exclusive de Valentin Moulay, sauf mention contraire. Toute reproduction, distribution ou utilisation sans autorisation préalable est interdite.
          </p>
          <p className="mt-2">
            Les photographies d'animaux sont prises et soumises par les utilisateurs. Chaque utilisateur conserve les droits sur ses propres photographies.
          </p>
        </section>

        {/* Données personnelles / RGPD */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Politique de confidentialité (RGPD)</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4">
            <p className="font-display font-semibold text-foreground text-sm">
              🔒 Faunex ne revend jamais vos données personnelles et ne les partage à des fins publicitaires. Vos données ne sont transmises qu'aux prestataires strictement nécessaires au fonctionnement du service.
            </p>
          </div>
          <p>
            La politique de confidentialité complète et détaillée est disponible ici :{' '}
            <Link to="/confidentialite" className="text-primary underline">Politique de confidentialité Faunex</Link>.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">5. Cookies</h2>
          <p>
            Faunex utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (authentification, session utilisateur) ainsi que des cookies de mesure d'audience et de conversion. Aucun cookie n'est utilisé pour revendre vos données. Vous pouvez à tout moment supprimer ou bloquer les cookies depuis les réglages de votre navigateur.
          </p>
        </section>

        {/* Responsabilité */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">6. Limitation de responsabilité</h2>
          <p>
            L'identification des animaux par intelligence artificielle est fournie à titre informatif et ne constitue pas un avis scientifique. Faunex ne saurait être tenu responsable d'erreurs d'identification.
          </p>
          <p className="mt-2">
            Le service est fourni « en l'état » : nous ne garantissons pas un fonctionnement ininterrompu, sans erreur ni sans interruption (maintenance, panne d'un prestataire, limites des modèles d'IA).
          </p>
          <p className="mt-2">
            L'utilisateur est seul responsable du contenu qu'il soumet (photographies, textes, notes) et doit disposer des droits nécessaires sur ce contenu.
          </p>
        </section>

        {/* CGU */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">7. Conditions générales d'utilisation et de vente</h2>
          <p>
            En créant un compte ou en poursuivant l'utilisation de Faunex, vous acceptez les présentes conditions et concluez un contrat avec <strong>Faunex</strong> (Valentin Moulay). Vous déclarez être majeur ou disposer de l'autorisation de votre représentant légal.
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.1 Usage autorisé</h3>
          <p>
            Faunex vous accorde un droit d'utilisation personnel, non exclusif et non transférable dans les limites de la formule choisie. Sont notamment interdits : tout usage illégal, la fraude, le spam, l'atteinte aux droits de propriété intellectuelle de tiers, la publication de contenus illicites ou de photographies de personnes sans leur accord, l'ingénierie inverse, la revente ou la redistribution du service, l'extraction automatisée de données (scraping) et toute atteinte à la sécurité (logiciels malveillants, tests d'intrusion, contournement des limites techniques).
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.2 Formules et abonnement Faunex Premium</h3>
          <p>
            Faunex propose une formule gratuite (limitée à 4 captures par jour) et un abonnement <strong>Faunex Premium</strong> au prix de <strong>2,40 € par mois</strong> ou <strong>24 € par an</strong> (2 mois offerts), débloquant les captures illimitées, une détection et une modération plus performantes, la localisation des espèces autour de vous et les notes sur les captures. Les tarifs et le détail des fonctionnalités sont publics sur la page <a href="/tarifs" className="text-primary underline">Tarifs</a>.
          </p>
          <p className="mt-2">
            L'abonnement est mensuel et se renouvelle automatiquement à chaque échéance jusqu'à son annulation. Vous pouvez annuler à tout moment depuis <strong>Réglages → Faunex Premium → Gérer mon abonnement</strong> ; l'annulation prend effet à la fin de la période en cours, sans frais supplémentaires. Les prix sont indiqués en euros ; les taxes applicables (TVA) sont calculées et ajoutées au moment du paiement selon votre pays.
          </p>
          <p className="mt-2">
            Les modalités de paiement, de facturation, de taxes, d'annulation et de remboursement sont détaillées dans les{' '}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">conditions d'achat de Paddle</a>{' '}
            et dans notre <a href="/remboursement" className="text-primary underline">politique de remboursement</a> (garantie de 30 jours).
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.3 Revendeur et Merchant of Record</h3>
          <p>
            Notre processus de commande est géré par notre revendeur en ligne Paddle.com. Paddle.com est le Merchant of Record de toutes nos commandes. Paddle gère l'ensemble des demandes de service client ainsi que les retours et remboursements.
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.4 Suspension et résiliation</h3>
          <p>
            Nous pouvons suspendre ou résilier l'accès au service, y compris à un abonnement payant, en cas de : manquement grave aux présentes conditions, défaut de paiement, risque de sécurité ou de fraude, ou violations répétées de nos règles de publication. Lorsque cela est raisonnablement possible, nous vous en informons au préalable. En cas de résiliation à votre initiative ou de suspension pour manquement, vous pouvez demander l'export de vos données avant la suppression de votre compte.
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.5 Propriété intellectuelle et contenus utilisateurs</h3>
          <p>
            Faunex conserve la propriété du service, de son code, de son design et de sa marque. Vous conservez les droits sur vos photographies et nous accordez une licence limitée d'hébergement, de traitement et d'affichage nécessaire au fonctionnement du service (identification, collection, partage selon vos réglages de confidentialité). Toute réclamation d'un titulaire de droits peut être adressée à contact@faunex.fr pour retrait.
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">7.6 Modifications</h3>
          <p>
            L'éditeur se réserve le droit de modifier les présentes conditions et les tarifs à tout moment. Les utilisateurs abonnés sont informés de toute modification substantielle avant son entrée en vigueur et peuvent annuler leur abonnement s'ils la refusent.
          </p>
        </section>


        {/* Suppression de compte */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">8. Suppression de compte</h2>
          <p>
            Vous pouvez supprimer votre compte et l'ensemble de vos données directement depuis l'application :
          </p>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>Ouvrez votre <strong>Profil</strong></li>
            <li>Accédez aux <strong>Paramètres</strong></li>
            <li>Sélectionnez <strong>Supprimer mon compte</strong></li>
          </ol>
          <p className="mt-3">
            La suppression entraîne l'effacement définitif des éléments suivants :
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Votre profil utilisateur</li>
            <li>L'ensemble de vos captures et photographies associées</li>
            <li>Vos relations et abonnements</li>
          </ul>
          <p className="mt-3">
            Une fois la demande confirmée, la suppression est irréversible. Vos données sont effacées dans un délai de <strong>30 jours</strong> maximum après la demande.
          </p>
        </section>

        {/* Droit applicable */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">9. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. Tout litige sera soumis à la compétence des tribunaux français.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">
          Première publication (V.0.0) : 8 mars 2026 · Dernière mise à jour : 12 août 2026
        </p>
      </div>
      <Footer />
    </main>
  );
};

export default LegalPage;
