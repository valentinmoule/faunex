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

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Responsable du traitement</h3>
          <p>
            <strong>Faunex</strong> (Valentin Moulay, personne physique) agit en qualité de <strong>responsable du traitement</strong>
            au sens du RGPD pour les données collectées via le site et l'application Faunex. Contact : <strong>contact@faunex.fr</strong>.
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Données collectées, finalités et bases légales</h3>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>Adresse e-mail, identifiants de connexion</strong> — création et sécurisation du compte. Base légale : exécution du contrat.</li>
            <li><strong>Nom d'affichage, pseudonyme, photo de profil (optionnelle)</strong> — identité publique dans l'application. Base légale : exécution du contrat.</li>
            <li><strong>Photographies d'animaux, notes, données de géolocalisation (optionnelles)</strong> — identification des espèces, collection, fonctionnalités sociales et carte. Base légale : exécution du contrat, et consentement pour la géolocalisation.</li>
            <li><strong>Données techniques d'usage (appareil, adresse IP, journaux de connexion)</strong> — sécurité, prévention de la fraude et des abus, amélioration du service. Base légale : intérêt légitime.</li>
            <li><strong>Données de facturation liées à l'abonnement</strong> (nom, e-mail, pays, informations de paiement) — collectées et traitées par notre revendeur Paddle pour la vente, la facturation, la TVA et la lutte contre la fraude. Base légale : exécution du contrat et obligation légale.</li>
            <li><strong>Messages de support</strong> — traitement des demandes. Base légale : exécution du contrat / intérêt légitime.</li>
          </ul>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Destinataires des données</h3>
          <p>Vos données peuvent être communiquées aux catégories de destinataires suivantes :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Prestataires techniques (sous-traitants)</strong> : hébergement et base de données (Lovable / Supabase, Cloudflare), envoi d'e-mails, modèles d'intelligence artificielle utilisés pour l'identification des photographies.</li>
            <li><strong>Paddle.com Market Ltd — Merchant of Record</strong> : vente de l'abonnement, gestion des paiements, de la facturation, de la TVA, des renouvellements et des remboursements. Voir la <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">politique de confidentialité de Paddle</a>.</li>
            <li><strong>Conseils professionnels</strong> (comptables, juristes) lorsque cela est nécessaire.</li>
            <li><strong>Autorités compétentes</strong> lorsque la loi l'exige.</li>
          </ul>
          <p className="mt-2">
            Certains prestataires peuvent traiter des données hors de l'Union européenne. Ces transferts sont encadrés par des clauses contractuelles types ou une décision d'adéquation.
          </p>
          <p className="mt-2">
            <strong>Vos données ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires.</strong>
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Durée de conservation</h3>
          <p>Les données sont conservées tant que le compte est actif, puis supprimées ou anonymisées dans un délai de 30 jours après la suppression du compte. Les documents de facturation sont conservés par Paddle pour la durée légale applicable (généralement 10 ans).</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Sécurité</h3>
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des échanges (HTTPS), contrôle d'accès par utilisateur (politiques de sécurité au niveau des lignes en base de données), authentification sécurisée et journalisation des accès.</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Vos droits</h3>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition et de limitation du traitement</li>
            <li>Droit de retirer votre consentement à tout moment (géolocalisation, e-mails)</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez : <strong>contact@faunex.fr</strong>. Nous répondons dans un délai d'un mois.
          </p>
          <p className="mt-2">
            En cas de litige, vous pouvez introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">CNIL</a> (Commission Nationale de l'Informatique et des Libertés).
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
            Faunex propose une formule gratuite (limitée à 4 captures par jour) et un abonnement <strong>Faunex Premium</strong> au prix de <strong>1,99 € par mois</strong>, débloquant les captures illimitées, une identification plus performante, la localisation des espèces autour de vous et les notes sur les captures. Les tarifs et le détail des fonctionnalités sont publics sur la page <a href="/tarifs" className="text-primary underline">Tarifs</a>.
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
