
// @/components/animations/FireworksAnimation.tsx
"use client";

import type { FC } from 'react';
import { useEffect, useState } from 'react';

const NUM_PARTICLES = 180; // Increased number of particles
const fireworkColors = [
  'hsl(var(--primary))',   // Cheerful sky blue
  'hsl(var(--accent))',    // Playful lime green
  'hsl(0, 100%, 70%)',   // Bright Red
  'hsl(45, 100%, 70%)',  // Bright Yellow
  'hsl(300, 100%, 70%)', // Bright Pink/Purple
  'hsl(180, 100%, 70%)', // Bright Cyan
  'hsl(30, 100%, 65%)',  // Orange
  'hsl(240, 100%, 75%)', // Indigo
  'hsl(120, 100%, 60%)', // Green
  'hsl(60, 100%, 50%)',  // Yellow
  'hsl(330, 100%, 70%)', // Hot Pink
  'hsl(200, 100%, 60%)', // Azure
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
      // Increased spread radius (250px to 750px from center)
      const radius = Math.random() * 500 + 250; 
      // Particle size between 12px and 27px
      const size = Math.random() * 15 + 12; 
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];

      return {
        '--tx': `${Math.cos(angle) * radius}px`,
        '--ty': `${Math.sin(angle) * radius}px`,
        left: '50%', // Particles originate from the center of their relative container
        top: '50%',
        animationDelay: `${Math.random() * 0.6}s`, // Slightly longer delay spread for more visual effect
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
      } as ParticleStyle;
    });
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
      <div className="relative w-1 h-1"> {/* Container for positioning particles relative to screen center */}
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
