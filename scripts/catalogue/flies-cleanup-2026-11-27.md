# Mouches — lot corrigé du 27 novembre 2026

L'audit précédent contenait des erreurs : Calliphora vicina et Calliphora vomitoria ne sont pas des doublons. Sciaridae, Panorpidae, Mantispidae et Tenthredinidae sont des familles, non des espèces. Le nombre « 420 » n'était pas vérifié.

## Premier lot de référence (pas des identifications photographiques)

| Ancienne fiche | Fiche de référence existante | Motif |
| --- | --- | --- |
| Mouche papillon | Mouche des éviers — Clogmia albipunctata | Famille Psychodidae, référence la plus capturée connue |
| Moucheron papillon | Mouche des éviers — Clogmia albipunctata | Même famille générique |
| Mouche à viande | Mouche verte — Lucilia sericata | Famille Calliphoridae, référence la plus capturée connue |
| Mouche des greniers | Mouche polénie — Pollenia rudis | Genre Pollenia |
| Mouche à merde fluo | Mouche verte — Lucilia sericata | Genre Lucilia |
| Mouche d'europe | Mouche domestique — Musca domestica | Identité scientifique invalide, repli demandé par le propriétaire |
| Puparium de mouche | Mouche domestique — Musca domestica | Stade non identifiable, repli demandé par le propriétaire |

Les 291 photos de ce lot sont approuvées. Toutes portent encore des identités génériques ou invalides ; aucune identification individuelle n'est revendiquée. La sauvegarde doit conserver leur étiquette originale et la raison de repli.

## Conservé / restant

- Conserver Calliphora vicina et Calliphora vomitoria séparément, ainsi que Fannia canicularis.
- Bibio ne prouve pas Bibio marci : garder les 18 photos pour une revue diagnostique, sans correction automatique du binôme.
- Moucheron (115 photos) couvre plusieurs familles : Musca domestica n'appartient pas aux Nematocera. Ne pas appliquer ce choix erroné ; audit photographique nécessaire avant choix d'un groupe de référence cohérent.
- Les autres familles repérées (dont Sciaridae) restent à auditer ; ce lot ne constitue pas un nettoyage complet des mouches.

## Contrôles

Opération atomique utilisant `reclassify_generic_capture_to_reference`, snapshots des fiches, photos et progression ; suppression seulement si aucune capture ne porte encore le nom source. Vérifier après opération : ID/photo/statut/XP attribuée conservés, XP et niveaux identiques, anciennes fiches absentes, destinations exactes.

Résultat relu : 291 photos sauvegardées/reclassées, 281 explorateurs avec XP/niveau identiques, zéro différence de photo/statut/XP attribuée, sept fiches retirées. Destinations : Clogmia albipunctata 258, Lucilia sericata 26, Pollenia rudis 4, Musca domestica 3. Les deux espèces Calliphora sont toujours présentes. Vingt tests des protections génériques passent.