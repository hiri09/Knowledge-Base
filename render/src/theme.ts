// The channel's entire visual language. Change here, every video changes.
// Rule from principles/audience-psychology.md: ONE saturated element against a muted frame.
// A frame where everything is loud has nothing loud in it.
export const theme = {
  bg: '#0B0B0C',
  muted: '#6E6E73',
  text: '#E8E8ED',
  accent: '#FF3B30', // the only saturated colour in the system. Use once per frame.
  font: '"Helvetica Neue", Arial, sans-serif',
};

export const FPS = 30;
// ponytail: 5s hard cap per scene = the 3-5s pattern-interrupt rule, enforced in code
// rather than trusted to the scriptwriter. Raise only with a measured reason.
export const MAX_SCENE_SEC = 5;
export const MIN_NUMBER_SEC = 2; // a money figure is the payoff; never flash it
