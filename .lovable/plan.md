# Apprendre : parcours interactifs et récompenses en Graines

## Résultat attendu

Un véritable parcours d’apprentissage Faunex, adapté au téléphone : chemin vertical légèrement sinueux, étapes circulaires, progression sauvegardée et exercices courts. Ce plan couvre la phase **Apprendre**, sans ajouter le Coffre, les achats de monnaie ou les cosmétiques.

## Accès et présentation

- Ajouter « Apprendre » depuis Mon Faunex, en conservant les cinq onglets actuels.
- Afficher le solde de Graines, le nombre de nouvelles étapes validées aujourd’hui, le parcours actif, sa progression et « Reprendre ».
- Distinguer étapes terminées (vert et coche), actuelle (mise en évidence discrète), verrouillées (gris et cadenas) et quiz de fin de chapitre.
- Permettre de choisir un parcours et de revoir les étapes déjà terminées.
- Respecter les couleurs, typographies et fenêtres Faunex, les zones de sécurité iOS, les petits écrans et les préférences de mouvement réduit. Tous les nouveaux textes sont disponibles en français et anglais.

## Exercices et progression

- Organiser le contenu en **Parcours → Chapitres → Étapes → Questions**.
- Chaque étape propose une introduction courte et environ cinq questions, pour une durée cible de 2 à 4 minutes.
- Inclure QCM, vrai/faux et reconnaissance visuelle avec photos d’espèces correctement identifiées et autorisées.
- Afficher la progression, le choix d’une réponse, « Vérifier », le résultat et une explication avant la question suivante.
- Sauvegarder la tentative pour reprendre après une interruption ; une réponse vérifiée ne peut plus être modifiée dans cette tentative.
- En cas d’échec, présenter les erreurs et corrections et permettre de recommencer.
- En cas de réussite, afficher les félicitations, la récompense éventuelle et débloquer la prochaine étape.

## Règles exactes

- Réussite à **80 % minimum**, soit **4 bonnes réponses sur 5**.
- **10 Graines** pour la première réussite de chaque étape, jamais pour une question seule.
- **Gratuit : 3 nouvelles étapes validées par jour. Premium : 10**, y compris Premium Famille.
- La journée est comptée de minuit à minuit **UTC**, conformément à l’économie existante.
- Une tentative échouée ne consomme aucun quota, ne donne aucune Graine et ne débloque aucune étape.
- Rejouer une étape validée est gratuit, sans quota ni nouvelle récompense.
- Après passage à Premium, les réussites déjà réalisées restent comptées : après 3 réussites, il reste 7 validations possibles.
- Quota atteint : les révisions restent accessibles ; afficher le moment de renouvellement et, pour les comptes gratuits, un accès à l’offre Premium existante.
- Les connexions, captures et découvertes restent sans gain de Graines.

## Contenus et administration

- Ajouter un espace administrateur pour créer et ordonner les parcours, chapitres, étapes et questions, avec introductions, photos, choix, réponses correctes et explications FR/EN.
- Permettre les brouillons, la prévisualisation et la publication ; refuser une publication incomplète.
- Les contenus peuvent évoluer sans nouvelle version sur les stores une fois cette fonctionnalité installée.
- Préparer un premier parcours « Les oiseaux de nos jardins » avec plusieurs étapes et un quiz final ; utiliser des contenus pédagogiques relus et des photos aux droits vérifiés. Les autres thèmes restent extensibles, sans catalogue massif inventé.

## Détails techniques

- Réutiliser le portefeuille et le registre existants : « Graines » est le nouveau nom de la même monnaie, pas un deuxième solde.
- Stocker contenus, tentatives, réponses et validations dans Lovable Cloud ; séparer les réponses correctes des données accessibles aux apprenants.
- Vérifier chaque réponse côté serveur avant de renvoyer le résultat et l’explication ; ne jamais accepter un score ou une récompense fournis par le téléphone.
- À la fin, vérifier publication, prérequis, score et abonnement effectif. Sous un verrou par utilisateur, enregistrer ensemble première validation, quota et crédit des 10 Graines.
- Garantir l’unicité de la récompense par utilisateur et étape, même après un double appui, une reprise ou deux appareils simultanés.
- Figer la version du contenu d’une tentative pour qu’une modification éditoriale ne change pas ses questions en cours.
- Protéger les données personnelles et réserver la gestion éditoriale aux administrateurs vérifiés côté serveur.

## Validation avant livraison

- Tests des seuils 3/5 et 4/5, des 10 Graines, des quotas 3/10 et de leur renouvellement UTC.
- Tests de l’échec, de la révision, du passage à Premium après 3 réussites, de Premium Famille et de l’accès expiré.
- Tests des prérequis, contenus non publiés, accès aux réponses correctes, doubles validations et concurrence.
- Vérifier qu’une erreur annule toute la validation et son crédit, sans opération partielle.
- Parcourir une étape réelle avec un compte connecté : réponses, retour pédagogique, réussite, solde actualisé, prochaine étape, puis révision sans nouveau gain.
- Vérifier l’affichage sur téléphone et ordinateur et conserver les tests qui interdisent les gains pour captures et connexions.

## Hors périmètre

Pas d’achat de Graines, de nouvelle logique de paiement, de récompense XP supplémentaire, de vie payante, de classement pédagogique ou de changement des autres fonctions de Faunex.