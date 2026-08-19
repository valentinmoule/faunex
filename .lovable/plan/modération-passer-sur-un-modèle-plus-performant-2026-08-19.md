# Modération : passer sur un modèle plus performant

## Objectif
Améliorer la fiabilité des décisions de modération (auto-validation et prévisualisation de fiche) en utilisant en priorité le modèle le plus performant, avec repli automatique en cas d'erreur.

## Situation actuelle
- Auto-modération (`auto-moderate-capture`) : essaie `google/gemini-2.5-flash`, puis `google/gemini-2.5-pro` en repli.
- Enrichissement de fiche (`enrich-capture`) : `gemini-2.5-pro` puis `flash` en qualité "high", `flash-lite` puis `flash` sinon.
- Seuil d'auto-approbation actuel conservé (confiance ≥ 90 %).

## Changements proposés
1. Auto-modération : inverser l'ordre → `google/gemini-2.5-pro` en principal, `google/gemini-2.5-flash` en repli (puis `flash-lite` en dernier recours si les deux échouent).
2. Enrichissement : utiliser la chaîne "haute qualité" (`pro` → `flash`) pour toute demande venant de la modération, et non seulement en mode `high`.
3. Journaliser le modèle réellement utilisé dans les événements dataset, pour comparer la qualité des décisions.
4. Aucun changement du seuil de confiance ni du parcours utilisateur : la modération humaine reste le repli.

## Impact
- Meilleure précision sur les cas difficiles (races, insectes, espèces proches), donc moins de captures renvoyées en modération manuelle.
- Coût IA par modération plus élevé (le flux de modération est faible en volume, contrairement à l'identification côté capture qui reste inchangée).
- Latence légèrement supérieure ; les timeouts et repli existants sont conservés.

## Détails techniques
- `supabase/functions/auto-moderate-capture/index.ts` : liste de modèles réordonnée, ajout d'un dernier repli, capture du modèle utilisé pour le log dataset.
- `supabase/functions/enrich-capture/index.ts` : `quality` par défaut passe sur la chaîne `pro` → `flash` pour les appels de modération.
- Vérification par appel réel des deux fonctions après déploiement (une capture en attente).
