// The channel's entire visual language. Change here, every video changes.
// Rule from principles/audience-psychology.md: ONE saturated element against a muted frame.
// A frame where everything is loud has nothing loud in it.
export const theme = {
  // Not black. #0B0B0C gave every frame a void to sit on, so the whole video
  // read as dark rather than as graded. A charcoal with a blue cast is a base
  // the eye reads as film stock, and it lets the warm accent actually glow.
  bg: '#12141A',
  bgLift: '#1A1D26',   // the top of the shadow range — blacks never crush to 0
  shadow: '#16202E',   // cool, multiplied into the shadows of a ground
  highlight: '#FFD2A8', // warm, screened into the highlights
  muted: '#8A8A93',
  text: '#F2F2F5',
  accent: '#FF4438', // the only saturated colour in the system. Use once per frame.
  font: '"Helvetica Neue", Arial, sans-serif',
};

export const FPS = 30;
// ponytail: 5s hard cap per scene = the 3-5s pattern-interrupt rule, enforced in code
// rather than trusted to the scriptwriter. Raise only with a measured reason.
export const MAX_SCENE_SEC = 5;
export const MIN_NUMBER_SEC = 2; // a money figure is the payoff; never flash it
