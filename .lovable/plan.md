# Profil en tiroir

## Résultat attendu
- Ajouter un bouton avatar/profil dans les en-têtes de **Mon Faunex**, **Bestiaire** et **Explorateurs**.
- Ouvrir un tiroir mobile depuis le bas, avec une présentation compacte : avatar centré, nom et pseudo centrés, niveau et progression XP, puis les quatre statistiques en petit format.
- Conserver dans ce tiroir les accès utiles du profil actuel : paramètres du compte, Premium, Discord et modération pour l’administrateur.
- Retirer l’entrée Profil du menu inférieur.
- Supprimer l’écran Profil comme destination autonome : un ancien lien `/profile` redirigera vers Mon Faunex et ouvrira directement le tiroir.

## Compatibilité
- Réutiliser les données actuelles du compte sans modifier les règles, statistiques ou permissions.
- Conserver les écrans de paramètres existants pour l’édition du compte, les notifications, la langue, le mot de passe, la confidentialité, la déconnexion et la suppression.
- Maintenir les textes français et anglais.
- Vérifier le tiroir sur mobile dans les trois pages concernées et le comportement de l’ancien lien `/profile`.

## Détails techniques
- Créer un tiroir de profil partagé, monté une seule fois dans l’application et piloté par un contexte léger.
- Créer un bouton de profil partagé affichant l’avatar ou une icône de repli.
- Charger le profil, les abonnés/abonnements et l’accès modération à l’ouverture, avec états de chargement et fermeture correcte lors d’une navigation.
