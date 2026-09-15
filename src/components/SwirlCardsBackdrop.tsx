interface SwirlCard {
  photo: string;
  angle: number;
  tilt: number;
  tone: string;
}

const PHOTOS = ['/landing/reddeer.jpg', '/landing/bluetit.jpg', '/landing/squirrel.jpg', '/landing/ladybug.jpg'];

const TONES = ['--rarity-rare', '--rarity-illustration-rare', '--primary', '--rarity-very-rare'];

const buildRing = (count: number, offset = 0): SwirlCard[] =>
  Array.from({ length: count }, (_, i) => ({
    photo: PHOTOS[(i + offset) % PHOTOS.length],
    angle: (360 / count) * i + offset * 11,
    tilt: (i % 2 === 0 ? -1 : 1) * (8 + ((i * 7) % 14)),
    tone: TONES[(i + offset) % TONES.length],
  }));

const OUTER = buildRing(8, 0);
const INNER = buildRing(6, 1);

const Card = ({
  card,
  size,
  radius,
  blur,
  opacity,
}: {
  card: SwirlCard;
  size: string;
  radius: string;
  blur: string;
  opacity: number;
}) => (
  <div
    className="absolute left-1/2 top-1/2"
    style={{
      transform: `rotate(${card.angle}deg) translateY(calc(-1 * ${radius})) rotate(${-card.angle + card.tilt}deg)`,
    }}
  >
    <div
      className="relative aspect-[4/5] rounded-xl overflow-hidden border border-border/40 shadow-[0_16px_36px_-20px_hsl(var(--foreground)/0.45)]"
      style={{
        width: size,
        marginLeft: `calc(-1 * ${size} / 2)`,
        filter: blur === '0px' ? undefined : `blur(${blur})`,
        opacity,
      }}
    >
      <img src={card.photo} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <span
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, hsl(var(${card.tone}) / 0.28), transparent 55%)` }}
      />
      <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,hsl(0_0%_100%/0.28)_50%,transparent_62%)]" />
      <span className="absolute inset-0 rounded-xl" style={{ boxShadow: `inset 0 0 0 1px hsl(var(${card.tone}) / 0.45)` }} />
    </div>
  </div>
);

export const SwirlCardsBackdrop = () => (
  <div className="swirl-stage pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute left-1/2 top-1/2 h-[130vw] w-[130vw] -translate-x-1/2 -translate-y-1/2">
      <div className="swirl-ring" style={{ ['--swirl-duration' as string]: '64s' }}>
        {OUTER.map((card, i) => (
          <Card key={`o-${i}`} card={card} size="5.6rem" radius="42vw" blur="0px" opacity={0.95} />
        ))}
      </div>
      <div className="swirl-ring swirl-ring-rev" style={{ ['--swirl-duration' as string]: '42s' }}>
        {INNER.map((card, i) => (
          <Card key={`i-${i}`} card={card} size="3.4rem" radius="22vw" blur="3px" opacity={0.55} />
        ))}
      </div>
    </div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background))_18%,hsl(var(--background)/0.82)_42%,transparent_78%)]" />
  </div>
);

export default SwirlCardsBackdrop;
