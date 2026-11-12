import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Short, durationOf, ShortData} from './Short';
import {FPS} from './theme';
import data from '../data/001-38-studios.json';

const short = data as ShortData;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    durationInFrames={durationOf(short)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{data: short}}
  />
);
