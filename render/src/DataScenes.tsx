import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {theme} from './theme';

// Visuals built from the story's own numbers. Relevant by construction —
// no stock photo can be wrong, because there is no stock photo.

// A unit grid. mode 'fill' counts up, mode 'drain' goes dark one by one.
export const UnitGrid: React.FC<{
  total: number; filled: number; mode: 'fill' | 'drain'; label: string; sub?: string;
}> = ({total, filled, mode, label, sub}) => {
  const frame = useCurrentFrame();
  const cols = Math.ceil(Math.sqrt(total * 0.62));
  const p = interpolate(frame, [4, 40], [0, 1], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});
  const active = mode === 'fill' ? Math.round(filled * p) : Math.round(filled + (total - filled) * (1 - p));

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44}}>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 15, width: 760}}>
        {Array.from({length: total}).map((_, i) => {
          const on = mode === 'fill' ? i < active : i < active;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                backgroundColor: on ? theme.accent : 'transparent',
                border: on ? 'none' : `2px solid ${theme.muted}55`,
                boxShadow: on ? `0 0 16px ${theme.accent}66` : undefined,
              }}
            />
          );
        })}
      </div>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 46, fontWeight: 800, color: theme.text, letterSpacing: 3}}>{label}</div>
        {sub ? <div style={{fontSize: 34, color: theme.muted, marginTop: 10}}>{sub}</div> : null}
      </div>
    </div>
  );
};

// A horizontal timeline. The travelling dot is the story moving.
export const Timeline: React.FC<{
  marks: {at: number; label: string}[]; head: number; caption?: string;
}> = ({marks, head, caption}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [4, 38], [0, head], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});

  // The track spans the marks, not the container. Drawn full-width, it ran
  // past the last dot into empty space whenever the last mark sat short of 1.
  const first = Math.min(...marks.map((m) => m.at));
  const last = Math.max(...marks.map((m) => m.at));
  const span = last - first || 1;
  const filled = Math.max(0, Math.min(1, (p - first) / span)) * span;

  return (
    <div style={{width: 820, display: 'flex', flexDirection: 'column', gap: 70}}>
      <div style={{position: 'relative', height: 8}}>
        <div
          style={{
            position: 'absolute', left: `${first * 100}%`, right: `${(1 - last) * 100}%`,
            top: 0, height: 8, backgroundColor: '#26262A', borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute', left: `${first * 100}%`, top: 0, height: 8,
            width: `${filled * 100}%`, backgroundColor: theme.accent, borderRadius: 4,
            boxShadow: `0 0 28px ${theme.accent}`,
          }}
        />
        {marks.map((m, i) => {
          const reached = p >= m.at - 0.01;
          return (
            // The wrapper is the width of the DOT, not the label. Sized by the
            // label, translateX(-50%) centred the text and shoved the dot left
            // by half the label — a different amount per mark — which is what
            // made the track look like it overran the last dot.
            <div key={i} style={{position: 'absolute', left: `${m.at * 100}%`, top: -13, width: 34, transform: 'translateX(-50%)'}}>
              <div
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: reached ? theme.accent : theme.bg,
                  border: `3px solid ${reached ? theme.accent : theme.muted}`,
                }}
              />
              <div
                style={{
                  position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 32, fontWeight: 700, whiteSpace: 'nowrap',
                  color: reached ? theme.text : theme.muted,
                }}
              >
                {m.label}
              </div>
            </div>
          );
        })}
      </div>
      {caption ? (
        <div style={{fontSize: 58, fontWeight: 900, color: theme.accent, textAlign: 'center', marginTop: 60}}>
          {caption}
        </div>
      ) : null}
    </div>
  );
};
