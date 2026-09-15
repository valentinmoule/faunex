interface SwirlCard {
  photo: string;
  name: string;
  angle: number;
  tilt: number;
  tone: string;
}

const SPECIES = [
  { photo: '/landing/reddeer.jpg', name: 'Cerf élaphe' },
  { photo: '/landing/bluetit.jpg', name: 'Mésange bleue' },
  { photo: '/landing/squirrel.jpg', name: 'Écureuil roux' },
  { photo: '/landing/ladybug.jpg', name: 'Coccinelle' },
];

const TONES = ['--rarity-rare', '--rarity-illustration-rare', '--primary', '--rarity-very-rare'];

const buildRing = (count: number, offset = 0): SwirlCard[] =>
  Array.from({ length: count }, (_, i) => {
    const species = SPECIES[(i + offset) % SPECIES.length];
    return {
      photo: species.photo,
      name: species.name,
      angle: (360 / count) * i + offset * 13,
      tilt: (i % 2 === 0 ? -1 : 1) * (7 + ((i * 7) % 12)),
      tone: TONES[(i + offset) % TONES.length],
    };
  });

const OUTER = buildRing(9, 0);
const INNER = buildRing(6, 1);

const Card = ({
  card,
  width,
  radius,
  blur,
  opacity,
  showName,
}: {
  card: SwirlCard;
  width: string;
  radius: string;
  blur: string;
  opacity: number;
  showName: boolean;
}) => (
  <div
    className="absolute left-1/2 top-1/2"
    style={{
      transform: `rotate(${card.angle}deg) translateY(calc(-1 * ${radius})) rotate(${-card.angle + card.tilt}deg)`,
    }}
  >
    <div
      className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card p-[3px] shadow-[0_20px_44px_-22px_hsl(var(--foreground)/0.5)]"
      style={{
        width,
        marginLeft: `calc(-1 * ${width} / 2)`,
        marginTop: `calc(-1 * ${width} * 0.625)`,
        filter: blur === '0px' ? undefined : `blur(${blur})`,
        opacity,
        boxShadow: `inset 0 0 0 1.5px hsl(var(${card.tone}) / 0.55), 0 20px 44px -22px hsl(var(--foreground) / 0.45)`,
      }}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        <img
          src={card.photo}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <span
          className="absolute inset-0"
          style={{ background: `linear-gradient(165deg, hsl(var(${card.tone}) / 0.22), transparent 50%)` }}
        />
        <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,hsl(0_0%_100%/0.26)_50%,transparent_62%)]" />
        {showName && (
          <>
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-2 flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: `hsl(var(${card.tone}))` }}
              />
              <span className="font-display text-[0.55rem] font-semibold leading-tight text-white/95 truncate">
                {card.name}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  </div>
);

export const SwirlCardsBackdrop = () => (
  <div className="swirl-stage pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    <div className="absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2">
      <div className="swirl-ring" style={{ ['--swirl-duration' as string]: '70s' }}>
        {OUTER.map((card, i) => (
          <Card key={`o-${i}`} card={card} width="7.5rem" radius="46vmax" blur="0px" opacity={1} showName />
        ))}
      </div>
      <div className="swirl-ring swirl-ring-rev" style={{ ['--swirl-duration' as string]: '48s' }}>
        {INNER.map((card, i) => (
          <Card key={`i-${i}`} card={card} width="4.6rem" radius="26vmax" blur="3.5px" opacity={0.5} showName={false} />
        ))}
      </div>
    </div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background))_16%,hsl(var(--background)/0.86)_40%,hsl(var(--background)/0.35)_70%,transparent_100%)]" />
  </div>
);

export default SwirlCardsBackdrop;
