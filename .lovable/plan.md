# Refonte de la navigation Faunex

## Résultat attendu

### Mon Faunex (`/home`)
Une barre d’onglets conserve l’esprit actuel avec :
- **Captures** : grille personnelle, recherche, tri, filtres, réorganisation et état d’accueil existants.
- **Cartes** : carte géographique actuelle avec les captures localisées.
- **Badges** : quêtes hebdomadaires, invitation communautaire et badges.

### Bestiaire (`/bestiaire`)
La deuxième entrée de navigation devient **Bestiaire** et contient :
- **Bestiaire** : catalogue complet des espèces, recherche et filtres.
- **Collections** : territoires et collections suivis, sans modifier leurs limites ni leur fonctionnement.
- **Classement** : classement hebdomadaire global existant, avec ses vues Global/Abonnements.

### Profil (`/profile`)
Le profil reste dédié à l’identité, la progression, les statistiques, les abonnements et les réglages. Les quêtes, badges et le classement en sont retirés puisqu’ils disposent désormais de leurs onglets dédiés.

## Compatibilité
- Conserver `/home`, `/bestiaire`, `/profile`, `/quests` et les liens profonds existants.
- Rediriger les anciens liens vers le bon nouvel onglet, notamment les notifications de badge et de quête.
- Synchroniser l’onglet actif dans l’adresse (`?tab=`) afin que retour, rechargement et liens partagés gardent le bon écran.
- Ne modifier ni les données, ni les quotas, ni les règles Premium, ni les calculs de progression.
- Maintenir les traductions françaises et anglaises.

## Détails techniques
- Extraire les grandes vues réutilisables au lieu de dupliquer les requêtes et la logique existantes.
- Réutiliser une barre d’onglets commune et stable sur mobile.
- Monter la carte uniquement dans son onglet et recalculer correctement sa taille à l’ouverture.
- Vérifier les cinq entrées de navigation, les six nouveaux onglets, les liens de notifications et les états vides sur mobile.
