

## Plan : Poignée sans background séparé

**Problème** : La poignée du Drawer a un conteneur avec le background par défaut (`bg-background`) du `Drawer.Content`, ce qui crée une bande blanche visible entre le haut de la modal et le header coloré de l'animal.

**Solution** : Rendre le `Drawer.Content` transparent en arrière-plan et positionner la poignée en absolu par-dessus le contenu du header, pour que le gradient de rareté remonte jusqu'au bord arrondi de la modal.

### Modifications dans `src/components/CardDetailSheet.tsx`

1. **Retirer `bg-background` du `Drawer.Content`** et le déplacer sur le conteneur scrollable interne, après le header.
2. **Positionner la poignée en `absolute`** au-dessus du contenu avec `z-10`, pour qu'elle flotte sur le header sans conteneur opaque.
3. **Retirer le `-mt-12`** du hero section (qui compensait l'espace de la poignée) et ajuster le padding top du conteneur scrollable pour laisser la place à la poignée.

Structure résultante :
```text
Drawer.Content (bg transparent, rounded-t-3xl, overflow-hidden)
├── poignée (absolute top-3, z-10, bg-white/30)
└── div scrollable (h-full, overflow-y-auto)
    ├── bouton close (sticky)
    ├── hero section (gradient rareté, remonte jusqu'en haut)
    └── reste du contenu (bg-background)
```

