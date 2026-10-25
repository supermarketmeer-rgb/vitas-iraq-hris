/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useId } from 'react';
import { ClockHand } from './ClockHand';
import { ParticleTrail } from './ParticleTrail';
import { soundSynth } from '../../utils/audio';
import splashLogo from '../../../assets/meerson_splash_logo_transparent.png';
import meersonWatermark from '../../../assets/meerson_logo_transparent.png';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number; // total duration in ms (default 3800ms)
  holdTime?: number; // hold completed logo in ms (default 1800ms)
  isInteractivePreview?: boolean; // if used inside the showcase modal
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  duration = 3800,
  holdTime = 1800,
  isInteractivePreview = false,
}) => {
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const [phase, setPhase] = useState<'idle' | 'drawing' | 'completed' | 'exiting'>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [handOpacity, setHandOpacity] = useState<number>(1);
  const [logoGlow, setLogoGlow] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const maskId = useId();
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef<number>(0);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches && !isInteractivePreview) {
        // Immediate reveal if user explicitly requested reduced motion
        setProgress(1);
        setPhase('completed');
        exitTimeoutRef.current = setTimeout(() => {
          onFinish();
        }, 1200);
      }
    }
  }, [isInteractivePreview, onFinish]);

  // Main Animation Loop
  const startAnimation = () => {
    // Cancel existing timers/frames
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

    setProgress(0);
    setPhase('drawing');
    setHandOpacity(1);
    setLogoGlow(false);
    startTimeRef.current = null;
    lastTickAngleRef.current = 0;

    const actualDuration = duration / speedMultiplier;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const rawLinear = Math.min(1, elapsed / actualDuration);

      // Natural cubic ease-in-out curve
      const eased =
        rawLinear < 0.5
          ? 2 * rawLinear * rawLinear
          : 1 - Math.pow(-2 * rawLinear + 2, 2) / 2;

      setProgress(eased);

      // Trigger micro sound tick every 30 degrees
      const currentAngle = eased * 360;
      if (currentAngle - lastTickAngleRef.current >= 30) {
        lastTickAngleRef.current = currentAngle;
        soundSynth.playTick();
      }

      if (rawLinear < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        // Animation completed
        setProgress(1);
        setPhase('completed');
        setLogoGlow(true);
        soundSynth.playCompleteChime();

        // Smoothly fade out the clock hand
        setHandOpacity(0);

        if (!isInteractivePreview) {
          // Hold completed logo visible for ~1.8 seconds before transition
          exitTimeoutRef.current = setTimeout(() => {
            setPhase('exiting');
            exitTimeoutRef.current = setTimeout(() => {
              onFinish();
            }, 600); // fade out duration
          }, holdTime);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    startAnimation();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [speedMultiplier]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundSynth.enabled = next;
    if (next) soundSynth.playTick();
  };

  const handleSkip = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    setProgress(1);
    setPhase('exiting');
    setTimeout(() => {
      onFinish();
    }, 250);
  };

  // SVG Mask Calculations
  // ViewBox is 600x600, Center is (300, 300)
  const cx = 300;
  const cy = 300;
  const radius = 380; // large enough to cover the square logo corners

  const currentAngle = progress * 360; // in degrees (0 to 360)
  const rad = ((currentAngle - 90) * Math.PI) / 180;
  const x2 = cx + radius * Math.cos(rad);
  const y2 = cy + radius * Math.sin(rad);
  const largeArcFlag = currentAngle > 180 ? 1 : 0;

  // Mask path: wedge from 12 o'clock (0 deg) clockwise to currentAngle
  let sectorPath = '';
  if (progress <= 0.001) {
    sectorPath = 'M 0 0';
  } else if (progress >= 0.999) {
    sectorPath = `M 0 0 H 600 V 600 H 0 Z`;
  } else {
    sectorPath = `M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  // Trailing Glow Arc: An orange beam trailing 25 degrees behind the hand
  const trailAngle = Math.max(0, currentAngle - 25);
  const trailRad = ((trailAngle - 90) * Math.PI) / 180;
  const tx = cx + radius * Math.cos(trailRad);
  const ty = cy + radius * Math.sin(trailRad);
  const trailLargeArc = currentAngle - trailAngle > 180 ? 1 : 0;
  const trailingWedgePath =
    progress > 0.01 && progress < 0.999
      ? `M ${cx} ${cy} L ${tx} ${ty} A ${radius} ${radius} 0 ${trailLargeArc} 1 ${x2} ${y2} Z`
      : '';

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-700 select-none overflow-hidden ${
        phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {/* Animated MeerSon Watermark — Top Left (matches login screen) */}
      <div
        className="absolute top-16 left-8 sm:left-20 w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center pointer-events-none animate-pulse select-none"
      >
        <div className="absolute inset-0 bg-teal-500 rounded-full blur-3xl opacity-20" />
        <img
          src={meersonWatermark}
          alt=""
          aria-hidden="true"
          className="relative z-0 w-44 sm:w-56 object-contain opacity-35 brightness-175 contrast-125 select-none pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 25px rgba(45,212,191,0.45)) brightness(1.75) contrast(1.25)' }}
        />
      </div>

      {/* Animated MeerSon Watermark — Bottom Right (matches login screen) */}
      <div
        className="absolute bottom-12 right-8 sm:right-20 w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center pointer-events-none animate-pulse select-none"
        style={{ animationDelay: '1s' }}
      >
        <div className="absolute inset-0 bg-teal-600 rounded-full blur-3xl opacity-20" />
        <img
          src={meersonWatermark}
          alt=""
          aria-hidden="true"
          className="relative z-0 w-52 sm:w-64 object-contain opacity-35 select-none pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 25px rgba(45,212,191,0.45)) brightness(1.75) contrast(1.25)' }}
        />
      </div>

      {/* Subtle orange center ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.04) 0%, transparent 65%)',
        }}
      />

      {/* Clock + Logo Disc — centered directly on the gradient background */}
      <div className="relative flex items-center justify-center">
        <div
            className="relative w-[300px] sm:w-[320px] aspect-square rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #16181F 0%, #0F1116 65%, #08090C 100%)',
              transform: 'translateZ(0)',
              clipPath: 'circle(50% at 50% 50%)',
            }}
          >
            {/* Floating warm amber dust particles matching reference attachment */}
            <div className="absolute inset-0 pointer-events-none">
              {[
                { top: '20%', left: '48%', size: 3, delay: '0s', opacity: 0.8 },
                { top: '28%', left: '38%', size: 2.5, delay: '1.2s', opacity: 0.7 },
                { top: '34%', left: '58%', size: 3.5, delay: '0.5s', opacity: 0.85 },
                { top: '44%', left: '26%', size: 2, delay: '2.1s', opacity: 0.6 },
                { top: '56%', left: '72%', size: 2.5, delay: '0.8s', opacity: 0.75 },
                { top: '66%', left: '33%', size: 3, delay: '1.7s', opacity: 0.8 },
                { top: '24%', left: '68%', size: 2, delay: '2.5s', opacity: 0.65 },
                { top: '74%', left: '58%', size: 2.5, delay: '1.4s', opacity: 0.7 },
                { top: '48%', left: '22%', size: 2, delay: '1.9s', opacity: 0.5 },
                { top: '38%', left: '76%', size: 2.5, delay: '0.3s', opacity: 0.75 },
              ].map((dot, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-orange-400 animate-pulse"
                  style={{
                    top: dot.top,
                    left: dot.left,
                    width: `${dot.size}px`,
                    height: `${dot.size}px`,
                    opacity: dot.opacity,
                    boxShadow: '0 0 6px 1.5px rgba(249,115,22,0.8)',
                    animationDuration: `${2.2 + (i % 3)}s`,
                    animationDelay: dot.delay,
                  }}
                />
              ))}
            </div>

            {/* Canvas Spark Trail */}
            <ParticleTrail
              angle={currentAngle}
              isActive={phase === 'drawing'}
              centerRadius={150}
              width={320}
              height={320}
            />

            {/* SVG Mask Container for Exact Logo Reveal */}
            <div className="relative w-full h-full flex items-center justify-center p-3">
              {/* Ambient Logo Glow upon Completion */}
              <div
                className={`absolute inset-0 rounded-full transition-opacity duration-1000 pointer-events-none ${
                  logoGlow ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  background:
                    'radial-gradient(circle, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.06) 50%, transparent 75%)',
                  filter: 'blur(16px)',
                }}
              />

              <svg
                className="w-full h-full"
                viewBox="0 0 600 600"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'hidden' }}
              >
                <defs>
                  {/* Sector Clip Mask for Progressive Reveal */}
                  <mask id={maskId}>
                    {/* Default transparent black */}
                    <rect x="0" y="0" width="600" height="600" fill="black" />
                    {/* Revealed white sector */}
                    <path d={sectorPath} fill="white" />
                  </mask>

                  {/* Trailing hot glow gradient along drawing hand edge */}
                  <radialGradient
                    id={`trailGrad-${maskId}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="50%"
                    fy="50%"
                  >
                    <stop offset="0%" stopColor="#FFA500" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#FF6A00" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
                  </radialGradient>

                  {/* Soft glow filter for the trailing beam */}
                  <filter
                    id={`blurFilter-${maskId}`}
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feGaussianBlur stdDeviation="8" />
                  </filter>
                </defs>

                {/* Trailing Luminous Orange Wedge behind the hand */}
                {trailingWedgePath && (
                  <path
                    d={trailingWedgePath}
                    fill={`url(#trailGrad-${maskId})`}
                    filter={`url(#blurFilter-${maskId})`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                )}

                {/* Exact Transparent Logo revealed through the Clock Sector Mask */}
                <g mask={`url(#${maskId})`}>
                  <image
                    href={splashLogo || "/meerson_logo.png"}
                    x="85"
                    y="75"
                    width="430"
                    height="430"
                    preserveAspectRatio="xMidYMid meet"
                    className="transition-all duration-300"
                  />
                </g>

                {/* Radiant Drawing Ray along the leading edge */}
                {phase === 'drawing' && progress > 0.01 && progress < 0.99 && (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="#FFAE00"
                    strokeWidth="2.5"
                    strokeOpacity="0.85"
                    style={{
                      filter: 'drop-shadow(0 0 8px #FF6A00)',
                      mixBlendMode: 'screen',
                    }}
                  />
                )}
              </svg>

              {/* Programmatically Animated 3D Clock Hand */}
              <ClockHand
                angle={currentAngle}
                radius={155}
                opacity={handOpacity}
                showTrail={phase === 'drawing'}
                scale={0.72}
              />
            </div>
        </div>
      </div>
    </div>
  );
};
