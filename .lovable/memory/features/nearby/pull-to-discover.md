---
name: Pull to discover
description: Le bouton "Chercher dans cette zone" est remplacé par un geste pull-down (style Slack) global
type: feature
---
Le bouton "Chercher dans cette zone" a été retiré de la carte.
La recherche d'espèces proches (edge function `nearby-animals`) se déclenche via un geste
"tirer vers le bas" quand l'utilisateur est déjà en haut de la page, sur /home, /bestiaire,
/explorers et /profile (composant global `PullToDiscover`, monté dans App).
Seuil ~88px, pastille flottante avec radar + libellés "Tire pour explorer autour de toi" /
"Relâche pour explorer" / "Exploration en cours…", puis bottom sheet des résultats.
La recherche utilise toujours la géolocalisation de l'utilisateur (plus le centre de la carte).
