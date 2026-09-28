# Fluidifier le rangement d’une carte

## Objectif
Rendre le passage « Ajouter → Bestiaire → rangement » nettement plus fluide sur téléphone, sans modifier la destination exacte de la carte ni retarder les animations de niveau.

## Changements
- Utiliser l’attente après le clic sur « Ajouter » comme un court écran de préparation : chargement de la photo et de la page du Bestiaire avant le lancement visuel.
- Ne commencer le rangement qu’une fois la grille positionnée, la vignette cible montée et la photo décodée.
- Simplifier le mouvement en un seul vol continu du centre vers la case, avec une légère apparition puis un éclat d’arrivée plus court.
- Éviter les recalculs pendant le vol : mesurer la destination juste avant le départ, puis ne faire qu’un ajustement final si la grille a réellement bougé.
- Conserver le mode « réduire les animations » et l’attente de fin du rangement avant une montée de niveau.

## Vérification
- Simuler une carte en attente dans le Bestiaire sur format mobile.
- Contrôler que la carte arrive exactement dans sa case, que l’image est déjà chargée et qu’aucune erreur n’apparaît.
- Vérifier la compilation après les changements.

## Détails techniques
Le mouvement restera limité à `transform` et `opacity`, avec `will-change` actif uniquement sur la carte volante. Le préchargement sera borné afin qu’une image lente ne bloque jamais le parcours.
