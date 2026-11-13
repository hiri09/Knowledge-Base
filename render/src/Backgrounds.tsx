import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, OffthreadVideo, Loop} from 'remotion';
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
      background: 'radial-gradient(ellipse at center, transparent 52%, rgba(6,8,12,0.42) 100%)',
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
              `linear-gradient(${theme.muted}CC 1px, transparent 1px),` +
              `linear-gradient(90deg, ${theme.muted}CC 1px, transparent 1px),` +
              `linear-gradient(${theme.accent}59 2px, transparent 2px)`,
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
            backgroundImage:
              `repeating-linear-gradient(115deg, ${theme.muted}D9 0 4px, transparent 4px 46px),` +
              `linear-gradient(115deg, transparent 35%, ${theme.accent}26 50%, transparent 65%)`,
            backgroundSize: 'auto, 240% 100%',
            backgroundPosition: `0 0, ${(frame * 1.1) % 240}% 0`,
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
            opacity: 0.22,
            whiteSpace: 'nowrap',
            transform: `translateX(${drift}px)`,
          }}
        >
          {ghost ?? '38'}
        </div>
      </AbsoluteFill>
    );
  };

  // A procedural ground gets the same tonal treatment a photographic one does,
  // or the video alternates between graded shots and flat dark shots and reads
  // as uneven. Shape first, then the pattern, then the split-tone.
  const drift = interpolate(Math.sin(frame / 90), [-1, 1], [38, 62]);
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(130% 85% at ${drift}% 18%, ${theme.bgLift} 0%, ${theme.bg} 58%),` +
            `radial-gradient(90% 60% at ${100 - drift}% 100%, ${theme.shadow}CC 0%, transparent 70%)`,
        }}
      />
      {inner()}
      <AbsoluteFill style={{backgroundColor: theme.highlight, opacity: 0.07, mixBlendMode: 'soft-light'}} />
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
export const isFootage = (src: string) => /\.(mp4|webm|mov)(\?|$)/i.test(src);

export const Photo: React.FC<{src: string; shot: Shot; clipFrames?: number; dim?: number}> = ({src, shot, clipFrames = 120, dim = 1}) => {
  const frame = useCurrentFrame();
  const t = (a: number, b: number, end = 150) =>
    interpolate(frame, [0, end], [a, b], {extrapolateRight: 'clamp'});

  // Footage arrives already composed at 1080x1920 (a sharp 16:9 band over a
  // blurred fill), so a photo-sized ken burns would crop the band away. It
  // also moves on its own, which is the thing the move was compensating for.
  const vid = isFootage(src);
  let scale = 1.1, x = 0, y = 0;
  if (vid) {
    scale = shot === 'pull' ? t(1.06, 1.0) : t(1.0, 1.06);
    x = shot === 'panL' ? t(1.2, -1.2) : shot === 'panR' ? t(-1.2, 1.2) : 0;
    y = shot === 'tilt' ? t(-1.0, 1.0) : 0;
  } else if (shot === 'push') { scale = t(1.04, 1.26); }
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
          transform: `scale(${scale}) translate(${x}%, ${y}%)`,
          // Archive stills get the archival grade. Footage does not: it was
          // added for colour and life, and desaturating it to match the
          // stills throws away the only reason it is here.
          filter: vid
            ? 'grayscale(0.2) contrast(1.05) brightness(1.0) saturate(1.1)'
            : `grayscale(0.88) contrast(1.06) brightness(${0.98 * dim}) saturate(0.9)`,
          ...(isFootage(src)
            ? {}
            : {backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center'}),
        }}
      >
        {isFootage(src) ? (
          // Archive footage moves on its own, so a shot built on it can never
          // read as a frozen card — which is half of what "it's just text"
          // meant. Looped because the clip is shorter than most scenes.
          <Loop durationInFrames={Math.max(1, Math.round(clipFrames))}>
            <OffthreadVideo src={src} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </Loop>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: theme.shadow, opacity: vid ? 0.2 : 0.42, mixBlendMode: 'multiply'}} />
      <AbsoluteFill style={{backgroundColor: theme.highlight, opacity: vid ? 0.05 : 0.1, mixBlendMode: 'soft-light'}} />
      <AbsoluteFill style={{backgroundColor: theme.bgLift, opacity: vid ? 0.12 : 0.3, mixBlendMode: 'lighten'}} />
      {vid ? null : (
        <AbsoluteFill style={{backgroundColor: theme.accent, opacity: 0.05, mixBlendMode: 'color'}} />
      )}
      <AbsoluteFill
        style={{
          background: vid
            ? `linear-gradient(180deg, ${theme.bg}D9 0%, ${theme.bg}14 30%, ${theme.bg}26 62%, ${theme.bg}E6 100%)`
            : `linear-gradient(180deg, ${theme.bg}F2 0%, ${theme.bg}33 34%, ${theme.bg}4D 60%, ${theme.bg}F7 100%)`,
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
            // 0.55 white blew the frame out to near-flat grey for two frames,
            // which reads as a render glitch rather than as a cut.
            backgroundColor: theme.text,
            opacity: interpolate(frame, [0, 2, 6], [0.26, 0.12, 0], {extrapolateRight: 'clamp'}),
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
