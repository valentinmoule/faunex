import { useEffect, useId, useRef } from 'react';

/** Printed artwork stays separate from the photo so titles remain bilingual. */
export default function BoosterLettering({ title, image }: { title: string; image: string }) {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const theme = image.match(/boosters-modern(?:%2F|\/)([a-z]+)\./i)?.[1] ?? 'advent';
  const words = title.trim().split(/\s+/);
  const split = words.length > 2 ? words.length - 2 : Math.max(1, words.length - 1);
  const top = words.slice(0, split).join(' ');
  const main = words.slice(split).join(' ') || top;
  const fontSize = Math.min(45, 255 / Math.max(main.length * .65, 1));
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
    <svg ref={svgRef} className={`booster-lettering !h-auto !w-full booster-lettering--${theme}`} viewBox="0 0 300 140" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" className="booster-lettering-highlight" />
          <stop offset="0.45" className="booster-lettering-paper" />
          <stop offset="1" className="booster-lettering-accent" />
        </linearGradient>
      </defs>
      <g className="booster-lettering-motif" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {['jardin', 'foret', 'jungle'].includes(theme) ? <>
          <path d="M22 106Q40 85 48 62M27 98Q8 82 17 74Q31 75 34 88M38 83Q60 81 59 67Q45 63 38 83M278 106Q260 85 252 62M273 98Q292 82 283 74Q269 75 266 88M262 83Q240 81 241 67Q255 63 262 83" />
        </> : ['mares', 'rivages', 'recifs'].includes(theme) ? <>
          <path d="M30 112Q45 102 60 112T90 112M210 112Q225 102 240 112T270 112M58 120Q70 114 82 120M218 120Q230 114 242 120" />
          <circle cx="24" cy="70" r="3" /><circle cx="276" cy="63" r="4" />
        </> : ['ciel', 'sommets', 'polaire'].includes(theme) ? <>
          <path d="M28 111L48 94L67 111M233 111L252 94L272 111M140 116L150 104L160 116M150 10V22M144 16H156" />
        </> : theme === 'papillons' ? <>
          <path d="M30 90Q8 55 27 60Q40 67 32 88Q58 64 56 84Q52 103 32 92M270 90Q292 55 273 60Q260 67 268 88Q242 64 244 84Q248 103 268 92" />
        </> : theme === 'savane' ? <>
          <path d="M126 115H174M136 115A14 14 0 0 1 164 115M150 91V86M129 98L125 94M171 98L175 94" />
        </> : <>
          <path d="M26 64L29 73L38 76L29 79L26 88L23 79L14 76L23 73ZM272 86L275 95L284 98L275 101L272 110L269 101L260 98L269 95Z" />
          {theme === 'nuit' && <path d="M150 8A10 10 0 1 0 162 24A11 11 0 0 1 150 8Z" />}
        </>}
      </g>
      <g className="booster-lettering-type" textAnchor="middle">
        <text x="150" y="49" className="booster-lettering-kicker" fontSize={Math.min(19, 240 / Math.max(top.length * .65, 1))}>{words.length > 1 ? top : ''}</text>
        <text x="150" y="94" className="booster-lettering-main" fontSize={fontSize} fill={`url(#${id}-ink)`}>{main}</text>
      </g>
    </svg>
  );
}