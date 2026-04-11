import { useState, useEffect } from 'react';

interface Particle {
  id: number;
  x: number;
  delay: number;
  size: number;
  duration: number;
}

interface XpParticlesProps {
  active: boolean;
  count?: number;
  onComplete?: () => void;
}

const XpParticles = ({ active, count = 18, onComplete }: XpParticlesProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      size: 6 + Math.random() * 8,
      duration: 0.6 + Math.random() * 0.4,
    }));
    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1200);

    return () => clearTimeout(timeout);
  }, [active, count, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute xp-particle"
          style={{
            left: `${p.x}%`,
            bottom: '20%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          <div
            className="rounded-full bg-gradient-to-t from-amber to-amber-light flex items-center justify-center font-display font-black text-background shadow-[0_0_8px_hsla(42,85%,55%,0.6)]"
            style={{
              width: `${p.size * 2}px`,
              height: `${p.size * 2}px`,
              fontSize: `${p.size * 0.7}px`,
            }}
          >
            XP
          </div>
        </div>
      ))}
    </div>
  );
};

export default XpParticles;
