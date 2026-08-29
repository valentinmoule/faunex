import type { CollectionArt } from '@/lib/collectionArt';

/**
 * Ambiance chromatique d'une collection : l'illustration est reprise en très
 * léger flou derrière la page, complétée par un halo de la couleur dominante.
 * Purement décoratif, non interactif.
 */
const CollectionAmbience = ({ art }: { art: CollectionArt }) => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <img
      src={art.image}
      alt=""
      loading="lazy"
      className="absolute -top-10 left-0 w-full h-[42vh] object-cover blur-3xl scale-125 opacity-[0.14]"
    />
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(120% 55% at 50% 0%, hsl(${art.tint} / 0.16) 0%, hsl(${art.tint} / 0.06) 45%, transparent 78%)`,
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
  </div>
);

export default CollectionAmbience;
