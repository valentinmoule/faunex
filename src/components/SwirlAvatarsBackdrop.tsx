interface SwirlAvatar {
  initials: string;
  name: string;
  level: number;
  angle: number;
  tilt: number;
  tone: string;
}

const EXPLORERS = [
  { initials: 'LM', name: '@lucie', level: 12 },
  { initials: 'TR', name: '@theo', level: 7 },
  { initials: 'AB', name: '@amine', level: 21 },
  { initials: 'SJ', name: '@sofia', level: 5 },
  { initials: 'NK', name: '@noah', level: 16 },
  { initials: 'EC', name: '@emma', level: 9 },
];

const TONES = ['--rarity-rare', '--rarity-illustration-rare', '--primary', '--rarity-very-rare'];

const buildRing = (count: number, offset = 0): SwirlAvatar[] =>
  Array.from({ length: count }, (_, i) => {
    const explorer = EXPLORERS[(i + offset) % EXPLORERS.length];
    return {
      ...explorer,
      angle: (360 / count) * i + offset * 13,
      tilt: (i % 2 === 0 ? -1 : 1) * (5 + ((i * 5) % 9)),
      tone: TONES[(i + offset) % TONES.length],
    };
  });

const OUTER = buildRing(9, 0);
const INNER = buildRing(6, 1);

const Avatar = ({
  avatar,
  size,
  radius,
  blur,
  opacity,
  showName,
}: {
  avatar: SwirlAvatar;
  size: string;
  radius: string;
  blur: string;
  opacity: number;
  showName: boolean;
}) => (
  <div
    className="absolute left-1/2 top-1/2"
    style={{
      transform: `rotate(${avatar.angle}deg) translateY(calc(-1 * ${radius})) rotate(${-avatar.angle + avatar.tilt}deg)`,
    }}
  >
    <div
      className="relative flex flex-col items-center"
      style={{
        width: size,
        marginLeft: `calc(-1 * ${size} / 2)`,
        marginTop: `calc(-1 * ${size} / 2)`,
        filter: blur === '0px' ? undefined : `blur(${blur})`,
        opacity,
      }}
    >
      <div
        className="relative rounded-full flex items-center justify-center bg-card"
        style={{
          width: size,
          height: size,
          boxShadow: `inset 0 0 0 2px hsl(var(${avatar.tone}) / 0.5), 0 18px 38px -20px hsl(var(--foreground) / 0.45)`,
          background: `linear-gradient(150deg, hsl(var(${avatar.tone}) / 0.28), hsl(var(--card)) 62%)`,
        }}
      >
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: `calc(${size} * 0.34)`, color: `hsl(var(${avatar.tone}))` }}
        >
          {avatar.initials}
        </span>
        {showName && (
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-[2px] font-display text-[0.5rem] font-bold leading-none text-white"
            style={{ background: `hsl(var(${avatar.tone}))` }}
          >
            {avatar.level}
          </span>
        )}
      </div>
      {showName && (
        <span className="mt-2 font-body text-[0.55rem] font-semibold text-muted-foreground truncate max-w-full">
          {avatar.name}
        </span>
      )}
    </div>
  </div>
);

/** Orbites infinies de faux explorateurs — décor de l'état vide du fil Explorateurs. */
export const SwirlAvatarsBackdrop = () => (
  <div className="swirl-stage pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    <div className="absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2">
      <div className="swirl-ring" style={{ ['--swirl-duration' as string]: '74s' }}>
        {OUTER.map((avatar, i) => (
          <Avatar key={`o-${i}`} avatar={avatar} size="4.4rem" radius="46vmax" blur="0px" opacity={1} showName />
        ))}
      </div>
      <div className="swirl-ring swirl-ring-rev" style={{ ['--swirl-duration' as string]: '50s' }}>
        {INNER.map((avatar, i) => (
          <Avatar key={`i-${i}`} avatar={avatar} size="3rem" radius="26vmax" blur="3.5px" opacity={0.5} showName={false} />
        ))}
      </div>
    </div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background))_16%,hsl(var(--background)/0.86)_40%,hsl(var(--background)/0.35)_70%,transparent_100%)]" />
  </div>
);

export default SwirlAvatarsBackdrop;
