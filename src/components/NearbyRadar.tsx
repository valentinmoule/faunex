import { useEffect, useState } from 'react';
import { Rarity, RARITY_LABELS } from '@/data/mockData';

interface RadarAnimal {
  name: string;
  rarity: Rarity;
  category: string;
}

const rarityColor: Record<string, string> = {
  common: 'hsl(0, 0%, 60%)',
  rare: 'hsl(210, 70%, 55%)',
  uncommon: 'hsl(222, 12%, 38%)',
  very_rare: 'hsl(230, 20%, 16%)',
  ultra_rare: 'hsl(220, 18%, 62%)',
  illustration_rare: 'hsl(43, 92%, 55%)',
  special_rare: 'hsl(40, 95%, 50%)',
  hyper_rare: 'hsl(36, 98%, 46%)',
};

const rarityPulse: Record<string, string> = {
  common: '',
  rare: 'radar-dot-pulse-rare',
  ultra_rare: 'radar-dot-pulse-silver',
  illustration_rare: 'radar-dot-pulse-gold',
  special_rare: 'radar-dot-pulse-gold',
  hyper_rare: 'radar-dot-pulse-gold',
};

// Generate a pseudo-random but stable angle/distance from animal name
const hashAnimal = (name: string, seed: number): number => {
  let hash = seed;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const directionLabel = (angle: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const idx = Math.round(angle / 45) % 8;
  return dirs[idx];
};

interface Props {
  animals: RadarAnimal[];
}

const NearbyRadar = ({ animals }: Props) => {
  const [sweep, setSweep] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Compute stable positions for each animal
  const positions = animals.map((a, i) => {
    const h = hashAnimal(a.name, i * 7 + 13);
    const angle = (h % 360);
    const distance = 0.3 + (((h >> 4) % 50) / 100); // 0.3 to 0.8 radius
    return { angle, distance, direction: directionLabel(angle) };
  });

  // Animate sweep
  useEffect(() => {
    const interval = setInterval(() => {
      setSweep(prev => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Reveal dots when sweep passes their angle
  useEffect(() => {
    positions.forEach((pos, i) => {
      const diff = Math.abs(sweep - pos.angle);
      if (diff < 10 || diff > 350) {
        setRevealed(prev => new Set(prev).add(i));
      }
    });
  }, [sweep]);

  const size = 160;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      {/* Radar circle */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background rings */}
        <svg width={size} height={size} className="absolute inset-0">
          <circle cx={center} cy={center} r={center - 4} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.1" strokeWidth="1" />
          <circle cx={center} cy={center} r={(center - 4) * 0.66} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.08" strokeWidth="0.5" />
          <circle cx={center} cy={center} r={(center - 4) * 0.33} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="0.5" />
          {/* Cross lines */}
          <line x1={center} y1={4} x2={center} y2={size - 4} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="0.5" />
          <line x1={4} y1={center} x2={size - 4} y2={center} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="0.5" />
        </svg>

        {/* Sweep line */}
        <div
          className="absolute inset-0 origin-center"
          style={{ transform: `rotate(${sweep}deg)` }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-bottom-left"
            style={{
              width: center - 4,
              height: 2,
              transform: 'translateY(-1px)',
              background: `linear-gradient(90deg, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0))`,
            }}
          />
        </div>

        {/* Sweep trail (conic gradient) */}
        <div
          className="absolute inset-1 rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from ${sweep - 30}deg at 50% 50%, transparent 0deg, hsl(var(--primary) / 0.08) 20deg, transparent 30deg)`,
          }}
        />

        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />

        {/* Cardinal labels */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-display font-bold text-muted-foreground">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-display font-bold text-muted-foreground">S</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-display font-bold text-muted-foreground">O</span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-display font-bold text-muted-foreground">E</span>

        {/* Animal dots */}
        {animals.map((animal, i) => {
          const pos = positions[i];
          const isRevealed = revealed.has(i);
          const r = (center - 12) * pos.distance;
          const rad = (pos.angle - 90) * (Math.PI / 180);
          const x = center + r * Math.cos(rad);
          const y = center + r * Math.sin(rad);
          const color = rarityColor[animal.rarity] || rarityColor.common;

          return (
            <div
              key={i}
              className={`absolute transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} ${rarityPulse[animal.rarity] || ''}`}
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) ${isRevealed ? 'scale(1)' : 'scale(0)'}`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}, 0 0 16px ${color}40`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {animals.map((animal, i) => {
          const pos = positions[i];
          const color = rarityColor[animal.rarity] || rarityColor.common;
          const isRevealed = revealed.has(i);
          return (
            <div
              key={i}
              className={`flex items-center gap-1.5 transition-all duration-500 ${isRevealed ? 'opacity-100' : 'opacity-30'}`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-display text-foreground/80">{animal.name}</span>
              <span className="text-[9px] font-display text-muted-foreground">~{pos.direction}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NearbyRadar;
