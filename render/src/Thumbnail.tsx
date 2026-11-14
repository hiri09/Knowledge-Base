import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

// Packaging grammar for the channel, set 2026-11-14 (Himanshu's idea).
//
// EVERY Flopnomics cover is the same object: the company's plate, with a rubber
// stamp struck across it. The story changes, the grammar does not — that
// repetition is the point. 2026 thumbnail research: a recognisable visual
// language is itself a CTR lever, because returning viewers identify the
// channel in the feed before they read anything.
//
// The research also set the constraints this frame obeys:
//   one dominant subject · 2-3 colours · 3-5 words · 30-40% negative space,
//   composed rather than dead · subject on a rule-of-thirds line · readable at
//   120px. Cleaner is outperforming maximalist.
//
// Light, not dark, per his note: dark-equals-serious is the faceless default and
// reads as generic. The stamp carries the verdict, so the ground does not have
// to be grim to say "failure".
//
// Deliberately no face — the only real faces available are the developers in the
// archive interview, and placing one beside a failure headline implies a
// responsibility the script never asserts.

const c = {
  paper: '#EFE9DC',
  card: '#FBF8F2',
  ink: '#15171C',
  grey: '#8D8779',
  stamp: '#C8301B',
};

export const Thumbnail: React.FC<{
  wide?: boolean;
  company?: string;
  meta?: string;
  stampText?: string;
  footnote?: string;
}> = ({
  wide = false,
  company = '38 STUDIOS',
  meta = 'PROVIDENCE, RI · 2006–2012',
  stampText = 'BANKRUPT',
  footnote = '1,000,000 COPIES SOLD',
}) => {
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height * (wide ? 1 : 0.62));

  // ponytail: no fake ink grain. The striped mask version ate the letters, and
  // an unreadable stamp is worth less than a clean one. multiply + opacity is
  // enough ink at this scale.

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.paper,
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* light from upper left so the paper is lit rather than flat */}
      <AbsoluteFill
        style={{background: `radial-gradient(ellipse 65% 45% at 30% 16%, #FFFDF8 0%, transparent 72%)`}}
      />

      <div style={{position: 'relative', transform: `rotate(-1.2deg)`}}>
        {/* THE SUBJECT: the company's plate */}
        <div
          style={{
            backgroundColor: c.card,
            padding: wide
              ? `${u * 0.13}px ${u * 0.1}px ${u * 0.3}px`
              : `${u * 0.22}px ${u * 0.08}px ${u * 0.42}px`,
            borderRadius: u * 0.018,
            boxShadow: `0 ${u * 0.016}px ${u * 0.05}px rgba(20,16,10,0.16), 0 ${u * 0.004}px 0 rgba(20,16,10,0.1)`,
            textAlign: 'center',
            minWidth: u * 0.9,
          }}
        >
          <div
            style={{
              fontSize: u * 0.145,
              fontWeight: 900,
              letterSpacing: -u * 0.004,
              lineHeight: 0.92,
              color: c.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {company}
          </div>
          <div
            style={{
              marginTop: u * 0.042,
              fontSize: u * 0.036,
              fontWeight: 700,
              letterSpacing: u * 0.012,
              color: c.grey,
              whiteSpace: 'nowrap',
            }}
          >
            {meta}
          </div>
        </div>

        {/* THE VERDICT: struck across the plate, breaking its edges */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: wide ? '74%' : '72%',
            transform: 'translate(-50%, -50%) rotate(-7deg)',
            border: `${u * 0.011}px solid ${c.stamp}`,
            outline: `${u * 0.0035}px solid ${c.stamp}`,
            outlineOffset: u * 0.009,
            borderRadius: u * 0.012,
            padding: `${u * 0.022}px ${u * 0.05}px ${u * 0.028}px`,
            color: c.stamp,
            fontSize: u * 0.135,
            fontWeight: 900,
            letterSpacing: u * 0.015,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            opacity: 0.88,
            mixBlendMode: 'multiply',
          }}
        >
          {stampText}
        </div>
      </div>

      {/* the one supporting fact, on the lower third line */}
      <div
        style={{
          position: 'absolute',
          bottom: wide ? '6%' : '16%',
          fontSize: u * 0.05,
          fontWeight: 800,
          letterSpacing: u * 0.016,
          color: c.ink,
          opacity: 0.8,
          whiteSpace: 'nowrap',
        }}
      >
        {footnote}
      </div>
    </AbsoluteFill>
  );
};
