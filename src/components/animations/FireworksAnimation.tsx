
// @/components/animations/FireworksAnimation.tsx
"use client";

import type { FC } from 'react';
import { useEffect, useState } from 'react';

const NUM_PARTICLES = 40; // Increased number of particles
const fireworkColors = [
  'hsl(var(--primary))',   // Cheerful sky blue
  'hsl(var(--accent))',    // Playful lime green
  'hsl(0, 100%, 70%)',   // Bright Red
  'hsl(45, 100%, 70%)',  // Bright Yellow/Orange
  'hsl(300, 100%, 70%)', // Bright Pink/Purple
  'hsl(180, 100%, 70%)', // Bright Cyan
];

interface ParticleStyle extends React.CSSProperties {
  '--tx': string;
  '--ty': string;
  animationDelay: string;
  backgroundColor: string;
  width: string;
  height: string;
}

export const FireworksAnimation: FC = () => {
  const [particles, setParticles] = useState<ParticleStyle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: NUM_PARTICLES }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 200 + 100; // Increased spread radius (100px to 300px)
      const size = Math.random() * 8 + 8; // Particle size between 8px and 16px
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];

      return {
        '--tx': `${Math.cos(angle) * radius}px`,
        '--ty': `${Math.sin(angle) * radius}px`,
        left: '50%',
        top: '50%',
        animationDelay: `${Math.random() * 0.4}s`, // Slightly longer delay spread
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
      } as ParticleStyle;
    });
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
      <div className="relative w-1 h-1"> {/* Container for positioning particles */}
        {particles.map((style, index) => (
          <div 
            key={index} 
            className="particle" // Base class for animation, opacity, border-radius
            style={style} // Inline styles for position, color, size, delay
          />
        ))}
      </div>
    </div>
  );
};
