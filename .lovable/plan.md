# Garder le champ de collection visible avec le clavier

## Modification
- Détecter la hauteur réellement visible lorsque le clavier mobile s’ouvre.
- Limiter la fenêtre « Ajouter » à cette hauteur et permettre à son contenu de défiler si nécessaire.
- Faire défiler automatiquement le champ de nom dans la zone visible au moment où il reçoit le focus.
- Conserver l’apparence et le comportement actuels lorsque le clavier est fermé.

## Vérification
- Ouvrir une fiche depuis Mon Faunex, puis « Ajouter » et « Créer une collection ».
- Simuler un écran mobile avec clavier réduit et confirmer que le champ et le bouton restent visibles.
- Contrôler la fermeture de la fenêtre et la compilation.

## Détails techniques
- Utiliser `window.visualViewport` avec un repli standard pour iOS/Android.
- Nettoyer les écouteurs à la fermeture afin de ne pas affecter les autres fenêtres.
