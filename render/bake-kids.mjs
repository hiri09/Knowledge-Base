// Bakes the dice race to a frame table.
//
// Remotion renders frames out of order and in parallel, so a live physics step
// inside the component would desync. The sim runs ONCE here, in Node, and the
// component just reads row N. Same bytes every render, and critique can be run
// against a cut that will not change under it.
// ponytail: bake to JSON, no physics in the renderer. Re-run only to re-roll.
import {World, Body, Box, Sphere, Plane, Vec3, Material, ContactMaterial} from 'cannon-es';
import {writeFileSync, mkdirSync} from 'node:fs';

const FPS = 30;
const SECONDS = 12;
const FRAMES = FPS * SECONDS;
const SUBSTEPS = 4; // 120Hz under a 30fps frame — stable at dice size 0.55

const LANES = 3;
const LANE_W = 3.3;
const DICE_PER_LANE = 10;
const DIE = 0.55;          // half-extent is DIE/2
const SPAWN_Y = 19.5;
const FLOOR_Y = 0;
const Z_LIMIT = 0.6;       // thin slab — the race reads as 2D in a 9:16 frame
const laneX = (i) => (i - (LANES - 1) / 2) * LANE_W;

// Seeded, so a re-run reproduces the exact race. Change SEED to re-roll it.
const SEED = 20261113;
const rng = (() => {
  let a = SEED >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

const FINISH_Y_CHECK = 2.6;
const world = new World({gravity: new Vec3(0, -12, 0)});
world.defaultContactMaterial.friction = 0.12;

const matWall = new Material('wall');
const matDie = new Material('die');
world.addContactMaterial(new ContactMaterial(matDie, matWall, {friction: 0.03, restitution: 0.45}));
world.addContactMaterial(new ContactMaterial(matDie, matDie, {friction: 0.2, restitution: 0.18}));

const staticBox = (hx, hy, hz, x, y, z = 0) => {
  const b = new Body({mass: 0, material: matWall, shape: new Box(new Vec3(hx, hy, hz))});
  b.position.set(x, y, z);
  world.addBody(b);
  return b;
};

// floor
const floor = new Body({mass: 0, material: matWall, shape: new Plane()});
floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
floor.position.set(0, FLOOR_Y, 0);
world.addBody(floor);

// front/back slab walls keep the race in one plane
for (const z of [-Z_LIMIT, Z_LIMIT]) {
  const w = new Body({mass: 0, material: matWall, shape: new Plane()});
  if (z > 0) w.quaternion.setFromEuler(0, Math.PI, 0);
  w.position.set(0, 0, z);
  world.addBody(w);
}

// lane dividers, including the two outer walls
for (let i = 0; i <= LANES; i++) {
  staticBox(0.06, 10.5, Z_LIMIT, laneX(0) - LANE_W / 2 + i * LANE_W, 10.5);
}

// peg field — identical in every lane, so the race is fair and the winner is
// decided by contact chaos rather than by geometry
const pegs = [];
const PEG_R = 0.11;
// ONE peg per row, offset on a 5-row cycle. Two pegs in a row cannot fit three
// gaps wider than a tumbling cube's diagonal (0.78) inside a 3.18 lane, and any
// gap narrower than that wedges a die and stops the lane dead. One small peg
// leaves gaps of 1.0+ on both sides — it deflects without ever trapping.
for (let lane = 0; lane < LANES; lane++) {
  let row = 0;
  for (let y = 16; y >= 3.2; y -= 1.4, row++) {
    const offs = [[-0.5], [0.5], [0], [0.62], [-0.62]][row % 5];
    for (const o of offs) {
      const b = new Body({mass: 0, material: matWall, shape: new Sphere(PEG_R)});
      b.position.set(laneX(lane) + o, y, 0);
      world.addBody(b);
      pegs.push([+(laneX(lane) + o).toFixed(3), +y.toFixed(3)]);
    }
  }
}

// dice. The release is front-loaded on purpose: 50-60% of a Short's drop-off
// happens in the first 3 seconds, and an arena holding two falling dice at the
// 1 second mark is an empty frame. Four per lane arrive almost at once, then
// the rest spread out to keep the race alive.
const dice = [];
for (let lane = 0; lane < LANES; lane++) {
  for (let n = 0; n < DICE_PER_LANE; n++) {
    const b = new Body({
      mass: 1,
      material: matDie,
      shape: new Box(new Vec3(DIE / 2, DIE / 2, DIE / 2)),
      linearDamping: 0.01,
      angularDamping: 0.06,
      // ponytail: sleeping OFF. A die that balances on a peg crosses the sleep
      // threshold and hangs in mid-air forever — it never topples off.
      allowSleep: false,
    });
    b.position.set(laneX(lane) + (rng() - 0.5) * 0.7, SPAWN_Y, 0);
    b.quaternion.setFromEuler(rng() * 6.28, rng() * 6.28, rng() * 6.28);
    b.angularVelocity.set((rng() - 0.5) * 4, (rng() - 0.5) * 4, (rng() - 0.5) * 4);
    b.collisionResponse = false; // held above the gate until its release frame
    b.type = Body.STATIC;
    dice.push({body: b, lane, release: Math.round((n < 4 ? n * 7 : 21 + (n - 3) * 27) + lane * 5), pip: 1 + Math.floor(rng() * 6)});
    world.addBody(b);
  }
}

// bounce events, for sound design derived from the actual sim
const events = [];
let frame = 0;
for (const d of dice) {
  d.body.addEventListener('collide', (e) => {
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v > 1.2) events.push([frame, +Math.min(1, v / 9).toFixed(3), d.lane]);
  });
}

const rows = [];
for (frame = 0; frame < FRAMES; frame++) {
  for (const d of dice) {
    if (d.body.type === Body.STATIC && frame >= d.release) {
      d.body.type = Body.DYNAMIC;
      d.body.collisionResponse = true;
      d.body.wakeUp();
    }
  }
  for (let s = 0; s < SUBSTEPS; s++) world.step(1 / (FPS * SUBSTEPS));

  // ponytail: jam breaker, escalating. A velocity impulse cannot free a die
  // that is stably supported — a balanced stack above the first peg row sat
  // there for the whole 20s. So the nudge escalates to a small POSITION shift
  // toward the lane centre, which no stable contact can resist. At playback it
  // reads as a settle-and-slip; nothing else frees it.
  if (frame % 10 === 9) {
    for (const d of dice) {
      if (d.body.type !== Body.DYNAMIC) continue;
      const p = d.body.position;
      if (p.y < FINISH_Y_CHECK) { d.stuck = 0; d.last = p.y; continue; }
      if (d.last !== undefined && Math.abs(p.y - d.last) < 0.03) {
        d.stuck = (d.stuck || 0) + 1;
        const toCentre = Math.sign(laneX(d.lane) - p.x) || 1;
        d.body.velocity.x += toCentre * (0.8 + 0.6 * d.stuck);
        d.body.velocity.y -= 1.2;
        d.body.angularVelocity.z += (rng() - 0.5) * 6;
        if (d.stuck >= 2) {
          p.x += toCentre * 0.12;
          p.y -= 0.08;
        }
      } else {
        d.stuck = 0;
      }
      d.last = p.y;
    }
  }

  const row = [];
  for (const d of dice) {
    const p = d.body.position, q = d.body.quaternion;
    row.push(
      +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3),
      +q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3), +q.w.toFixed(3),
    );
  }
  rows.push(row);
}

// a die has finished when it is below the peg field and has settled
const FINISH_Y = 2.6;
const finishFrame = dice.map(() => -1);
for (let f = 0; f < FRAMES; f++) {
  dice.forEach((d, i) => {
    if (finishFrame[i] !== -1) return;
    if (rows[f][i * 7 + 1] < FINISH_Y) finishFrame[i] = f;
  });
}
const perLane = Array.from({length: LANES}, () => 0);
const countByFrame = [];
for (let f = 0; f < FRAMES; f++) {
  const c = Array.from({length: LANES}, () => 0);
  dice.forEach((d, i) => {
    if (finishFrame[i] !== -1 && finishFrame[i] <= f) c[d.lane]++;
  });
  countByFrame.push(c);
}
dice.forEach((d, i) => {
  if (finishFrame[i] !== -1) perLane[d.lane]++;
});

// winner: first lane to land all of its dice; ties broken by the earlier finish
const laneDone = Array.from({length: LANES}, (_, l) => {
  const fs = dice.map((d, i) => (d.lane === l ? finishFrame[i] : -1)).filter((f) => f !== -1);
  return fs.length === DICE_PER_LANE ? Math.max(...fs) : Infinity;
});
let winner = 0;
for (let l = 1; l < LANES; l++) {
  if (laneDone[l] < laneDone[winner] || (laneDone[l] === laneDone[winner] && perLane[l] > perLane[winner])) winner = l;
}
const decidedAt = Number.isFinite(laneDone[winner]) ? laneDone[winner] : FRAMES - 150;

mkdirSync(new URL('./data/', import.meta.url), {recursive: true});
writeFileSync(
  new URL('./data/kids-001.frames.json', import.meta.url),
  JSON.stringify({
    fps: FPS, frames: FRAMES, lanes: LANES, laneW: LANE_W, diceSize: DIE,
    laneX: Array.from({length: LANES}, (_, i) => +laneX(i).toFixed(3)),
    pegs, pegR: PEG_R, floorY: FLOOR_Y, finishY: FINISH_Y,
    dice: dice.map((d) => ({lane: d.lane, pip: d.pip})),
    counts: countByFrame, winner, decidedAt,
    rows,
  }),
);
writeFileSync(new URL('./data/kids-001.events.json', import.meta.url), JSON.stringify({fps: FPS, events}));

console.log(`lanes finished: ${perLane.join(' ')}`);
console.log(`winner lane ${winner}, decided at frame ${decidedAt} (${(decidedAt / FPS).toFixed(1)}s)`);
console.log(`bounce events: ${events.length}`);
