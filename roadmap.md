
## Présentation Premium
- [x] Afficher deux cartes Personnel/Famille avec détails et tarifs, remplacer le comparatif par une liste légère ; page connectée, tarifs mensuels, accès Famille et absence de débordement mobile vérifiés, 16 tests réussis

## Premium Famille
- [x] Réserver l’entrée Ma famille au payeur Famille ; invitations e-mail liées à l’adresse vérifiée, reprise après inscription/confirmation/profil ; 12 tests et scénario transactionnel annulé réussis, envoi interdit au non-payeur vérifié
- [ ] Confirmer réception de l’e-mail et inscription complète d’un invité après un vrai achat Famille : aucun achat Famille disponible pour vérifier ce parcours complet, aucun abonnement fictif conservé
- [x] Analyser les comptes, les accès Premium et les achats web/iOS/Android ; chemin mobile Paddle externe observé, aucun achat intégré trouvé dans les chemins inspectés
- [x] Préparer le plan : quatre comptes au total, 40 €/an ou 4 €/mois, parrainage annuel et invitations sécurisées ; présentation pour validation
- [x] Plan validé ; page Ma famille FR/EN, invitations à usage unique de sept jours, trois invités maximum, retrait et départ sans perte de données
- [x] Ajouter les tarifs web 40 €/an et 4 €/mois en test ; activation après paiement relu et vérifié, droits familiaux serveur, parrainage annuel
- [x] Vérifier 14 tests, scénario transactionnel annulé et parcours connecté : tarifs visibles, deuxième abonnement refusé, invitation invalide refusée, aucun débordement horizontal
- [ ] Tester un paiement Famille complet, renouvellement, remboursement et parrainage prolongé : achat de test et scénarios de facturation non exécutés ; aucun abonnement familial fictif conservé
- [x] Conserver Paddle sur iOS/Android comme Solo, selon la demande utilisateur ; ouvrir Famille dans le navigateur externe avec intention de paiement vérifiée, sans achats Apple/Google
- [ ] Confirmer le parcours Paddle Famille sur téléphone après synchronisation/reconstruction : appareils natifs indisponibles ici ; validation des stores non garantie

## Parrainage Premium annuel
- [x] Ajouter le code personnel et la saisie avant l’achat annuel, avec validation pour les nouveaux clients
- [x] Accorder 30 jours aux deux comptes après paiement confirmé, sans auto-parrainage ni double récompense
- [x] Reporter le renouvellement des abonnements actifs et conserver les jours offerts pour les autres comptes
- [x] Huit tests réussis, scénario serveur transactionnel annulé après validation, traitement Paddle vérifié et déployé ; code personnel/copier vérifiés connecté
- [ ] Confirmer un achat annuel complet et le report réel de renouvellement : paiement de test non exécuté dans cette session

## Notifications natives iPhone et Android
- [x] Préciser les alternatives : APNs direct sur iPhone ; service unifié possible, mais FCM généralement requis sur Android
- [x] Connecter Firebase ; validation sans livraison et accès depuis l’application réussis
- [x] Ajouter l’enregistrement privé des appareils et les notifications sociales, modération, compte bloqué, relance et récap Premium ; fonctions déployées
- [x] Tester les règles : préférences sociales distinctes, motifs de refus conservés, liens limités à l’application ; cinq tests réussis, aperçu sans erreur
- [x] Installer et valider google-services.json dans android/app pour fr.faunex.app ; plugin Google Services déjà activé, dépendance Messaging fournie par Capacitor
- [x] Installer GoogleService-Info.plist iOS pour com.faunex.faunex et l’inclure dans les ressources de la cible Xcode ; identifiant App Store préservé
- [x] Clé Apple APNs importée dans Firebase, confirmé par l’utilisateur ; réception non encore vérifiée
- [ ] Vérifier la capacité Push Notifications et le profil de signature dans Xcode : accès Apple requis
- [ ] Synchroniser/reconstruire les apps et confirmer la réception sur iPhone/Android : appareils natifs non disponibles ici

## Identité des œdipodes
- [x] Corriger Œdipode germanique, sa fiche et ses 116 captures ; confirmer Œdipode turquoise et l’aigue-marine déjà présents
- [x] Ajouter les critères diagnostiques aux analyses et à la modération, déployer les deux fonctions ; cinq contrôles serveur réussis, espèces vérifiées dans le Bestiaire connecté
- [ ] Fusionner le doublon « Criquet à ailes jaunes » / « Œdipode turquoise » : un explorateur possède les deux photos ; choix de la photo à conserver nécessaire avant fusion

## Analyse du compte de démonstration
- [x] Première passe Gemini 3.8 Flash activée pour le compte demandé, autres comptes et quotas inchangés ; fonction déployée, 11 tests réussis, identification connectée d’un Harfang des neiges affichée en 13,6 s sans ajout à la collection

## Intégrité des descriptions d’espèces
- [x] Corriger la capture de demoiselle du 24 octobre et son label de validation ; séparation Chrysiptera hemicyanea / Chrysiptera parasema vérifiée, photo conservée, trois tests serveur réussis et fiche ouverte dans l’application
- [x] Corriger le nom corrompu de la Mélitée orangée dans la référence et les trois captures concernées ; deux tests serveur réussis, correction automatique des noms à la sauvegarde vérifiée
- [x] Annuler la fusion incorrecte du Criquet des ajoncs, rétablir la capture identifiable et renommer Omocestus viridulus en Criquet verdelet ; trois tests serveur réussis
- [x] Séparer Boa du Pacifique (Candoia paulsoni) et Python de Bismarck (Bothrochilus boa), corriger les trois captures ; deux tests de correspondance réussis
- [x] Corriger la fiche commune et harmoniser les 155 captures du Cochon domestique (0 description vietnamienne restante ; Cochon vietnamien inchangé)
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
