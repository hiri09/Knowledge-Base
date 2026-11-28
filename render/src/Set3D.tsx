import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer, DepthOfField, Bloom, Vignette} from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  SET, Wall, SideWall, Floor, Ceiling, Pillar, Window, Table, Chair, Paper, Mug,
  Figure, SetLight, Lamp, Shelf, Monitor,
} from './props';
import {theme} from './theme';

export type Vec = [number, number, number];
export type Cast = {x: number; z: number; coat: string; turn?: number; scale?: number; brow?: number};
export type Cam = {from: Vec; to: Vec; look: Vec; lookTo?: Vec};
export type SetScene = {
  room: RoomName;
  cam: Cam;
  cast?: Cast[];
  tint?: string;
};

export type RoomName = 'boardroom' | 'office' | 'chamber' | 'studio' | 'newsroom';

/** Rooms are arrangements of the kit, not bespoke builds. A new room is a new
 *  entry here; it reuses the same walls, floor and furniture. */
const ROOMS: Record<RoomName, React.FC> = {
  boardroom: () => (
    <>
      <Wall gapAt={0} /> <SideWall /> <SideWall x={8.5} /> <Floor /> <Ceiling />
      <Pillar x={-6} /> <Pillar x={6} />
      <Window />
      <Table />
      <Chair x={-3.4} z={2.6} turn={0.5} />
      <Chair x={3.2} z={2.4} turn={-0.4} />
      <Paper x={0.9} z={-0.3} turn={0.36} />
      <Paper x={-1.5} z={-0.5} turn={-0.2} color={theme.palette.blue} />
      <Mug x={-2.3} z={-1.1} />
      <Lamp x={-6.4} z={-3.6} /> <Shelf x={6.3} z={-4.2} turn={-0.5} />
      <Monitor x={-3.4} z={-0.7} turn={0.5} />
    </>
  ),
  office: () => (
    <>
      <Wall color="#6B5E2E" panels={4} gapAt={-2.4} /> <SideWall color="#554A22" /> <SideWall x={8.5} color="#5F5428" /> <Floor color="#7A6B45" /> <Ceiling />
      <Pillar x={-5.4} color="#434C59" />
      <Window x={-2.4} />
      <Table z={-1.2} width={4.2} />
      <Chair x={-2.6} z={1.8} turn={0.3} color="#434C59" />
      <Paper x={0.4} z={-1.0} turn={0.2} />
      <Mug x={-1.3} z={-1.5} color={theme.palette.gold} />
      <Shelf x={4.6} z={-3.8} turn={-0.7} /> <Lamp x={-5.2} z={1.2} />
      <Monitor x={1.9} z={-1.3} turn={-0.4} />
    </>
  ),
  // A broadcast studio: dark walls, a lit desk, the glow coming off the set.
  studio: () => (
    <>
      <Wall color="#1F3350" panels={7} gapAt={0} />
      <SideWall color="#18283E" /> <SideWall x={8.5} color="#1B2E46" /> <Floor color="#243A52" /> <Ceiling y={8.4} color="#141F30" />
      <Pillar x={-5.6} color="#23262F" /> <Pillar x={5.6} color="#23262F" />
      <Window x={0} y={3.8} />
      <Table z={-1.0} width={4.6} />
      <Paper x={0.6} z={-0.9} turn={0.3} />
      <Mug x={-1.2} z={-1.3} color={theme.palette.gold} />
      <Monitor x={-2.8} z={-1.6} turn={0.45} /> <Lamp x={4.8} z={-2.6} />
    </>
  ),
  // Open-plan desks. Cooler and flatter than the studio on purpose, so the two
  // never read as the same screen.
  newsroom: () => (
    <>
      <Wall color="#2E5C4F" panels={6} gapAt={-4.3} />
      <SideWall color="#24473D" /> <SideWall x={8.5} color="#2A4F44" /> <Floor color="#5E7A63" /> <Ceiling />
      <Window x={-4.3} y={3.6} />
      <Table z={-3.4} width={7.0} />
      <Table z={0.4} width={7.0} />
      <Chair x={-2.6} z={-1.6} turn={0.2} color="#3A464D" />
      <Chair x={2.4} z={-1.5} turn={-0.3} color="#3A464D" />
      <Paper x={-1.8} z={-3.2} turn={0.4} color={theme.palette.blue} />
      <Paper x={1.9} z={0.6} turn={-0.25} />
      <Mug x={0.2} z={0.2} />
      <Monitor x={-3.0} z={-3.2} turn={0.3} /> <Monitor x={3.2} z={0.2} turn={-0.35} />
      <Shelf x={6.2} z={-2.4} turn={-0.6} /> <Lamp x={-6.0} z={2.0} />
    </>
  ),
  chamber: () => (
    <>
      <Wall color="#7A3B2A" panels={6} gapAt={0} /> <SideWall color="#5C2D20" /> <SideWall x={8.5} color="#683527" /> <Floor color="#6E5240" /> <Ceiling y={9} />
      <Pillar x={-7} /> <Pillar x={-3.5} /> <Pillar x={3.5} /> <Pillar x={7} />
      <Window x={0} y={4.4} />
      <Table z={-2.2} width={7.2} />
      <Paper x={1.4} z={-2.0} turn={0.5} />
      <Lamp x={-5.8} z={-1.4} /> <Lamp x={5.8} z={-1.4} />
      <Chair x={-2.2} z={0.6} turn={0.3} /> <Chair x={2.4} z={0.5} turn={-0.3} />
    </>
  ),
};

const Rig: React.FC<{cam: Cam}> = ({cam}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {camera, scene} = useThree();
  const t = frame / Math.max(1, durationInFrames - 1);

  // Fog desaturates distance; depth of field defocuses it. Both, because they
  // do different jobs and the reference has both.
  scene.fog = new THREE.Fog(SET.wallFar, 11, 28);

  // Linear, deliberately. An inOut ease parks the camera for a beat at both
  // ends of every shot, and with 17 shots that is 17 near-still moments —
  // motion_floor caught it. A gliding camera does not ease into each cut.
  const at = (a: number, b: number) => interpolate(t, [0, 1], [a, b]);
  camera.position.set(at(cam.from[0], cam.to[0]), at(cam.from[1], cam.to[1]), at(cam.from[2], cam.to[2]));
  const lookTo = cam.lookTo ?? cam.look;
  camera.lookAt(at(cam.look[0], lookTo[0]), at(cam.look[1], lookTo[1]), at(cam.look[2], lookTo[2]));
  camera.updateProjectionMatrix();
  return null;
};

export const Set3D: React.FC<{scene: SetScene}> = ({scene}) => {
  const {width, height} = useVideoConfig();
  const Room = ROOMS[scene.room] ?? ROOMS.boardroom;
  // Focus rides the camera's target so the subject stays sharp as it travels.
  const focus: Vec = scene.cam.look;
  return (
    <AbsoluteFill style={{backgroundColor: SET.wallFar}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 40}}>
        <Rig cam={scene.cam} />
        <SetLight />
        <Room />
        {(scene.cast ?? []).map((c, i) => (
          <Figure key={i} x={c.x} z={c.z} coat={c.coat} turn={c.turn} scale={c.scale} brow={c.brow} />
        ))}
        <EffectComposer>
          <DepthOfField target={focus} focalLength={0.028} bokehScale={5.5} />
          <Bloom intensity={0.5} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette darkness={0.42} offset={0.32} />
        </EffectComposer>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Straight-line camera travel in world units. The pixel motion probe is
 *  confounded by blur; this is the distance the camera actually moves, read
 *  from the plan, so critique.py can gate on movement that is declared rather
 *  than inferred. */
export const camTravel = (cam: Cam) =>
  Math.hypot(cam.to[0] - cam.from[0], cam.to[1] - cam.from[1], cam.to[2] - cam.from[2]);
