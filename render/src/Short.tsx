import React from 'react';
import {AbsoluteFill, Sequence, Audio, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {theme, FPS, MIN_NUMBER_SEC} from './theme';
import {Background, Photo, Transition, BgKind, Shot, Trans} from './Backgrounds';
import {UnitGrid, Timeline} from './DataScenes';
import {Enter, CountUp, ANIMS, POSITIONS, posStyle, accentText, Anim, Pos} from './motion';

export type Scene = Look & (
  | {type: 'hook' | 'line'; text: string; sec: number; vo?: string; source?: string; media?: string; shot?: Shot; trans?: Trans}
  | {type: 'number'; value: string; label: string; sec: number; vo?: string; source?: string; crack?: boolean; media?: string; shot?: Shot; trans?: Trans}
  | {type: 'grid'; total: number; filled: number; mode: 'fill' | 'drain'; label: string; sub?: string; sec: number; vo?: string; source?: string; shot?: Shot; trans?: Trans}
  | {type: 'timeline'; marks: {at: number; label: string}[]; head: number; caption?: string; sec: number; vo?: string; source?: string; shot?: Shot; trans?: Trans}
  | {type: 'compare'; aLabel: string; aValue: number; bLabel: string; bValue: number; sec: number; vo?: string; source?: string; shot?: Shot; trans?: Trans});

// Chosen per scene by the Assistant Director, enforced by critique.py.
// `beat` is not consumed by the renderer — it is what the hold gate is read against.
export type Look = {beat?: 'HOOK' | 'EXPLAIN' | 'REVEAL' | 'CLOSE'; bg?: BgKind; anim?: Anim; pos?: Pos};

export type ShortData = {id: string; title: string; scenes: Scene[]};
export type MediaLock = Record<string, {file: string}>;

// *word* -> accent. The eye needs somewhere to land in a block of type.
// The accent word turns red AT the moment its word is spoken, not before the
// viewer has heard it. This is what makes the whole video read as synced
// rather than just the two shots that carry a number.
const Marked: React.FC<{text: string; at?: number}> = ({text, at}) => {
  const frame = useCurrentFrame();
  const hit = at === undefined || frame >= at;
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
          <span
            key={i}
            style={{
              color: hit ? theme.accent : theme.text,
              transition: 'none',
              textShadow: hit ? `0 0 46px ${theme.accent}66` : 'none',
            }}
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};
export type AudioData = {
  track: string;
  durations: number[];
  // The frame-accurate moment each scene's key word is spoken, from whisper
  // DTW alignment. A number that resolves before the voice reaches it is the
  // loudest desync there is, and keying to the shot boundary guaranteed it.
  keyAt?: (number | null)[];
  words?: [string, number, number][][];
};

const BGS: BgKind[] = ['grid', 'glow', 'bars', 'ghost'];

// Scene length now comes from the narration itself, so picture and voice cannot drift.
// The old hard caps stay as a floor only.
const secondsFor = (s: Scene, i: number, audio?: AudioData) => {
  const fromAudio = audio?.durations[i];
  const min = s.type === 'number' ? MIN_NUMBER_SEC : 0.9;
  return Math.max(min, fromAudio ?? s.sec);
};

const Lines: React.FC<{scene: Extract<Scene, {type: 'hook' | 'line'}>; anim: any; keyFrame?: number}> = ({scene, anim, keyFrame}) => (
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
    <Marked text={scene.text} at={keyFrame} />
  </Enter>
);

const NumberScene: React.FC<{scene: Extract<Scene, {type: 'number'}>; anim: any; keyFrame?: number}> = ({
  scene,
  anim,
  keyFrame,
}) => {
  const frame = useCurrentFrame();
  const at = keyFrame ?? 2;
  // the crack follows the number, so it tears open as the figure lands
  const crack = interpolate(frame, [at + 8, at + 28], [0, 100], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});
  return (
    <>
      <Enter anim={anim}>
        <div
          style={{
            position: 'relative',
            // The figure is not on screen before it is spoken. Rendering it
            // early meant the shot sat on "$0M" for two seconds, which reads
            // as a wrong number rather than as a number arriving.
            opacity: interpolate(frame, [at - 5, at - 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `scale(${interpolate(frame, [at - 5, at + 4], [1.18, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })})`,
          }}
        >
          <CountUp value={scene.value} at={at} style={{fontSize: 196, ...accentText, textShadow: `0 0 90px ${theme.accent}55`}} />
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
      <div
        style={{
          fontSize: 52, fontWeight: 700, color: '#E8E8EA', marginTop: 26,
          letterSpacing: 0.3, textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9)',
        }}
      >
        {scene.label}
      </div>
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

const SceneView: React.FC<{scene: Scene; i: number; ghost?: string; media?: MediaLock; keyFrame?: number}> = ({scene, i, ghost, media, keyFrame}) => {
  // A scene chooses its own look. The index fallbacks below are a floor for
  // unmigrated data, never a design: cycling by i is what made every fourth
  // shot identical, which reads as machine-made however good each shot is.
  const s_ = scene as any;
  const anim = (s_.anim ?? ANIMS[i % ANIMS.length]) as typeof ANIMS[number];
  const dataScene = scene.type === 'compare' || scene.type === 'grid' || scene.type === 'timeline';
  const pos = (s_.pos ?? (dataScene ? 'center' : POSITIONS[i % POSITIONS.length])) as Pos;
  const bg = (s_.bg ?? BGS[i % BGS.length]) as BgKind;
  const key = 'media' in scene ? (scene as any).media : undefined;
  const photo = key && media?.[key] ? staticFile(media[key].file) : undefined;
  const shot = ((scene as any).shot ?? 'push') as Shot;
  const trans = ((scene as any).trans ?? 'cut') as Trans;
  return (
    <Transition kind={trans}>
      {photo ? <Photo src={photo} shot={shot} dim={(scene as any).dim} /> : <Background kind={bg} ghost={ghost} />}
      <AbsoluteFill style={{fontFamily: theme.font, display: 'flex', flexDirection: 'column', ...posStyle(pos as any)}}>
        {scene.type === 'grid' ? (
          <UnitGrid total={scene.total} filled={scene.filled} mode={scene.mode} label={scene.label} sub={scene.sub} />
        ) : scene.type === 'timeline' ? (
          <Timeline marks={scene.marks} head={scene.head} caption={scene.caption} />
        ) : scene.type === 'compare' ? (
          <Compare scene={scene} />
        ) : scene.type === 'number' ? (
          <NumberScene scene={scene} anim={anim} keyFrame={keyFrame} />
        ) : (
          <Lines scene={scene} anim={anim} keyFrame={keyFrame} />
        )}
      </AbsoluteFill>
    </Transition>
  );
};

// A Short that cuts to black on its last frame reads as the file ending, not
// as the story ending. 20 frames of settle costs two thirds of a second.
const FadeOut: React.FC<{total: number}> = ({total}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        opacity: interpolate(frame, [total - 20, total - 1], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        }),
        pointerEvents: 'none',
      }}
    />
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
            <SceneView
              scene={scene}
              i={i}
              ghost={data.id.includes('38') || data.id.includes('pitcher') ? '38' : undefined}
              media={media}
              keyFrame={
                audio?.keyAt?.[i] != null ? Math.round((audio.keyAt[i] as number) * FPS) : undefined
              }
            />
          </Sequence>
        );
      })}
          <FadeOut total={data.scenes.reduce((a, sc, j) => a + Math.round(secondsFor(sc, j, audio) * FPS), 0)} />
    </AbsoluteFill>
  );
};

export const durationOf = (data: ShortData, audio?: AudioData) =>
  data.scenes.reduce((n, s, i) => n + Math.round(secondsFor(s, i, audio) * FPS), 0);
