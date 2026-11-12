import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {theme, FPS, MAX_SCENE_SEC, MIN_NUMBER_SEC} from './theme';

export type Scene =
  | {type: 'hook' | 'line'; text: string; sec: number; source?: string}
  | {type: 'number'; value: string; label: string; sec: number; source?: string; crack?: boolean}
  | {type: 'compare'; aLabel: string; aValue: number; bLabel: string; bValue: number; sec: number; source?: string};

export type ShortData = {id: string; title: string; scenes: Scene[]};

// Every scene is clamped to the pattern-interrupt window. Code enforces the rule,
// so a careless script can't quietly produce a 9-second static shot.
const clamp = (s: Scene) => {
  const min = s.type === 'number' ? MIN_NUMBER_SEC : 0.8;
  return Math.max(min, Math.min(s.sec, MAX_SCENE_SEC));
};

const Rise: React.FC<{children: React.ReactNode; delay?: number}> = ({children, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  return (
    <div style={{transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`, opacity: s}}>
      {children}
    </div>
  );
};

const Frame: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.bg,
      fontFamily: theme.font,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 90,
      textAlign: 'center',
    }}
  >
    {children}
  </AbsoluteFill>
);

const SceneView: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();

  if (scene.type === 'hook' || scene.type === 'line') {
    return (
      <Frame>
        <Rise>
          <div
            style={{
              fontSize: scene.type === 'hook' ? 108 : 86,
              fontWeight: 800,
              color: theme.text,
              lineHeight: 1.08,
              letterSpacing: -2,
            }}
          >
            {scene.text}
          </div>
        </Rise>
      </Frame>
    );
  }

  if (scene.type === 'number') {
    // The number is the only saturated element in the frame — the label stays muted.
    const crackWidth = interpolate(frame, [8, 26], [0, 100], {extrapolateRight: 'clamp'});
    return (
      <Frame>
        <Rise>
          <div style={{position: 'relative'}}>
            <div style={{fontSize: 190, fontWeight: 900, color: theme.accent, letterSpacing: -6}}>
              {scene.value}
            </div>
            {scene.crack ? (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  height: 6,
                  width: `${crackWidth}%`,
                  backgroundColor: theme.bg,
                  transform: 'rotate(-2deg)',
                }}
              />
            ) : null}
          </div>
        </Rise>
        <Rise delay={6}>
          <div style={{fontSize: 52, fontWeight: 600, color: theme.muted, marginTop: 28}}>
            {scene.label}
          </div>
        </Rise>
      </Frame>
    );
  }

  // compare: the bar that matters is accent, the other is muted. Contrast carries the meaning.
  const max = Math.max(scene.aValue, scene.bValue);
  const grow = interpolate(frame, [4, 24], [0, 1], {extrapolateRight: 'clamp'});
  const Bar: React.FC<{label: string; value: number; accent: boolean}> = ({label, value, accent}) => (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
      <div style={{fontSize: 56, fontWeight: 800, color: accent ? theme.accent : theme.muted}}>
        {value.toLocaleString()}
      </div>
      <div
        style={{
          width: 180,
          height: (value / max) * 620 * grow,
          backgroundColor: accent ? theme.accent : '#2A2A2E',
          borderRadius: 8,
        }}
      />
      <div style={{fontSize: 38, color: theme.muted, fontWeight: 600}}>{label}</div>
    </div>
  );

  return (
    <Frame>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 70, width: '100%', height: 820}}>
        <Bar label={scene.aLabel} value={scene.aValue} accent={false} />
        <Bar label={scene.bLabel} value={scene.bValue} accent />
      </div>
    </Frame>
  );
};

export const Short: React.FC<{data: ShortData}> = ({data}) => {
  let at = 0;
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      {data.scenes.map((scene, i) => {
        const dur = Math.round(clamp(scene) * FPS);
        const from = at;
        at += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneView scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const durationOf = (data: ShortData) =>
  data.scenes.reduce((n, s) => n + Math.round(clamp(s) * FPS), 0);
