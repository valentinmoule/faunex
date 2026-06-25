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
];

export const guides = articles.filter((a) => a.type === 'guide');
export const useCases = articles.filter((a) => a.type === 'usecase');

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
