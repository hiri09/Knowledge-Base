import React from 'react';
import {AbsoluteFill, Img, staticFile, useVideoConfig} from 'remotion';
import {theme} from './theme';

// Packaging rules from pipeline/agents/packager.md:
//   one saturated element against a muted frame
//   negative emotion reads faster than positive
//   the thumbnail keeps the TITLE's promise, not the story's summary
//
// The Gate 2 concept (`1,000,000` cracked, "STILL BANKRUPT") was written for
// 001's title. 002 promises a state betting $75M, so the figure changes and
// the frame follows the same grammar.
//
// Deliberately no face. The rules say a readable emotion on a face out-pulls
// everything else, and the only real faces available are the developers in the
// archive interview — putting one of them beside a failure headline implies
// they were responsible for it, which the script is careful never to say.
// Reach is not worth that.

export const Thumbnail: React.FC<{wide?: boolean}> = ({wide = false}) => {
  const {width, height} = useVideoConfig();
  const unit = Math.min(width, height);

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg, fontFamily: theme.font, overflow: 'hidden'}}>
      {/* muted frame: the state seal, pushed well back */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('media/statehouse.jpg')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(1) contrast(1.15) brightness(0.42)',
          transform: 'scale(1.15)',
        }}
      />
      <AbsoluteFill style={{backgroundColor: theme.shadow, opacity: 0.5, mixBlendMode: 'multiply'}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 46%, transparent 30%, ${theme.bg}E6 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: wide ? '0 6%' : '0 7%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: unit * (wide ? 0.058 : 0.062),
            fontWeight: 800,
            letterSpacing: unit * 0.006,
            color: theme.text,
            opacity: 0.86,
            marginBottom: unit * 0.025,
          }}
        >
          A US STATE BET
        </div>

        {/* the one saturated element, cracked across the middle */}
        <div style={{position: 'relative'}}>
          <div
            style={{
              fontSize: unit * (wide ? 0.175 : 0.172),
              fontWeight: 900,
              letterSpacing: unit * -0.004,
              color: theme.accent,
              lineHeight: 0.95,
              textShadow: `0 ${unit * 0.012}px ${unit * 0.06}px rgba(0,0,0,0.85), 0 0 ${unit * 0.09}px ${theme.accent}55`,
              whiteSpace: 'nowrap',
            }}
          >
            $75,000,000
          </div>
          <div
            style={{
              position: 'absolute',
              left: '-3%',
              top: '60%',
              width: '106%',
              height: unit * 0.0065,
              backgroundColor: theme.bg,
              transform: 'rotate(-1.6deg)',
            }}
          />
        </div>

        <div
          style={{
            fontSize: unit * (wide ? 0.072 : 0.068),
            whiteSpace: 'nowrap',
            fontWeight: 900,
            color: theme.text,
            marginTop: unit * 0.03,
            lineHeight: 1.04,
            textShadow: `0 ${unit * 0.01}px ${unit * 0.05}px rgba(0,0,0,0.9)`,
          }}
        >
          ON ONE VIDEO GAME
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
