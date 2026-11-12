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

// Photographic ground. Graded to the channel palette so stock never reads as stock,
// and always moving — a static photo behind text is still a slide.
export type Shot = 'push' | 'pull' | 'panL' | 'panR' | 'tilt' | 'punch';

// Photographic ground. Graded to the channel palette so stock never reads as stock.
// Every shot moves differently — an identical camera move on every image is the
// single loudest "machine made this" tell.
export const Photo: React.FC<{src: string; shot: Shot}> = ({src, shot}) => {
  const frame = useCurrentFrame();
  const t = (a: number, b: number, end = 150) =>
    interpolate(frame, [0, end], [a, b], {extrapolateRight: 'clamp'});

  let scale = 1.1, x = 0, y = 0;
  if (shot === 'push') { scale = t(1.04, 1.26); }
  else if (shot === 'pull') { scale = t(1.30, 1.06); }
  else if (shot === 'panR') { scale = 1.32; x = t(-7, 7); }
  else if (shot === 'panL') { scale = 1.32; x = t(7, -7); }
  else if (shot === 'tilt') { scale = 1.30; y = t(-6, 6); }
  else if (shot === 'punch') {
    // fast snap in, then a slow drift — reads as a cut-in, not a zoom
    scale = interpolate(frame, [0, 11, 150], [1.55, 1.14, 1.2], {extrapolateRight: 'clamp'});
    x = t(2, -2);
  }

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${scale}) translate(${x}%, ${y}%)`,
          filter: 'grayscale(1) contrast(1.18) brightness(0.55)',
        }}
      />
      <AbsoluteFill style={{backgroundColor: theme.accent, opacity: 0.22, mixBlendMode: 'color'}} />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.38) 58%, rgba(0,0,0,0.96) 100%)',
        }}
      />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

export type Trans = 'cut' | 'flash' | 'slideUp' | 'punchIn' | 'wipe';

// Scene-entry treatment. Cycled so no two consecutive shots arrive the same way.
export const Transition: React.FC<{kind: Trans; children: React.ReactNode}> = ({kind, children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 9], [0, 1], {extrapolateRight: 'clamp'});

  const style: React.CSSProperties =
    kind === 'slideUp' ? {transform: `translateY(${(1 - p) * 100}%)`}
    : kind === 'punchIn' ? {transform: `scale(${1 + (1 - p) * 0.16})`, opacity: Math.min(1, p * 2)}
    : kind === 'wipe' ? {clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}
    : {};

  return (
    <AbsoluteFill style={style}>
      {children}
      {kind === 'flash' ? (
        <AbsoluteFill
          style={{
            backgroundColor: '#FFFFFF',
            opacity: interpolate(frame, [0, 2, 7], [0.55, 0.3, 0], {extrapolateRight: 'clamp'}),
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
