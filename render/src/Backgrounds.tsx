import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {theme} from './theme';

// Rule (review-feedback.md): no frame is ever flat black.
// All procedural — no image files, so no licensing surface at all.

export type BgKind = 'grid' | 'glow' | 'bars' | 'ghost';

const Grain: React.FC = () => (
  <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
    <svg width="100%" height="100%">
      <filter id="g">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  </AbsoluteFill>
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none',
    }}
  />
);

export const Background: React.FC<{kind: BgKind; ghost?: string}> = ({kind, ghost}) => {
  const frame = useCurrentFrame();

  const inner = () => {
    if (kind === 'grid') {
      const shift = (frame * 0.6) % 120;
      return (
        <AbsoluteFill
          style={{
            backgroundImage:
              `linear-gradient(${theme.muted}66 1px, transparent 1px),` +
              `linear-gradient(90deg, ${theme.muted}66 1px, transparent 1px),` +
              `linear-gradient(${theme.accent}33 2px, transparent 2px)`,
            backgroundSize: '120px 120px, 120px 120px, 100% 600px',
            transform: `translate(${-shift}px, ${-shift}px) scale(1.25)`,
          }}
        />
      );
    }
    if (kind === 'glow') {
      const x = interpolate(Math.sin(frame / 55), [-1, 1], [25, 75]);
      const y = interpolate(Math.cos(frame / 70), [-1, 1], [30, 70]);
      return (
        <AbsoluteFill
          style={{
            background:
              `radial-gradient(circle at ${x}% ${y}%, ${theme.accent}66 0%, transparent 52%),` +
              `radial-gradient(circle at ${100 - x}% ${100 - y}%, #3A6BFF40 0%, transparent 48%)`,
          }}
        />
      );
    }
    if (kind === 'bars') {
      const shift = (frame * 1.4) % 220;
      return (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${theme.muted}4D 0 3px, transparent 3px 92px)`,
            transform: `translateX(${-shift}px) scale(1.4)`,
          }}
        />
      );
    }
    // ghost: an oversized figure drifting behind the content
    const drift = interpolate(frame, [0, 150], [0, -70], {extrapolateRight: 'clamp'});
    return (
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 760,
            fontWeight: 900,
            color: '#FFFFFF',
            opacity: 0.1,
            whiteSpace: 'nowrap',
            transform: `translateX(${drift}px)`,
          }}
        >
          {ghost ?? '38'}
        </div>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      {inner()}
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
