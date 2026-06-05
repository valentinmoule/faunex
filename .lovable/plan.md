## Objectif
Permettre à l'utilisateur de créer plusieurs rubriques départementales dans le Bestiaire (ex. "Chez moi à Paris (75)" + "Vacances Bouches-du-Rhône (13)") pour suivre sa progression de capture d'espèces locales par département français.

## Fonctionnement utilisateur
1. Onglet **Bestiaire** : ajout d'une section "Mes régions" au-dessus des catégories existantes.
2. Bouton **+ Ajouter un département** → sélecteur des 101 départements français (recherche par nom ou numéro).
3. Chaque rubrique départementale ouvre une grille type binder (comme les catégories actuelles) listant les animaux présents dans ce département, marqués capturés/non-capturés.
4. L'utilisateur peut supprimer une rubrique départementale.
5. Une capture compte pour un département si l'espèce fait partie de la faune locale de ce département (peu importe où la photo a été prise).

## Données
- **Liste des départements** : statique en front (`src/data/departements.ts` — 101 entrées code + nom + région).
- **Faune par département** : nouvelle table `animal_departments` (animal_name, department_code). Peuplée via une edge function `populate-department-fauna` qui interroge l'IA Lovable pour générer la liste d'espèces par département à partir des animaux existants dans `animals`. Exécutée à la demande (admin) ou paresseusement par département à la première ouverture.
- **Rubriques utilisateur** : nouvelle table `user_department_subscriptions` (user_id, department_code, created_at) avec RLS scopée à `auth.uid()`.

## Architecture technique

### Migration DB
- Table `animal_departments` : `animal_name text`, `department_code text`, PK composite. Lecture publique (authenticated). Insert via service_role uniquement.
- Table `user_department_subscriptions` : `user_id uuid`, `department_code text`, `created_at`. RLS standard utilisateur.
- GRANT appropriés + RLS.

### Edge function `populate-department-fauna`
- Input : `{ department_code: string }`
- Récupère tous les `animals` de la base, demande à l'IA Lovable (`google/gemini-2.5-flash`) lesquels sont présents/observables dans ce département français, retourne la liste et l'insère dans `animal_departments`.
- Idempotente : skip si le département a déjà des entrées récentes.

### Front
- `src/data/departements.ts` : liste complète FR.
- `src/pages/BestiairePage.tsx` :
  - Nouvelle section "Mes régions" avec cards par département souscrit (progression X/Y).
  - Bouton "+ Ajouter un département" → bottom sheet avec recherche.
  - À l'ouverture d'une rubrique département : si `animal_departments` vide pour ce code, appelle l'edge function puis affiche la grille (mêmes composants que catégories actuelles : 4-col grid, slots capturés/vides, ouverture `CardDetailSheet`).
  - Bouton supprimer la rubrique (long press ou icône dans le header de la vue détail).

## Points hors scope
- Pas de détection automatique du département via géoloc (l'utilisateur choisit manuellement, conforme à la mémoire "Nearby activation").
- Pas de quêtes liées aux départements (peut être ajouté plus tard).
- Pas de partage social des rubriques départementales.

## Plan d'exécution
1. Migration : créer les 2 tables avec RLS/GRANT.
2. Créer `src/data/departements.ts` (101 départements).
3. Créer edge function `populate-department-fauna`.
4. Modifier `BestiairePage.tsx` : section régions + sélecteur + vue rubrique département.
5. Tester le flux : ajout département → peuplement IA → affichage grille → capture compte dans la rubrique.