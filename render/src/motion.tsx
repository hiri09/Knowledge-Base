import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {theme} from './theme';

// Rule (review-feedback.md): never the same entrance animation twice in a row.
export type Anim = 'rise' | 'slideL' | 'slideR' | 'scale' | 'stagger' | 'blur';
export const ANIMS: Anim[] = ['rise', 'slideL', 'slideR', 'scale', 'stagger', 'blur'];

// Rule: never everything dead centre.
export type Pos = 'center' | 'left' | 'right' | 'top' | 'bottom';
export const POSITIONS: Pos[] = ['center', 'left', 'bottom', 'right', 'top'];

export const posStyle = (p: Pos): React.CSSProperties => ({
  justifyContent: p === 'top' ? 'flex-start' : p === 'bottom' ? 'flex-end' : 'center',
  alignItems: p === 'left' ? 'flex-start' : p === 'right' ? 'flex-end' : 'center',
  textAlign: p === 'left' ? 'left' : p === 'right' ? 'right' : 'center',
  paddingTop: p === 'top' ? 300 : 110,
  paddingBottom: p === 'bottom' ? 320 : 110,
  paddingLeft: 88,
  paddingRight: 88,
});

export const Enter: React.FC<{anim: Anim; children: React.ReactNode; text?: string; style?: React.CSSProperties}> = ({
  anim,
  children,
  text,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 200}});

  if (anim === 'stagger' && text) {
    return (
      <div style={style}>
        {text.split(' ').map((w, i) => {
          const ws = spring({frame: frame - i * 2.5, fps, config: {damping: 200}});
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: '0.28em',
                opacity: ws,
                transform: `translateY(${interpolate(ws, [0, 1], [34, 0])}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    );
  }

  const t: Record<Anim, string> = {
    rise: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
    slideL: `translateX(${interpolate(s, [0, 1], [-140, 0])}px)`,
    slideR: `translateX(${interpolate(s, [0, 1], [140, 0])}px)`,
    scale: `scale(${interpolate(s, [0, 1], [0.78, 1])})`,
    stagger: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
    blur: 'none',
  };

  return (
    <div
      style={{
        ...style,
        opacity: s,
        transform: t[anim],
        filter: anim === 'blur' ? `blur(${interpolate(s, [0, 1], [22, 0])}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

// Rule: numbers count up, they do not appear.
export const CountUp: React.FC<{value: string; style?: React.CSSProperties}> = ({value, style}) => {
  const frame = useCurrentFrame();
  const m = value.match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return <div style={style}>{value}</div>;
  const [, pre, digits, suf] = m;
  const target = Number(digits.replace(/,/g, ''));
  const n = Math.round(interpolate(frame, [2, 26], [0, target], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'}));
  return <div style={style}>{pre}{n.toLocaleString()}{suf}</div>;
};

export const accentText = {color: theme.accent, fontWeight: 900, letterSpacing: -6};
