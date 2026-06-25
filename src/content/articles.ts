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
    title: 'Comment identifier un oiseau avec une photo et une IA',
    description:
      "Reconnaître un oiseau en 3 secondes grâce à une photo : méthode, astuces de cadrage, limites de l'IA et comparaison avec les guides papier.",
    category: 'Identification',
    readingMinutes: 5,
    publishedAt: '2026-06-20',
    body: `# Comment identifier un oiseau avec une photo et une IA

Reconnaître un oiseau de jardin demandait hier un guide papier, des jumelles et un peu de patience. Aujourd'hui, une simple photo prise au téléphone suffit : une **IA d'identification d'oiseaux** compare ta photo à des milliers d'espèces et te donne un nom commun, un nom latin et souvent l'habitat probable.

## Pourquoi identifier les oiseaux change ta façon de te balader

Mettre un nom sur ce qu'on voit transforme une promenade banale en chasse au trésor. Une mésange charbonnière devient soudain une rencontre, pas un "petit oiseau jaune". C'est aussi le premier pas vers une démarche **naturaliste amateur** : on commence à reconnaître les chants, à noter les habitudes, à comprendre les saisons.

## Les 3 règles pour une bonne photo d'identification

1. **Cadre serré** — Si l'oiseau occupe moins de 10 % de la photo, l'IA aura du mal. Zoome optique avant de déclencher.
2. **Lumière sur le sujet** — Évite le contre-jour. La couleur du plumage est un des marqueurs principaux.
3. **Profil de côté** — Le profil donne la silhouette, la longueur du bec et la coloration du flanc. C'est le meilleur angle pour une IA.

## Ce que l'IA voit vraiment

Une IA de reconnaissance ne "regarde" pas comme nous. Elle analyse des motifs : la forme du bec, la silhouette de la queue, le contraste tête/corps. C'est pour ça qu'une photo floue mais bien cadrée marche souvent mieux qu'une photo nette mais lointaine.

## Les pièges courants

- **Les juvéniles** ressemblent rarement aux adultes. Un rouge-gorge juvénile n'a pas la tache rouge.
- **Les femelles** sont souvent plus ternes et confondues avec d'autres espèces.
- **Les races domestiques** (canards, poules, pigeons) sont parfois mal identifiées car trop variables.

## IA ou guide papier : faut-il choisir ?

Les deux sont complémentaires. L'IA gagne en vitesse et en accessibilité — un enfant peut identifier un oiseau sans rien connaître. Le guide papier reste imbattable pour **apprendre les groupes d'espèces** et comprendre les liens entre eux. L'idéal : identifier avec l'app, lire la fiche, puis revenir à un guide pour creuser.

## Aller plus loin : collectionner ses observations

Une fois l'identification automatisée, l'étape suivante est la **collection**. Sauvegarder ses observations crée un journal personnel de la faune autour de toi — saisons, lieux, fréquences. C'est exactement ce que propose Faunex : chaque photo devient une carte, chaque espèce une entrée dans ton bestiaire personnel.

> Astuce : commence par 5 espèces autour de chez toi avant de partir en forêt. Le moineau, la mésange, le pigeon, le rouge-gorge et le merle sont partout — et déjà très satisfaisants à "attraper".
`,
  },
  {
    slug: 'animaux-jardin-france',
    type: 'guide',
    title: '12 animaux que tu peux observer dans ton jardin en France',
    description:
      "Mésange, hérisson, écureuil, lézard… La liste des 12 espèces les plus faciles à observer chez soi, avec saison, habitat et astuces d'observation.",
    category: 'Espèces',
    readingMinutes: 7,
    publishedAt: '2026-06-22',
    body: `# 12 animaux que tu peux observer dans ton jardin en France

Pas besoin de partir en safari : ton jardin, ton balcon ou le parc d'à côté abritent déjà une faune surprenante. Voici 12 espèces faciles à croiser en France, avec la saison idéale et les bons réflexes pour les observer.

## Oiseaux faciles à reconnaître

### 1. Mésange charbonnière
Petit oiseau noir-jaune avec une cravate noire au ventre. Présente toute l'année, très active aux mangeoires en hiver.

### 2. Rouge-gorge familier
Reconnaissable à sa bavette orange. Solitaire et territorial, il s'approche volontiers d'un jardinier qui retourne la terre.

### 3. Merle noir
Mâle entièrement noir avec bec orange, femelle brune. Chant flûté caractéristique au crépuscule au printemps.

### 4. Moineau domestique
Le compagnon historique de l'humain. En déclin dans les grandes villes, mais encore très présent en zone pavillonnaire.

### 5. Pinson des arbres
L'un des oiseaux les plus nombreux de France. Mâle au plumage rosé et bleu, femelle plus discrète.

## Petits mammifères

### 6. Écureuil roux
Plutôt en lisière de forêt ou parcs arborés. Période la plus active : matins d'automne, quand il fait ses provisions.

### 7. Hérisson d'Europe
Protégé en France. Sort à la tombée de la nuit. Laisse un coin de jardin "sauvage" pour l'attirer.

### 8. Chauve-souris (pipistrelle)
La plus commune. Se voit au crépuscule chassant les moustiques. Toutes les espèces sont protégées.

## Reptiles et amphibiens

### 9. Lézard des murailles
Petit lézard gris-brun qui se chauffe au soleil sur les murs en pierre. Très commun, même en ville.

### 10. Grenouille rousse
Présente près des points d'eau au printemps. Pond en gros amas gélatineux dans les mares.

## Insectes remarquables

### 11. Coccinelle à 7 points
La native. À ne pas confondre avec la coccinelle asiatique (souvent orange, avec un "M" blanc sur la tête).

### 12. Paon-du-jour
Papillon brun-rouge avec 4 grands "yeux" colorés. Très commun de mars à octobre sur les fleurs violettes.

## Comment maximiser ses observations

- **Patiente 10 minutes immobile** — la plupart des animaux reviennent vite.
- **Garde un coin sauvage** — orties, bois mort, tas de feuilles.
- **Évite les pesticides** — ils éliminent la base de la chaîne alimentaire.
- **Note tes observations** — une app de collection comme Faunex transforme chaque rencontre en carte et te montre les espèces dominantes de ta zone au fil des saisons.

> Plus tu observes, plus tu vois. La plupart des espèces de cette liste sont là depuis toujours — il "suffit" de lever les yeux.
`,
  },
  {
    slug: 'difference-animaux-communs-rares',
    type: 'guide',
    title: 'Espèce commune, rare, mythique : comment se mesure la rareté ?',
    description:
      "Pourquoi certains animaux sont 'communs' et d'autres 'mythiques' ? Statut de conservation UICN, fréquence d'observation et logique des cartes à collectionner.",
    category: 'Conservation',
    readingMinutes: 4,
    publishedAt: '2026-06-24',
    body: `# Espèce commune, rare, mythique : comment se mesure la rareté ?

Sur Faunex comme dans les guides naturalistes, on parle d'espèces "communes", "rares", "épiques" ou "mythiques". Mais sur quoi se base cette classification ? Ce n'est pas qu'une mécanique de jeu : c'est une lecture du **statut de conservation** réel des espèces.

## La liste rouge de l'UICN, le référentiel mondial

L'**Union Internationale pour la Conservation de la Nature** (UICN) tient une liste rouge mondiale qui classe chaque espèce sur une échelle :

- **LC** — Préoccupation mineure (l'espèce va bien)
- **NT** — Quasi menacée
- **VU** — Vulnérable
- **EN** — En danger
- **CR** — En danger critique
- **EW / EX** — Éteinte à l'état sauvage / Éteinte

C'est ce statut qui sert de base à la plupart des classifications de rareté, y compris dans les apps naturalistes.

## La logique de Faunex

Sur Faunex, on traduit ces statuts en quatre paliers visuels, pour rendre la collection lisible :

| Palier | Couleur | Correspondance | Exemples |
|---|---|---|---|
| Commun | Gris | LC très répandu | Moineau, coccinelle |
| Rare | Bleu | LC discret, NT | Mésange à longue queue, écureuil |
| Épique | Violet | VU, EN | Hérisson, chauve-souris |
| Mythique | Doré | CR, EW | Lynx boréal, loutre |

## Pourquoi ce n'est pas juste un jeu

Mettre des couleurs sur la rareté a un effet concret : on **valorise** l'observation d'espèces en déclin, on **comprend** que croiser un hérisson n'est plus banal, on **apprend** ce qui mérite d'être protégé.

C'est aussi pour ça que les apps de collection naturaliste séduisent : elles transforment un savoir parfois aride (la liste rouge) en quelque chose d'**émotionnel** — la joie d'attraper une carte rare.

## Limites à connaître

- La rareté **dépend du territoire** : un cerf est commun en forêt, rarissime en ville.
- La rareté **change vite** : certaines espèces remontent (loup, castor), d'autres s'effondrent (moineau urbain).
- Une **espèce commune mais en chute libre** (le moineau, encore) peut être plus inquiétante qu'une espèce déjà classée rare et stable.

## Ce que tu peux faire

- Observer et **noter** — chaque observation alimente la connaissance globale.
- Partager tes captures avec une communauté naturaliste.
- Soutenir les habitats : haies, mares, prairies non tondues.

> La rareté n'est pas qu'un score. C'est une mémoire de ce qu'on est en train de perdre — ou de retrouver.
`,
  },
  {
    slug: 'app-collection-animaux-balade',
    type: 'usecase',
    title: 'Transformer une balade en collection de cartes faune',
    description:
      "Comment Faunex transforme une promenade ordinaire en chasse aux trésors : capture photo, identification IA, cartes à rareté, progression et bestiaire.",
    category: 'Faunex',
    readingMinutes: 4,
    publishedAt: '2026-06-23',
    body: `# Transformer une balade en collection de cartes faune

Tu connais cette sensation : tu marches, tu vois un animal, tu n'as pas le nom, tu passes. Trois jours plus tard, tu as oublié. Et si chaque rencontre devenait une **carte à collectionner** dans ta poche ?

## L'idée

Faunex est une **app mobile gratuite** qui combine deux choses simples :

1. Une IA d'identification d'animaux à partir d'une photo
2. Un système de **collection façon cartes Pokémon** avec quatre niveaux de rareté

Tu prends une photo, l'IA reconnaît l'espèce en 3 secondes, et la carte rejoint ton bestiaire personnel. Avec habitat, régime, anecdotes, et une rareté qui reflète le **vrai statut de conservation** de l'espèce.

## En 30 secondes

- **Tu vois** un oiseau, un insecte, un mammifère.
- **Tu photographies** depuis l'app (ou tu importes depuis ta galerie).
- **L'IA identifie** l'espèce.
- **La carte se révèle** avec une animation type "ouverture de booster".
- **Elle entre dans ton bestiaire** et te donne de l'XP.

## Pourquoi ça marche mieux qu'un guide naturaliste

Un guide naturaliste classique demande un effort : ouvrir, chercher, comparer. Une app de collection joue sur la **dopamine de la découverte** : envie d'attraper une carte rare, de compléter une catégorie, de remplir le bestiaire de sa région.

C'est exactement ce qui fait que les enfants apprennent les noms de 150 Pokémons sans effort — alors qu'on peine à leur apprendre 10 espèces locales. Faunex utilise ce ressort pour servir une cause sérieuse : **redonner envie d'observer le vivant**.

## Pour qui ?

- **Familles** — un prétexte parfait pour les balades du week-end.
- **Curieux urbains** — découvrir qu'il y a 30 espèces dans son quartier.
- **Naturalistes amateurs** — un journal photo facile à tenir.
- **Profs et animateurs** — un outil ludique pour les sorties scolaires.

## Et le côté social ?

Tu peux suivre d'autres **explorateurs**, voir leurs captures dans un fil d'actualité, comparer ton bestiaire à un ami. Sans réseau social toxique : pas de pub, pas de scroll infini, juste du contenu nature.

## Comment démarrer

L'app est gratuite, sans inscription par carte bancaire, sans publicité. Tu installes la PWA depuis ton navigateur (pas besoin d'app store), tu crées un compte en 30 secondes, et tu pars marcher.

> La meilleure capture de ta vie est probablement à 200 mètres de chez toi. Il manque juste l'outil pour la voir.
`,
  },
  {
    slug: 'reconnaissance-animaux-ia-famille',
    type: 'usecase',
    title: 'Une app IA pour reconnaître les animaux en famille',
    description:
      "Faunex est conçu pour les balades en famille : identification IA simple, pas de pub, collection ludique, données privées. Guide d'utilisation parent/enfant.",
    category: 'Famille',
    readingMinutes: 4,
    publishedAt: '2026-06-25',
    body: `# Une app IA pour reconnaître les animaux en famille

Sortir en forêt avec un enfant, c'est dix fois la même question : "C'est quoi cet oiseau ?", "Et celui-là ?". Si tu n'es pas naturaliste, tu réponds vite "un moineau" à tout. Une **app de reconnaissance d'animaux par IA** change radicalement l'expérience.

## Pourquoi une app spécialisée plutôt qu'un Google Images

Google Images marche pour identifier une photo nette d'un objet net. Pour un animal en mouvement, à 15 mètres, photographié au téléphone, les résultats sont décevants. Une app pensée pour la faune intègre :

- Un **modèle entraîné spécifiquement** sur des espèces sauvages
- Une **base d'animaux locaux** (la faune française, pas mondiale)
- Une **fiche pédagogique** adaptée à un enfant (habitat, régime, anecdote)

## Conçue pour les enfants, utile aux parents

Faunex est minimaliste exprès : un bouton "photo", une carte qui se révèle, un bestiaire qui se remplit. Pas de menu compliqué, pas de pub, pas de notifications agressives.

L'enfant joue avec un outil qui ressemble à un jeu de cartes ; les parents, eux, apprennent en silence à reconnaître la faune de leur région.

## 4 idées pour rendre la balade géniale

1. **Le défi du jour** — Choisir une espèce à attraper avant de partir (un oiseau bleu, un papillon orange).
2. **Le bingo nature** — Lister 5 animaux à croiser ; le premier qui complète gagne.
3. **La carte la plus rare** — Compter les points en fin de balade selon la rareté.
4. **Le bestiaire du quartier** — Construire en plusieurs sorties la "carte" de tout ce qui vit autour de chez vous.

## Côté sécurité et données

- Les comptes enfants n'ont **pas de réseau social agressif** : profils privés par défaut, pas d'inconnus.
- **Aucune publicité**, aucun pistage publicitaire.
- Les photos restent **privées** sauf si tu les partages explicitement.

## Pour commencer

L'installation se fait depuis le navigateur (PWA) — pas besoin d'app store. L'app fonctionne hors-ligne pour consulter le bestiaire déjà collecté.

> Un enfant qui connaît le nom des animaux ne les ignore plus. Et un adulte qui a réappris cinq oiseaux n'écoute plus jamais la forêt de la même façon.
`,
  },
];

export const guides = articles.filter((a) => a.type === 'guide');
export const useCases = articles.filter((a) => a.type === 'usecase');

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
