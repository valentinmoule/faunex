// Light static CMS — add a new article by appending an entry below.
// `body` is markdown; rendered with react-markdown + remark-gfm.
// Translatable fields (title, description, body) carry both FR and EN copy.

export type ArticleType = 'guide' | 'usecase';
export type Locale = 'fr' | 'en';

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface Article {
  slug: string;
  type: ArticleType;
  title: LocalizedText;
  description: LocalizedText; // <160 chars, used for meta description
  category: string; // displayed as chip
  readingMinutes: number;
  publishedAt: string; // ISO date
  updatedAt?: string;
  cover?: string; // public path
  body: LocalizedText; // markdown
}

export interface LocalizedArticle extends Omit<Article, 'title' | 'description' | 'body'> {
  title: string;
  description: string;
  body: string;
}

/** Resolve the FR/EN copy of an article for a given i18next locale (e.g. `i18n.language`). */
export function resolveLocale(locale: string | undefined): Locale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/** Returns an article with `title`/`description`/`body` resolved to a single language. */
export function localizedArticle(article: Article, locale: string | undefined): LocalizedArticle {
  const lang = resolveLocale(locale);
  return {
    ...article,
    title: article.title[lang],
    description: article.description[lang],
    body: article.body[lang],
  };
}

export const articles: Article[] = [
  {
    slug: 'identifier-oiseau-photo-ia',
    type: 'guide',
    title: {
      fr: "Identifier un oiseau avec une photo : ce qui marche, ce qui foire",
      en: "How to Identify a Bird From a Photo: What Works and What Doesn't",
    },
    description: {
      fr: "Méthode honnête pour reconnaître un oiseau depuis une photo de téléphone : cadrage, lumière, pièges des juvéniles, et quand l'IA se plante.",
      en: "An honest method for identifying birds from a phone photo: framing, light, juvenile pitfalls, and where AI gets it wrong.",
    },
    category: 'Identification',
    readingMinutes: 5,
    publishedAt: '2026-06-20',
    body: {
      fr: `# Identifier un oiseau avec une photo : ce qui marche, ce qui foire

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
      en: `# How to Identify a Bird From a Photo: What Works and What Doesn't

The first time I tried to put a name on "that little grey thing singing its head off in the hedge," I spent ten minutes flipping through a paper guide and found nothing. It was a Eurasian wren — pound for pound, the loudest singer in Europe. Five grams of bird with the volume of an angry sparrow. Once you know it, you hear it everywhere. Until then, it simply doesn't exist.

That's the whole point of identification: turning an animal from a "thing" into a recognized presence. And these days, a single photo is enough.

## The photo that fails every time

You spot the bird, grab your phone, pinch-zoom with your finger, and shoot. Result: a blurry dot against a pale sky. Neither an AI nor a seasoned birder can do anything with that.

Three simple habits change everything:

- **Use optical zoom whenever you can**, never your fingers. Digital zoom just blows a postage stamp up into mush.
- **Put the sun behind you**, not behind the bird. Backlighting washes out colour, and colour is often the only clue separating two similar species.
- **Aim for the profile.** Not the back, not the belly — the profile. Silhouette, beak, tail: that's where identification actually happens.

A blurry photo that's well framed and well lit beats ten sharp photos shot from the wrong angle.

## What "AI" actually sees

The word sounds intimidating, but the principle is simple. The model has seen hundreds of thousands of labelled photos. It has learned to spot patterns: beak shape, tail length relative to the body, contrast zones on the head, a pale eyebrow stripe, the colour of the rump.

That's exactly why it stumbles on juveniles: a young robin doesn't have the orange bib yet — it's entirely mottled beige. To the model, it might as well be a different bird. Same story with female finches, far duller than the photogenic males in field guides.

Keep this in mind too: on domestic breeds (pond ducks, city pigeons, backyard chickens), AI hesitates. Too much crossbreeding, too much variability. It will usually give you the group, rarely the exact breed. That's an honest limitation, not a bug.

## Identification is step one of something bigger

Identifying a bird feels satisfying. But the real shift happens afterwards: you start recognising its song without needing the photo. You realise your garden hosts a pair of blue tits that has nested in the box for three years. You notice the kestrel that passes over the street every day at 6pm.

You become an attentive resident of your own neighbourhood, not just someone passing through. No app can hand you that — it can only open the door.

> A beginner's tip that would have saved me months: start with five species. House sparrow, great tit, blackbird, pigeon, robin. Learn them thoroughly — song, behaviour, season. Everything else builds on that foundation.
`,
    },
  },
  {
    slug: 'animaux-jardin-france',
    type: 'guide',
    title: {
      fr: "Les animaux que tu croises sans les voir (et comment les voir)",
      en: "The Wildlife You Walk Past Every Day (And How to Actually Notice It)",
    },
    description: {
      fr: "12 espèces sauvages présentes dans la majorité des jardins français : où les chercher, à quelle heure, et le détail qui les trahit.",
      en: "12 wild species found in most French gardens: where to look, what time of day, and the one detail that gives them away.",
    },
    category: 'Espèces',
    readingMinutes: 7,
    publishedAt: '2026-06-22',
    body: {
      fr: `# Les animaux que tu croises sans les voir (et comment les voir)

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
      en: `# The Wildlife You Walk Past Every Day (And How to Actually Notice It)

There's a fascinating thing that happens once you start observing: the wildlife doesn't change, but your eye does. You've walked the same park for ten years, and one day you notice a great spotted woodpecker hammering away three metres above your head. It was there every single day. You just weren't.

Here are twelve species that are extremely common across mainland France. None of them are rare. All of them probably crossed your path this week without you noticing.

## Five birds to learn first

**The great tit** wears a black necktie running the full length of its belly — broad on the male, thin on the female. It's the most active bird at winter feeders, usually the first to show up for sunflower seeds.

**The robin** approaches you when you turn over soil. It's waiting for worms. It's solitary year-round and even sings in winter, which is unusual — that slightly melancholic, flute-like song you hear in November.

**The blackbird**: males are entirely black with an orange bill, females chocolate brown. Its dusk song from spring onward is one of the most beautiful in Europe, and everyone hears it without really listening.

**The house sparrow** has lived alongside us since the Neolithic. It's crashing in city centres but still holds strong in suburban areas. If you no longer see any in your neighbourhood, that's a bad sign for your neighbourhood.

**The chaffinch** is probably the most numerous bird in France. Males have a blue-grey head and pink chest; females are far duller, greenish-beige. Its metallic "pink pink" alarm call gives it away before you even see it.

## Mammals: go out at the right time

**The red squirrel** is best seen on autumn mornings, while it's stockpiling food. It favours conifers and old broadleaf trees. If your park has cedars, check the base: you'll find pine cones gnawed down like apple cores — its signature.

**The hedgehog** is a protected species in France, and it needs to be: half of all hedgehogs die crossing roads. To attract one to your garden, keep a wild corner — nettles, a woodpile, uncollected leaves. It comes out at nightfall, never before.

**The common pipistrelle** is the bat you see zigzagging above streetlights in summer. It hunts by echolocation, sometimes catching 3,000 mosquitoes a night. All bat species are protected in France.

## The discreet ground-dwellers

**The wall lizard** basks in the sun on old stone walls, even in the middle of a city. Approach slowly and from the side, never head-on — its brain is wired to flee anything coming straight at it.

**The common frog** is the classic pond frog, reddish-brown with a dark mask around the eye. It spawns in February-March in thick gelatinous clumps. At the right moment, you can find a pond literally holding kilos of eggs.

## Insects: two to know

**The seven-spot ladybird** is the "real" one, the native European species. Bright red, exactly seven black spots. Its Asian cousin (often orange, with a white "M" behind the head) arrived in France in the 2000s and outcompetes it heavily.

**The peacock butterfly** is that reddish-brown butterfly with four large blue eyespots on its wings. It loves buddleia and lavender beds. You can watch it from 30cm away — it won't fly off.

## The real advice

Stay still for ten minutes. That's it. Most animals fled the moment you arrived and come back as soon as you go quiet. Ninety percent of wildlife watching is patience — not gear, not knowledge. Just the decision not to move.

> One last tip: keep a notebook, or use a collection app. Not to chase a score, but because memory lies. You'll swear you saw a robin in July, when you actually saw it in May — and it stops singing by July. Precise dates change everything.
`,
    },
  },
  {
    slug: 'difference-animaux-communs-rares',
    type: 'guide',
    title: {
      fr: "Pourquoi une carte mythique est mythique : la vraie rareté du vivant",
      en: "Why a \"Mythic\" Card Is Mythic: The Real Rarity of Wildlife",
    },
    description: {
      fr: "Liste rouge UICN, statuts de conservation, fréquence réelle d'observation : ce que veut dire 'rare' quand on parle d'animaux sauvages.",
      en: "IUCN Red List, conservation status, real-world observation frequency: what \"rare\" actually means when we talk about wild animals.",
    },
    category: 'Conservation',
    readingMinutes: 4,
    publishedAt: '2026-06-24',
    body: {
      fr: `# Pourquoi une carte mythique est mythique : la vraie rareté du vivant

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
      en: `# Why a "Mythic" Card Is Mythic: The Real Rarity of Wildlife

In a classic trading card game, rarity is arbitrary. The publisher decides that a Charizard will show up less often than a Pidgey. End of story.

In real wildlife, it's the opposite. Nobody decided that otters would be rare. They became rare. And that's exactly what makes spotting an otter infinitely more intense than spotting a pigeon: you don't stumble onto it because luck smiled on you — you stumble onto it because just enough of them are left for the encounter to still be possible.

## The Red List is serious business

The **International Union for Conservation of Nature** (IUCN) ranks every species into a risk category, and this list carries authority worldwide. From safest to most alarming:

- **LC** — Least Concern
- **NT** — Near Threatened
- **VU** — Vulnerable
- **EN** — Endangered
- **CR** — Critically Endangered
- **EW / EX** — Extinct in the Wild / Extinct

It looks cold and administrative, but behind every letter lies a real situation on the ground: a counted population, a measured trend, habitats shrinking or slowly recovering.

## How Faunex translates that

We use four visual tiers to make the collection readable without diluting the message:

| Tier | Colour | Corresponds to | Example |
|---|---|---|---|
| Common | Grey | Widespread LC | Sparrow, ladybird |
| Rare | Blue | Discreet LC, NT | Long-tailed tit, squirrel |
| Epic | Purple | VU, EN | Hedgehog, bat |
| Mythic | Gold | CR, EW | Iberian lynx, otter |

A Mythic card isn't mythic because we decided to make it glow brighter. It's mythic because encountering it means encountering something we're actively losing — or, in the best cases, getting back.

## A few useful truths

**Rarity depends on location.** A deer is common in the Vosges, nearly impossible in Paris. A red kite is unremarkable in the Massif Central, extremely rare on the northern coast. Your "rare" isn't your neighbour's "rare."

**Rarity shifts fast.** Wolves returned to France in the 1990s. Beavers recolonised the Loire. Meanwhile the house sparrow, still very common, is collapsing in European cities — maybe a decade away from joining the Red List for real.

**A "common but declining" species can be more worrying than a rare but stable one.** The sparrow is the textbook case: still everywhere, yet its population has dropped 60% across Europe in forty years. Same with hedgehogs. We don't notice because "there are still some around" — until the day there aren't.

## Why collecting helps

Putting visual tiers on conservation status is an honest teaching trick. Nobody's going to read the IUCN Red List on a Saturday night. But everyone remembers opening a booster pack and finding a gold card inside. If that gold card represents an otter you genuinely spotted in a river in the Vosges, the knowledge sinks in through a different channel — an emotional one — and it stays there.

> Rarity isn't a game mechanic. It's a memory. And every observation logged somewhere is a saved checkpoint in that collective memory.
`,
    },
  },
  {
    slug: 'app-collection-animaux-balade',
    type: 'usecase',
    title: {
      fr: "De la balade à la collection : comment Faunex marche vraiment",
      en: "From Walk to Collection: How Faunex Actually Works",
    },
    description: {
      fr: "Pourquoi on a fait Faunex, comment fonctionne la capture, le bestiaire et la rareté. Une visite honnête de l'app, sans baratin marketing.",
      en: "Why we built Faunex, and how capture, the bestiary, and rarity actually work. An honest tour of the app, no marketing fluff.",
    },
    category: 'Faunex',
    readingMinutes: 4,
    publishedAt: '2026-06-23',
    body: {
      fr: `# De la balade à la collection : comment Faunex marche vraiment

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
      en: `# From Walk to Collection: How Faunex Actually Works

Faunex was born out of frustration. We love walking outdoors, we see animals, we don't know their names, and we forget. Paper field guides work, but they don't fit in a pocket while you're chasing a kid around. Existing apps are either too technical or plain ugly.

The idea came to us while playing Pokémon cards with a nephew. He knew the Latin names of fictional creatures. Not a single name for the bird singing right next to us. It felt absurd. So we asked ourselves: what if we built the exact same irresistible experience Pokémon cards offer, but for real animals?

## What happens when you take a photo

You open the app, frame the shot, tap the shutter. The image is compressed locally (max 1024px, 60% quality) before it's sent — to save your data plan and speed up processing.

The model identifies the species and pulls its **common name**, **Latin name**, main **habitat**, **diet**, and **rarity**, derived from its IUCN conservation status. The card reveals itself with a booster-pack-style animation — the rarer the species, the more intense the animation (with a light haptic buzz for Mythics on mobile).

And the card joins your bestiary. Permanently. With the date, the location, your photo.

## The bestiary is the heart of it

It's your visual field journal. Every species you've encountered, sorted by rarity, category, and region. You can open a card for full details, view your photo full screen, and read the fun facts.

As you fill it in, you notice two things: the real diversity around you (often surprisingly high), and the gaps (you still haven't caught a chaffinch, even though they're everywhere — meaning you need to look more closely).

## Rarity, once more, because it matters

It's not just decoration. The four-tier system (common grey, rare blue, epic purple, mythic gold) is built directly on the IUCN Red List. When you catch a Mythic, you've genuinely observed a critically endangered species. That's what gives the collection real meaning.

## Social features, the non-toxic version

We added an "explorers" mode: you can follow other users, see their catches in a simple chronological feed, and compare bestiaries. Profiles are private by default — you have to accept a follow request. No ads, no infinite scroll, no liking strangers' posts — just your friends and their walks.

## What this isn't

It's not a scientific tool. If you do bird ringing or rigorous surveys, use iNaturalist or Faune-France, which feed into national databases.

It's not a game either. We won't bombard you with notifications, there are no gems to buy, and we don't push you to open the app ten times a day.

It sits between the two: a naturalist's journal with trading-card-game flair, designed to make observation contagious — especially for people who don't yet know they'd love it.

> The best feedback we've had came from a 40-year-old guy who said he'd spent ten years trying to get into birdwatching, and in three weeks with the app he could name thirty species. He summed it up better than we ever could: "Before, I used to see birds. Now I see Marcel, Léon, and Roger, and I worry when they're not around."
`,
    },
  },
  {
    slug: 'reconnaissance-animaux-ia-famille',
    type: 'usecase',
    title: {
      fr: "Reconnaître les animaux en famille (sans devenir naturaliste)",
      en: "Identifying Animals as a Family (Without Becoming a Naturalist)",
    },
    description: {
      fr: "Faunex pour les balades parents-enfants : comment ça change vraiment une promenade, idées de jeux en sortie, et ce que les enfants retiennent.",
      en: "Faunex for parent-child walks: how it changes an ordinary stroll, game ideas for outings, and what kids actually remember.",
    },
    category: 'Famille',
    readingMinutes: 4,
    publishedAt: '2026-06-25',
    body: {
      fr: `# Reconnaître les animaux en famille (sans devenir naturaliste)

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
      en: `# Identifying Animals as a Family (Without Becoming a Naturalist)

A forest walk with a 6-year-old means roughly forty questions an hour. Three about trees, two about mushrooms, and the rest about whatever flies, runs, scratches, or crawls.

If you don't know the answer, you have two options: make something up (a rite of passage for every parent — sorry to the "green woodpecker" that was actually a chaffinch), or pull out an app.

## Why not just Google Images

Google Images works fine for identifying an IKEA chair, not so much for a bird flying fifteen metres above a trail. The generic model has no clue about European wildlife and will happily suggest an Amazonian parrot for a tit.

A specialised app means a model trained on local wildlife, a database of French species, and fact sheets written to be read aloud to a child — not to pass an ornithology exam.

## What kids actually pick up

We've watched plenty of families use Faunex, and it's always the same pattern:

The kid wants the phone. Takes the photo. The card reveals itself. Five seconds of pure excitement over the rarity ("OH, A BLUE ONE!"). Then comes the interesting question: "What does it eat?" And because the sheet is short and illustrated, they actually read it. At six years old. Voluntarily. A fact sheet about a red squirrel's diet.

Three walks later, they know ten species. They name them before you do. They correct your pronunciation of "long-tailed tit." And they start asking why some are mythic.

That's when it quietly becomes educational.

## Four game ideas for outings

**Nature bingo** — Before setting off, everyone lists five species to try and catch. First to complete their grid wins. Works great with competitive siblings.

**Rarest card wins** — Everyone captures during the walk. At the end, compare. Rarity gives points (1 for common, 5 for mythic). The kid usually wins, because kids look down at the ground while adults look far ahead.

**Challenge of the day** — One species to catch before lunch. An orange butterfly. A singing bird. A yellow flower (if you're branching into plants). It forces you to *search*, not just wander.

**The neighbourhood bestiary** — Over several weeks, build a map of everything living within 500 metres of home. You'll be surprised: thirty species, easily.

## The serious side

The app is free, ad-free, with no ad tracking. Children's profiles are private by default — no open social network, no messages from strangers. Photos stay in your account unless you choose to share them.

It installs straight from the browser (PWA) — no app store, no complicated download. And it works offline to browse what you've already collected — handy in a forest with no signal.

> The thing we hear most often: "Now, the moment we hear a bird, we absolutely have to catch it." That's exactly what we were going for.
`,
    },
  },
  {
    slug: 'identification-insectes',
    type: 'guide',
    title: {
      fr: "Identification des insectes : la méthode qui marche vraiment sur le terrain",
      en: "Insect Identification: The Method That Actually Works in the Field",
    },
    description: {
      fr: "Comment identifier un insecte à partir d'une photo : les 5 critères qui comptent, les confusions classiques (guêpe/syrphe, libellule/demoiselle) et les limites de l'IA.",
      en: "How to identify an insect from a photo: the 5 criteria that matter, classic mix-ups (wasp/hoverfly, dragonfly/damselfly), and where AI hits its limits.",
    },
    category: 'Identification',
    readingMinutes: 7,
    publishedAt: '2026-08-20',
    body: {
      fr: `# Identification des insectes : la méthode qui marche vraiment sur le terrain

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
      en: `# Insect Identification: The Method That Actually Works in the Field

France is home to roughly 40,000 insect species. Forty thousand. By comparison, the 300 or so regular bird species look like a short shopping list. That's exactly why insect identification feels intimidating: it seems like you'd need a PhD just to name a bug sitting on a flower head.

In reality, no. You just need to stop hunting for "the species" right away and learn to go down the stairs one step at a time: first the broad group, then the family, and only afterwards the precise name. That's exactly what an identification AI does — and it's what you can do with the naked eye.

## Step 1: find the broad group (30 seconds)

Look at the wings. It's the only criterion that matters at first.

- **Only two wings** → flies, hoverflies, mosquitoes (Diptera). No visible second pair at the rear of the body.
- **Four wings, wasp-like build, a marked "wasp waist"** → bees, wasps, bumblebees, ants (Hymenoptera).
- **Wings covered in powdery scales** → butterflies and moths (Lepidoptera).
- **Hard wing cases meeting in a straight line down the back** → beetles (ladybirds, ground beetles, chafers, longhorns).
- **Four large transparent, veined wings, elongated body** → dragonflies and damselflies (Odonata).
- **Piercing mouthpart, triangular shield on the back** → true bugs (Hemiptera).

With these six boxes, you can sort 90% of what you'll come across in a garden. And more importantly, you instantly rule out 39,000 species.

## Step 2: the 5 things to photograph

To go further, you need real information in the image. A usable insect photo shows:

1. **The top of the body**, flat, perpendicular to the lens. No blurry three-quarter angle.
2. **The full antennae** — their length and shape (clubbed, feathery, thread-like) separate entire families.
3. **The legs**, especially the hind ones (thickened in jumping insects).
4. **The pattern on the wings or wing cases**: number of spots, stripes, pale markings.
5. **The plant or surface it's on**. A caterpillar on its host plant is already half the identification done.

Practical tip: approach slowly, without casting a shadow over the insect. It's the shadow that triggers a flight response, not the noise. And take three photos rather than one "perfect" shot — you won't get a second chance.

## Step 3: the classic mix-ups

The same confusions trip up humans and algorithms alike:

- **Wasp vs. hoverfly.** A hoverfly is a fly disguised as a wasp: two wings, huge eyes covering the head, and it hovers in place. A wasp never hovers.
- **Honeybee vs. wild bee.** France has nearly 1,000 wild bee species. Most are solitary, smaller, sometimes black or metallic. If you photograph "a bee," there's a good chance it isn't *Apis mellifera*.
- **Dragonfly vs. damselfly.** At rest: dragonflies hold their wings flat open, with a stocky body. Damselflies fold their wings above the back, with a body as thin as a matchstick.
- **European hornet vs. Asian hornet.** The Asian hornet has yellow leg tips and an almost entirely black thorax. The European hornet is more reddish, with striped yellow markings.
- **Harlequin ladybird vs. seven-spot ladybird.** Count the spots, and look for the black-and-white "M" mark behind the head on the harlequin.

## What AI can do — and where it struggles

An identification AI has learned from hundreds of thousands of labelled photos. It excels on high-contrast, frequently photographed insects: butterflies, ladybirds, dragonflies, bumblebees, boldly patterned bugs.

It's far more cautious on:

- **small flies and micro-wasps**, where the distinguishing feature is wing venation or hair patterns, invisible on a phone photo;
- **larvae and caterpillars**, many of which have no reference photos at all;
- **groups that require lab-grade examination**. For some families, even a specialist can't decide without a microscope.

On Faunex, when confidence is too low, we'd rather report the genus or family than invent a species name. It's less flashy, but a wrong identification pollutes everyone's data — and your own memory, most of all.

## Why it's worth getting into

Insects are the group collapsing fastest, and the least monitored. Every dated, located observation genuinely counts. But beyond that, something small and delightful happens: the moment you can name three hoverflies, a flowerbed never looks the same again. The garden becomes noisy with detail.

Start small: five species on your balcony. Photograph them, identify them, keep them. The rest follows on its own.
`,
    },
  },
  {
    slug: 'identification-animaux',
    type: 'guide',
    title: {
      fr: "Identification des animaux : reconnaître une espèce à partir d'une photo",
      en: "Animal Identification: How to Recognise a Species From a Photo",
    },
    description: {
      fr: "Guide pratique pour identifier un animal sauvage : silhouette, taille, habitat, indices de présence. Ce qu'une photo doit montrer pour une identification fiable.",
      en: "A practical guide to identifying wildlife: silhouette, size, habitat, signs of presence. What a photo needs to show for a reliable ID.",
    },
    category: 'Identification',
    readingMinutes: 7,
    publishedAt: '2026-08-20',
    body: {
      fr: `# Identification des animaux : reconnaître une espèce à partir d'une photo

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
      en: `# Animal Identification: How to Recognise a Species From a Photo

Most people assume identifying an animal is a matter of memory: knowing the names. In practice, it's mostly a matter of method. A beginner naturalist with the right checklist identifies more species than a curious person who's read three books but never looked closely.

Here's that checklist, in the order you'd actually use it in the field.

## 1. Silhouette before colour

Our brain grabs onto colour first. That's a mistake: colour shifts with light, season, age, and sex. Silhouette doesn't.

Ask yourself three questions, in this order:

- **What's the overall shape?** Stocky, slender, compact, elongated.
- **What are the proportions?** Tail length relative to the body, leg length, head size.
- **What's the profile of the beak, muzzle, or snout?** Thin, thick, hooked, flattened.

A blackbird and a common starling both look "black" from a distance. The blackbird has a long tail and hops; the starling has a short tail, a triangular silhouette, and walks on the ground. Colour alone wouldn't have told you anything.

## 2. Size, but relative

"It was about this big" means nothing. Always compare it to something familiar in the scene: a pigeon, a sparrow, a hand, a paving stone, a leaf. A common buzzard and a Eurasian sparrowhawk share almost the same shape in a photo — scale is what settles it.

On a photo, that reference disappears if you crop in too tight. So take **two images**: a close one for detail, a wide one for context and scale.

## 3. Habitat and geography

This is the most powerful filter — and the most overlooked. A red squirrel in dense city centre isn't impossible, but it's rare. A sea anemone in a pond in Île-de-France is impossible.

Always note:

- the **habitat**: forest, woodland edge, meadow, wetland, coast, city;
- the **date**: many species are only present part of the year;
- the **region**. Half of all mix-ups are solved just by checking the species' known range.

That's also why an identification app using your location beats a generic image search: it rules out species that have no business being there.

## 4. The recurring pitfalls

- **Juveniles.** A young robin has no orange bib. A gull takes four years to look like the field guide illustration.
- **Females.** In many birds and butterflies, females are drab while guides show the flashier male.
- **Mimicry.** Some species deliberately imitate a more dangerous one.
- **Domestic animals and hybrids.** Cats, dogs, horses, pond ducks, city pigeons: variability is so high that the exact breed is often beyond what a photo can tell you. You can usually name the species, rarely more.
- **Zoo or aviary photos.** They skew everything: exotic species, artificial setting. That's not a wildlife observation.

## 5. When the animal isn't there: signs of presence

A large part of wildlife identification happens without ever seeing the animal. In fact, that's often the only way.

- **Tracks**: number of toes, presence of claws, stride pattern.
- **Droppings**: shape, contents (fur, pits, insect fragments).
- **Feeding remains**: spruce cones stripped by a squirrel, hazelnuts pierced by a wood mouse, a neat ring of feathers left by a bird of prey.
- **Marks on wood**: woodpecker holes, bark rubbed by a deer.
- **Sounds**: a call is often more diagnostic than a sighting, especially for birds and amphibians.

## What AI identification can — and can't — do

An AI compares your photo to hundreds of thousands of labelled images and measures patterns: proportions, contrast, beak shape, plumage or coat markings. On a decent photo of a common species, it's excellent and instant.

It's still fallible on juveniles, hybrids, backlit photos, and groups that require a feature invisible in the image. That's why, on Faunex, every identification shows a **confidence level**: above 90%, the card is validated automatically; below that, you can dispute it or request a human check, and the species won't enter the bestiary without review. Taxa are also cross-checked against scientific references, to avoid invented species names.

## The simple routine to adopt

1. Two photos: one close, one wide.
2. Note the habitat and date (the app does this for you).
3. Look for the broad group, not the species.
4. Accept uncertainty when it's warranted — "tit, probably great tit" is honest, useful data.

After a few weeks, you'll stop needing anything for the twenty species in your neighbourhood. That's when it gets genuinely interesting: you start noticing absences, arrivals, changes. Identification is just the front door.
`,
    },
  },
];

export const guides = articles.filter((a) => a.type === 'guide');
export const useCases = articles.filter((a) => a.type === 'usecase');

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
