# Le Calendrier de l’Avent des Explorateurs

## Expérience proposée

Une collection spéciale Noël dans le Bestiaire, ouverte à tous les comptes, du **1er au 24 décembre 2026**. Son booster ouvre une page calendrier de 24 cases, plutôt qu’une grille classique d’espèces.

- Chaque case révèle son défi à minuit, heure de Paris.
- Une nouvelle capture correspondant au défi, envoyée ce jour-là et approuvée, complète la case. Les anciennes captures ne comptent pas ; photographier une espèce déjà possédée reste possible.
- **Pas de rattrapage** : une case manquée reste manquée. Un défi soumis à temps peut être validé plus tard par la modération.
- Cases futures verrouillées, case du jour accessible, états distincts pour les captures en attente, les défis accomplis et les jours manqués.
- Les catégories larges et les animaux domestiques restent admissibles pour rendre l’événement accessible en décembre.
- Les quotas habituels de capture restent inchangés.

## Proposition des 24 défis

Une seule photo admissible suffit chaque jour. Les choix entre catégories signifient « l’une ou l’autre », jamais plusieurs photos obligatoires.

| Jour | Défi |
|---|---|
| 1 | Trouver un mammifère |
| 2 | Trouver un oiseau |
| 3 | Trouver un insecte |
| 4 | Trouver un mollusque |
| 5 | Trouver un poisson |
| 6 | Trouver un mammifère ou un oiseau |
| 7 | Trouver un arachnide |
| 8 | Trouver un oiseau |
| 9 | Trouver un mammifère |
| 10 | Trouver un insecte ou un arachnide |
| 11 | Trouver un poisson ou un crustacé |
| 12 | Trouver un animal de n’importe quelle catégorie |
| 13 | Trouver un mollusque |
| 14 | Trouver un oiseau |
| 15 | Trouver un mammifère |
| 16 | Trouver un insecte |
| 17 | Trouver un reptile, un amphibien ou un poisson |
| 18 | Trouver un oiseau ou un mammifère |
| 19 | Trouver un arachnide ou un mollusque |
| 20 | Trouver un poisson |
| 21 | Trouver un insecte ou un crustacé |
| 22 | Trouver un mammifère |
| 23 | Trouver un oiseau |
| 24 | Trouver un animal de n’importe quelle catégorie |

## Récompenses proposées, à valider

- **50 XP par défi**, soit 1 200 XP pour les 24 jours, en plus des récompenses habituelles de capture.
- **Badge « Explorateur de l’Avent 2026 » et 300 XP supplémentaires** pour les 24 cases accomplies : total événement de **1 500 XP**.
- Réclamation manuelle des récompenses, avec les animations déjà utilisées dans Faunex. Une récompense ne peut être reçue qu’une fois.
- Le badge obtenu reste visible sur le profil après Noël ; le calendrier reste consultable comme souvenir, sans nouveaux défis après le 24 décembre.

## Gestion depuis le Backoffice

Ajouter un type « Calendrier » à la création d’une collection thématique. L’administrateur peut ajuster les 24 défis, leurs catégories, les XP, l’année et les illustrations avant publication.

Préparer le calendrier **en brouillon** avec cette proposition ; aucune annonce ni mise en ligne automatique avant validation. Une fois lancé, protéger les règles déjà utilisées pour ne pas changer les récompenses des participants en cours d’événement.

Couverture du booster : photographie/illustration de Noël avec animaux et ambiance de calendrier à collectionner, fidèle aux boosters existants. Badge avec son illustration dédiée. Textes disponibles en français et en anglais.

## Détails techniques

- Étendre les collections thématiques par un type d’événement et des défis stockés côté serveur, plutôt que coder les dates et catégories dans l’app.
- Conserver les participations et récompenses séparément des collections ordinaires ; aucune capture ni XP déclarés par le téléphone ne font foi.
- Utiliser la date serveur de soumission et le statut de modération pour prouver qu’une photo a été présentée le bon jour. Conserver cette preuve aussi pour le remplacement d’une photo d’espèce déjà capturée.
- Autoriser la récupération des XP uniquement après validation ; empêcher les doublons et les récompenses multiples lors des tentatives répétées ou simultanées.
- Réutiliser le crédit XP et l’affichage de badges existants sans contourner leurs protections.
- Tests : ouverture du 1er décembre, limites à minuit à Paris, fermeture après le 24, absence de rattrapage, anciennes captures exclues, remplacement admissible, validation tardive, catégories, XP exacts et attribution unique du badge à 24/24.
- Vérification du parcours complet avec un événement de test privé, sans changer la date globale ni publier un calendrier factice aux utilisateurs.

## Déploiement

Ce calendrier exige une extension de l’app : **une première mise à jour iPhone/Android sera nécessaire** pour afficher les cases quotidiennes. Ensuite, les calendriers et leurs défis pourront être préparés et publiés depuis le Backoffice sans nouvelle version des stores.