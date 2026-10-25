/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface ParticleTrailProps {
  angle: number; // current angle in degrees
  isActive: boolean;
  centerRadius?: number; // distance of needle tip from center
  width?: number;
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

export const ParticleTrail: React.FC<ParticleTrailProps> = ({
  angle,
  isActive,
  centerRadius = 220,
  width = 600,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastAngleRef = useRef<number>(angle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Spawn particles when active and angle is changing
      if (isActive && Math.abs(angle - lastAngleRef.current) > 0.05) {
        const cx = width / 2;
        const cy = height / 2;

        // Needle tip position
        const rad = ((angle - 90) * Math.PI) / 180;
        const tipX = cx + centerRadius * Math.cos(rad);
        const tipY = cy + centerRadius * Math.sin(rad);

        // Also spawn a few along the needle body (e.g., at 0.6 and 0.85 radius)
        const count = 3;
        for (let i = 0; i < count; i++) {
          const rOffset = centerRadius * (0.5 + Math.random() * 0.5);
          const px = cx + rOffset * Math.cos(rad) + (Math.random() - 0.5) * 8;
          const py = cy + rOffset * Math.sin(rad) + (Math.random() - 0.5) * 8;

          // Tangential velocity opposing movement direction
          const tangAngle = rad + Math.PI / 2;
          const speed = (Math.random() * 0.8 + 0.2) * -1;

          particlesRef.current.push({
            x: px,
            y: py,
            vx: Math.cos(tangAngle) * speed + (Math.random() - 0.5) * 0.5,
            vy: Math.sin(tangAngle) * speed + (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2.2 + 0.8,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02,
            color: Math.random() > 0.3 ? '#FFA500' : '#FFD700',
          });
        }
      }
      lastAngleRef.current = angle;

      // Update and draw existing particles
      const remaining: Particle[] = [];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#FF6A00';
          ctx.fill();
          remaining.push(p);
        }
      }

      ctx.restore();
      particlesRef.current = remaining;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [angle, isActive, centerRadius, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
};
