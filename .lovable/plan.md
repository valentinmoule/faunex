# Plan d'action : réduire les coûts IA et le trafic réseau

## Ce que disent les chiffres (dernières 24 h)

| Poste | Volume / jour | Modèle | Commentaire |
|---|---|---|---|
| Identification (1re passe) | ~1 640 appels | gemini-3.1-flash-lite | pour seulement ~1 100 captures enregistrées → ~33 % d'appels "perdus" |
| Identification (2e passe) | ~135 appels | gemini-3.5-flash | prompt long (~4× plus long), déclenché en cas de doute |
| Auto-modération | 35 à 130 appels | gemini-2.5-pro | **le modèle le plus cher du projet**, appelé en 1er |
| Fiches espèces | ~0 à 45 | flash-lite | déjà mutualisées : 3 970 fiches en base, ça marche |
| Recherche autour de toi | ~53 appels | gemini-3-flash | aucun cache géographique |

Deux constats importants :
1. **Oui, les descriptions sont déjà mises en cache** en base (`species_profiles`) : ce poste n'est plus le problème.
2. **Aucune empreinte d'image n'est enregistrée** (0 hash sur 3 570 événements) : impossible aujourd'hui de détecter qu'une même photo est analysée plusieurs fois. C'est le gisement d'économie le plus évident.

Le vrai coût aujourd'hui = **les jetons image** (chaque photo en 1024 px consomme plus de jetons que tout le prompt) × le nombre d'appels, plus la présence du modèle `pro` sur la modération.

## Lot 1 — Économies immédiates, sans perte de fiabilité

1. **Cache d'identification par empreinte d'image**
   - Calculer un hash SHA-256 de l'image compressée, l'enregistrer, et renvoyer le résultat précédent si la même image est renvoyée dans les 24 h (retry réseau, re-soumission, "contester l'IA", double tap).
   - Gain attendu : 15 à 30 % des appels d'identification.
2. **Réduire la résolution de la 1re passe : 1024 px → 768 px** (qualité 0,60)
   - Les jetons image baissent d'environ 40 % pour une précision quasi identique sur cette passe de tri ; la 2e passe (cas douteux) garde 1024 px.
   - Gain attendu : 25 à 35 % du coût de la 1re passe.
3. **Auto-modération : inverser l'ordre des modèles**
   - `gemini-3.1-flash-lite` en 1er, puis escalade vers `gemini-2.5-pro` **uniquement** si le verdict est incertain ou si l'utilisateur a forcé un nom.
   - Gain attendu : 70 à 85 % du coût de modération, décision finale inchangée sur les cas difficiles (l'humain reste le dernier recours).
4. **Cache géographique pour "Autour de toi"**
   - Mémoriser le résultat par zone (~5 km) et par saison pendant 30 jours en base ; les explorations dans la même zone ne rappellent plus l'IA.
   - Gain attendu : 60 à 80 % des appels de ce poste.

## Lot 2 — Éviter les appels inutiles

5. **Ne plus analyser deux fois la même capture** : bloquer un second appel d'identification tant que le premier n'a pas répondu, et ne pas relancer l'IA après un simple changement d'écran.
6. **Filtre local avant envoi** : refuser côté application les images trop petites/floues ou sans contenu exploitable avant tout appel IA.
7. **Raccourcir encore le prompt rapide** (regroupement des listes d'indices) : ~20 % de jetons texte en moins sur chaque appel.

## Lot 3 — Trafic réseau (bande passante)

Aujourd'hui, chaque photo est stockée en 1600 px / qualité 0,82 (~300-600 Ko) et c'est **cette même image** qui est chargée dans les grilles du bestiaire, le feed explorateurs et la carte. Une grille de 60 cartes = 20 à 30 Mo transférés.

8. **Générer une vignette 400 px WebP à l'enregistrement** (en plus de l'original) et l'utiliser dans les grilles, le feed, la carte et les avatars. L'image pleine résolution ne se charge plus qu'à l'ouverture du détail / plein écran.
   - Gain attendu : **80 à 90 % de bande passante** sur les écrans de listes.
9. **Générer les vignettes manquantes pour l'historique** en tâche de fond (par lots), sans bloquer l'app.
10. **Cache navigateur long** sur les médias et suppression des rechargements en double d'une même liste.

## Ordre proposé

- Étape A (coût IA, rapide) : points 1, 2, 3, 5 → baisse attendue de l'ordre de **45 à 60 %** de la facture IA quotidienne.
- Étape B (réseau) : points 8, 9, 10 → baisse attendue de **80 %+** du trafic images.
- Étape C (finitions) : points 4, 6, 7.

## Détails techniques

- `supabase/functions/identify-animal/index.ts` : calcul et journalisation de `image_hash`, lecture du cache avant appel IA, 768 px pour la passe rapide.
- Nouvelle table `identify_cache` (hash, payload jsonb, created_at) avec RLS et GRANT, purge > 24 h ; `ml_dataset_events.image_hash` enfin rempli pour mesurer les gains.
- `supabase/functions/auto-moderate-capture/index.ts` : chaîne `flash-lite → 2.5-pro` conditionnelle.
- Nouvelle table `nearby_cache` (cellule géo, mois, payload) pour `nearby-animals`.
- `src/lib/imageProcessing.ts` : `compressForAI` à 768 px, ajout d'un `makeThumbnail(400, webp)` ; `useCaptureSave.ts` téléverse `image_url` + `thumb_url` (nouvelle colonne sur `captures`).
- Composants de liste (`AnimalCardComponent`, `FeedPostCard`, carte, avatars) : consommer `thumb_url` avec repli sur `image_url`.
- Mesure : requête de suivi quotidien appels/captures et coût par capture avant/après chaque lot.
