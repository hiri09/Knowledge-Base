import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Pawn, Die, Tile, Stars, Scenery, Pose, PALETTE, FACE_UP} from './kidsChars';

// A gag, not a simulation. Physics gave the dice race its motion; comedy needs
// the opposite — every beat landing on a frame somebody chose. So this is a
// keyframe table, and retiming a joke means editing numbers in T below.
//
// The story, in case the numbers stop being readable: Blue rolls a 1. Yellow
// shoves in, rolls a 6, struts off. Blue tries harder, gets bonked by his own
// die — and it lands on 6. He races ahead in triumph, and the board drops him
// straight back to the start.

const T = {
  look: 14, windup: 34, jump: 56, slam: 72, settle1: 110,
  sad: 118,
  yellowIn: 142, shove: 160, yellowStomp: 178, settle6: 206, dance: 212, yellowGo: 232,
  blueUp: 278, bigWind: 292, launch: 306, bigSlam: 322,
  dieUp: 324, bonk: 346, dizzyEnd: 378, settleWin: 380,
  notice: 392, race: 404, raceEnd: 448,
  trap: 452, drop: 462, back: 480, pat: 508, end: 540,
};

// Staged further from camera than the first pass. At z=3 the die passed within
// two units of the lens on the bonk and filled the whole frame, and the hero's
// base was cropped by the bottom edge.
const TILE_Z = [0.6, -1.1, -2.8, -4.5, -6.2, -7.9, -9.6];
// closer and a little lower than the first pass: the characters were small
// in frame and the empty ground was doing most of the composition's work
const CAM = {fov: 42, pos: [0, 4.4, 9.6] as const, look: [0, 1.5, -3.0] as const};

const kf = (frame: number, pts: [number, number][], ease = false) =>
  interpolate(frame, pts.map((p) => p[0]), pts.map((p) => p[1]), {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: ease ? Easing.inOut(Easing.ease) : undefined,
  });

// a hop is an arc plus a squash on takeoff and landing — the two things that
// separate a character jumping from a box being moved
const arc = (frame: number, start: number, dur: number, h: number) => {
  const t = Math.min(1, Math.max(0, (frame - start) / dur));
  return 4 * h * t * (1 - t);
};
const land = (frame: number, at: number, depth = 0.26) =>
  frame < at ? 0 : -depth * Math.max(0, 1 - (frame - at) / 7);

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  camera.position.set(...(CAM.pos as unknown as [number, number, number]));
  camera.lookAt(...(CAM.look as unknown as [number, number, number]));
  camera.updateProjectionMatrix();

  // ---- BLUE ------------------------------------------------------------
  const blueZ = kf(frame, [
    [0, 3.4], [T.look, TILE_Z[0]],
    [T.race, TILE_Z[0]], [T.raceEnd, TILE_Z[5]],
    [T.drop, TILE_Z[5]], [T.back - 1, TILE_Z[5]], [T.back, TILE_Z[0]],
  ]);
  const blueX = kf(frame, [
    [0, -0.55], [T.shove, -0.55], [T.shove + 10, -1.85],
    [T.blueUp, -1.85], [T.blueUp + 16, -0.55],
  ]);
  const blueHop =
    arc(frame, 0, 26, 0.9) +                       // hops into frame
    arc(frame, T.jump, 18, 2.0) +                  // first stomp
    arc(frame, T.launch, 18, 2.6) +                // the big one
    [0, 1, 2, 3, 4].reduce((a, i) => a + arc(frame, T.race + i * 9, 9, 0.75), 0);
  const blueDrop = kf(frame, [[T.drop, 0], [T.drop + 10, -4.5], [T.back - 1, -4.5], [T.back, 3.6], [T.back + 7, 0]]);
  const blueSquash =
    1 +
    kf(frame, [[T.windup, 0], [T.windup + 10, -0.36], [T.jump, -0.36], [T.jump + 4, 0.22], [T.jump + 14, 0]]) +
    land(frame, T.slam, 0.3) +
    kf(frame, [[T.sad, 0], [T.sad + 14, -0.22], [T.yellowIn, -0.22], [T.blueUp, -0.22], [T.blueUp + 14, 0]]) +
    kf(frame, [[T.bigWind, 0], [T.bigWind + 12, -0.45], [T.launch, -0.45], [T.launch + 5, 0.3], [T.launch + 16, 0]]) +
    land(frame, T.bonk, 0.34) +
    land(frame, T.back + 7, 0.3) +
    kf(frame, [[T.notice, 0], [T.notice + 5, 0.2], [T.notice + 14, 0]]);
  const blueTilt =
    kf(frame, [[T.shove, 0], [T.shove + 8, 1.25], [T.blueUp, 1.25], [T.blueUp + 14, 0]]) +
    (frame > T.bonk && frame < T.dizzyEnd ? Math.sin((frame - T.bonk) * 0.55) * 0.22 : 0);
  const bluePose: Pose = {
    x: blueX, z: blueZ, y: Math.max(0, blueHop) + blueDrop,
    squash: blueSquash, tilt: blueTilt,
    turn: kf(frame, [[T.race, 0], [T.race + 6, 0]]),
    pupilX: kf(frame, [[0, 0], [T.look, 0.9], [T.settle1, 0.9], [T.sad, 0.2],
      [T.yellowIn, 1], [T.blueUp, 0.4], [T.notice, 1], [T.notice + 10, 0.2], [T.back, 0]]),
    pupilY: kf(frame, [[0, 0], [T.look, -0.5], [T.sad, -1], [T.blueUp, 0], [T.bonk, 0.6],
      [T.dizzyEnd, 0], [T.notice, 0.4], [T.trap, 0.4], [T.drop, 1], [T.back, -0.6]]),
    brow: kf(frame, [[0, 0], [T.windup, 1], [T.settle1, 1], [T.sad, -1], [T.blueUp, 1],
      [T.bonk, -0.4], [T.notice, 0], [T.trap, 0], [T.drop, -1]]),
    blink: Math.max(
      frame > T.bonk && frame < T.dizzyEnd ? 0.35 + Math.sin(frame * 0.8) * 0.25 : 0,
      kf(frame, [[T.pat, 0], [T.pat + 5, 1], [T.pat + 11, 0], [T.pat + 26, 0], [T.pat + 31, 1], [T.pat + 37, 0]]),
    ),
  };

  // ---- YELLOW ----------------------------------------------------------
  const yellowIn = frame > T.yellowIn - 24;
  const yellowPose: Pose = {
    x: kf(frame, [[T.yellowIn - 24, 5.2], // clear of the die at x=0.78: at 0.55 the two meshes intersected
      [T.yellowIn, 1.6], [T.shove, -0.2], [T.yellowStomp, -0.2]]),
    z: kf(frame, [[T.yellowIn, TILE_Z[0]], [T.yellowGo, TILE_Z[0]], [T.yellowGo + 34, TILE_Z[4]]]),
    y: Math.max(0, arc(frame, T.yellowStomp, 16, 1.7) +
      [0, 1, 2].reduce((a, i) => a + arc(frame, T.yellowGo + i * 11, 11, 0.8), 0)),
    squash: 1 +
      kf(frame, [[T.yellowStomp - 10, 0], [T.yellowStomp - 2, -0.3], [T.yellowStomp + 3, 0.2], [T.yellowStomp + 14, 0]]) +
      (frame > T.dance && frame < T.yellowGo ? Math.sin((frame - T.dance) * 0.5) * 0.12 : 0),
    turn: kf(frame, [[T.dance, 0], [T.yellowGo, Math.PI * 2]]),
    pupilX: kf(frame, [[T.yellowIn, -1], [T.dance, 0.6], [T.yellowGo, 0]]),
    pupilY: kf(frame, [[T.yellowIn, 0], [T.dance, 0.5]]),
    brow: kf(frame, [[T.yellowIn, 1], [T.dance, 0], [T.yellowGo, 0]]),
  };

  // ---- THE DIE ---------------------------------------------------------
  // It is a prop for most of the film and a character for the last beat.
  const TAU = Math.PI * 2;
  // Every tumble is a WHOLE number of turns, and the face the die rests on is
  // carried by `faceZ` alone. The first pass added 6.1 and 3.0 radians of spin,
  // which is 11 degrees shy of a turn on one axis and 172 off on another — so
  // the die settled on whatever face it happened to reach and the gag read
  // "he rolled a four" when the whole joke is that he rolled a one.
  const faceZ = kf(frame, [
    [0, FACE_UP[1][2]], [T.yellowStomp, FACE_UP[1][2]],
    [T.settle6, FACE_UP[6][2]], [T.settleWin, FACE_UP[6][2]],
  ]);
  const turns = (pts: [number, number][]) => kf(frame, pts) * TAU;
  const dieY =
    0.5 +
    Math.max(0, arc(frame, T.slam, 32, 1.4)) +
    Math.max(0, arc(frame, T.yellowStomp + 4, 30, 1.5)) +
    Math.max(0, arc(frame, T.dieUp, 46, 2.3)) +
    Math.max(0, arc(frame, T.pat, 18, 0.7));
  const dieX = kf(frame, [
    // kept inside the rails: at x=1.55 the die rested half behind the right
    // rail and the number it landed on — the whole beat — was not readable
    [0, 0.78], [T.slam, 0.78], [T.settle1, 0.78],
    [T.yellowStomp, 0.78], [T.settle6, 0.78],
    [T.dieUp, 1.0], [T.bonk, blueX + 0.1], [T.settleWin, blueX + 1.5],
    [T.pat, blueX + 1.5], [T.pat + 18, blueX + 1.05],
  ]);
  const dieRot: [number, number, number] = [
    turns([[T.slam, 0], [T.settle1, 2], [T.yellowStomp, 2], [T.settle6, 4], [T.dieUp, 4], [T.settleWin, 8]]),
    turns([[T.slam, 0], [T.settle1, 1], [T.dieUp, 1], [T.settleWin, 3]]),
    faceZ + turns([[T.dieUp, 0], [T.settleWin, 2]]),
  ];

  const starsShow = frame > T.bonk && frame < T.dizzyEnd
    ? Math.min(1, (frame - T.bonk) / 5) * Math.min(1, (T.dizzyEnd - frame) / 8) : 0;

  const trapFlip = kf(frame, [[T.trap, 0], [T.drop + 8, 1.5], [T.back - 2, 1.5], [T.back, 0]]);

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 12, 8]} intensity={1.6} castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12} shadow-camera-right={12}
        shadow-camera-top={12} shadow-camera-bottom={-12} />
      <directionalLight position={[-7, 5, 6]} intensity={0.4} color="#BFE6FF" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={0.95} />
      </mesh>
      <Scenery />

      {TILE_Z.map((z, i) => (
        <Tile key={i} i={i} z={z} color={i % 2 ? PALETTE.boardAlt : PALETTE.board}
          flip={i === 5 ? trapFlip : 0} />
      ))}

      <Pawn color="blue" pose={bluePose} />
      {yellowIn ? <Pawn color="yellow" pose={yellowPose} /> : null}
      <Die pos={[dieX, dieY, frame > T.dieUp ? blueZ + 0.15 : TILE_Z[0]]} rot={dieRot} size={0.92} />
      <Stars at={[blueX, 1.95, blueZ + 0.1]} spin={frame * 0.25} show={starsShow} />
    </>
  );
};

export const KidsComedy: React.FC<{sfx?: string}> = ({sfx}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();

  // One card, at the front, for the scroller who has not yet decided to stay.
  const hook = interpolate(frame, [0, 6, fps * 2.4, fps * 2.9], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${PALETTE.sky1} 0%, ${PALETTE.sky2} 100%)`}}>
      {sfx ? <Audio src={staticFile(sfx)} /> : null}
      <ThreeCanvas width={width} height={height} shadows
        camera={{fov: CAM.fov, position: CAM.pos as unknown as [number, number, number]}}>
        <Scene />
      </ThreeCanvas>

      <div style={{position: 'absolute', top: 76, left: 0, right: 0, textAlign: 'center', opacity: hook}}>
        <div style={{
          display: 'inline-block', fontFamily: '"Baloo 2", "Trebuchet MS", sans-serif', fontWeight: 900,
          fontSize: 86, lineHeight: 1.05, color: '#243B53', background: '#FFFFFF',
          borderRadius: 46, padding: '22px 42px', boxShadow: '0 14px 0 rgba(36,59,83,0.15)',
        }}>
          HE ONLY NEEDS<br />A SIX…
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const COMEDY_FRAMES = T.end;

// Thumbnail. Not a frame grab — the same scene held at the comic peak, pushed
// in so two faces and the stars survive the size a Shorts grid renders at, with
// one word. The channel page and search are where a Short's thumbnail is seen;
// the feed never shows it.
export const THUMB_FRAME = 352;

export const KidsComedyThumb: React.FC = () => (
  // Built on a real frame from the finished film, not on a re-render of the
  // scene. Two bespoke thumbnail cameras put the hero in a corner — the still
  // renderer does not frame the scene the way the film does, and a frame that
  // already shipped cannot disagree with the video it is advertising.
  // Re-cut the film? Re-grab the frame:
  //   ffmpeg -ss 11.75 -i out/kids-002-final.mp4 -frames:v 1 public/kids-002/thumbframe.png
  <AbsoluteFill>
    <Img src={staticFile('kids-002/thumbframe.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    <div style={{position: 'absolute', top: '6%', left: 0, right: 0, textAlign: 'center'}}>
      <div style={{
        display: 'inline-block', fontFamily: '"Baloo 2", "Trebuchet MS", sans-serif',
        fontWeight: 900, fontSize: 215, lineHeight: 1, color: '#FFD93D',
        WebkitTextStroke: '28px #243B53', paintOrder: 'stroke fill',
        transform: 'rotate(-7deg)',
        filter: 'drop-shadow(0 18px 0 rgba(36,59,83,0.28))',
      }}>
        OUCH!
      </div>
    </div>
  </AbsoluteFill>
);
