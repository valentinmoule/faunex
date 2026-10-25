# Faunex Premium Famille

## Offre retenue
- **4 comptes maximum au total : le gestionnaire payeur + 3 invités.** Cela remplace les 5 comptes de la demande initiale.
- **40 € par an ou 4 € par mois.** Les offres individuelles restent disponibles et inchangées.
- Chaque compte conserve ses captures, son bestiaire, ses badges, ses préférences et sa progression.
- Le parrainage s’applique aussi à l’offre Famille **annuelle**, après paiement confirmé ; pas à l’offre mensuelle.

## Analyse de l’existant
- L’authentification utilise déjà une session individuelle et les identifiants propres à chaque utilisateur. Il n’est pas nécessaire de créer des comptes partagés ni de modifier la connexion Google/Apple.
- Les abonnements sont actuellement gérés par **Paddle**. L’application lit l’abonnement et les bonus de parrainage pour afficher les avantages Premium ; le serveur contrôle également les droits pour les fonctions protégées.
- Le système de parrainage dispose déjà de récompenses séparées, attribuées après vérification du paiement. Il faut le préserver et l’étendre explicitement à Famille annuel.
- **Les achats mobiles inspectés ouvrent actuellement Paddle dans le navigateur. Aucun achat StoreKit ou Google Play Billing n’a été trouvé dans les chemins et dépendances examinés.** Ce constat ne permet pas de garantir la conformité de la version actuellement distribuée.
- Les contrôles serveur mélangent actuellement certains droits test et réels (`is_premium` accepte les deux), et les états d’abonnement ne sont pas interprétés exactement pareil sur le téléphone et sur le serveur. Ce point doit être unifié avant d’étendre les droits à plusieurs personnes, avec maintien des accès individuels légitimes.

## Ce que l’utilisateur pourra faire
### Gestionnaire
Dans **Paramètres → Ma famille** : voir son offre, les comptes membres et les places disponibles ; créer/copier une invitation, révoquer une invitation, retirer un membre avec confirmation et accéder à la gestion de son abonnement.

### Invité
Ouvrir le lien, se connecter ou créer son propre compte, puis accepter explicitement l’invitation. Voir la famille et son statut Premium ; quitter la famille avec confirmation. La connexion revient vers l’invitation après identification, sans acceptation automatique.

### Vie de l’abonnement
- La famille devient utilisable seulement après achat confirmé par le prestataire de paiement.
- Un utilisateur ne peut être membre ou gestionnaire que d’**une seule famille** à la fois.
- Retrait ou départ : droits familiaux révoqués immédiatement ; l’abonnement individuel et les bonus personnels éventuels restent valables.
- Résiliation ordinaire : avantages conservés jusqu’à la fin de la période payée. Expiration, remboursement ou révocation : arrêt selon l’état confirmé par le prestataire.
- La famille et ses données de gestion peuvent rester visibles après expiration, mais ne donnent plus Premium. Aucune capture, collection ni progression n’est effacée.
- L’abonnement individuel d’un invité n’est ni annulé ni suspendu automatiquement. Un avertissement évite de lui faire croire que rejoindre la famille arrête sa facturation.
- Pas de transfert de gestionnaire ni de fusion des comptes dans cette première version. La suppression du compte payeur ferme l’accès familial ; le sort de sa facturation doit être traité auprès du prestataire avant la fermeture du compte.

## Plan d’implémentation
### 1. Unifier les droits Premium
Ajouter une lecture serveur unique : **abonnement individuel valide OU bonus personnel actif OU appartenance active à une famille ayant un droit valide**. Distinguer le bénéfice Premium du droit de gérer la facturation : un invité ne peut jamais gérer le paiement du gestionnaire.

Harmoniser les dates, renouvellements, impayés, résiliations et expirations entre affichage et contrôles serveur, sans modifier arbitrairement les règles des abonnés existants. Les achats de test ne doivent jamais ouvrir les droits réels ; les tests auront un périmètre serveur isolé et non choisi librement par le client.

### 2. Invitations et famille sécurisées
Créer la famille, les adhésions et les invitations séparément des données personnelles existantes. Toutes les opérations sensibles passent par le serveur : création après achat valide, invitation, acceptation, départ et retrait.

Proposition : liens aléatoires à usage unique, valables **7 jours**, révocables ; seul leur condensat est stocké. Un lien est transmissible et vaut invitation : ne pas y inclure une adresse e-mail ni des informations privées. Une place est réservée par invitation en attente, libérée à l’expiration ou à la révocation.

### 3. Page « Ma famille »
Ajouter une page connectée et une entrée plate dans les paramètres, suivant le style actuel. Prévoir les états sans famille, achat en attente de confirmation, famille active, invitation expirée/révoquée, famille complète et abonnement expiré. Tous les textes et messages en FR/EN, sans modification du reste de l’application.

### 4. Achats web et mobiles — chantier distinct
- **Web :** conserver Paddle ; ajouter deux tarifs Famille et une identification claire de l’offre dans les paiements confirmés. Ne pas modifier les tarifs individuels.
- **iOS/Android :** prévoir StoreKit et Google Play Billing pour les abonnements numériques vendus dans les apps, avec restauration des achats, vérification serveur et notifications de renouvellement/remboursement. Ne pas recopier le paiement externe actuel sans avoir établi l’éligibilité à une exception.
- Rattacher chaque achat vérifié au gestionnaire authentifié ; ne jamais accepter un utilisateur, un prix ou un état « payé » fourni uniquement par le téléphone ou par un lien.
- Utiliser les événements signés et les vérifications auprès du prestataire, avec traitement idempotent et protection contre les événements arrivant dans le désordre. Réconcilier les abonnements lorsque des événements manquent.
- Gérer l’abonnement chez son prestataire d’origine : Paddle, Apple ou Google. Pas de seconde souscription involontaire ni de changement d’offre avec double facturation.
- Les créations de produits, la configuration des consoles Apple/Google et les essais réels ne commencent qu’après validation. Aucun abonnement fictif ne débloquera Famille.

### 5. Parrainage Famille annuel
Étendre la vérification d’éligibilité au premier achat annuel Famille. Conserver l’interdiction d’auto-parrainage, le contrôle « nouveau client » et l’attribution unique après paiement confirmé, en tenant compte des achats des différents prestataires.

Proposition : les **30 jours offerts au filleul gestionnaire prolongent sa famille entière** ; les **30 jours du parrain prolongent son offre personnelle**, ou sa famille s’il en est lui-même le gestionnaire. Un parrain simple invité ne prolonge pas l’abonnement d’un autre payeur : il reçoit un bonus personnel.

Sur Paddle, conserver le report du renouvellement sans prorata quand il est applicable. **Ne pas promettre de repousser un renouvellement Apple/Google de la même manière** : prévoir une méthode officiellement supportée ou des droits bonus séparés, présentés clairement. Finaliser cette partie avant mise en vente native pour éviter les bonus perdus ou une fausse promesse de retard de facturation.

### 6. Tests et livraison
- Tests de règles : 4 comptes au total, 3 invitations maximum, un seul rattachement, interdiction d’inviter/rejoindre sans abonnement valide, gestionnaire seul autorisé à retirer/inviter.
- Tests de concurrence : deux acceptations pour la dernière place, adhésion simultanée à deux familles, usage répété d’un lien.
- Tests d’accès : aucun accès aux captures privées, aux préférences ou à la facturation des autres ; retrait/expiration immédiatement appliqués côté serveur.
- Tests d’achats : doublons/ordre des événements, renouvellement, impayé, expiration, remboursement, restauration et séparation test/réel.
- Tests parrainage : annuel éligible, mensuel non éligible, nouveau client, paiement requis, 30 jours exacts, récompense unique.
- Vérifier le parcours complet avec un payeur et trois comptes distincts, puis la sortie d’un membre gardant son abonnement individuel et ses données.
- Essais Apple/Google dans leurs environnements de test, puis sur appareils. Nouvelle version des apps nécessaire pour les pages et achats natifs ; la publication n’est pas automatique.

## Détails techniques
- Tables proposées : `families`, `family_memberships`, `family_invitations`, droits d’achat liés au prestataire. Changements additifs : ne pas détourner `user_roles` (réservé aux rôles de modération de Faunex) ni stocker un rôle familial modifiable dans `profiles`.
- Inclure le gestionnaire dans les adhésions ; index unique sur l’utilisateur pour les adhésions en cours ; verrou transactionnel de famille pour compter membres et invitations réservées et limiter à 4 comptes. Empêcher le retrait du gestionnaire par une opération de retrait de membre.
- Tables privées, autorisations explicites et RLS ; le gestionnaire ne voit que les informations de gestion nécessaires, les membres leurs droits autorisés. Aucun accès supplémentaire aux données des comptes.
- Vérification de session dans les fonctions, validation des entrées, limitation des tentatives d’invitation, liens sans secrets de session, aucun jeton d’invitation dans les journaux ou outils de suivi.
- Points existants à adapter : `useSubscription`, contrôles `has_active_subscription` / `is_premium` et fonctions Premium ; `SettingsPage`, `PremiumPage`, `usePaddleCheckout` ; traitement `payments-webhook` et parrainage. Préserver la compatibilité des anciens clients avec les contrôles serveur.
- Les tarifs affichés doivent correspondre aux tarifs effectivement configurés chez chaque prestataire ; vérifier taxes, devises et paliers disponibles dans les stores avant commercialisation.

## Règles des stores et limites de la vérification
Références : [Apple — règles 3.1.1 et 3.1.3](https://developer.apple.com/app-store/review/guidelines/) ; [Google Play — politique de paiement](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).

Les exceptions aux achats intégrés dépendent du pays, du programme et des autorisations applicables. Le partage Famille Faunex est un partage entre **comptes Faunex**, pas le Partage familial Apple : ne pas activer un partage natif qui multiplie involontairement les familles.

L’analyse du code n’établit ni l’inscription à ces programmes ni l’approbation future des stores. Les configurations commerciales des consoles et la réception réelle des événements Apple/Google restent à vérifier. Une partie de la validation mobile nécessite vos accès Apple/Google et des appareils.

## Validation demandée
Valider ce plan autorise l’implémentation de l’offre et des invitations, avec le chantier d’achats natifs traité explicitement et sans contourner les stores. La règle proposée de parrainage Famille fait partie de cette validation. **À ce stade : aucune modification des paiements, aucun nouveau produit, aucun faux abonnement et aucune modification du fonctionnement de l’application.**