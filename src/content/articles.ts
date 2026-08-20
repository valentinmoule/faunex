// Light static CMS — add a new article by appending an entry below.
// `body` is markdown; rendered with react-markdown + remark-gfm.

export type ArticleType = 'guide' | 'usecase';

export interface Article {
  slug: string;
  type: ArticleType;
  title: string;
  description: string; // <160 chars, used for meta description
  category: string; // displayed as chip
  readingMinutes: number;
  publishedAt: string; // ISO date
  updatedAt?: string;
  cover?: string; // public path
  body: string; // markdown
}

export const articles: Article[] = [
  {
    slug: 'identifier-oiseau-photo-ia',
    type: 'guide',
    title: "Identifier un oiseau avec une photo : ce qui marche, ce qui foire",
    description:
      "Méthode honnête pour reconnaître un oiseau depuis une photo de téléphone : cadrage, lumière, pièges des juvéniles, et quand l'IA se plante.",
    category: 'Identification',
    readingMinutes: 5,
    publishedAt: '2026-06-20',
    body: `# Identifier un oiseau avec une photo : ce qui marche, ce qui foire

La première fois que j'ai voulu mettre un nom sur "le petit truc gris qui chante super fort dans la haie", j'ai tourné dix minutes dans un guide papier sans rien trouver. C'était un troglodyte mignon — l'oiseau qui chante le plus fort d'Europe rapporté à son poids. Cinq grammes, et un volume sonore de moineau enragé. Quand on sait, on l'entend partout. Quand on ne sait pas, il n'existe pas.

C'est tout l'enjeu de l'identification : faire passer un animal du statut de "truc" à celui de présence reconnue. Et aujourd'hui, une photo suffit.

## La photo qui rate à tous les coups

Tu vois l'oiseau, tu sors le téléphone, tu zoomes au doigt, tu déclenches. Résultat : un point flou au milieu d'un ciel pâle. Ni l'IA ni un ornitho aguerri ne pourra rien en faire.

Trois trucs simples changent tout :

- **Zoome optique si tu peux**, jamais au doigt. Le zoom numérique te donne un timbre-poste agrandi en bouillie.
- **Place le soleil derrière toi**, pas derrière l'oiseau. Le contre-jour avale les couleurs, et la couleur est souvent le seul indice qui sépare deux espèces.
- **Vise le profil**. Pas le dos, pas le ventre — le profil. La silhouette, le bec, la queue : c'est là que tout se joue.

Une photo floue mais bien cadrée et bien éclairée vaut dix photos nettes prises au mauvais angle.

## Ce que "l'IA" voit vraiment

Le mot fait un peu peur, mais le principe est simple. Le modèle a vu des centaines de milliers de photos étiquetées. Il a appris à repérer des motifs : la forme du bec, la longueur de la queue par rapport au corps, les zones de contraste sur la tête, la présence d'un sourcil clair, la couleur du croupion.

C'est pour ça qu'il se trompe sur les juvéniles : un rouge-gorge juvénile n'a pas la bavette orange, il est entièrement moucheté beige. Pour le modèle, c'est presque un autre oiseau. Pareil pour les femelles de pinsons, beaucoup plus ternes que les mâles photogéniques des manuels.

Garde aussi ça en tête : sur les races domestiques (canards de mare, pigeons de ville, poules de jardin), l'IA hésite. Trop de croisements, trop de variabilité. Souvent elle te donnera le groupe, rarement la race exacte. C'est une limite honnête, pas un bug.

## L'identification, étape 1 d'un truc plus grand

Identifier un oiseau, c'est satisfaisant. Mais le vrai déclic vient après : tu commences à reconnaître son chant sans la photo. Tu sais que ton jardin abrite un couple de mésanges bleues qui nichent dans le nichoir depuis trois ans. Tu repères le faucon crécerelle qui passe tous les jours à 18h au-dessus de la rue.

Tu deviens un habitant attentif de ton quartier, pas juste un passant. Et ça, aucune app ne peut te le donner — elle peut juste t'ouvrir la porte.

> Un conseil de débutant qui m'aurait fait gagner des mois : commence par cinq espèces. Moineau, mésange charbonnière, merle, pigeon, rouge-gorge. Apprends-les en profondeur — chant, comportement, saison. Le reste se construit dessus.
`,
  },
  {
    slug: 'animaux-jardin-france',
    type: 'guide',
    title: "Les animaux que tu croises sans les voir (et comment les voir)",
    description:
      "12 espèces sauvages présentes dans la majorité des jardins français : où les chercher, à quelle heure, et le détail qui les trahit.",
    category: 'Espèces',
    readingMinutes: 7,
    publishedAt: '2026-06-22',
    body: `# Les animaux que tu croises sans les voir (et comment les voir)

Il y a un truc fascinant quand on commence à observer : la faune ne change pas, mais ton œil change. Tu marches dans le même parc depuis dix ans, et un jour tu te rends compte qu'un pic épeiche tape sur le tronc à trois mètres au-dessus de ta tête. Il était là tous les jours. C'est toi qui n'étais pas là.

Voici douze espèces ultra-communes en France métropolitaine. Aucune n'est rare. Toutes te sont probablement passées sous le nez cette semaine.

## Cinq oiseaux à apprendre en premier

**La mésange charbonnière** porte une cravate noire qui descend tout le long du ventre — large chez le mâle, fine chez la femelle. C'est l'oiseau le plus actif aux mangeoires l'hiver, le premier à venir si tu mets des graines de tournesol.

**Le rouge-gorge** s'approche de toi quand tu retournes la terre. Il attend les vers. Il est solitaire toute l'année et chante même en hiver, ce qui est rare — c'est ce chant flûté un peu mélancolique qu'on entend en novembre.

**Le merle noir** : mâle entièrement noir au bec orange, femelle brun chocolat. Son chant du printemps au crépuscule est l'un des plus beaux d'Europe, et tout le monde l'entend sans y prêter attention.

**Le moineau domestique** vit avec nous depuis le néolithique. Il est en chute libre dans les centres-villes mais reste très présent en zone pavillonnaire. Si tu n'en vois plus dans ton quartier, c'est mauvais signe pour ton quartier.

**Le pinson des arbres** est probablement l'oiseau le plus nombreux de France. Le mâle a la tête bleu-gris et la poitrine rose ; la femelle, bien plus discrète, beige verdâtre. Son cri d'alarme métallique "pink pink" trahit sa présence avant qu'on le voie.

## Mammifères : sors à la bonne heure

**L'écureuil roux** se voit surtout les matins d'automne, quand il fait ses réserves. Il aime les conifères et les vieux feuillus. Si ton parc a des cèdres, va voir au pied : tu trouveras des pommes de pin rongées comme des trognons de pomme, c'est sa signature.

**Le hérisson** est protégé en France et il en a besoin : la moitié des hérissons meurent en traversant des routes. Pour en avoir au jardin, garde un coin sauvage — orties, tas de bois, feuilles non ramassées. Il sort à la tombée de la nuit, jamais avant.

**La pipistrelle commune** est la chauve-souris que tu vois zigzaguer au-dessus des lampadaires en été. Elle chasse au sonar, parfois 3000 moustiques par nuit. Toutes les chauves-souris sont protégées en France.

## Les discrets de surface

**Le lézard des murailles** se chauffe au soleil sur les vieux murs en pierre, même en pleine ville. Approche en glissant doucement de côté, jamais frontalement — son cerveau est câblé pour fuir tout ce qui vient droit dessus.

**La grenouille rousse** est la grenouille des mares, brun-roux avec un masque sombre sur l'œil. Elle pond en février-mars en gros amas gélatineux. Au pire moment, tu peux trouver une mare avec littéralement des kilos d'œufs.

## Insectes : deux à connaître

**La coccinelle à sept points** est la "vraie", l'européenne. Rouge vif, sept points noirs bien comptés. Sa cousine asiatique (souvent orange, avec un "M" blanc sur la tête) est arrivée en France dans les années 2000 et la concurrence sévèrement.

**Le paon-du-jour** est ce papillon brun-rouge avec quatre grands yeux bleus sur les ailes. Il adore les buddleias et les massifs de lavande. Tu peux l'observer à 30 cm, il ne s'envolera pas.

## Le vrai conseil

Reste immobile dix minutes. C'est tout. La plupart des animaux ont fui ton arrivée et reviennent dès que tu te tais. Quatre-vingt-dix pour cent de l'observation, c'est de la patience — pas du matériel, pas des connaissances. Juste la décision de ne pas bouger.

> Un dernier truc : tiens un carnet, ou utilise une app de collection. Pas pour faire un score, mais parce que la mémoire ment. Tu jureras avoir vu un rouge-gorge en juillet, alors qu'en réalité tu l'avais vu en mai et qu'il ne chante plus en juillet. Les dates précises changent tout.
`,
  },
  {
    slug: 'difference-animaux-communs-rares',
    type: 'guide',
    title: "Pourquoi une carte mythique est mythique : la vraie rareté du vivant",
    description:
      "Liste rouge UICN, statuts de conservation, fréquence réelle d'observation : ce que veut dire 'rare' quand on parle d'animaux sauvages.",
    category: 'Conservation',
    readingMinutes: 4,
    publishedAt: '2026-06-24',
    body: `# Pourquoi une carte mythique est mythique : la vraie rareté du vivant

Dans un jeu de cartes classique, la rareté est arbitraire. L'éditeur décide qu'un Dracaufeu sortira moins souvent qu'un Roucool. Point.

Dans la faune réelle, c'est l'inverse. Personne n'a décidé que la loutre serait rare. Elle l'est devenue. Et c'est ce qui rend une observation de loutre infiniment plus intense qu'une observation de pigeon : tu ne tombes pas dessus parce que le hasard te sourit, tu tombes dessus parce qu'il en reste juste assez pour qu'une rencontre soit encore possible.

## La liste rouge, c'est sérieux

L'**Union Internationale pour la Conservation de la Nature** (UICN) classe chaque espèce dans une catégorie de risque, et cette liste fait autorité partout dans le monde. Du plus tranquille au plus inquiétant :

- **LC** — Préoccupation mineure
- **NT** — Quasi menacée
- **VU** — Vulnérable
- **EN** — En danger
- **CR** — En danger critique
- **EW / EX** — Éteinte à l'état sauvage / Éteinte

C'est froid, c'est administratif, mais derrière chaque lettre il y a une réalité de terrain : un effectif compté, une tendance mesurée, des habitats qui rétrécissent ou qui se reconstruisent.

## Comment Faunex traduit ça

On a quatre paliers visuels, pour rendre la collection lisible sans appauvrir le message :

| Palier | Couleur | Correspondance | Exemple |
|---|---|---|---|
| Commun | Gris | LC très répandu | Moineau, coccinelle |
| Rare | Bleu | LC discret, NT | Mésange à longue queue, écureuil |
| Épique | Violet | VU, EN | Hérisson, chauve-souris |
| Mythique | Doré | CR, EW | Lynx boréal, loutre |

Une carte mythique n'est pas mythique parce qu'on a décidé de la faire briller plus fort. Elle est mythique parce que la croiser, c'est croiser quelque chose qu'on est en train de perdre — ou de retrouver, dans les meilleurs cas.

## Quelques vérités utiles

**La rareté dépend du territoire.** Un cerf est commun dans les Vosges, quasi-impossible à Paris. Un milan royal est banal dans le Massif central, rarissime sur la côte nord. Ton "rare" n'est pas celui du voisin.

**La rareté change vite.** Le loup est revenu en France dans les années 90. Le castor a recolonisé la Loire. À l'inverse, le moineau domestique, encore très commun, s'effondre en ville européenne — peut-être moins une décennie avant qu'il rejoigne la liste rouge sérieuse.

**Une espèce "commune mais en chute" peut être plus inquiétante qu'une rare et stable.** Le moineau est l'exemple classique : encore partout, mais sa population a baissé de 60 % en Europe en quarante ans. Le hérisson aussi. On ne s'en rend pas compte parce que "il y en a encore". Jusqu'au jour où il n'y en a plus.

## Pourquoi collectionner aide

Mettre des paliers visuels sur la conservation, c'est une astuce pédagogique honnête. Personne ne va lire la liste rouge UICN un samedi soir. Mais tout le monde se souvient avoir ouvert un booster avec une carte dorée à l'intérieur. Si cette carte dorée représente une loutre observée pour de vrai dans une rivière vosgienne, le savoir entre par un autre canal — émotionnel — et il y reste.

> La rareté n'est pas une mécanique de jeu. C'est une mémoire. Et chaque observation qu'on note quelque part, c'est un point sauvegardé dans cette mémoire collective.
`,
  },
  {
    slug: 'app-collection-animaux-balade',
    type: 'usecase',
    title: "De la balade à la collection : comment Faunex marche vraiment",
    description:
      "Pourquoi on a fait Faunex, comment fonctionne la capture, le bestiaire et la rareté. Une visite honnête de l'app, sans baratin marketing.",
    category: 'Faunex',
    readingMinutes: 4,
    publishedAt: '2026-06-23',
    body: `# De la balade à la collection : comment Faunex marche vraiment

Faunex est né d'une frustration. On adore marcher en nature, on voit des animaux, on n'a pas les noms, on oublie. Les guides papier marchent mais ne tiennent pas dans une poche pendant qu'on court après un enfant. Les apps existantes sont soit techniques soit moches.

L'idée nous est venue en jouant aux cartes Pokémon avec un neveu. Il connaissait les noms latins d'animaux fictifs. Pas un seul nom de l'oiseau qui chantait juste à côté de nous. C'était absurde. On s'est dit : et si on construisait pour les animaux réels exactement la même expérience qui rend les cartes Pokémon irrésistibles ?

## Ce qui se passe quand tu prends une photo

Tu sors l'app, tu cadres, tu déclenches. L'image est compressée localement (1024 px max, qualité 60 %) avant d'être envoyée — pour économiser ton forfait data et accélérer le traitement.

Le modèle identifie l'espèce, récupère le **nom commun**, le **nom latin**, l'**habitat** principal, le **régime alimentaire**, et la **rareté** déduite du statut de conservation UICN. La carte se révèle avec une animation type ouverture de booster — plus la rareté est haute, plus l'animation est intense (légère vibration pour les mythiques sur mobile).

Et la carte rejoint ton bestiaire. Définitivement. Avec la date, le lieu, ta photo.

## Le bestiaire, c'est le cœur

C'est ton journal de bord visuel. Toutes les espèces que tu as croisées, classées par rareté, par catégorie, par région. Tu peux ouvrir une fiche pour la consulter en détail, voir ta photo en plein écran, lire les anecdotes.

À mesure que tu remplis, tu vois deux choses : la diversité réelle de ta zone (souvent surprenante), et les manques (tu n'as toujours pas attrapé de pinson des arbres, et pourtant ils sont partout — c'est qu'il faut mieux regarder).

## La rareté, on l'a déjà dit, mais bon

C'est pas du vent. Le système des quatre paliers (commun gris, rare bleu, épique violet, mythique doré) repose sur la liste rouge UICN. Quand tu attrapes une mythique, tu as littéralement observé une espèce en danger critique. C'est ce qui rend la collection signifiante.

## Le social, version pas toxique

On a ajouté un mode "explorateurs" : tu peux suivre d'autres utilisateurs, voir leurs captures dans un fil chronologique simple, comparer ton bestiaire au leur. Les profils sont privés par défaut, on doit accepter pour être suivi. Pas de pub, pas de scroll infini, pas de like sur des inconnus — juste tes amis et leurs balades.

## Ce que ce n'est pas

C'est pas un outil scientifique. Si tu fais du baguage ou des inventaires rigoureux, prends iNaturalist ou Faune-France, qui sont rattachés à des bases de données nationales.

C'est pas non plus un jeu. On ne te bombarde pas de notifications, il n'y a pas de système de gemmes à acheter, on ne te pousse pas à ouvrir l'app dix fois par jour.

C'est entre les deux : un journal naturaliste avec des codes de jeu de cartes, pour rendre l'observation contagieuse, surtout chez les gens qui ne savent pas qu'ils aiment ça.

> Le meilleur retour qu'on ait eu venait d'un mec de 40 ans qui dit avoir mis dix ans à essayer de s'intéresser aux oiseaux, et qui en trois semaines d'app en connaît trente. Lui résume mieux que nous pourquoi ça marche : "Avant je voyais des oiseaux. Maintenant je vois Marcel, Léon et Roger, et je m'inquiète quand ils ne sont pas là."
`,
  },
  {
    slug: 'reconnaissance-animaux-ia-famille',
    type: 'usecase',
    title: "Reconnaître les animaux en famille (sans devenir naturaliste)",
    description:
      "Faunex pour les balades parents-enfants : comment ça change vraiment une promenade, idées de jeux en sortie, et ce que les enfants retiennent.",
    category: 'Famille',
    readingMinutes: 4,
    publishedAt: '2026-06-25',
    body: `# Reconnaître les animaux en famille (sans devenir naturaliste)

Une promenade en forêt avec un enfant de 6 ans, c'est environ quarante questions par heure. Trois sur les arbres, deux sur les champignons, et le reste sur ce qui vole, court, gratte ou rampe.

Si tu ne sais pas répondre, deux options : inventer (option pratiquée par tous les parents un jour ou l'autre — désolé pour le "pic-vert" qui était en fait un pinson), ou tu sors une app.

## Pourquoi pas juste Google Images

Google Images marche pour identifier une chaise IKEA, pas pour identifier un oiseau qui passe à quinze mètres au-dessus d'un sentier. Le modèle généraliste n'a aucune idée de la faune européenne, et il te proposera des photos d'un perroquet d'Amazonie pour une mésange.

Une app spécialisée, c'est un modèle entraîné sur la faune locale, une base d'espèces françaises, et des fiches écrites pour être lues à voix haute à un enfant — pas pour passer un examen d'ornitho.

## Ce que les enfants captent vraiment

On a observé plein de familles utiliser Faunex et c'est toujours la même mécanique :

L'enfant veut le téléphone. Il prend la photo. La carte se révèle. Il s'extasie cinq secondes sur la rareté ("OH UNE BLEUE !"). Puis il pose la question intéressante : "Il mange quoi ?". Et là, comme la fiche est courte et illustrée, il lit. À 6 ans. De son plein gré. Une fiche sur le régime alimentaire d'un écureuil roux.

Trois balades plus tard, il connaît dix espèces. Il les nomme avant toi. Il corrige ta prononciation de "mésange à longue queue". Et il commence à demander pourquoi certaines sont mythiques.

C'est là que le truc devient éducatif sans le dire.

## Quatre idées de jeux en sortie

**Le bingo nature** — Avant de partir, chacun liste cinq espèces à essayer d'attraper. Le premier à compléter sa grille gagne. Marche très bien pour les frères et sœurs compétitifs.

**La carte la plus rare** — Tout le monde capture pendant la balade. À la fin, on compare. La rareté donne les points (1 pour commun, 5 pour mythique). Souvent c'est l'enfant qui gagne, parce que les enfants regardent par terre alors que les adultes regardent loin.

**Le défi du jour** — Une espèce à attraper avant le déjeuner. Un papillon orange. Un oiseau qui chante. Une plante avec une fleur jaune (si tu pars sur la végétation un jour). Ça force à *chercher*, pas juste à se promener.

**Le bestiaire du quartier** — Sur plusieurs semaines, construire la carte de tout ce qui vit dans un rayon de 500 mètres autour de la maison. Tu seras surpris : trente espèces, facile.

## Côté sérieux

L'app est gratuite, pas de pub, pas de pistage publicitaire. Les profils enfants sont privés par défaut — pas de réseau social ouvert, pas de messages d'inconnus. Les photos restent dans ton compte sauf si tu choisis de les partager.

On installe depuis le navigateur (PWA), pas d'app store, pas de téléchargement compliqué. Et ça marche hors-ligne pour consulter ce qu'on a déjà collecté — utile en forêt sans réseau.

> Ce qu'on entend le plus souvent : "Maintenant, dès qu'on entend un oiseau, il faut absolument l'attraper." C'est exactement ce qu'on voulait.
`,
  },
  {
    slug: 'identification-insectes',
    type: 'guide',
    title: "Identification des insectes : la méthode qui marche vraiment sur le terrain",
    description:
      "Comment identifier un insecte à partir d'une photo : les 5 critères qui comptent, les confusions classiques (guêpe/syrphe, libellule/demoiselle) et les limites de l'IA.",
    category: 'Identification',
    readingMinutes: 7,
    publishedAt: '2026-08-20',
    body: `# Identification des insectes : la méthode qui marche vraiment sur le terrain

Il y a en France environ 40 000 espèces d'insectes. Quarante mille. À côté, les 300 espèces d'oiseaux régulières ressemblent à une petite liste de courses. C'est pour ça que l'identification des insectes fait peur : on a l'impression qu'il faut un doctorat pour mettre un nom sur une bestiole posée sur une ombelle.

En réalité, non. Il faut juste arrêter de chercher "l'espèce" tout de suite et apprendre à descendre l'escalier : d'abord le grand groupe, ensuite la famille, et seulement après le nom précis. C'est exactement ce que fait une IA d'identification, et c'est ce que tu peux faire à l'œil nu.

## Étape 1 : trouver le grand groupe (30 secondes)

Regarde les ailes. C'est le seul critère qui compte au début.

- **Deux ailes seulement** → mouches, syrphes, moustiques (les diptères). L'arrière du corps n'a pas de deuxième paire visible.
- **Quatre ailes, taille de guêpe, "taille de guêpe" marquée** → abeilles, guêpes, bourdons, fourmis (hyménoptères).
- **Ailes couvertes d'écailles poudreuses** → papillons de jour et de nuit (lépidoptères).
- **Élytres durs qui se rejoignent en ligne droite sur le dos** → coléoptères (coccinelles, carabes, hannetons, capricornes).
- **Quatre grandes ailes transparentes nervurées, corps allongé** → libellules et demoiselles (odonates).
- **Bec piqueur, dos en écusson triangulaire** → punaises (hémiptères).

Avec ces six cases, tu classes 90 % de ce que tu croises dans un jardin. Et surtout, tu élimines d'un coup 39 000 espèces.

## Étape 2 : les 5 critères à photographier

Pour aller plus loin, il faut de l'information dans l'image. Une photo d'insecte utilisable montre :

1. **Le dessus du corps**, à plat, perpendiculaire à l'objectif. Pas de trois quarts flou.
2. **Les antennes en entier** — leur longueur et leur forme (en massue, en peigne, filiformes) séparent des familles entières.
3. **Les pattes**, notamment les postérieures (épaissies chez les sauteurs).
4. **Le motif des ailes ou des élytres** : nombre de points, bandes, taches claires.
5. **La plante ou le support**. Une chenille sur son plant nourricier, c'est la moitié de l'identification faite.

Astuce concrète : approche-toi lentement, sans ombre portée sur l'insecte. C'est l'ombre qui déclenche la fuite, pas le bruit. Et prends trois photos plutôt qu'une seule "parfaite" — tu n'auras pas de deuxième chance.

## Étape 3 : les confusions classiques

Ce sont toujours les mêmes qui piègent, humains comme algorithmes :

- **Guêpe vs syrphe.** Le syrphe est une mouche déguisée en guêpe : deux ailes, gros yeux qui couvrent la tête, et il fait du surplace en vol stationnaire. Une guêpe ne fait jamais de surplace.
- **Abeille domestique vs abeille sauvage.** Il existe presque 1 000 espèces d'abeilles sauvages en France. La plupart sont solitaires, plus petites, parfois noires ou métalliques. Si tu photographies "une abeille", il y a une bonne chance que ce ne soit pas *Apis mellifera*.
- **Libellule vs demoiselle.** Au repos : libellule = ailes ouvertes à plat, corps trapu. Demoiselle = ailes repliées au-dessus du dos, corps fin comme une allumette.
- **Frelon européen vs frelon asiatique.** L'asiatique a les pattes jaunes aux extrémités et le thorax presque entièrement noir. L'européen est plus roux, avec du jaune rayé.
- **Coccinelle asiatique vs coccinelle à 7 points.** Compte les points, et regarde le "M" blanc et noir derrière la tête chez l'asiatique.

## Ce que l'IA sait faire — et là où elle bloque

Une IA d'identification a appris sur des centaines de milliers de photos étiquetées. Elle est excellente sur les insectes bien contrastés et fréquemment photographiés : papillons de jour, coccinelles, libellules, bourdons, punaises graphiques.

Elle est beaucoup plus prudente sur :

- les **petits diptères et micro-hyménoptères**, où la distinction se fait sur la nervation des ailes ou la pilosité, invisible sur une photo de téléphone ;
- les **larves et chenilles**, dont beaucoup n'ont aucune photo de référence ;
- les **groupes qui exigent un examen en laboratoire**. Pour certaines familles, même un spécialiste ne tranche pas sans microscope.

Sur Faunex, quand la certitude est trop faible, on préfère annoncer le genre ou la famille plutôt que d'inventer un nom d'espèce. C'est moins spectaculaire, mais une identification fausse pollue les données de tout le monde — et surtout ta propre mémoire.

## Pourquoi ça vaut le coup de s'y mettre

Les insectes sont le groupe qui s'effondre le plus vite, et le plus mal suivi. Chaque observation datée et localisée compte réellement. Mais au-delà de ça, il se passe un truc bête : dès que tu sais nommer trois syrphes, tu ne vois plus un massif de fleurs de la même façon. Le jardin devient bruyant de détails.

Commence petit : cinq espèces sur ton balcon. Photographie-les, identifie-les, garde-les. Le reste vient tout seul.
`,
  },
  {
    slug: 'identification-animaux',
    type: 'guide',
    title: "Identification des animaux : reconnaître une espèce à partir d'une photo",
    description:
      "Guide pratique pour identifier un animal sauvage : silhouette, taille, habitat, indices de présence. Ce qu'une photo doit montrer pour une identification fiable.",
    category: 'Identification',
    readingMinutes: 7,
    publishedAt: '2026-08-20',
    body: `# Identification des animaux : reconnaître une espèce à partir d'une photo

La plupart des gens croient qu'identifier un animal, c'est une question de mémoire : connaître les noms. En pratique, c'est surtout une question de méthode. Un naturaliste débutant avec la bonne grille de lecture identifie plus d'espèces qu'un curieux qui a lu trois livres sans jamais regarder de près.

Voici la grille, dans l'ordre où on l'utilise sur le terrain.

## 1. La silhouette avant la couleur

Notre cerveau attrape la couleur en premier. C'est une erreur : la couleur change avec la lumière, la saison, l'âge et le sexe. La silhouette, non.

Pose-toi trois questions dans cet ordre :

- **Quelle forme générale ?** Trapu, élancé, compact, allongé.
- **Quelles proportions ?** Longueur de la queue par rapport au corps, longueur des pattes, taille de la tête.
- **Quel profil de bec, de museau ou de rostre ?** Fin, épais, crochu, aplati.

Un merle noir et un étourneau sansonnet ont tous les deux l'air "noirs" de loin. Le merle a une longue queue et marche par bonds ; l'étourneau a une queue courte, une silhouette triangulaire et court au sol. La couleur ne t'aurait rien dit.

## 2. La taille, mais relative

"Il était gros comme ça" ne veut rien dire. Compare toujours à quelque chose de connu dans la scène : un pigeon, un moineau, une main, un pavé, une feuille. Une buse variable et un épervier d'Europe font la même forme en photo — c'est l'échelle qui tranche.

Sur une photo, ce repère disparaît si tu cadres serré. Prends donc **deux images** : une serrée pour les détails, une large pour le contexte et l'échelle.

## 3. L'habitat et la géographie

C'est le filtre le plus puissant et le plus négligé. Un écureuil roux en ville dense, ce n'est pas impossible mais c'est rare. Une anémone de mer dans un étang d'Île-de-France, c'est impossible.

Note systématiquement :

- le **milieu** : forêt, lisière, prairie, zone humide, littoral, ville ;
- la **date** : beaucoup d'espèces ne sont présentes qu'une partie de l'année ;
- la **région**. La moitié des confusions se règlent en regardant l'aire de répartition.

C'est aussi pour ça qu'une app d'identification qui utilise ta localisation est plus fiable qu'un moteur d'images générique : elle écarte les espèces qui n'ont rien à faire là.

## 4. Les pièges qui reviennent tout le temps

- **Les juvéniles.** Un rouge-gorge jeune n'a pas de bavette orange. Un goéland met quatre ans à ressembler à l'illustration du guide.
- **Les femelles.** Chez beaucoup d'oiseaux et de papillons, elles sont ternes alors que les manuels montrent le mâle.
- **Le mimétisme.** Certaines espèces imitent volontairement une autre, plus dangereuse.
- **Les animaux domestiques et croisements.** Chats, chiens, chevaux, canards de mare, pigeons de ville : la variabilité est telle que le nom de race est souvent hors de portée d'une photo. On peut donner l'espèce, rarement mieux.
- **La photo de zoo ou de volière.** Elle biaise tout : espèce exotique, décor artificiel. Ce n'est pas une observation de faune sauvage.

## 5. Quand l'animal n'est pas là : les indices de présence

Une bonne part de la faune se reconnaît sans jamais la voir. C'est même souvent la seule façon.

- **Empreintes** : nombre de doigts, présence de griffes, alignement des pas.
- **Crottes** : forme, contenu (poils, noyaux, débris d'insectes).
- **Restes de repas** : cônes d'épicéa décortiqués par un écureuil, noisettes percées par un mulot, plumes en rond d'un rapace.
- **Traces sur le bois** : trous de pic, écorce frottée par un cervidé.
- **Sons** : le chant est souvent plus discriminant que la vue, surtout chez les oiseaux et les amphibiens.

## Ce que fait — et ne fait pas — l'identification par IA

Une IA compare ta photo à des centaines de milliers d'images étiquetées, et elle mesure des motifs : proportions, contrastes, formes de bec, motifs de plumage ou de pelage. Sur une photo correcte d'espèce commune, elle est très bonne et instantanée.

Elle reste faillible sur les juvéniles, les hybrides, les photos à contre-jour et les groupes qui demandent un critère invisible en image. C'est pourquoi, sur Faunex, chaque identification affiche un **niveau de fiabilité** : au-dessus de 90 %, la fiche est validée automatiquement ; en dessous, tu peux contester ou demander une vérification humaine, et l'espèce n'entre pas dans le bestiaire sans contrôle. Les taxons sont en plus recoupés avec les référentiels scientifiques, pour éviter les noms d'espèces inventés.

## La routine simple à adopter

1. Deux photos : une serrée, une large.
2. Note le milieu et la date (l'app le fait pour toi).
3. Cherche le grand groupe, pas l'espèce.
4. Accepte l'incertitude quand elle est justifiée — "mésange, probablement charbonnière" est une donnée honnête et utile.

Au bout de quelques semaines, tu ne consultes plus rien pour les vingt espèces de ton quartier. C'est là que ça devient vraiment intéressant : tu commences à remarquer les absences, les arrivées, les changements. L'identification n'est que la porte d'entrée.
`,
  },
];

export const guides = articles.filter((a) => a.type === 'guide');
export const useCases = articles.filter((a) => a.type === 'usecase');

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
