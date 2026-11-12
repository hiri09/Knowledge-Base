import React from 'react';
import {Composition} from 'remotion';
import {Short, durationOf, ShortData, AudioData} from './Short';
import {FPS} from './theme';
import data from '../data/001-38-studios.json';
import audio from '../data/001-38-studios.audio.json';

const short = data as ShortData;
const aud = audio as AudioData;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    durationInFrames={durationOf(short, aud)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{data: short, audio: aud}}
  />
);
