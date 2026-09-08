# Corriger les faux doublons en modération

## Objectif
Empêcher qu’une capture soit signalée comme déjà possédée lorsque l’espèce proposée et la capture existante sont taxonomiquement différentes.

## Étapes
1. Vérifier le cas Agame des colons / Iguane d’eau de Bornéo dans les captures, le catalogue et les correspondances taxonomiques.
2. Corriger la comparaison serveur pour privilégier l’identité taxonomique fiable et ne jamais assimiler deux noms scientifiques différents.
3. Déployer la fonction concernée et tester le cas signalé ainsi que les vrais doublons.

## Technique
- Conserver l’exclusion de la capture en cours.
- Comparer les identifiants taxonomiques lorsqu’ils existent, sinon les binômes scientifiques normalisés, puis seulement les noms communs canoniques.
- Ne modifier ni les captures ni les autres règles de modération sans lien avec ce défaut.
