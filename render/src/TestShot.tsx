import React from 'react';
import {Set3D, SetScene} from './Set3D';
import {theme} from './theme';

// Smoke test for the set kit. Not a template and not part of any video — it
// renders one room from props.tsx through the same path Short.tsx uses, so a
// broken prop or a broken rig shows up here in 9 seconds instead of inside a
// 60-second render.
//
// It deliberately owns no geometry of its own. Everything it draws comes from
// the shared kit; if something is missing, the kit is missing it.

export const TEST_SCENE: SetScene = {
  room: 'boardroom',
  cam: {
    from: [-5.2, 4.2, 11.2],
    to: [1.9, 1.95, 5.4],
    look: [-0.8, 1.45, -1.6],
    lookTo: [0.5, 1.45, -1.6],
  },
  cast: [
    {x: -1.9, z: 1.0, coat: theme.palette.blue, turn: 0.55},
    {x: 1.5, z: 1.25, coat: '#9C3B2E', turn: -0.5, scale: 0.97},
    {x: -0.2, z: -2.0, coat: '#3B3746', turn: Math.PI + 0.1, scale: 1.02},
  ],
};

export const TestShot: React.FC = () => <Set3D scene={TEST_SCENE} />;
