import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';

// The kids channel is a different product from the documentary channel and
// shares nothing with it but the renderer. Bright, non-verbal, loopable.
// Its own palette lives here rather than in theme.ts so neither can drift the
// other.
export const KIDS = {
  lanes: ['#FF5A5F', '#FFC93C', '#4D9DFF'],
  laneDark: ['#D63A41', '#D9A21F', '#2E74D9'],
  laneBack: ['#FFE3E4', '#FFF3D0', '#DCEBFF'],
  skyTop: '#FFF6E5',
  skyBottom: '#BFE6FF',
  tray: '#FFFFFF',
  font: '"Baloo 2", "Trebuchet MS", "Helvetica Neue", sans-serif',
};

export type Baked = {
  fps: number; frames: number; lanes: number; laneW: number; diceSize: number;
  laneX: number[]; pegs: [number, number][]; pegR: number; floorY: number; finishY: number;
  dice: {lane: number; pip: number}[];
  counts: number[][]; winner: number; decidedAt: number;
  rows: number[][];
};

// Camera. Solved backwards from the two numbers that actually matter: the
// floor has to sit at 88% of frame height and the top peg row at 12%, because
// the Shorts player covers roughly the bottom 15% with its own chrome. Those
// two constraints fix the view height at 21 units, which fixes the distance.
const CAM = {fov: 40, pos: [0, 8, 28.9] as const, look: [0, 8, 0] as const};
const VIEW_H = 2 * CAM.pos[2] * Math.tan((CAM.fov / 2) * Math.PI / 180);
const VIEW_W = VIEW_H * (1080 / 1920);
// world x/y -> css percentage, so the HTML overlay can sit exactly over a lane
const sx = (x: number) => 50 + (x / VIEW_W) * 100;
const sy = (y: number) => ((CAM.pos[1] + VIEW_H / 2 - y) / VIEW_H) * 100;

// One canvas per die face. Pips are what makes a coloured cube read as a die,
// and a die is the whole reason this channel's first format is a dice race.
const pipLayout: number[][][] = [
  [[0, 0]],
  [[-1, 1], [1, -1]],
  [[-1, 1], [0, 0], [1, -1]],
  [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
  [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
];

const faceTexture = (color: string, pips: number) => {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, S, S);
  // a soft inner light so the cube does not read as flat vinyl
  const grad = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S * 0.5, S * 0.5, S * 0.8);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#FFFFFF';
  for (const [px, py] of pipLayout[pips - 1]) {
    g.beginPath();
    g.arc(S / 2 + px * S * 0.26, S / 2 + py * S * 0.26, S * 0.085, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const Scene: React.FC<{baked: Baked}> = ({baked}) => {
  const frame = useCurrentFrame();
  // R3F points a default camera at the origin. The arena's centre of interest
  // is 9 units up, so without this the whole frame is tilted.
  const {camera} = useThree();
  camera.position.set(CAM.pos[0], CAM.pos[1], CAM.pos[2]);
  camera.lookAt(CAM.look[0], CAM.look[1], CAM.look[2]);
  camera.updateProjectionMatrix();
  const row = baked.rows[Math.min(frame, baked.frames - 1)];

  // 3 colours x 6 faces, built once. A die's material array is the standard
  // +x,-x,+y,-y,+z,-z order with opposite faces summing to 7.
  const mats = useMemo(() => {
    const order = [1, 6, 2, 5, 3, 4];
    return KIDS.lanes.map((c) =>
      order.map((p) => new THREE.MeshStandardMaterial({map: faceTexture(c, p), roughness: 0.45, metalness: 0.02})),
    );
  }, []);

  const half = baked.diceSize / 2;
  const arenaW = baked.lanes * baked.laneW;

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight
        position={[6, 20, 14]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={22}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-8, 6, 10]} intensity={0.35} color="#BFE6FF" />

      {/* One pale back panel per lane rather than one white sheet. A single
          white ground lit this hard read as industrial grey; tinting each lane
          puts the colour behind the dice instead of only on them, and it tells
          the eye which lane it is looking at before a die even arrives. */}
      {baked.laneX.map((x, i) => (
        <mesh key={`bp${i}`} position={[x, 11.5, -1.2]} receiveShadow>
          <planeGeometry args={[baked.laneW, 23]} />
          <meshStandardMaterial color={KIDS.laneBack[i]} roughness={0.95} />
        </mesh>
      ))}

      {/* lane dividers */}
      {Array.from({length: baked.lanes + 1}, (_, i) => (
        <mesh key={`w${i}`} position={[baked.laneX[0] - baked.laneW / 2 + i * baked.laneW, 9.5, 0]}>
          <boxGeometry args={[0.14, 23, 1.3]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
        </mesh>
      ))}

      {/* collection trays, one per lane, in the lane's own colour */}
      {baked.laneX.map((x, i) => (
        <mesh key={`t${i}`} position={[x, baked.finishY / 2, -0.55]} receiveShadow>
          <boxGeometry args={[baked.laneW - 0.2, baked.finishY, 0.3]} />
          <meshStandardMaterial color={KIDS.lanes[i]} roughness={0.55} opacity={0.35} transparent />
        </mesh>
      ))}

      {/* floor, and the plinth under it. Without the plinth the panels ended in
          mid-air and the bottom of frame showed shadows floating over nothing. */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[arenaW, 0.3, 2.6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh position={[0, -2.6, -0.4]} receiveShadow>
        <boxGeometry args={[arenaW + 1.1, 4.6, 2.2]} />
        <meshStandardMaterial color="#F1F5FA" roughness={0.85} />
      </mesh>

      {/* pegs */}
      {baked.pegs.map(([x, y], i) => (
        <mesh key={`p${i}`} position={[x, y, 0]} castShadow receiveShadow>
          <sphereGeometry args={[baked.pegR, 20, 16]} />
          <meshStandardMaterial color="#9FB3C8" roughness={0.35} metalness={0.1} />
        </mesh>
      ))}

      {/* dice */}
      {baked.dice.map((d, i) => {
        const o = i * 7;
        return (
          <mesh
            key={`d${i}`}
            position={[row[o], row[o + 1], row[o + 2]]}
            quaternion={[row[o + 3], row[o + 4], row[o + 5], row[o + 6]]}
            material={mats[d.lane]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[half * 2, half * 2, half * 2]} />
          </mesh>
        );
      })}
    </>
  );
};

const Counter: React.FC<{lane: number; n: number; total: number; won: boolean; frame: number; decidedAt: number; show: number}> =
  ({lane, n, total, won, frame, decidedAt, show}) => {
    const {fps} = useVideoConfig();
    const pop = spring({frame: frame - decidedAt, fps, config: {damping: 9, mass: 0.5}});
    const scale = (won && frame >= decidedAt ? 1 + 0.3 * pop : 1) * show;
    return (
      <div style={{
        flex: 1, textAlign: 'center',
        transform: `scale(${scale})`,
        opacity: show,
      }}>
        <div style={{
          fontFamily: KIDS.font, fontWeight: 900, fontSize: 112, lineHeight: 1.05,
          color: '#FFFFFF', background: KIDS.lanes[lane], borderRadius: 44,
          padding: '4px 0 10px', margin: '0 10px',
          boxShadow: `0 12px 0 ${KIDS.laneDark[lane]}`,
        }}>
          {n}<span style={{fontSize: 46, opacity: 0.85}}>/{total}</span>
        </div>
      </div>
    );
  };

export const KidsShort: React.FC<{baked: Baked; sfx?: string}> = ({baked, sfx}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  // The board freezes the instant the race is decided. Left running, the other
  // lanes catch up to 10/10 a second later and the reveal reads as a tie —
  // the scoreboard has to show the standing at the moment of the win.
  const counts = baked.counts[Math.min(frame, baked.decidedAt)];
  const decided = frame >= baked.decidedAt;

  // hook card: present from frame 0, gone before the race gets interesting
  const hookOut = interpolate(frame, [fps * 2.2, fps * 2.8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hookDrop = spring({frame, fps, config: {damping: 11, mass: 0.6}});

  const winPop = spring({frame: frame - baked.decidedAt, fps, config: {damping: 10, mass: 0.7}});
  // the board takes over the top of the frame as the hook card leaves it
  const boardIn = spring({frame: frame - fps * 2.5, fps, config: {damping: 12, mass: 0.6}});

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${KIDS.skyTop} 0%, ${KIDS.skyBottom} 100%)`}}>
      {sfx ? <Audio src={staticFile(sfx)} /> : null}

      <ThreeCanvas width={width} height={height} shadows camera={{fov: CAM.fov, position: CAM.pos as unknown as [number, number, number]}}>
        <Scene baked={baked} />
      </ThreeCanvas>

      {/* hook. Non-verbal everywhere else — this one line is what makes a
          scroller stop and pick a colour, which is also what makes them comment. */}
      <div
        style={{
          position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center',
          opacity: hookOut, transform: `translateY(${(1 - hookDrop) * -120}px)`,
          zIndex: 2,
        }}
      >
        <div style={{
          display: 'inline-block', fontFamily: KIDS.font, fontWeight: 900, fontSize: 92, lineHeight: 1.05,
          color: '#243B53', background: '#FFFFFF', borderRadius: 48, padding: '26px 44px',
          boxShadow: '0 14px 0 rgba(36,59,83,0.15)',
        }}>
          WHICH COLOUR<br />WINS?
        </div>
      </div>

      {/* Scoreboard sits at the TOP. The Shorts player covers the bottom of the
          frame with its own title, avatar and buttons — a score placed down
          there is a score nobody sees. */}
      <div style={{
        position: 'absolute', top: 80, left: 24, right: 24,
        display: 'flex', alignItems: 'flex-start',
      }}>
        {counts.map((n, lane) => (
          <Counter key={lane} lane={lane} n={n} total={10} won={lane === baked.winner}
            frame={frame} decidedAt={baked.decidedAt} show={boardIn} />
        ))}
      </div>

      {/* winner reveal */}
      {decided ? (
        <div style={{
          position: 'absolute', top: '34%', left: 0, right: 0, textAlign: 'center',
          transform: `scale(${0.6 + 0.4 * winPop}) rotate(${(1 - winPop) * -8}deg)`,
          zIndex: 3,
        }}>
          <div style={{
            display: 'inline-block', fontFamily: KIDS.font, fontWeight: 900, fontSize: 118, lineHeight: 1,
            color: '#FFFFFF', background: KIDS.lanes[baked.winner], borderRadius: 60, padding: '28px 56px',
            boxShadow: '0 16px 0 rgba(0,0,0,0.15)',
          }}>
            WINNER!
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
