import { BookOpen, ChevronRight, Bird, Bug, TreePine, CloudRain, Baby, Sunrise } from 'lucide-react';

interface Guide {
  icon: typeof BookOpen;
  title: string;
  description: string;
  species: string[];
  difficulty: 'facile' | 'moyen' | 'difficile';
}

const guides: Guide[] = [
  {
    icon: Bird,
    title: 'Observer les oiseaux en ville',
    description: 'Les meilleures techniques pour repérer et identifier les oiseaux urbains depuis ton balcon ou un parc.',
    species: ['Moineau domestique', 'Pigeon ramier', 'Merle noir'],
    difficulty: 'facile',
  },
  {
    icon: CloudRain,
    title: 'Trouver des animaux après la pluie',
    description: 'Pourquoi la pluie fait sortir certaines espèces et comment en profiter pour observer.',
    species: ['Escargot de Bourgogne', 'Salamandre tachetée', 'Crapaud commun'],
    difficulty: 'facile',
  },
  {
    icon: TreePine,
    title: 'Sortie nature en forêt',
    description: 'Guide complet pour une balade en forêt : que chercher, où regarder, quand y aller.',
    species: ['Chevreuil', 'Pic épeiche', 'Écureuil roux'],
    difficulty: 'moyen',
  },
  {
    icon: Baby,
    title: 'Sortie nature avec enfants',
    description: 'Activités adaptées et espèces faciles à repérer pour initier les plus jeunes.',
    species: ['Coccinelle', 'Canard colvert', 'Papillon citron'],
    difficulty: 'facile',
  },
  {
    icon: Sunrise,
    title: "L'aube : le moment idéal",
    description: "Pourquoi se lever tôt multiplie tes chances de découvrir des espèces rares.",
    species: ['Renard roux', 'Biche', 'Chouette hulotte'],
    difficulty: 'difficile',
  },
  {
    icon: Bug,
    title: 'Le monde des insectes',
    description: 'Macro-observation : comment voir ce qui est trop petit pour être remarqué.',
    species: ['Libellule', 'Mante religieuse', 'Lucane cerf-volant'],
    difficulty: 'moyen',
  },
];

const difficultyColor: Record<string, string> = {
  facile: 'bg-rarity-common/15 text-rarity-common',
  moyen: 'bg-rarity-rare/15 text-rarity-rare',
  difficile: 'bg-rarity-epic/15 text-rarity-epic',
};

const BestiaireGuidesTab = () => {
  return (
    <div className="px-4 pt-3 space-y-3">
      {guides.map((guide, i) => {
        const Icon = guide.icon;
        return (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-display font-bold text-foreground truncate">{guide.title}</h3>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-display font-bold uppercase shrink-0 ${difficultyColor[guide.difficulty]}`}>
                    {guide.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{guide.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {guide.species.map((s, j) => (
                  <span key={j} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-display text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 ml-2" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BestiaireGuidesTab;
