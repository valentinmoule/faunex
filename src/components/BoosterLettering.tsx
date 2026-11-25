import { useEffect, useId, useRef } from 'react';

/** Printed artwork stays separate from the photo so titles remain bilingual. */
export default function BoosterLettering({ title, image }: { title: string; image: string }) {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const theme = image.match(/boosters-modern(?:%2F|\/)([a-z]+)(?:-v\d+)?\./i)?.[1] ?? 'advent';
  const words = title.trim().split(/\s+/);
  const split = words.length > 2 ? words.length - 2 : Math.max(1, words.length - 1);
  const top = words.slice(0, split).join(' ');
  const main = words.slice(split).join(' ') || top;
  const fontSize = Math.min(45, 255 / Math.max(main.length * .65, 1));
  const metal = ['nuit', 'sommets', 'polaire', 'rivages', 'mares', 'ciel'].includes(theme) ? 'silver' : 'gold';
  useEffect(() => {
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      svgRef.current?.querySelectorAll('text').forEach(text => {
        text.removeAttribute('textLength');
        const width = text.getComputedTextLength();
        if (width > 254) {
          text.setAttribute('textLength', '254');
          text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        }
      });
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => { cancelled = true; };
  }, [title, theme]);

  return (
    <svg ref={svgRef} className={`booster-lettering booster-lettering--${metal} !h-auto !w-full booster-lettering--${theme}`} viewBox="0 0 300 140" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" className="booster-lettering-highlight" />
          <stop offset="0.45" className="booster-lettering-paper" />
          <stop offset="1" className="booster-lettering-accent" />
        </linearGradient>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="foil-a" />
          <stop offset="0.38" className="foil-b" />
          <stop offset="0.52" className="foil-c" />
          <stop offset="0.7" className="foil-d" />
          <stop offset="1" className="foil-e" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopOpacity="0" className="foil-a" />
          <stop offset="0.5" stopOpacity="0.95" className="foil-a" />
          <stop offset="1" stopOpacity="0" className="foil-a" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <text x="150" y="94" textAnchor="middle" className="booster-lettering-main" fontSize={fontSize}>{main}</text>
        </clipPath>
      </defs>
      <g className="booster-lettering-type" textAnchor="middle">
        <text x="150" y="49" className="booster-lettering-kicker" fontSize={Math.min(19, 240 / Math.max(top.length * .65, 1))}>{words.length > 1 ? top : ''}</text>
        <text x="150" y="94" className="booster-lettering-main" fontSize={fontSize} fill={`url(#${id}-foil)`}>{main}</text>
      </g>
      <g clipPath={`url(#${id}-clip)`} aria-hidden="true">
        <rect className="booster-lettering-shine" x="-60" y="40" width="70" height="70" fill={`url(#${id}-shine)`} />
      </g>
    </svg>
  );
}