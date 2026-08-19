# Refonte taxonomie Faunex — Audit, modèle cible, migration

Statut : **analyse uniquement**. Aucune donnée de production modifiée, aucune UI touchée.

## 1. Où vivent les données aujourd'hui

| Donnée | Emplacement | Clé de liaison |
| --- | --- | --- |
| Catalogue d'espèces | `animals` (2 646 lignes) : `name`, `scientific_name`, `category`, `rarity` | aucune hiérarchie |
| Captures utilisateurs | `captures` (9 814 approuvées) : `animal_name`, `scientific_name`, `category`, `rarity` dénormalisés | **jointure par texte** `lower(name)` |
| Fauna par territoire | `animal_departments` (871 lignes) | `animal_name` (texte) |
| Dataset ML | `ml_dataset_events` (9 807 vérités terrain) | `animal_id` (FK, 0 orphelin) |
| Progression | `profiles.total_captures`, `regions_explored`, XP, `user_badges`, `daily_quests` | dérivés du nombre d'**espèces distinctes** (`recompute_profile_counters`) |
| Modération | `captures.status`, edge functions `enrich-capture` / `auto-moderate-capture` | `match_animal(name, scientific)` |
| Identification IA | `identify-animal` → nom FR + binôme + `category` libre | contrainte par trigger `enforce_animal_category` + `canonical_animal_category` |
| Front | `src/lib/bestiary.ts` (icônes/emoji par `category`, `normalizeCategory` retire « (monde) »), `useBestiaryData`, `MapPage`, `NearbyAnimalsSection` | `category` texte |

Point structurel majeur : **le nom commun est la clé de fait** de tout le système (captures, territoires, unicité `captures_unique_species_per_user`). Il n'existe aucune notion de rang taxonomique ni de parenté.

## 2. Incohérences détectées (aucune suppression effectuée)

1. **Catégories dédoublées par le suffixe « (monde) »** : 9 catégories réelles → 15 valeurs (`Mammifères` 481 vs `Mammifères (monde)` 96). La portée géographique est encodée dans la catégorie au lieu d'un attribut.
2. **Races traitées comme des espèces** : 117 entrées `Canis lupus familiaris`, 44 `Bos taurus`, 34 chevaux, 31 `Felis catus`, 31 `Gallus gallus domesticus`. Toutes au même niveau que le lynx boréal.
3. **Rangs supérieurs traités comme des espèces** : 151 entrées avec un seul mot scientifique, dont des familles/ordres (`Araneae`, `Formicidae`, `Culicidae`, `Lepidoptera`, `Anisoptera`, `Ostreidae`). « Araignée » cohabite avec « Argiope frelon ».
4. **Sous-espèces au même niveau que l'espèce** : 239 trinômes (`Equus ferus przewalskii`, `Felis silvestris catus`…), sans lien vers l'espèce parente.
5. **Variantes de nommage / quasi-doublons** : `Husky Sibérien` vs `Husky de Sibérie`, `Caniche nain`/`Caniche naine`, `Vache Pie Holsteinn`/`Vache Pie Holsteine`, `Chat domestique`/`Chat domestique (Européen)`/`Chat Européen`, `Loup tchécoslovaque`/`Chien-loup tchécoslovaque`. 0 doublon exact de `name`, mais 21 binômes partagés par plusieurs entrées.
6. **Entrées « non identifiées »** promues en espèces : `Cheval de race inconnue`, `Cheval de race non identifiée`, `Coq de race naine (probablement…)`.
7. **Classification biologique fausse** : `Mollusques` sert de fourre-tout (méduses, oursins, anémones, vers) ; `Insectes` contient les myriapodes ; les mille-pattes et cloportes sont rangés par mots-clés.
8. **116 lignes `animal_departments` orphelines** (nom absent du catalogue) : fauna régionale silencieusement perdue.
9. **Contournement fragile dans la modération** : `match_animal` maintient une liste codée en dur de 14 binômes « ambigus » pour éviter les faux doublons entre races — symptôme direct de l'absence de rangs.
10. **Candidats naturels aux collections spécialisées** déjà présents mais non modélisés : chiens, chats, chevaux, bovins, volailles, papillons, libellules, coccinelles, rapaces, orchidées de mer, etc.

## 3. Modèle cible proposé

Un arbre unique + un système de collections transversal. Le catalogue `animals` reste en place comme **vue de compatibilité** le temps de la migration.

```text
taxa (arbre, 1 ligne par entité taxonomique)
  id, parent_id -> taxa.id
  rank: enum ('kingdom_group','class_group','group','species','subspecies','breed')
  main_category: enum (9 catégories principales, jamais suffixée)
  vernacular_name (FR), scientific_name, scientific_rank ('familia','genus','species'...)
  is_domestic bool, scope enum ('france','monde')
  rarity, status ('validated','pending','deprecated'), merged_into -> taxa.id
  external_ids jsonb (inat_id, gbif_id)

taxon_synonyms          -- noms alternatifs, fautes, variantes régionales
  taxon_id, label, kind ('synonym','misspelling','ai_alias','legacy_name'), lang
  unique(normalized_label)

collections             -- collections principales (gratuites) et spécialisées (Premium)
  id, slug, title, kind ('main_category','specialized'), is_premium, icon, sort_order

collection_taxa         -- N-N : une entité peut appartenir à plusieurs collections
  collection_id, taxon_id, is_core bool
```

Rattachement des données existantes :

- `captures.taxon_id` (nouvelle colonne nullable, FK `taxa`) — les colonnes texte actuelles restent intactes comme historique d'identification.
- `ml_dataset_events.taxon_id` en parallèle de `animal_id`.
- `animal_departments.taxon_id` en parallèle de `animal_name`.
- `animals` conservée telle quelle + colonne `taxon_id` : zéro régression pour le front et les edge functions.

Exemples de résolution :

```text
Mammifères → Chiens (group, Canis lupus familiaris) → Chien domestique (species)
                                                    → Golden Retriever (breed)
   collections : « Mammifères » (main) + « Races de chiens » (specialized, premium)

Insectes → Papillons (group, Lepidoptera) → Paon-du-jour (species, Aglais io)
   collections : « Insectes » (main) + « Papillons de France » (specialized)
```

Règles :
- une catégorie principale reste un simple attribut `main_category` : les 9 collections gratuites ne bougent pas ;
- l'unicité de collection utilisateur devient paramétrable par rang (une seule ligne « Chien domestique », mais plusieurs races collectionnables) ;
- `scope` remplace le suffixe « (monde) », qui disparaît sans casser `normalizeCategory`.

## 4. Stratégie de migration (par phases, non destructive)

**Phase 0 — Snapshot.** Copies figées `animals_backup_<date>` et `animal_departments_backup_<date>`.

**Phase 1 — Structures vides.** Création de `taxa`, `taxon_synonyms`, `collections`, `collection_taxa` + GRANT/RLS (lecture publique du référentiel, écriture réservée `service_role` / rôle admin). Aucune lecture applicative encore.

**Phase 2 — Import miroir.** Chaque ligne `animals` devient un `taxa` (`animals.taxon_id` renseigné) avec un rang **déduit automatiquement** :
- 1 mot scientifique → `group` ;
- binôme domestique connu (14 binômes) → `breed` rattaché à l'espèce ;
- trinôme → `subspecies` ;
- binôme sinon → `species`.
Les cas non tranchés passent en `status='pending'` pour revue humaine, jamais en devinette silencieuse.

**Phase 3 — Rattachement des parents.** Création des nœuds `group` manquants (Chiens, Chats, Chevaux, Bovins, Volailles, Papillons, Libellules…), reparentage, et enregistrement des variantes de nommage en `taxon_synonyms` (aucune fusion destructive : `merged_into` + `status='deprecated'`).

**Phase 4 — Rattachement de l'historique.** Backfill `captures.taxon_id`, `ml_dataset_events.taxon_id`, `animal_departments.taxon_id` via nom normalisé puis synonymes. Les 116 lignes territoires orphelines sont listées, pas supprimées.

**Phase 5 — Lecture côté serveur.** `match_animal` et la modération interrogent `taxa` + synonymes (la liste codée en dur de binômes ambigus est remplacée par `rank='breed'`). Comportement fonctionnel identique.

**Phase 6 — Collections.** Peuplement de `collections` / `collection_taxa` ; les compteurs de progression restent calculés sur les espèces des 9 catégories principales pour ne pas décaler les niveaux/XP existants.

Chaque phase est réversible : les colonnes historiques ne sont jamais écrasées et aucune ligne n'est supprimée avant validation explicite.

## 5. Risques et cas ambigus

- **Compteurs et XP** : basculer l'unicité du nom vers le taxon pourrait fusionner des captures (ex. `Husky Sibérien` + `Husky de Sibérie`) et faire *baisser* un total. Mitigation : garder l'unicité par nom en phases 1-5, et ne toucher aux compteurs qu'après arbitrage.
- **Index `captures_unique_species_per_user`** : basé sur `animal_name`. Le passer au taxon changerait ce qui est collectionnable (races de chiens notamment) — décision produit à prendre avant la phase 6.
- **Races vs espèces** : ~250 entrées domestiques exigent une revue manuelle (chevaux « de race inconnue », croisés, « Bully American » vs « American Bully »).
- **Taxons fourre-tout** : `Mollusques` doit être scindé (méduses/oursins/vers) ; risque de faire disparaître une catégorie visible côté utilisateur si fait sans UI adaptée.
- **Cohérence IA** : l'IA renvoie du texte libre ; sans mapping synonymes complet, de nouvelles captures créeraient des taxons en doublon. Un `status='pending'` par défaut pour tout nouveau nom est nécessaire.
- **Volume de revue humaine** : ~500 entrées à arbitrer (151 rangs supérieurs + 239 trinômes + variantes). Prévoir un écran d'admin dédié (hors périmètre actuel).
- **Territoires** : les 116 orphelins et le fallback par mots-clés de `buildRegionalAnimalSet` deviendront caducs — à remplacer par un rattachement `taxon_id`.

## 6. Décisions attendues avant toute migration

1. Les races de chiens/chats/chevaux sont-elles collectionnables individuellement (1 carte par race) ou une seule carte « Chien domestique » + collection Premium de races ?
2. Les groupes (« Araignée », « Papillons ») restent-ils capturables, ou deviennent-ils uniquement des nœuds de regroupement ?
3. Les compteurs/XP historiques peuvent-ils être recalculés (risque de baisse) ou doivent-ils être gelés ?
4. `Mollusques` est-il scindé maintenant ou conservé tel quel jusqu'à la refonte UI ?
