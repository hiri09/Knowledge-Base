import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

// Packaging rules from pipeline/agents/packager.md:
//   one saturated element against a muted frame
//   negative emotion reads faster than positive
//   the thumbnail keeps the TITLE's promise, not the story's summary
//
// Rebuilt light 2026-11-14 on Himanshu's note: a failure story does not have to
// be told in the dark. Dark-equals-serious is the faceless-channel default, so
// it reads as generic — Kurzgesagt covers extinction in candy colour and Company
// Man runs failures on white. Light is the differentiator here, not a softening
// of the subject. The *verdict* carries the weight, not the background.
//
// The frame shows the thing it is counting. 002 and the dark 001 both put a
// number over a ground and nothing else; the count is now 50 physical units,
// so "a million sold" is an image before it is a figure.
//
// Deliberately no face — the only real faces available are the developers in
// the archive interview, and placing one beside a failure headline implies a
// responsibility the script never asserts.

const c = {
  paper: '#F2EDE3',
  ink: '#15171C',
  grey: '#9A958B',
  red: '#E23D23',
  blue: '#2D6BE4',
  dead: '#C9C3B8',
};

// ponytail: glyph widths approximated, not measured. Helvetica digits are
// tabular so this holds for money figures; swap for canvas measureText if a
// title ever clips.
const emWidth = (s: string) =>
  [...s].reduce((w, ch) => w + (',.'.includes(ch) ? 0.3 : ch === ' ' ? 0.28 : 0.6), 0);

const UNITS = 50;
const DEAD_FROM = 38; // the tail that never sold through

export const Thumbnail: React.FC<{
  wide?: boolean;
  figure?: string;
  unitLabel?: string;
  verdict?: string;
}> = ({wide = false, figure = '1,000,000', unitLabel = 'COPIES SOLD', verdict = 'STILL DIED'}) => {
  const {width} = useVideoConfig();
  const figureSize = (width * 0.9) / emWidth(figure);
  const cols = wide ? 25 : 10;
  const box = (width * (wide ? 0.62 : 0.78)) / cols;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.paper,
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* warm light from upper left so the paper is lit, not flat */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 50% at 28% 18%, #FFFFFF 0%, transparent 70%)`,
        }}
      />

      <AbsoluteFill
        style={{justifyContent: 'center', alignItems: 'center', gap: figureSize * 0.1}}
      >
        {/* the units. the last block is tipped and drained of colour — the
            failure is shown, not stated */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${box}px)`,
            gap: box * 0.16,
            marginBottom: figureSize * 0.1,
          }}
        >
          {Array.from({length: UNITS}, (_, i) => {
            const dead = i >= DEAD_FROM;
            return (
              <div
                key={i}
                style={{
                  width: box,
                  height: box * 1.3,
                  borderRadius: box * 0.14,
                  backgroundColor: dead ? c.dead : c.blue,
                  // the live ones catch the light, the dead ones do not
                  boxShadow: dead
                    ? 'none'
                    : `inset 0 ${box * 0.1}px 0 rgba(255,255,255,0.28), 0 ${box * 0.07}px 0 #1B4BA8`,
                  transform: dead
                    ? `rotate(${(i % 5) * 13 - 26}deg) translateY(${box * 0.22}px)`
                    : 'none',
                  opacity: dead ? 0.85 : 1,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            fontSize: figureSize,
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: -figureSize * 0.03,
            color: c.ink,
            whiteSpace: 'nowrap',
          }}
        >
          {figure}
        </div>

        <div
          style={{
            fontSize: figureSize * 0.23,
            fontWeight: 800,
            letterSpacing: figureSize * 0.035,
            textIndent: figureSize * 0.035,
            color: c.ink,
            opacity: 0.55,
          }}
        >
          {unitLabel}
        </div>

        {/* the verdict — the one saturated element, and the only thing allowed
            to be loud on a quiet ground */}
        <div
          style={{
            marginTop: figureSize * 0.12,
            backgroundColor: c.red,
            color: c.paper,
            fontSize: figureSize * 0.46,
            fontWeight: 900,
            letterSpacing: -figureSize * 0.004,
            padding: `${figureSize * 0.07}px ${figureSize * 0.16}px ${figureSize * 0.1}px`,
            borderRadius: figureSize * 0.05,
            transform: 'rotate(-1.6deg)',
            boxShadow: `0 ${figureSize * 0.035}px 0 #A32814`,
            whiteSpace: 'nowrap',
          }}
        >
          {verdict}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
