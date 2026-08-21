import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Politique de confidentialité — Faunex</title>
        <meta name="description" content="Politique de confidentialité de Faunex : données collectées, finalités, droits des utilisateurs, conservation et sécurité. Conforme au RGPD." />
        <link rel="canonical" href="https://faunex.fr/confidentialite" />
        <meta property="og:url" content="https://faunex.fr/confidentialite" />
        <meta property="og:title" content="Politique de confidentialité — Faunex" />
        <meta property="og:type" content="website" />
        <meta property="og:description" content="Politique de confidentialité de Faunex : données collectées, finalités, droits des utilisateurs, conservation et sécurité." />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour à la page précédente"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Politique de confidentialité</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">
        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="font-display font-semibold text-foreground text-sm">
              🔒 Faunex ne revend pas vos données. Vos informations ne sont transmises qu'aux prestataires strictement nécessaires au fonctionnement du service.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">1. Qui sommes-nous ?</h2>
          <p>
            <strong>Faunex</strong> est une application web progressive (PWA) d'identification et de collection de la faune sauvage, éditée par :
          </p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>Responsable du traitement :</strong> Valentin Moulay</li>
            <li><strong>Statut :</strong> Personne physique</li>
            <li><strong>Contact :</strong> contact@faunex.fr</li>
          </ul>
          <p className="mt-2">
            Cette politique de confidentialité explique quelles données nous collectons, pourquoi nous les utilisons, comment nous les protégeons et quels sont vos droits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">2. Données collectées</h2>
          <p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application :</p>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>Données d'authentification :</strong> adresse e-mail, identifiant unique, mot de passe hashé (jamais en clair), et éventuellement nom/prenom fournis par Google ou Apple lors d'une connexion SSO.</li>
            <li><strong>Données de profil :</strong> nom d'affichage, pseudonyme, photo de profil (facultative), biographie (facultative).</li>
            <li><strong>Captures et contenus utilisateurs :</strong> photographies d'animaux, nom de l'espèce identifiée, notes personnelles, date et lieu de la capture (si géolocalisation activée).</li>
            <li><strong>Données de localisation :</strong> coordonnées GPS approximatives ou précises, uniquement si vous activez la géolocalisation et que vous consentez explicitement.</li>
            <li><strong>Données techniques :</strong> type d'appareil, système d'exploitation, adresse IP, journaux de connexion, identifiants de push notification (si vous les activez).</li>
            <li><strong>Données de transaction :</strong> lors d'un achat Faunex Premium, notre revendeur Paddle collecte les informations nécessaires au paiement (e-mail, pays, moyen de paiement). Faunex ne stocke pas vos coordonnées bancaires.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">3. Finalités et bases légales du traitement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-display font-semibold text-foreground">Finalité</th>
                  <th className="py-2 pl-3 font-display font-semibold text-foreground">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-2 pr-3">Création et gestion du compte utilisateur</td>
                  <td className="py-2 pl-3">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Identification des espèces par IA</td>
                  <td className="py-2 pl-3">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Affichage du profil public/privé et du feed social</td>
                  <td className="py-2 pl-3">Exécution du contrat / Intérêt légitime</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Géolocalisation des captures et radar de proximité</td>
                  <td className="py-2 pl-3">Consentement</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Envoi d'e-mails transactionnels (confirmation, réinitialisation, notifications)</td>
                  <td className="py-2 pl-3">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Envoi d'e-mails de relance et conseils (désactivables)</td>
                  <td className="py-2 pl-3">Consentement</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Notifications push (si activées)</td>
                  <td className="py-2 pl-3">Consentement</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Sécurité, prévention de la fraude et modération</td>
                  <td className="py-2 pl-3">Intérêt légitime / Obligation légale</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Analyse d'audience et amélioration du service</td>
                  <td className="py-2 pl-3">Intérêt légitime</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Gestion de l'abonnement Premium et facturation</td>
                  <td className="py-2 pl-3">Exécution du contrat / Obligation légale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">4. Destinataires des données</h2>
          <p>Vos données sont destinées :</p>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>À Faunex</strong> (Valentin Moulay) et ses éventuels mandataires, uniquement pour l'exploitation et l'amélioration du service.</li>
            <li><strong>À nos sous-traitants techniques :</strong>
              <ul className="mt-1 ml-4 space-y-1 list-disc list-inside text-foreground/70">
                <li><strong>Lovable</strong> (hébergement web via Cloudflare) — États-Unis</li>
                <li><strong>Supabase</strong> (base de données, authentification, stockage) — selon la région du projet</li>
                <li><strong>Cloudflare</strong> (CDN, sécurité, performances) — États-Unis</li>
                <li><strong>Google</strong> (connexion SSO, modèles d'IA Gemini pour l'identification, analytics) — États-Unis</li>
                <li><strong>Apple</strong> (connexion SSO Sign in with Apple) — États-Unis</li>
                <li><strong>Paddle.com Market Ltd</strong> (paiements, facturation, TVA, remboursements) — Royaume-Uni / États-Unis</li>
              </ul>
            </li>
            <li><strong>Aux autres utilisateurs</strong>, uniquement pour les données que vous choisissez de rendre publiques (profil public, captures partagées).</li>
            <li><strong>Aux autorités compétentes</strong>, lorsque la loi l'exige.</li>
          </ul>
          <p className="mt-2">
            Nous ne vendons, ne louons et ne cédons pas vos données personnelles à des tiers à des fins publicitaires.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">5. Transferts internationaux de données</h2>
          <p>
            Certains prestataires (Lovable, Cloudflare, Google, Apple, Paddle) peuvent traiter des données en dehors de l'Union européenne, notamment aux États-Unis et au Royaume-Uni. Ces transferts sont encadrés par des clauses contractuelles types de la Commission européenne, des décisions d'adéquation ou des mécanismes de certification appropriés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">6. Durée de conservation</h2>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>Données du compte et contenus actifs :</strong> conservées tant que votre compte est actif.</li>
            <li><strong>Données après suppression du compte :</strong> supprimées ou anonymisées dans un délai maximum de 30 jours, sauf obligation légale contraire.</li>
            <li><strong>Journaux de connexion et données de sécurité :</strong> conservées pendant 12 mois maximum.</li>
            <li><strong>Données de facturation :</strong> conservées par Paddle pour la durée légale applicable (généralement 10 ans).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">7. Vos droits</h2>
          <p>Conformément au Règlement général sur la protection des données (RGPD), vous disposez des droits suivants :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes.</li>
            <li><strong>Droit à l'effacement (« droit à l'oubli ») :</strong> demander la suppression de vos données.</li>
            <li><strong>Droit à la limitation du traitement :</strong> restreindre l'usage de vos données dans certains cas.</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
            <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements, notamment à des fins d'analyse.</li>
            <li><strong>Droit de retirer votre consentement :</strong> à tout moment pour la géolocalisation, les notifications push et les e-mails de relance.</li>
          </ul>
          <p className="mt-2">
            Pour exercer vos droits, envoyez un e-mail à <strong>contact@faunex.fr</strong>. Nous répondons dans un délai d'un mois. En cas de litige, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">CNIL</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">8. Sécurité</h2>
          <p>Nous mettons en œuvre les mesures suivantes pour protéger vos données :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Chiffrement des échanges par HTTPS/TLS.</li>
            <li>Authentification sécurisée (JWT, mots de passe hashés, SSO).</li>
            <li>Contrôle d'accès granulaire en base de données (Row Level Security).</li>
            <li>Surveillance, journalisation et détection des accès anormaux.</li>
            <li>Accès restreint aux seules personnes autorisées.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">9. Cookies et technologies similaires</h2>
          <p>
            Faunex utilise des cookies et technologies équivalentes strictement nécessaires au fonctionnement du service (session, authentification) ainsi que des cookies de mesure d'audience et de conversion. Aucun cookie n'est utilisé pour revendre vos données. Vous pouvez gérer ou bloquer les cookies depuis les réglages de votre navigateur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">10. Confidentialité des enfants</h2>
          <p>
            Faunex n'est pas destiné aux enfants de moins de 16 ans. Nous ne collectons pas sciemment de données personnelles auprès d'enfants. Si vous pensez qu'un enfant nous a fourni des données, contactez-nous à contact@faunex.fr pour que nous les supprimions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">11. Modifications de cette politique</h2>
          <p>
            Nous pouvons mettre à jour cette politique de confidentialité pour refléter les évolutions légales ou fonctionnelles. En cas de modification substantielle, nous vous en informerons au préalable. La date de dernière mise à jour est indiquée en bas de page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">12. Contact</h2>
          <p>
            Pour toute question relative à cette politique ou à la protection de vos données, contactez-nous à : <strong>contact@faunex.fr</strong>.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">
          Première publication : 8 mars 2026 · Dernière mise à jour : 21 août 2026
        </p>
      </div>

      <Footer />
    </main>
  );
};

export default PrivacyPage;
