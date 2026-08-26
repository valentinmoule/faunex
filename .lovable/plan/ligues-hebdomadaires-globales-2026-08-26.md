# Ligues hebdomadaires globales

Un système de compétition hebdomadaire à la Duolingo, totalement séparé des classements par catégorie.

## Principes

- Un utilisateur = **une seule ligue globale** à la fois (pas de ligue par catégorie).
- 7 paliers : 🌱 Débutant → 🥉 Bronze → 🥈 Argent → 🥇 Or → 💎 Platine → 💠 Diamant → 👑 Élite.
- Chaque semaine (lundi → dimanche), l'utilisateur rejoint un **groupe de 20 joueurs** du même palier.
- Les points de ligue = l'XP gagnée pendant la semaine (captures, quêtes, badges, follows). Aucune nouvelle source de points inventée : tout ce qui donne de l'XP donne des points.
- Fin de semaine, dans chaque groupe :
  - **top 5 → montent** d'un palier,
  - **rangs 6 à 15 → restent**,
  - **5 derniers → descendent** d'un palier (sauf Débutant, plancher).
  - Un joueur à 0 point ne monte pas.
- Élite est le plafond : les premiers restent Élite.

## Expérience utilisateur

- Nouvelle page `/ligue` : bandeau du palier courant (emoji, nom, couleur), compte à rebours jusqu'à la fin de semaine, puis la liste des 20 joueurs du groupe triée par points avec avatars (badge Premium respecté), points, et zones colorées « promotion » / « maintien » / « relégation ». Ma ligne est mise en avant.
- Nouvelle carte « Ligue » sur la page Profil (au-dessus des quêtes) : palier, position actuelle, aperçu des 3 premiers, clic → `/ligue`.
- Au premier chargement de la semaine, une bulle indique le résultat de la semaine précédente (monté / maintenu / descendu).
- Le classement par catégorie existant (`CategoryLeaderboard`) n'est pas modifié.

## Détails techniques

Base de données (migration) :
- `league_tiers` : ordre et libellés des 7 paliers (référence statique, lecture publique authentifiée).
- `league_groups` : `week_start`, `tier`, `group_no`, `settled_at`.
- `league_members` : `user_id`, `group_id`, `week_start`, `points`, unique (`user_id`, `week_start`).
- `league_results` : historique `user_id`, `week_start`, `tier`, `rank`, `outcome` (`promoted` / `stayed` / `demoted`) — sert à afficher le résultat et à déterminer le palier suivant.
- Grants explicites + RLS : chaque utilisateur ne lit que sa propre ligne ; les classements passent par des RPC `SECURITY DEFINER`.

Fonctions :
- `league_join(p_user_id)` : règle le(s) semaine(s) passée(s) non réglée(s) du joueur, calcule son palier courant depuis `league_results`, puis l'insère dans un groupe du bon palier ayant moins de 20 membres (sinon en crée un). Idempotent.
- `settle_league_group(p_group_id)` : classe les membres, écrit `league_results` avec les règles ci-dessus, marque le groupe réglé.
- `grant_xp` est étendue : après l'attribution d'XP, elle appelle `league_join` puis incrémente `points` de la semaine courante. Le calcul de niveau/XP reste identique.
- `league_standings()` : les 20 lignes de mon groupe (rang, pseudo, avatar, points, `is_me`).
- `my_league()` : mon palier, mon rang, mes points, la taille du groupe, et le résultat de la semaine précédente.

Front :
- `src/lib/leagues.ts` : métadonnées des paliers (emoji, libellé, classes de couleur) et bornes promotion/relégation.
- `src/pages/LeaguePage.tsx` (route `/ligue`, protégée comme les autres pages authentifiées).
- `src/components/LeagueCard.tsx` inséré dans `ProfilePage.tsx`.
- Réutilisation de `PremiumAvatar`, `usePremiumUsers`, `startOfWeekISO`, `LoadingScreen`.
