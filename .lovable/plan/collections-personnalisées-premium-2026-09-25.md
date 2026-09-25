# Collections personnalisées (Premium)

## Ce que l'utilisateur verra

- Sur la fiche d'une espèce, le bouton favori (marque-page) ouvre désormais une petite fenêtre avec trois choix :
  1. **Ajouter aux favoris** — comportement actuel, inchangé.
  2. **Ajouter à une collection** — liste de ses collections personnalisées, une espèce pouvant être dans plusieurs collections.
  3. **Créer une collection** — champ pour nommer la nouvelle collection ; l'espèce y est ajoutée directement.
- La création de collection personnalisée est **réservée aux membres Premium** : un utilisateur gratuit qui touche « Créer une collection » voit la fenêtre d'invitation Premium (comme pour la limite de collections existante).
- Les collections personnalisées apparaissent dans l'onglet **Collections du Bestiaire**, dans une section « Mes collections » au-dessus des collections Faunex. Au toucher : vue de la collection avec la grille des espèces ajoutées (photo, nom, rareté), et possibilité de retirer une espèce ou supprimer/renommer la collection.

## Technique

- **Base de données** (migration Lovable Cloud) :
  - `custom_collections` : id, user_id, name, created_at. RLS : propriétaire seul. GRANT authenticated + service_role.
  - `custom_collection_items` : id, collection_id (FK cascade), user_id, animal_name, scientific_name, created_at, unique (collection_id, animal_name). RLS : propriétaire seul. GRANT idem.
  - **Garde-fou serveur** : trigger `BEFORE INSERT` sur `custom_collections` qui appelle `is_premium(auth.uid())` et refuse la création sinon — un client modifié ne peut pas contourner la règle.
- **Frontend** :
  - `src/hooks/useCustomCollections.ts` : chargement, création, renommage, suppression, ajout/retrait d'espèce (mises à jour optimistes comme useFavorites).
  - `src/components/AddToCollectionSheet.tsx` : la fenêtre à trois choix (style liste iOS comme la modale de filtres), ouverte depuis le bouton favori de `CardDetailSheet`.
  - `BestiairePage` : section « Mes collections » dans l'onglet Collections + vue détaillée d'une collection personnalisée (réutilise la grille d'espèces existante).
  - Textes FR/EN via `t()` dans les locales bestiary.
- Vérification : build + parcours Playwright (création, ajout, affichage, retrait) sur le compte de test.
