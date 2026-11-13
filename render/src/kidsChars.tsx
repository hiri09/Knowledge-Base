import React, {useMemo} from 'react';
import * as THREE from 'three';

// Procedural characters. No rig, no model files — a pawn is a cone, a ball and
// two eyes, and the whole performance lives in three numbers: squash, where the
// pupils point, and how far the brows are down. That is deliberate rather than
// a shortcut: toddlers read eyes and timing, and a shape this simple can be
// posed frame by frame without an animation pipeline to maintain.

export const PALETTE = {
  red: '#FF5A5F', yellow: '#FFC93C', blue: '#4D9DFF', green: '#5FD38D',
  redDark: '#D6383F', yellowDark: '#D9A21F', blueDark: '#2E74D9',
  board: '#FFF3DC', boardAlt: '#FFE3B8', ground: '#CFEFD8',
  sky1: '#FFF6E5', sky2: '#BFE6FF',
};

const pipLayout: number[][][] = [
  [[0, 0]],
  [[-1, 1], [1, -1]],
  [[-1, 1], [0, 0], [1, -1]],
  [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
  [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
];

export const faceTexture = (color: string, pips: number) => {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S * 0.5, S * 0.5, S * 0.85);
  grad.addColorStop(0, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0.1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#E8413F';
  for (const [px, py] of pipLayout[pips - 1]) {
    g.beginPath();
    g.arc(S / 2 + px * S * 0.26, S / 2 + py * S * 0.26, S * 0.09, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export type Pose = {
  x: number; z: number; y?: number;
  squash?: number;   // 1 = rest. <1 crouch and widen, >1 stretch and narrow
  turn?: number;     // yaw, radians
  tilt?: number;     // lean, radians — a tipped-over pawn is tilt ~1.4
  pupilX?: number; pupilY?: number;
  brow?: number;     // 0 neutral, 1 angry/determined, -1 sad
  blink?: number;    // 0 open, 1 shut
};

export const Pawn: React.FC<{color: 'red' | 'yellow' | 'blue' | 'green'; pose: Pose}> = ({color, pose}) => {
  const body = PALETTE[color];
  const dark = PALETTE[`${color}Dark` as 'redDark'] ?? body;
  const s = pose.squash ?? 1;
  // volume is conserved: a squashed character widens, or it reads as shrinking
  const w = 1 / Math.sqrt(s);
  const px = pose.pupilX ?? 0;
  const py = pose.pupilY ?? 0;
  const brow = pose.brow ?? 0;
  const blink = pose.blink ?? 0;

  const eye = (side: 1 | -1) => (
    <group position={[side * 0.19, 0.06, 0.34]}>
      <mesh>
        <sphereGeometry args={[0.155, 20, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      <mesh position={[px * 0.07, py * 0.06, 0.1]}>
        <sphereGeometry args={[0.072, 16, 14]} />
        <meshStandardMaterial color="#20303F" roughness={0.25} />
      </mesh>
      {/* eyelid, doubling as the blink and the sad droop */}
      <mesh position={[0, 0.082 - blink * 0.1, 0.085]} scale={[1, Math.max(0.001, blink), 1]}>
        <boxGeometry args={[0.3, 0.2, 0.12]} />
        <meshStandardMaterial color={body} roughness={0.6} />
      </mesh>
      {/* brow — the single most legible emotion control on a face this simple */}
      <mesh position={[0, 0.2 - Math.max(0, brow) * 0.06, 0.1]} rotation={[0, 0, side * brow * 0.6]}>
        <boxGeometry args={[0.26, 0.055, 0.08]} />
        <meshStandardMaterial color="#20303F" roughness={0.5} />
      </mesh>
    </group>
  );

  return (
    <group position={[pose.x, pose.y ?? 0, pose.z]} rotation={[0, pose.turn ?? 0, pose.tilt ?? 0]}>
      <group scale={[w, s, w]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.56, 0.14, 28]} />
          <meshStandardMaterial color={dark} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.5, 0.65, 28]} />
          <meshStandardMaterial color={body} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial color={body} roughness={0.45} />
        </mesh>
        <group position={[0, 1.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.44, 28, 24]} />
            <meshStandardMaterial color={body} roughness={0.45} />
          </mesh>
          {eye(1)}
          {eye(-1)}
        </group>
      </group>
    </group>
  );
};

export const Die: React.FC<{pos: [number, number, number]; rot: [number, number, number]; size?: number}> =
  ({pos, rot, size = 1.15}) => {
    // material order is +x,-x,+y,-y,+z,-z; opposite faces sum to 7, as on a
    // real die, so a baked rotation lands on a face that actually makes sense
    const mats = useMemo(
      () => [1, 6, 2, 5, 3, 4].map((p) =>
        new THREE.MeshStandardMaterial({map: faceTexture('#FFFFFF', p), roughness: 0.4})),
      [],
    );
    return (
      <mesh position={pos} rotation={rot} material={mats} castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
      </mesh>
    );
  };

// Rotations that put a given number face-up. Keyed by the value the gag needs.
export const FACE_UP: Record<number, [number, number, number]> = {
  1: [0, 0, Math.PI / 2],
  2: [0, 0, 0],
  3: [Math.PI / 2, 0, 0],
  4: [-Math.PI / 2, 0, 0],
  5: [Math.PI, 0, 0],
  6: [0, 0, -Math.PI / 2],
};

export const Stars: React.FC<{at: [number, number, number]; spin: number; show: number}> = ({at, spin, show}) =>
  show <= 0 ? null : (
    <group position={at}>
      {[0, 1, 2].map((i) => {
        const a = spin + (i * Math.PI * 2) / 3;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.78, Math.sin(a * 2) * 0.12, Math.sin(a) * 0.78]}
            rotation={[a, a, 0]} scale={show}>
            <octahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color={PALETTE.yellow} emissive={PALETTE.yellow} emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );

// The empty field around the board was the weakest thing in the first pass:
// one flat green plane from the horizon to the bottom edge. Scenery is cheap
// here — a mat to sit the board on, rails to give the track an edge, bushes to
// break the field, and clouds so the sky band is not a blank strip.
export const Scenery: React.FC = () => (
  <>
    <mesh position={[0, -0.2, -2]} receiveShadow>
      <boxGeometry args={[9.5, 0.14, 34]} />
      <meshStandardMaterial color="#FFF8EC" roughness={0.9} />
    </mesh>
    {[-1.42, 1.42].map((x, i) => (
      <mesh key={i} position={[x, 0.02, -2]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.42, 30]} />
        <meshStandardMaterial color={PALETTE.red} roughness={0.6} />
      </mesh>
    ))}
    {[[-3.5, 2.5, 0.95], [-4.6, -2.0, 1.3], [-3.2, -7.5, 0.8], [-5.2, -12, 1.5],
      [3.6, 1.0, 1.1], [4.4, -4.5, 0.85], [3.3, -9.5, 1.25], [5.0, -14, 1.4]].map(([x, z, r], i) => (
      <group key={`b${i}`} position={[x, 0, z]}>
        <mesh position={[0, r * 0.45, 0]} scale={[1, 0.75, 1]} castShadow receiveShadow>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial color={i % 2 ? '#7FD6A0' : '#63C98C'} roughness={0.9} />
        </mesh>
      </group>
    ))}
    {[[-7, 8.5, -22], [6, 9.6, -26], [-2, 11, -30]].map(([x, y, z], i) => (
      <group key={`c${i}`} position={[x, y, z]}>
        {[[0, 0, 0, 1.6], [1.5, -0.3, 0, 1.2], [-1.5, -0.25, 0, 1.1]].map(([dx, dy, dz, r], j) => (
          <mesh key={j} position={[dx, dy, dz]}>
            <sphereGeometry args={[r, 16, 12]} />
            {/* unlit: a shaded cloud at this scale read as a grey smoke blob */}
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>
    ))}
  </>
);

export const Tile: React.FC<{i: number; z: number; color: string; flip?: number}> = ({z, color, flip = 0}) => (
  <group position={[0, 0, z]} rotation={[flip, 0, 0]}>
    <mesh position={[0, -0.12, 0]} receiveShadow>
      <boxGeometry args={[2.0, 0.24, 1.85]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  </group>
);
