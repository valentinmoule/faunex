# Actualisation et nettoyage des orthoptères

## Périmètre

Le fichier fourni contient 119 fiches. Actualiser le Bestiaire, ses fiches et les collections sans perdre les photos, captures ou récompenses des utilisateurs. Aucun changement n’a encore été appliqué au catalogue.

## Corrections de noms

- Appliquer les changements vernaculaires qui conservent l’identité scientifique : Courtilière commune, Miramelle des moraines, Criquet des pins, Caloptène italien, Criquet des clairières, etc.
- Corriger « chortipus apricarius » en *Chorthippus apricarius*.
- Garder les graphies scientifiques déjà correctes dans Faunex : *Chrysochraon dispar*, *Tessellana tessellata*, *Troglophilus neglectus* et *Gryllodes sigillatus*. Le fichier contient des fautes dans ces noms anciens ; ne pas les importer.
- Préserver « Œdipode turquoise » et « Œdipode germanique », ainsi que la distinction Criquet des ajoncs / Criquet verdelet.
- Vérifier les graphies proposées « érytrhique » et « pygmé » avant import et ne pas prendre un commentaire pour un nom d’espèce.
- Vérifier les références taxonomiques pour les changements de genre discutés ; ne pas décider qu’un nom scientifique est invalide sur la seule remarque du fichier.

## Fusions sans perte

- Regrouper Criquet brun et Criquet duettiste sous une seule fiche « Criquet duettiste » après vérification des synonymes scientifiques. **35 captures sont concernées**, à conserver.
- Regrouper les fiches génériques qui correspondent réellement au même groupe, en gardant les distinctions famille / genre : Acrididae ≠ Chorthippus ; Tetrigidae ≠ Tetrix.
- Donner des noms distincts aux niveaux d’identification pour éviter deux tuiles « Criquet indét. » ou « Tétrix indét. » impossibles à distinguer.
- Les mentions couleur, juvénile ou sexe ne deviennent pas des espèces nouvelles. Vérifier les photos avant de les rattacher à un groupe ou à une espèce.
- Conserver les anciens noms comme correspondances pour éviter la recréation des doublons.

## Cas incertains : ne pas réattribuer automatiquement les captures

Les lignes suivantes changent l’espèce, et pas seulement son nom. Le nom vernaculaire seul ne permet pas de déterminer si c’est l’ancien nom scientifique ou la proposition qui correspond à la photo.

| Fiche | Proposition du fichier | Captures existantes |
|---|---|---:|
| Criquet des chaumes | *Gomphocerippus apricarius* → *Dociostaurus genei* | 1 |
| Criquet des jachères | *Chorthippus biguttulus* → *Chorthippus mollis* | 2 |
| Criquet des marais | *Chorthippus palustris* → *Pseudochorthippus montanus* | 1 |
| Criquet mélodieux | *Chorthippus parallelus* → *Chorthippus biguttulus* | 69 |
| Sauterelle aptère | *Bradyporus* → *Bradyporus dasypus* | 1 |
| Sauterelle-feuille de Malaisie | Tettigoniidae → *Ancylecha fenestrata* | 1 |
| Tétrix des vasières | *Tetrix undulata* → *Tetrix ceperoi* | 13 |

**Décision proposée :** conserver l’identité actuelle de ces 88 captures jusqu’à vérification individuelle. Corriger la fiche selon les références vérifiées, mais ne transférer chaque capture vers la nouvelle espèce que si son identification est confirmée. Présenter les cas non résolus avant toute réattribution.

- « Criquet des arbustes » : une capture existe. Retirer la fiche invalide seulement après réidentification ou traitement en modération ; ne pas jeter la photo.
- « femelle d’orthoptère » : une capture existe ; vérifier avant rattachement à l’Éphippigère carénée.
- « Criquet mélanique » : trois captures existent ; l’absence d’observation personnelle mentionnée dans le fichier ne suffit pas à déclarer les photos invalides.
- Conserver le Criquet cendré tant que son statut taxonomique n’est pas clarifié.

## Collections et ajouts

- Vérifier et corriger l’appartenance du Dectique verrucivore et de l’Œdipode germanique à la collection d’orthoptères : aucune appartenance standard n’est actuellement trouvée pour ces fiches.
- *Isophya pyrenaea* existe déjà sous « Dectique gracile » : vérifier le renommage en « Barbitiste des Pyrénées » plutôt que créer un doublon.
- Vérifier l’ajout de *Isophya rectipennis* et du Myrmécophile social (*Myrmecophilus acervorum*), actuellement absents sous ces noms scientifiques. Ajouter des fiches documentées et leur appartenance à la collection, sans attribuer les captures du genre Isophya à une espèce précise par défaut.

## Mise en œuvre et contrôles techniques

- Préparer une correspondance explicite ancien nom + ancien nom scientifique → identité validée, avec contrôle des collisions et sauvegarde ciblée des lignes touchées.
- Synchroniser les catalogues `animals` et `taxa`, les captures, les fiches et traductions, ainsi que les listes de collections, favoris/couvertures et correspondances historiques concernées.
- Réutiliser les fusions et redirections du projet ; déplacer les références avant de retirer une fiche en doublon, dans une opération atomique.
- Préserver les identifiants des captures, photos, dates, XP et informations sociales. Ne pas copier une description d’une autre espèce lors d’un changement d’identité.
- Vérifier après application les noms, doublons, références, collections et nombres de captures ; garder des tests ciblés sur les distinctions scientifiques et les fusions validées.

L’approbation autorise les corrections vérifiées et le nettoyage sans perte décrit ici ; elle n’autorise pas les réattributions incertaines en bloc.