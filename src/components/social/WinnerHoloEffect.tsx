import "@/styles/winner-holo.css";
import prismAsset from "@/assets/effects/faunex-winner-prism.png.asset.json";

/**
 * Calque visuel de la carte primée ✦ W.
 * À insérer DANS la carte existante, APRÈS la photo et AVANT l'UI.
 * Ne crée aucun événement : Faunex conserve son interaction actuelle.
 * Le conteneur existant doit avoir position:relative, overflow:hidden,
 * isolation:isolate et border-radius correspondant à la carte.
 */
export function WinnerHoloEffect() {
  return (
    <div className="faunex-winner-holo" aria-hidden="true">
      <img
        className="faunex-winner-holo__prism"
        src={prismAsset.url}
        alt=""
        draggable={false}
      />
      <span className="faunex-winner-holo__glass-arc" />
      <span className="faunex-winner-holo__glass-edge" />
      <span className="faunex-winner-holo__microfoil" />
      <span className="faunex-winner-holo__rim" />
    </div>
  );
}
