// The channel's entire visual language. Change here, every video changes.
// Rule from principles/audience-psychology.md: ONE saturated element against a
// muted frame — the accent is the loud one, `palette` is for the set itself.
//
// Went light 2026-11-14 on Himanshu's note: a failure story does not have to be
// told in the dark. Dark-equals-serious is the faceless-channel default, so it
// reads as generic. The verdict carries the weight, not the background.
//
// Blend-mode contracts the old dark values encoded, kept intact:
//   bgLift   used with 'lighten' and as the bright end of a gradient -> must be
//            LIGHTER than bg
//   shadow   used with 'multiply' -> must stay DARK or it will not shade
//   highlight used with 'soft-light' -> warm, near-white
export const theme = {
  bg: '#F2EDE3',       // warm paper. not #FFF — pure white clips and reads cheap
  bgLift: '#FDFBF6',   // the top of the light range
  shadow: '#7F8799',   // cool, multiplied into the shadows of a ground
  highlight: '#FFF4E2', // warm, screened into the highlights
  muted: '#8D8779',
  text: '#15171C',
  accent: '#E23D23', // the only saturated colour in the TYPE system. Once per frame.

  // Scene palette. Separate from `accent` on purpose: accent is for type, this
  // is for the set. critique.py gates `sat_mean >= 15` and a cream ground alone
  // scores near zero — saturation has to come from built content, so the sets
  // need real colour available to them.
  palette: {
    blue: '#2D6BE4',
    teal: '#0E9C8E',
    gold: '#E8A317',
    plum: '#7B3F8C',
    ink: '#1D2433',
  },

  font: '"Helvetica Neue", Arial, sans-serif',
};

export const FPS = 30;
// ponytail: 5s hard cap per scene = the 3-5s pattern-interrupt rule, enforced in code
// rather than trusted to the scriptwriter. Raise only with a measured reason.
export const MAX_SCENE_SEC = 5;
export const MIN_NUMBER_SEC = 2; // a money figure is the payoff; never flash it
