// @/components/animations/FireworksAnimation.tsx
"use client";

import type { FC } from 'react';
import { useEffect, useState } from 'react';

const NUM_PARTICLES = 15;

interface ParticleStyle extends React.CSSProperties {
  '--tx': string;
  '--ty': string;
  animationDelay: string;
}

export const FireworksAnimation: FC = () => {
  const [particles, setParticles] = useState<ParticleStyle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: NUM_PARTICLES }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 100 + 50; // Spread radius
      return {
        '--tx': `${Math.cos(angle) * radius}px`,
        '--ty': `${Math.sin(angle) * radius}px`,
        left: '50%',
        top: '50%',
        animationDelay: `${Math.random() * 0.3}s`,
      } as ParticleStyle;
    });
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
      <div className="relative w-1 h-1">
        {particles.map((style, index) => (
          <div key={index} className="particle" style={style} />
        ))}
      </div>
    </div>
  );
};
