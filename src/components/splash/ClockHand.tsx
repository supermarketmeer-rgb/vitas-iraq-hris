/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ClockHandProps {
  angle: number; // in degrees (0 = 12 o'clock, clockwise)
  radius?: number; // length of the hand in pixels
  opacity?: number;
  showTrail?: boolean;
  scale?: number;
}

export const ClockHand: React.FC<ClockHandProps> = ({
  angle,
  radius = 210,
  opacity = 1,
  scale = 1,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-500"
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Clock Hand Assembly rotating around center pivot */}
      <div
        className="absolute w-0 h-0"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0px 0px',
        }}
      >
        {/* Glow halo along the hand */}
        <div
          className="absolute -left-3 top-[-220px] w-6 h-[220px] pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(255,106,0,0.4) 0%, rgba(255,160,0,0.8) 70%, rgba(255,230,120,1) 100%)',
            filter: 'blur(8px)',
            opacity: 0.7,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          }}
        />

        {/* 3D Tapered Needle Body */}
        <svg
          className="absolute -left-4 -top-[225px] overflow-visible"
          width="32"
          height="230"
          viewBox="0 0 32 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dark metallic left facet */}
            <linearGradient id="metallicLightFacet" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1F2937" />
            </linearGradient>

            {/* Dark metallic right facet */}
            <linearGradient id="metallicDarkFacet" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="60%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0B0F17" />
            </linearGradient>

            {/* Neon orange luminous spine */}
            <linearGradient id="orangeSpineGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#F97316" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#FB923C" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFEDD5" stopOpacity="1" />
            </linearGradient>

            {/* Tip glow filter */}
            <filter id="handTipGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Left Facet */}
          <path
            d="M 16 0 L 16 220 L 7 215 L 12 40 Z"
            fill="url(#metallicLightFacet)"
          />

          {/* Right Facet */}
          <path
            d="M 16 0 L 25 40 L 20 215 L 16 220 Z"
            fill="url(#metallicDarkFacet)"
          />

          {/* Central Luminous Orange Spine */}
          <path
            d="M 16 0 L 17.5 210 L 14.5 210 Z"
            fill="url(#orangeSpineGrad)"
          />

          {/* Glowing Sharp Tip (The Drawing Stylus) */}
          <circle
            cx="16"
            cy="2"
            r="3.5"
            fill="#FFF7ED"
            filter="url(#handTipGlow)"
          />
          <circle
            cx="16"
            cy="2"
            r="1.8"
            fill="#FFFFFF"
          />

          {/* Counterbalance tail at base */}
          <path
            d="M 14 220 L 18 220 L 19 235 L 13 235 Z"
            fill="#1E232E"
          />
        </svg>

        {/* Luminous Drawing Laser Flare at tip */}
        <div
          className="absolute -left-3 -top-[235px] w-6 h-6 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,170,50,0.9) 35%, rgba(255,90,0,0.4) 70%, transparent 100%)',
            boxShadow: '0 0 16px 4px rgba(255,115,0,0.9), 0 0 32px 8px rgba(255,70,0,0.5)',
            transform: 'scale(1.1)',
          }}
        />
      </div>

      {/* Central 3D Pivot Knob */}
      <div className="relative w-12 h-12 rounded-full flex items-center justify-center pointer-events-none">
        {/* Outer dark beveled ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #2A2E39, #151820)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.9)',
          }}
        />

        {/* Glowing Orange Ring Channel */}
        <div
          className="absolute w-8 h-8 rounded-full border-2 border-orange-500/90"
          style={{
            boxShadow: '0 0 12px rgba(249,115,22,0.85), inset 0 0 8px rgba(249,115,22,0.6)',
          }}
        />

        {/* Inner Hub with Specular Gleam */}
        <div
          className="relative w-5 h-5 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #4B5563 0%, #1F2937 60%, #111827 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.7)',
          }}
        >
          {/* Specular dot */}
          <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
};
