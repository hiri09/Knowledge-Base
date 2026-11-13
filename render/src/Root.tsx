import React from 'react';
import {Composition} from 'remotion';
import {Short, durationOf, ShortData, AudioData, MediaLock} from './Short';
import {KidsShort, Baked} from './KidsShort';
import kids001 from '../data/kids-001.frames.json';
import {FPS} from './theme';
// Which video is being worked on. One line, and `npm run render` reads the
// same file, so the id can never be set in two places and disagree.
import current from '../data/current.json';
import d001 from '../data/001-38-studios.json';
import a001 from '../data/001-38-studios.audio.json';
import m001 from '../data/001-38-studios.media.lock.json';
import d002 from '../data/002-the-pitcher.json';
import a002 from '../data/002-the-pitcher.audio.json';
import m002 from '../data/002-the-pitcher.media.lock.json';

const BY_ID: Record<string, {data: unknown; audio: unknown; media: unknown}> = {
  '001-38-studios': {data: d001, audio: a001, media: m001},
  '002-the-pitcher': {data: d002, audio: a002, media: m002},
};

const picked = BY_ID[(current as {id: string}).id];
const short = picked.data as ShortData;
const aud = picked.audio as AudioData;
const med = picked.media as MediaLock;

const kidsBaked = kids001 as unknown as Baked;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Short"
    component={Short}
    durationInFrames={durationOf(short, aud)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{data: short, audio: aud, media: med}}
  />
  <Composition
    id="KidsShort"
    component={KidsShort}
    durationInFrames={kidsBaked.frames}
    fps={kidsBaked.fps}
    width={1080}
    height={1920}
    defaultProps={{baked: kidsBaked, sfx: 'kids-001/sfx.wav'}}
  />
  </>
);
