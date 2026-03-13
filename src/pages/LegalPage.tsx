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
            <li><strong>Contact :</strong> valentinmoulay@gmail.com</li>
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
          <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Protection des données personnelles (RGPD)</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4">
            <p className="font-display font-semibold text-foreground text-sm">
              🔒 Faunex ne collecte, ne revend et ne partage aucune donnée personnelle à des tiers.
            </p>
          </div>
          <p>
            Les seules informations stockées sont celles strictement nécessaires au fonctionnement de l'application :
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Adresse e-mail (uniquement pour l'authentification)</li>
            <li>Nom d'affichage et pseudonyme (choisis par l'utilisateur)</li>
            <li>Photo de profil (optionnelle)</li>
            <li>Données de géolocalisation (optionnelles, stockées localement pour localiser les captures)</li>
            <li>Photographies d'animaux soumises par l'utilisateur</li>
          </ul>
          <p className="mt-3">
            <strong>Ces données ne sont ni vendues, ni transmises, ni exploitées à des fins commerciales ou publicitaires.</strong> Elles sont utilisées uniquement pour le fonctionnement de l'application (collection, progression, fonctionnalités sociales).
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Durée de conservation</h3>
          <p>Les données sont conservées tant que le compte est actif. Elles sont supprimées dans un délai de 30 jours après la suppression du compte.</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">Vos droits</h3>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition et de limitation du traitement</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez : <strong>valentinmoulay@gmail.com</strong>
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

        <p className="text-xs text-muted-foreground pt-4 pb-8">
          Première publication (V.0.0) : 8 mars 2026 · Dernière mise à jour : 13 mars 2026
        </p>
      </div>
    </main>
  );
};

export default LegalPage;
