# Plan de migration taxonomie Faunex — détail, mappings, cas ambigus

Arbitrages validés :
1. Races **collectionnables individuellement** (base des collections Premium).
2. Groupes taxonomiques = **niveaux de classification uniquement**, non collectionnables — sans perdre l'historique.
3. Progression/XP **jamais dégradée** : aucun compteur ne baisse, nouvelles règles appliquées progressivement.
4. `Mollusques` nettoyé et scindé (Mollusques / Échinodermes / Cnidaires / …), sans suppression, cas ambigus signalés avant modification.

Statut : **rien n'est exécuté.** Ce document est le plan à valider.

---

## A. Structures créées (phase 1, additif pur)

```sql
create type taxon_rank as enum ('group','species','subspecies','breed');
create type taxon_scope as enum ('france','monde');
create type main_category as enum ('Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons',
  'Insectes','Arachnides','Crustacés','Mollusques','Échinodermes','Cnidaires','Autres invertébrés');

taxa(id, parent_id→taxa, rank, main_category, vernacular_name, scientific_name,
     scientific_rank, scope, is_domestic, rarity, collectible bool,
     status ('validated','pending','deprecated'), merged_into→taxa,
     external_ids jsonb, created_at, updated_at)

taxon_synonyms(id, taxon_id→taxa, label, normalized_label unique, kind
     ('synonym','misspelling','ai_alias','legacy_name'), lang, created_at)

collections(id, slug unique, title, kind ('main_category','specialized'),
     is_premium, icon, sort_order, created_at)

collection_taxa(collection_id, taxon_id, is_core, primary key (collection_id, taxon_id))
```

Colonnes additives (nullable, aucune écriture destructive) :
`animals.taxon_id`, `captures.taxon_id`, `ml_dataset_events.taxon_id`, `animal_departments.taxon_id`.

RLS : lecture du référentiel pour `authenticated` (+ `anon` sur `taxa`/`collections` si le bestiaire public le nécessite), écriture réservée à `service_role` et au rôle `admin`. GRANT explicites sur chaque table.

---

## B. Règles de déduction du rang (phase 2)

Appliquées sur les 2 646 lignes `animals`, dans cet ordre :

| Règle | Détection | Rang | Volume |
| --- | --- | --- | --- |
| 1 | `scientific_name` d'un seul mot (famille/ordre/classe) | `group`, `collectible=false` | 151 |
| 2 | binôme figurant dans la **liste des espèces domestiques** (ci-dessous) et nom ≠ nom de l'espèce type | `breed`, `collectible=true` | ~300 |
| 3 | trinôme (`Genus species subspecies`) | `subspecies` | 239 |
| 4 | binôme restant | `species` | ~1 950 |
| 5 | `scientific_name` nul ou non exploitable | `status='pending'` | 1 |

Espèces domestiques → nœud `group` + espèce type + races (comptages réels) :

| Binôme | Groupe créé | Entrées | Collection Premium cible |
| --- | --- | --- | --- |
| Canis lupus familiaris (+ Canis familiaris) | Chiens | 118 | Races de chiens |
| Bos taurus | Bovins | 44 | Races bovines |
| Gallus gallus domesticus | Volailles | 31 | Races de volailles |
| Felis catus (+ Felis silvestris catus) | Chats | 31 | Races de chats |
| Equus caballus (+ Equus ferus caballus) | Chevaux | 34 | Races équines |
| Ovis aries | Ovins | 17 | Races ovines |
| Oryctolagus cuniculus | Lapins | 8 | Races de lapins |
| Anas platyrhynchos domesticus | Canards | 7 | Races de volailles |
| Sus scrofa domesticus | Porcins | 5 | Races porcines |
| Columba livia domestica | Pigeons | 3 | — |
| Capra hircus, Equus asinus, Meleagris gallopavo, Anser anser domesticus, Cavia porcellus, Mesocricetus auratus, Lama glama, Vicugna pacos, Carassius auratus, Cyprinus rubrofuscus, Melopsittacus undulatus, Nymphicus hollandicus, Psittacula krameri | groupes correspondants | 1 chacun | — |

Groupes non domestiques créés en phase 3 (rattachement par famille/ordre scientifique, pas par mot-clé) : Papillons (Lepidoptera), Libellules (Odonata), Coccinelles (Coccinellidae), Abeilles & guêpes (Hymenoptera), Coléoptères (Coleoptera), Diptères (Diptera), Punaises (Heteroptera), Araignées (Araneae), Rapaces (Accipitriformes/Strigiformes), Passereaux (Passeriformes), Anatidés (Anseriformes), Cervidés (Cervidae), Chauves-souris (Chiroptera), Serpents (Serpentes), Lézards (Lacertilia), Tortues (Testudines).

---

## C. Mapping du nettoyage `Mollusques` (114 entrées actuelles)

Reclassement proposé, **aucune suppression** :

| Nouvelle catégorie | Volume | Exemples |
| --- | --- | --- |
| Mollusques (conservés) | ~73 | Escargot de Bourgogne, Bulot, Moule commune, Poulpe commun, Seiche commune, Doris dalmatien, Ormeau, Patelle, Limace léopard |
| Cnidaires | 20 | Méduse lune (Aurelia aurita), Physalie, Pélagia noctiluca, Rhizostoma pulmo, Velelle, Anémone bulle, **Chrysaora fuscescens / lactea**, **Turritopsis dohrnii** (non détectés par mot-clé, à reclasser) |
| Échinodermes | 14 | Étoile de mer commune, Oursin violet, Holothurie, Ophiure, Concombre de mer |
| Vers / Annélides → Autres invertébrés | 5 | Ver de terre commun, Nereis, Hermelle, Ver marin |
| Autres invertébrés (tuniciers, cténaires) | 4 | Salpe, **Cténophore**, **Méduse boudin (Bolinopsis infundibulum → cténaire, pas cnidaire)** |

Erreurs franches détectées dans `Mollusques` (à reclasser, pas à supprimer) :

- **Aconit napel** (*Aconitum napellus*) et **Pulsatilla vulgaris** → **plantes**, hors périmètre animal → `status='pending'`, marquées `non_animal`.
- **Siamois Seal point** (*Felis catus*) → Mammifères / race de chat.
- **Limule royal** (*Limulus polyphemus*) → **Arachnides** (chélicérés), pas mollusque.
- **Trous de ver marin** (« Diverses espèces de vers polychètes ») → trace, pas une entité → `pending`.
- **Étoile de merForbes (Stichaster australis)** → faute de nom à corriger via synonyme.

Cas ambigus à trancher avant écriture :
1. Faut-il exposer `Échinodermes`, `Cnidaires` et `Autres invertébrés` comme catégories principales visibles (UI à faire) ou les garder masquées derrière `Mollusques` jusqu'à la refonte UI ? Recommandation : créer les valeurs en base, exposition UI dans un second temps.
2. Les 2 plantes et la trace : conservées en `pending` non collectionnables, ou reclassées en catégorie « Autre » dédiée ?
3. `Glaucus atlanticus`, `Cténophore` : nudibranche (mollusque) vs cténaire — respectivement OK et à déplacer.

---

## D. Groupes non collectionnables et préservation de l'historique

662 captures approuvées pointent aujourd'hui sur une entrée de rang `group` (Araignée, Fourmi, Moustique, Papillon générique…).

Traitement, sans perte :
- le taxon `group` reste en base avec `collectible=false` ;
- ces captures conservent `animal_name`, `scientific_name`, `rarity`, photos et XP **inchangés** ;
- `captures.taxon_id` pointe sur le groupe, plus un champ `identification_level='group'` (dérivable) pour cibler plus tard une invitation « précise ton identification » ;
- l'IA et la modération continueront d'accepter un groupe en repli, mais avec `status='pending'` pour revue.

Aucune capture n'est retirée d'un bestiaire ni d'un compteur.

---

## E. Préservation de la progression (contrainte 3)

- Les compteurs restent calculés sur `distinct lower(animal_name)` **tant que** la bascule sur `taxon_id` n'est pas validée.
- Avant/après chaque phase : snapshot `profiles_counters_backup_<date>` (`user_id`, `total_captures`, `xp`, `level`) + requête de contrôle garantissant `nouveau_total >= ancien_total` pour chaque utilisateur. En cas de baisse, la phase est annulée.
- Les fusions de variantes (`Husky Sibérien` / `Husky de Sibérie`) sont enregistrées comme **synonymes**, jamais comme fusion de captures : le nombre de découvertes ne bouge pas.
- `captures_unique_species_per_user` reste sur `animal_name` : les races étant collectionnables, aucune contrainte ne se resserre.
- XP, badges et quêtes : aucun recalcul déclenché par la migration.

---

## F. Séquence d'exécution proposée

| Phase | Contenu | Destructif | Validation |
| --- | --- | --- | --- |
| 0 | `animals_backup`, `animal_departments_backup`, `profiles_counters_backup` | non | — |
| 1 | types + 4 tables + 4 colonnes `taxon_id` + RLS/GRANT | non | — |
| 2 | import miroir 2 646 taxons, rangs déduits, `animals.taxon_id` | non | rapport de rangs |
| 3 | création des groupes, reparentage, synonymes, `merged_into` sur variantes | non | liste des `pending` |
| 4 | backfill `captures` / `ml_dataset_events` / `animal_departments` (+ rapport des 116 orphelins) | non | contrôle compteurs |
| 5 | `match_animal` + modération lisent `taxa` (races = `rank='breed'`, fin de la liste codée en dur) | non | tests modération |
| 6 | seed `collections` (9 principales gratuites + spécialisées Premium) et `collection_taxa` | non | — |
| 7 | reclassement `Mollusques` selon §C, après ton arbitrage sur les 3 cas ambigus | modifie `category` | revue manuelle |

Seule la phase 7 modifie des données existantes, et uniquement la colonne `category` de lignes listées à l'avance.

---

## G. Risques résiduels

- **~500 entrées à arbitrer manuellement** (151 groupes, 239 sous-espèces, variantes de races) : elles resteront en `pending` sans bloquer l'app.
- **Nouveaux noms IA** : tout nom inconnu créera un taxon `pending`, à surveiller pour éviter la repousse de doublons.
- **Territoires** : les 116 lignes orphelines resteront inertes jusqu'à un rattachement manuel ; le fallback par mots-clés de `buildRegionalAnimalSet` devient redondant mais reste en place.
- **UI** : les nouvelles catégories (`Échinodermes`, `Cnidaires`, `Autres invertébrés`) n'ont ni icône ni libellé dans `src/lib/bestiary.ts` — à traiter au moment de la refonte UI, sinon elles retomberont sur l'icône par défaut.

---

## H. Ce qu'il me faut pour lancer

1. Validation des phases 0→6 (non destructives) en un seul lot, ou phase par phase ?
2. Arbitrage des 3 cas ambigus `Mollusques` (§C) avant la phase 7.
3. Confirmation que les nouvelles catégories peuvent exister en base sans être encore visibles côté UI.

---

## I. Rapport d'exécution (19/08/2026) — phases 0 à 6 terminées, phase 7 NON lancée

| Phase | Résultat | Contrôle |
| --- | --- | --- |
| 0 | Snapshots `animals_backup_20260819` (2 647), `animal_departments_backup_20260819` (871), `profiles_counters_backup_20260819` (1 390 explorateurs, 9 820 découvertes, 152 440 XP) | OK |
| 1 | `taxa`, `taxon_synonyms`, `collections`, `collection_taxa` + `taxon_id` sur animals/captures/ml_dataset_events/animal_departments | linter inchangé (21 warns préexistants) |
| 2 | 2 647 taxons importés, `animals.taxon_id` 100 % renseigné | 0 ligne de `animals` modifiée |
| 3 | 35 groupes créés → 186 `group` non collectionnables, 314 `breed`, 68 `subspecies`, 2 114 `species`, 852 taxons parentés, 41 entrées génériques en `pending` | 0 suppression |
| 4 | 9 822 captures et 9 822 événements dataset reliés (0 capture approuvée non reliée), 763/871 territoires reliés (108 orphelins conservés) | compteurs stables |
| 5 | `match_animal` déduit l'ambiguïté du référentiel (fin de la liste de 14 binômes en dur), `match_taxon` ajouté, triggers de liaison automatique sur captures et dataset | comportement identique vérifié |
| 6 | 12 collections principales + 13 collections Premium, 2 970 rattachements (chiens 118, papillons 80, rapaces 46, bovins 44, volailles 40, équins 35, chats 31, libellules 29, ovins/caprins 20, cervidés 9, lapins 9, coccinelles 8, porcins 5) | invisible en UI |

Note : les collections `echinodermes`, `cnidaires` et `autres-invertebres` sont créées mais vides — elles se rempliront à la **phase 7** (reclassement Mollusques), non exécutée.

Anomalie tracée et écartée : un explorateur est passé de 7 à 6 découvertes pendant la fenêtre de migration ; cause identifiée = suppression volontaire d'une capture par l'utilisateur à 14:38 (XP en hausse 160 → 180, niveau inchangé). Aucune instruction des phases 0→6 n'écrit dans `captures` ni `profiles`.

---

## J. Rapport pré-exécution Phase 7 (préparé le 19/08/2026, NON exécuté)

Périmètre exact : **114 taxons** actuellement en `main_category = 'Mollusques'` (329 captures). **77 restent Mollusques** (259 captures, aucun changement). **37 taxons sont reclassés** (70 captures).

### J.1 Vue d'ensemble des mouvements

| Nouvelle catégorie | Taxons | Captures concernées | Lignes `animals` mises à jour | Liens collection remplacés |
| --- | --- | --- | --- | --- |
| Mollusques (inchangé) | 77 | 259 | 0 | 0 |
| Cnidaires | 15 | 41 | 15 | 13 |
| Échinodermes | 14 | 19 | 14 | 12 |
| Autres invertébrés | 3 | 5 | 3 | 2 |
| Autre (non animal) — `Trous de ver marin` seul | 1 | 1 | 1 | 1 (retiré, non remplacé) |
| **Supprimés du référentiel** (2 plantes, cf. §K) | 2 | 2 | 2 (lignes supprimées) | 2 (retirés) |
| Arachnides | 1 | 1 | 1 | 1 |
| Mammifères | 1 | 1 | 1 | 2 (dont 1 conservé) |


### J.2 Mollusques → Cnidaires (15 taxons, 41 captures)

| Ancien taxon | Nom scientifique | Rang | Nouveau taxon | Captures / explorateurs |
| --- | --- | --- | --- | --- |
| Physalie | *Physalia physalis* | species | Cnidaires (rare) | 9 / 9 |
| Méduse lune | *Aurelia aurita* | species | Cnidaires | 8 / 8 |
| Méduse boussole | *Chrysaora hysoscella* | species | Cnidaires | 4 / 4 |
| Méduse à bulbes | *Gonionemus vertens* | species | Cnidaires | 3 / 3 |
| Pélagia noctiluca | *Pelagia noctiluca* | species | Cnidaires | 3 / 3 |
| Chrysaora fuscescens | *Chrysaora fuscescens* | species | Cnidaires | 2 / 2 |
| Méduse chou-fleur | *Cotylorhiza tuberculata* | species | Cnidaires | 2 / 2 |
| Méduse rayonnée | *Chrysaora quinquecirrha* | species | Cnidaires | 2 / 2 |
| Velelle | *Velella velella* | species | Cnidaires | 2 / 2 |
| Anémone verte à tentacules courts | *Actiniaria* | group (non collectionnable) | Cnidaires | 1 / 1 |
| Chrysaora lactea | *Chrysaora lactea* | species | Cnidaires | 1 / 1 |
| Méduse boudin | *Bolinopsis infundibulum* | species | Cnidaires | 1 / 1 |
| Méduse Rhizostomeae | *Rhizostomeae* | group (non collectionnable) | Cnidaires | 1 / 1 |
| Méduses-lumière de la baie | *Olindias formosa* | species | Cnidaires | 1 / 1 |
| Rhizostoma pulmo | *Rhizostoma pulmo* | species | Cnidaires | 1 / 1 |

### J.3 Mollusques → Échinodermes (14 taxons, 19 captures)

| Ancien taxon | Nom scientifique | Rang | Nouveau taxon | Captures / explorateurs |
| --- | --- | --- | --- | --- |
| Étoile de mer commune | *Asterias rubens* | species | Échinodermes | 4 / 4 |
| Étoile de mer | *Asteroidea* | group (non collectionnable) | Échinodermes | 2 / 2 |
| Étoile de mer à cornes | *Protoreaster nodosus* | species (mythique) | Échinodermes | 2 / 2 |
| Holothurie | *Holothuroidea* | group (non collectionnable) | Échinodermes | 2 / 2 |
| Oursin noir | *Arbacia lixula* | species | Échinodermes | 2 / 2 |
| Étoile de mer à épines rouges | *Protoreaster lincki* | species (rare) | Échinodermes | 1 / 1 |
| Étoile de mer bleue | *Asterias vulgaris* | species | Échinodermes | 1 / 1 |
| Étoile de mer violette | *Astropecten irregularis* | species | Échinodermes | 1 / 1 |
| Étoile de merForbes (Stichaster australis) | *Stichaster australis* | species | Échinodermes | 1 / 1 |
| Ophiure | *Ophiothrix fragilis* | species | Échinodermes | 1 / 1 |
| Oursin vert | *Psammechinus miliaris* | species | Échinodermes | 1 / 1 |
| Oursin violet | *Paracentrotus lividus* | species | Échinodermes | 1 / 1 |
| Concombre de mer | *Holothuria tubulosa* | species | Échinodermes | 0 |
| Oursin cœur | *Echinocardium cordatum* | species | Échinodermes | 0 |

Note : « Étoile de mer rouge » (*Echinaster sepositus*) est aujourd'hui classée **Poissons** — hors périmètre validé, je ne la touche pas sans ton accord.

### J.4 Mollusques → Autres invertébrés (3 taxons, 5 captures)

| Ancien taxon | Nom scientifique | Rang | Nouveau taxon | Captures / explorateurs |
| --- | --- | --- | --- | --- |
| Ver de terre commun | *Lumbricus terrestris* | species | Autres invertébrés | 3 / 3 |
| Nereis | *Nereis sp.* | species | Autres invertébrés | 1 / 1 |
| Ver marin | *Polychaeta* | group (non collectionnable) | Autres invertébrés | 1 / 1 |

### J.5 Corrections ciblées

| Ancien taxon | Nouveau taxon | Détail | Captures |
| --- | --- | --- | --- |
| Siamois Seal point (Mollusques, `breed`, *Felis catus*) | **Mammifères**, parent « Chats », `breed` | rejoint la collection « Races de chats » (déjà rattaché) et quitte la collection Mollusques pour Mammifères | 1 / 1 explorateur |
| Limule royal (Mollusques, `species`, *Limulus polyphemus*) | **Arachnides**, `species`, rareté rare conservée | classement correct (chélicérate) | 1 / 1 explorateur |

### J.6 Entrée non animale conservée → « Autre (non animal) » (1 taxon, 1 capture)

| Ancien taxon | Nom scientifique | Nouveau taxon | Captures |
| --- | --- | --- | --- |
| Trous de ver marin | *Diverses espèces de vers polychètes* | Autre (non animal), `collectible = false`, `status = 'pending'` | 1 / 1 explorateur |

Il s'agit d'une trace d'observation animale (vers polychètes) : le taxon est **conservé** mais non collectionnable. Il perd son rattachement de collection et disparaîtra des grilles de bestiaire le jour où l'UI basculera sur les collections ; la capture, sa photo et l'XP acquis restent intacts.

Les deux plantes (*Aconitum napellus*, *Pulsatilla vulgaris*) ne sont plus reclassées : elles sont **supprimées du référentiel** — voir §K.


### J.7 Impact précis sur captures, XP et progression

| Objet | Impact |
| --- | --- |
| `captures` (lignes) | **Aucune suppression, aucune recréation, aucun changement de `user_id`, `image_url`, `animal_name`, `rarity`, `created_at`.** Seule la colonne `category` des 70 captures reclassées est alignée sur la nouvelle catégorie. |
| `captures.taxon_id` | Inchangé — les captures restent liées au même taxon, c'est le taxon qui change de catégorie. |
| XP / niveaux | **Aucun changement.** L'XP est attribué à la capture (par rareté) et stocké dans `profiles.xp` ; aucune rareté n'est modifiée, aucun trigger XP n'est déclenché (les mises à jour portent sur `taxa`/`animals`, pas sur `captures.rarity`). |
| `profiles.total_captures` | **Aucun changement.** Le compteur est le nombre de noms d'espèces distincts approuvés, indépendant de la catégorie. Vérification prévue avant/après contre `profiles_counters_backup_20260819`. |
| `profiles.regions_explored` | Aucun changement (basé sur les lieux). |
| Badges / quêtes | Aucun changement (basés sur nombre et rareté de captures). |
| Collections | 28 liens de collection principale sont **remplacés** (Mollusques → Cnidaires / Échinodermes / Autres invertébrés / Arachnides / Mammifères) et 3 liens sont **retirés** (entrées non animales). Les collections Premium ne perdent aucun membre ; « Races de chats » gagne le Siamois Seal point. |
| `animal_departments` | Aucune des lignes reclassées n'a de territoire rattaché (0 lien) → aucun impact carte/territoires. |
| Index unicité `captures_unique_species_per_user` | Inchangé (porte sur `user_id` + nom), donc aucun risque de conflit ni de doublon. |
| UI actuelle | Les 3 catégories nouvelles restent masquées ; les 70 captures reclassées basculent sous « Mollusques » → nouvelle catégorie **uniquement lorsque l'UI sera migrée**. La vue actuelle continue de lire `animals.category`, qui sera cohérente dès la fin de la phase.

### J.8 Contrôles prévus autour de l'exécution

1. Avant : snapshot ciblé `taxa_phase7_backup_<date>` des 114 lignes concernées + relevé `sum(total_captures)`, `sum(xp)`.
2. Écritures : `UPDATE` sur `taxa` (37 lignes), `animals` (37 lignes), `captures.category` (70 lignes), `collection_taxa` (28 remplacements + 3 retraits). **Aucun `DELETE` sur `captures`.**
3. Après : contrôle `count(captures) = 9825`, `sum(total_captures)` et `sum(xp)` ≥ valeurs relevées, `0` explorateur en régression, répartition par catégorie conforme au tableau J.1.
4. Rollback : restauration des colonnes depuis le snapshot ciblé, sans toucher aux captures.

**Statut : préparé, en attente de validation explicite. Aucune écriture effectuée.**
