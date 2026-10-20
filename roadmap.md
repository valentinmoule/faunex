
## Intégrité des descriptions d’espèces
- [x] Vérifier et corriger les fiches du Criquet égyptien et de la Salamandre de Corse (141 captures harmonisées)
- [x] Protéger les associations et sauvegardes de fiches contre les mélanges d’espèces
- [x] Tester les cas signalés et vérifier les données corrigées (6 règles serveur, 5 tests identification ; criquet vérifié connecté, salamandre verrouillée car non découverte sur le compte)

## Sécurité sans changement visuel
- [x] Terminer la protection des récompenses et dépendances restantes, puis relancer tous les tests et vérifier les écrans connectés
- [x] Sécuriser les fonctions publiques et les destinataires des notifications
- [x] Valider les badges et territoires côté serveur selon les règles existantes, sans accepter de montant XP client
- [x] Protéger les préférences e-mail/notifications tout en conservant les lectures communautaires et les préférences de partage natives
- [x] Mettre à jour les dépendances restantes : aucun avis de vulnérabilité connu sur les 74 dépendances de production analysées
- [x] Relancer les tests : 28 tests réussis ; scénario serveur transactionnel réussi (annulation de toutes les données de test)
- [x] Récompenser une capture uniquement à sa première approbation, sans double XP ni double crédit de ligue
- [x] Relancer le contrôle global : alertes de lecture des catalogues communs conservées, sans restreindre les usages légitimes

## Corrections iOS
- [x] Garder le header visible au défilement des badges et quêtes
- [x] Corriger le rendu du contour mythique
- [x] Empêcher le défilement horizontal de la fiche espèce
- [x] Vérifier l’aperçu connecté et les tests disponibles
- [ ] Confirmer sur iPhone après synchronisation et reconstruction (appareil natif non disponible ici)

## Pages partenaires B2B
- [x] Offre visibilité zoos et page associations (sorties nature, défis de collecte, événements sur mesure)
- [x] Liens, traductions FR/EN et vérification des pages

## i18n FR/EN (en cours)
- [x] Infra i18next + détection device + sélecteur Paramètres + profiles.locale
- [x] Traduction écrans : bestiaire, capture, social, profil/quêtes, carte, auth
- [x] Site vitrine + blog bilingue (articles.ts LocalizedText)
- [x] E-mails transactionnels selon profiles.locale
- [x] Passe finale : corriger TOUTES les erreurs de typecheck (/tmp/observability/build-errors.log)
- [x] Contenu espèces EN : noms communs en base (5 800) + fiches traduites à la demande

## Refonte navigation
- [x] Mon Faunex : Captures / Cartes / Badges + quêtes
- [x] Bestiaire : Bestiaire / Collections / Classement
- [x] Compatibilité des anciens liens et validation mobile
- [x] Remplacer la page Profil par un tiroir partagé dans les trois en-têtes

## Compte de test toutes raretés
- [x] Créer valentinmoulay+all@gmail.com et huit captures de raretés distinctes (confirmation e-mail requise)
- [x] Masquer ce compte des explorateurs, classements et statistiques d'activité

## Retraits demandés
- [x] Enlever le classement affiché dans les collections et dans les terroirs

## Navigation des classements
- [x] Premier niveau Global / Explorateurs
- [x] Second niveau Semaine / Tout temps / catégories d'animaux
- [x] Vérifier la navigation mobile et le verrou Premium
- [x] Afficher les montées et descentes depuis la veille

## Fiche espèce
- [x] Catégorie et nombre de captures dans la même carte d’infos que Rareté, Date, Localisation
- [x] Compteurs de likes et de commentaires affichés seulement lorsqu’ils sont non nuls
- [x] Suppression : icône poubelle à côté de Partager + pop-up de confirmation au-dessus de la fiche

## Transitions des cartes
- [x] Garder la carte visible sans écran blanc entre Ajouter et son rangement
- [x] Retirer la capture dès la fin visible de l'animation de suppression
- [x] Tester automatiquement le fond continu, le placement et la disparition dès la fin de l'effet
- [x] Supprimer la grande photo d'attente et le noir final du rangement ; ne montrer que le trajet vers la case
- [x] Remplacer l'écran blanc après le bouton par la petite carte au point de départ du rangement
- [x] Supprimer toute vue intermédiaire : afficher directement le Bestiaire derrière la carte qui se range

## Nettoyage des noms d’espèces
- [x] Corriger les noms, capitales et parenthèses signalés
- [x] Fusionner Âne et les variantes génériques d’Araignée
- [x] Bloquer les formulations incertaines avant la modération
