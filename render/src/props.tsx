import React from 'react';
import * as THREE from 'three';
import {theme} from './theme';

// The set kit. Every prop a shot needs lands HERE, never inline in a video's
// own file — that one habit is the difference between a library accumulating
// and four videos each owning a private copy of a chair.
//
// Video 1 builds most of this from nothing and is the expensive one. Video 2
// mostly arranges. By video 3 a boardroom, a courtroom and an office are the
// same parts in different order, which is what makes 3-4 good videos fit in
// the time instead of one.

export const SET = {
  wallFar: '#6E5566',
  wallSide: '#4A4457',
  floor: '#5E6B6A',
  ceiling: '#3B3746',
  wood: '#A8762F',
  trim: '#C8A24A',
  metal: '#8E94A3',
  ink: '#17131C',
};

// Toon shading needs a ramp or every surface renders as one flat tone. Four
// hard steps, nearest-filtered. Built once at module scope and shared by every
// material in every scene.
export const BANDS = (() => {
  const steps = new Uint8Array([28, 96, 178, 250]);
  const tex = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

type Vec = [number, number, number];

// ponytail: inverted hull — the same geometry again, scaled up a touch, back
// faces only, flat black. One extra draw per outlined object, no postprocessing
// pass. Swap for a depth/normal edge pass only if thin geometry shows seams.
export const Outlined: React.FC<{
  position?: Vec; rotation?: Vec; color: string; thickness?: number;
  castShadow?: boolean; receiveShadow?: boolean; children: React.ReactNode;
}> = ({position, rotation, color, thickness = 1.045, castShadow, receiveShadow, children}) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      {children}
      <meshToonMaterial gradientMap={BANDS} color={color} />
    </mesh>
    <mesh scale={thickness}>
      {children}
      <meshBasicMaterial color={SET.ink} side={THREE.BackSide} />
    </mesh>
  </group>
);

const Flat: React.FC<{position: Vec; rotation?: Vec; size: [number, number]; color: string}> = ({
  position, rotation, size, color,
}) => (
  <mesh position={position} rotation={rotation} receiveShadow>
    <planeGeometry args={size} />
    <meshToonMaterial gradientMap={BANDS} color={color} />
  </mesh>
);

/** A back wall with panelling. A bare plane has one surface angle, so it takes
 *  one shade and reads as card no matter how it is lit — the panels give it
 *  edges that catch light. */
export const Wall: React.FC<{z?: number; color?: string; panels?: number; gapAt?: number}> = ({
  z = -7, color = SET.wallFar, panels = 5, gapAt,
}) => (
  <group>
    <Flat position={[0, 4, z]} size={[26, 14]} color={color} />
    {Array.from({length: panels}, (_, i) => {
      const x = (i - (panels - 1) / 2) * 4.3;
      // A panel where the window goes would stand in front of it and leave a
      // lit sliver instead of an opening. Leave the bay empty.
      if (gapAt !== undefined && Math.abs(x - gapAt) < 2.2) return null;
      return (
        <group key={i}>
          <mesh position={[x, 3.1, z + 0.18]} castShadow>
            <boxGeometry args={[2.9, 4.6, 0.16]} />
            <meshToonMaterial gradientMap={BANDS} color={color} />
          </mesh>
          <mesh position={[x, 5.5, z + 0.26]}>
            <boxGeometry args={[3.1, 0.14, 0.1]} />
            <meshToonMaterial gradientMap={BANDS} color={SET.trim} />
          </mesh>
        </group>
      );
    })}
  </group>
);

export const SideWall: React.FC<{x?: number; color?: string}> = ({x = -8.5, color = SET.wallSide}) => (
  <Flat
    position={[x, 4, 0]}
    rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
    size={[18, 14]}
    color={color}
  />
);

export const Floor: React.FC<{color?: string}> = ({color = SET.floor}) => (
  <Flat position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[34, 26]} color={color} />
);

export const Ceiling: React.FC<{y?: number; color?: string}> = ({y = 7.6, color = SET.ceiling}) => (
  <Flat position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} size={[34, 26]} color={color} />
);

export const Pillar: React.FC<{x: number; z?: number; color?: string}> = ({
  x, z = -6.6, color = SET.wallSide,
}) => (
  <Outlined position={[x, 3.2, z]} color={color} thickness={1.01} castShadow>
    <boxGeometry args={[0.7, 7.4, 0.5]} />
  </Outlined>
);

/** A lit window. The bright plane is also the scene's visible light source, so
 *  the eye can find where the light comes from. */
export const Window: React.FC<{x?: number; y?: number; z?: number}> = ({
  x = 0, y = 3.6, z = -6.74,
}) => (
  <group position={[x, y, z]}>
    {/* glass at the back, mullions in front of it, and the surround built as
        four bars AROUND the opening. A solid slab in front — which is what the
        first attempt was — hides the glass and the whole thing reads as a flat
        amber panel. Order and shape both matter here. */}
    <mesh>
      <planeGeometry args={[3.3, 4.0]} />
      <meshBasicMaterial color="#FFEDC2" />
    </mesh>
    <mesh position={[0, 0, 0.03]}>
      <boxGeometry args={[0.08, 4.0, 0.02]} />
      <meshToonMaterial gradientMap={BANDS} color={SET.ceiling} />
    </mesh>
    <mesh position={[0, 0.6, 0.03]}>
      <boxGeometry args={[3.3, 0.08, 0.02]} />
      <meshToonMaterial gradientMap={BANDS} color={SET.ceiling} />
    </mesh>
    {([
      [0, 2.18, 3.9, 0.3],
      [0, -2.18, 3.9, 0.3],
      [-1.95, 0, 0.3, 4.66],
      [1.95, 0, 0.3, 4.66],
    ] as const).map(([bx, by, bw, bh], i) => (
      <Outlined key={i} position={[bx, by, 0.07]} color={SET.trim} thickness={1.02} castShadow>
        <boxGeometry args={[bw, bh, 0.22]} />
      </Outlined>
    ))}
  </group>
);

export const Table: React.FC<{z?: number; width?: number}> = ({z = -0.6, width = 5.8}) => (
  <group>
    <Outlined position={[0, 0.94, z]} color={SET.wood} thickness={1.012} castShadow receiveShadow>
      <boxGeometry args={[width, 0.18, 2.3]} />
    </Outlined>
    <mesh position={[0, 1.04, z]}>
      <boxGeometry args={[width - 0.3, 0.012, 2.05]} />
      <meshBasicMaterial color={SET.trim} />
    </mesh>
    {[-width / 2.4, width / 2.4].map((x) => (
      <mesh key={x} position={[x, 0.46, z]} castShadow>
        <boxGeometry args={[0.3, 0.92, 0.3]} />
        <meshToonMaterial gradientMap={BANDS} color={SET.ceiling} />
      </mesh>
    ))}
  </group>
);

export const Chair: React.FC<{x: number; z: number; turn?: number; color?: string}> = ({
  x, z, turn = 0, color = SET.ceiling,
}) => (
  <group position={[x, 0, z]} rotation={[0, turn, 0]}>
    <Outlined position={[0, 1.05, -0.3]} color={color} thickness={1.03} castShadow>
      <boxGeometry args={[1.0, 1.4, 0.16]} />
    </Outlined>
    <Outlined position={[0, 0.5, 0]} color={color} thickness={1.03} castShadow>
      <boxGeometry args={[1.0, 0.15, 0.9]} />
    </Outlined>
  </group>
);

export const Paper: React.FC<{x: number; z: number; turn?: number; color?: string; y?: number}> = ({
  x, z, turn = 0, color = theme.accent, y = 1.08,
}) => (
  <Outlined position={[x, y, z]} rotation={[0, turn, 0]} color={color} thickness={1.05} castShadow>
    <boxGeometry args={[0.76, 0.05, 0.56]} />
  </Outlined>
);

export const Mug: React.FC<{x: number; z: number; color?: string}> = ({x, z, color = theme.palette.teal}) => (
  <Outlined position={[x, 1.14, z]} color={color} thickness={1.05} castShadow>
    <cylinderGeometry args={[0.13, 0.16, 0.26, 18]} />
  </Outlined>
);

/** Our own character. Tapered body, rounded head, two brow bars doing all the
 *  expression. No limbs — at Shorts scale posture reads and fingers do not. */
export const Figure: React.FC<{
  x: number; z: number; coat: string; turn?: number; scale?: number; brow?: number;
}> = ({x, z, coat, turn = 0, scale = 1, brow = 0.22}) => (
  <group position={[x, 0, z]} rotation={[0, turn, 0]} scale={scale}>
    <Outlined position={[0, 0.62, 0]} color={coat} thickness={1.06} castShadow>
      <cylinderGeometry args={[0.29, 0.44, 1.24, 28]} />
    </Outlined>
    {[-1, 1].map((sx) => (
      <group key={sx} position={[sx * 0.3, 0.92, 0.06]} rotation={[0.18, 0, sx * 0.42]}>
        <Outlined color={coat} thickness={1.1} castShadow>
          <cylinderGeometry args={[0.085, 0.115, 0.78, 16]} />
        </Outlined>
        <mesh position={[sx * 0.055, -0.44, 0.02]} castShadow>
          <sphereGeometry args={[0.095, 16, 14]} />
          <meshToonMaterial gradientMap={BANDS} color="#EFD8BE" />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 1.25, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.3, 0.12, 22]} />
      <meshToonMaterial gradientMap={BANDS} color="#D9D2C4" />
    </mesh>
    <Outlined position={[0, 1.63, 0]} color="#EFD8BE" thickness={1.055} castShadow>
      <sphereGeometry args={[0.36, 30, 26]} />
    </Outlined>
    {[-0.125, 0.125].map((ex) => (
      <mesh key={ex} position={[ex, 1.67, 0.335]}>
        <circleGeometry args={[0.038, 16]} />
        <meshBasicMaterial color={SET.ink} />
      </mesh>
    ))}
    {[-0.13, 0.13].map((ex, k) => (
      <mesh key={ex} position={[ex, 1.75, 0.335]} rotation={[0, 0, k ? -brow : brow]}>
        <boxGeometry args={[0.1, 0.022, 0.008]} />
        <meshBasicMaterial color={SET.ink} />
      </mesh>
    ))}
    <mesh position={[0, 1.53, 0.34]}>
      <boxGeometry args={[0.1, 0.02, 0.008]} />
      <meshBasicMaterial color={SET.ink} />
    </mesh>
  </group>
);

/** One hard key, a cool bounce, and a rim behind the subject. Built once so
 *  every scene is lit the same way rather than re-tuned per shot.
 *  v3 of the test shot proved the failure mode: adding lamps lifts the shadows
 *  and costs contrast. Depth comes from ONE strong key and deep shadow. */
export const SetLight: React.FC<{warm?: string}> = ({warm = '#FFE2B4'}) => (
  <>
    <ambientLight intensity={0.45} color="#D8E2F0" />
    <directionalLight
      position={[4, 10, 7]}
      intensity={3.1}
      color={warm}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-14}
      shadow-camera-right={14}
      shadow-camera-top={14}
      shadow-camera-bottom={-5}
    />
    <directionalLight position={[-9, 5, 3]} intensity={0.35} color={theme.palette.blue} />
    <directionalLight position={[-2.5, 5.5, -8]} intensity={2.2} color="#FFF0D2" />
  </>
);


export const Lamp: React.FC<{x: number; z: number; color?: string}> = ({x, z, color = SET.trim}) => (
  <group position={[x, 0, z]}>
    <Outlined position={[0, 0.08, 0]} color={SET.ceiling} thickness={1.03} castShadow>
      <cylinderGeometry args={[0.26, 0.32, 0.16, 18]} />
    </Outlined>
    <mesh position={[0, 1.1, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, 2.0, 12]} />
      <meshToonMaterial gradientMap={BANDS} color={SET.metal} />
    </mesh>
    <Outlined position={[0, 2.26, 0]} color={color} thickness={1.04} castShadow>
      <cylinderGeometry args={[0.44, 0.3, 0.46, 20]} />
    </Outlined>
    <mesh position={[0, 2.06, 0]}>
      <circleGeometry args={[0.4, 20]} />
      <meshBasicMaterial color="#FFE6AE" />
    </mesh>
  </group>
);

export const Shelf: React.FC<{x: number; z: number; turn?: number}> = ({x, z, turn = 0}) => (
  <group position={[x, 0, z]} rotation={[0, turn, 0]}>
    <Outlined position={[0, 1.3, 0]} color={SET.wood} thickness={1.015} castShadow>
      <boxGeometry args={[2.2, 2.6, 0.5]} />
    </Outlined>
    {[0.6, 1.3, 2.0].map((y, r) => (
      <group key={y}>
        <mesh position={[0, y, 0.27]}>
          <boxGeometry args={[2.0, 0.06, 0.04]} />
          <meshToonMaterial gradientMap={BANDS} color={SET.trim} />
        </mesh>
        {[-0.6, -0.1, 0.45].map((bx, c) => (
          <mesh key={bx} position={[bx + r * 0.08, y + 0.2, 0.2]} castShadow>
            <boxGeometry args={[0.16, 0.34, 0.12]} />
            <meshToonMaterial gradientMap={BANDS}
              color={[theme.palette.blue, theme.palette.teal, theme.accent][(r + c) % 3]} />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

export const Monitor: React.FC<{x: number; z: number; turn?: number; y?: number}> = ({
  x, z, turn = 0, y = 1.05,
}) => (
  <group position={[x, y, z]} rotation={[0, turn, 0]}>
    <Outlined position={[0, 0.45, 0]} color={SET.ceiling} thickness={1.04} castShadow>
      <boxGeometry args={[1.15, 0.72, 0.09]} />
    </Outlined>
    <mesh position={[0, 0.45, 0.06]}>
      <planeGeometry args={[1.0, 0.58]} />
      <meshBasicMaterial color="#9FD8E8" />
    </mesh>
    <mesh position={[0, 0.06, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.26, 0.12, 14]} />
      <meshToonMaterial gradientMap={BANDS} color={SET.ceiling} />
    </mesh>
  </group>
);
