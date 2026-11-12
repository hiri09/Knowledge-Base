import React from 'react';
import {Composition} from 'remotion';
import {Short, durationOf, ShortData, AudioData, MediaLock} from './Short';
import {FPS} from './theme';
import data from '../data/001-38-studios.json';
import audio from '../data/001-38-studios.audio.json';
import media from '../data/001-38-studios.media.lock.json';

const short = data as ShortData;
const aud = audio as AudioData;
const med = media as MediaLock;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    durationInFrames={durationOf(short, aud)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{data: short, audio: aud, media: med}}
  />
);
