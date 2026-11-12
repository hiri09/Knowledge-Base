import React from 'react';
import {AbsoluteFill, Sequence, Audio, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {theme, FPS, MIN_NUMBER_SEC} from './theme';
import {Background, Photo, BgKind} from './Backgrounds';
import {Enter, CountUp, ANIMS, POSITIONS, posStyle, accentText} from './motion';

export type Scene =
  | {type: 'hook' | 'line'; text: string; sec: number; vo?: string; source?: string; media?: string}
  | {type: 'number'; value: string; label: string; sec: number; vo?: string; source?: string; crack?: boolean; media?: string}
  | {type: 'compare'; aLabel: string; aValue: number; bLabel: string; bValue: number; sec: number; vo?: string; source?: string};

export type ShortData = {id: string; title: string; scenes: Scene[]};
export type MediaLock = Record<string, {file: string}>;

// *word* -> accent. The eye needs somewhere to land in a block of type.
const Marked: React.FC<{text: string}> = ({text}) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
        <span key={i} style={{color: theme.accent}}>{part.slice(1, -1)}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    )}
  </>
);
export type AudioData = {track: string; durations: number[]};

const BGS: BgKind[] = ['grid', 'glow', 'bars', 'ghost'];

// Scene length now comes from the narration itself, so picture and voice cannot drift.
// The old hard caps stay as a floor only.
const secondsFor = (s: Scene, i: number, audio?: AudioData) => {
  const fromAudio = audio?.durations[i];
  const min = s.type === 'number' ? MIN_NUMBER_SEC : 0.9;
  return Math.max(min, fromAudio ?? s.sec);
};

const Lines: React.FC<{scene: Extract<Scene, {type: 'hook' | 'line'}>; anim: any}> = ({scene, anim}) => (
  <Enter
    anim={anim}
    text={scene.text.replace(/\*/g, '')}
    style={{
      fontSize: scene.type === 'hook' ? 104 : 84,
      fontWeight: 800,
      color: theme.text,
      lineHeight: 1.08,
      letterSpacing: -2,
      textShadow: '0 18px 60px rgba(0,0,0,0.65)',
    }}
  >
    <Marked text={scene.text} />
  </Enter>
);

const NumberScene: React.FC<{scene: Extract<Scene, {type: 'number'}>; anim: any}> = ({scene, anim}) => {
  const frame = useCurrentFrame();
  const crack = interpolate(frame, [10, 30], [0, 100], {extrapolateRight: 'clamp'});
  return (
    <>
      <Enter anim={anim}>
        <div style={{position: 'relative'}}>
          <CountUp value={scene.value} style={{fontSize: 196, ...accentText, textShadow: `0 0 90px ${theme.accent}55`}} />
          {scene.crack ? (
            <div
              style={{
                position: 'absolute', top: '52%', left: 0, height: 7,
                width: `${crack}%`, backgroundColor: theme.bg, transform: 'rotate(-2.5deg)',
              }}
            />
          ) : null}
        </div>
      </Enter>
      <div style={{fontSize: 50, fontWeight: 600, color: theme.muted, marginTop: 26}}>{scene.label}</div>
    </>
  );
};

const Compare: React.FC<{scene: Extract<Scene, {type: 'compare'}>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const max = Math.max(scene.aValue, scene.bValue);
  const grow = interpolate(frame, [4, 28], [0, 1], {extrapolateRight: 'clamp'});
  const Bar: React.FC<{label: string; value: number; accent: boolean; delay: number}> = ({label, value, accent, delay}) => {
    const g = interpolate(frame, [4 + delay, 28 + delay], [0, 1], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});
    return (
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        <CountUp
          value={String(value)}
          style={{fontSize: 54, fontWeight: 800, color: accent ? theme.accent : theme.muted}}
        />
        <div
          style={{
            width: 190,
            height: (value / max) * 600 * g,
            backgroundColor: accent ? theme.accent : '#2A2A2E',
            borderRadius: 10,
            boxShadow: accent ? `0 0 70px ${theme.accent}44` : undefined,
          }}
        />
        <div style={{fontSize: 36, color: theme.muted, fontWeight: 700, letterSpacing: 2}}>{label}</div>
      </div>
    );
  };
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 70, width: '100%', height: 790, opacity: grow > 0 ? 1 : 0}}>
      <Bar label={scene.aLabel} value={scene.aValue} accent={false} delay={0} />
      <Bar label={scene.bLabel} value={scene.bValue} accent delay={8} />
    </div>
  );
};

const SceneView: React.FC<{scene: Scene; i: number; ghost?: string; media?: MediaLock}> = ({scene, i, ghost, media}) => {
  const anim = ANIMS[i % ANIMS.length];
  const pos = scene.type === 'compare' ? 'center' : POSITIONS[i % POSITIONS.length];
  const bg = BGS[i % BGS.length];
  const key = 'media' in scene ? (scene as any).media : undefined;
  const photo = key && media?.[key] ? staticFile(media[key].file) : undefined;
  return (
    <AbsoluteFill>
      {photo ? <Photo src={photo} variant={i} /> : <Background kind={bg} ghost={ghost} />}
      <AbsoluteFill style={{fontFamily: theme.font, display: 'flex', flexDirection: 'column', ...posStyle(pos as any)}}>
        {scene.type === 'compare' ? (
          <Compare scene={scene} />
        ) : scene.type === 'number' ? (
          <NumberScene scene={scene} anim={anim} />
        ) : (
          <Lines scene={scene} anim={anim} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Short: React.FC<{data: ShortData; audio?: AudioData; media?: MediaLock}> = ({data, audio, media}) => {
  let at = 0;
  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      {audio ? <Audio src={staticFile(audio.track)} /> : null}
      {data.scenes.map((scene, i) => {
        const dur = Math.round(secondsFor(scene, i, audio) * FPS);
        const from = at;
        at += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneView scene={scene} i={i} ghost={data.id.includes('38') ? '38' : undefined} media={media} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const durationOf = (data: ShortData, audio?: AudioData) =>
  data.scenes.reduce((n, s, i) => n + Math.round(secondsFor(s, i, audio) * FPS), 0);
