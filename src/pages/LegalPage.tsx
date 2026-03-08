import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LegalPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Mentions légales</h1>
        </div>
      </header>

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
            <li><strong>Contact :</strong> contact@faunex.app</li>
          </ul>
        </section>

        {/* Hébergeur */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">2. Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>Lovable</strong> (via Supabase & Cloudflare)</li>
            <li>San Francisco, CA, États-Unis</li>
            <li>Site : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary underline">lovable.dev</a></li>
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
          <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Protection des données personnelles (RGPD)</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (UE) 2016/679, nous collectons et traitons les données personnelles suivantes :
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Adresse e-mail (inscription et authentification)</li>
            <li>Nom d'affichage et pseudonyme</li>
            <li>Photo de profil (optionnelle)</li>
            <li>Données de géolocalisation (optionnelles, pour localiser les captures)</li>
            <li>Photographies d'animaux soumises par l'utilisateur</li>
          </ul>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Finalités du traitement</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Gestion du compte utilisateur</li>
            <li>Fonctionnement de l'application (collection, progression, social)</li>
            <li>Identification des animaux via intelligence artificielle</li>
          </ul>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Base légale</h3>
          <p>Le traitement est fondé sur le consentement de l'utilisateur (article 6.1.a du RGPD) et l'exécution du contrat (article 6.1.b).</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Durée de conservation</h3>
          <p>Les données sont conservées tant que le compte est actif. Elles sont supprimées dans un délai de 30 jours après la suppression du compte.</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Vos droits</h3>
          <p>Vous disposez des droits suivants :</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition et de limitation du traitement</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez : <strong>contact@faunex.app</strong>
          </p>
          <p className="mt-2">
            En cas de litige, vous pouvez introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">CNIL</a> (Commission Nationale de l'Informatique et des Libertés).
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">5. Cookies</h2>
          <p>
            Faunex utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (authentification, session utilisateur). Aucun cookie publicitaire ou de suivi tiers n'est utilisé.
          </p>
        </section>

        {/* Responsabilité */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">6. Limitation de responsabilité</h2>
          <p>
            L'identification des animaux par intelligence artificielle est fournie à titre informatif et ne constitue pas un avis scientifique. Valentin Moulay ne saurait être tenu responsable d'erreurs d'identification.
          </p>
          <p className="mt-2">
            L'utilisateur est seul responsable du contenu qu'il soumet (photographies, textes).
          </p>
        </section>

        {/* CGU */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">7. Conditions générales d'utilisation</h2>
          <p>
            En utilisant Faunex, vous acceptez les présentes conditions. L'utilisation de l'application est réservée à un usage personnel et non commercial. Tout usage abusif, frauduleux ou contraire aux bonnes mœurs pourra entraîner la suspension du compte.
          </p>
          <p className="mt-2">
            L'éditeur se réserve le droit de modifier les présentes mentions légales à tout moment. Les utilisateurs seront informés de toute modification substantielle.
          </p>
        </section>

        {/* Droit applicable */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">8. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. Tout litige sera soumis à la compétence des tribunaux français.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">Dernière mise à jour : 8 mars 2026</p>
      </div>
    </main>
  );
};

export default LegalPage;
