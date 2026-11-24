import React from 'react';
import {Composition} from 'remotion';
import {FPS} from './theme';
import {Thumbnail} from './Thumbnail';
import {TestShot} from './TestShot';

// ponytail: no video wired in yet post-reset. Re-add a `Short` composition
// (see git history before this reset for the pattern) once the next script's
// data/audio/media JSON exists.
export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="TestShot"
    component={TestShot}
    durationInFrames={90}
    fps={FPS}
    width={1080}
    height={1920}
  />
  <Composition
    id="Thumb"
    component={Thumbnail}
    durationInFrames={1}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{wide: false}}
  />
  <Composition
    id="ThumbWide"
    component={Thumbnail}
    durationInFrames={1}
    fps={FPS}
    width={1280}
    height={720}
    defaultProps={{wide: true}}
  />
  </>
);
