/**
 * ui-content — Effects family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'flickering-grid': {
    tier: 'showcase',
    intro: `Canvas-rendered grid of squares that flicker at random — an animated background for hero sections, empty states, and loading surfaces.`,
    usage: `import { FlickeringGrid } from '@constructive-io/ui/flickering-grid';

<div className="relative h-48 overflow-hidden rounded-lg border">
  <FlickeringGrid squareSize={4} gridGap={6} maxOpacity={0.3} color="rgb(99,102,241)" />
</div>`,
    props: [
      { name: 'squareSize', type: 'number', default: '4', description: 'Side length of each square, in pixels.' },
      { name: 'gridGap', type: 'number', default: '6', description: 'Gap between squares, in pixels.' },
      { name: 'flickerChance', type: 'number', default: '0.3', description: 'Probability a square changes opacity each frame.' },
      { name: 'maxOpacity', type: 'number', default: '0.3', description: 'Peak opacity a square reaches.' },
      { name: 'color', type: 'string', default: `'rgb(0, 0, 0)'`, description: 'Square color (any CSS color).' },
    ],
  },
  'motion-grid': {
    tier: 'showcase',
    intro: `Animates a grid of dots through a sequence of frames — a lightweight loading or "thinking" indicator.`,
    usage: `import { MotionGrid } from '@constructive-io/ui/motion-grid';

<MotionGrid gridSize={[8, 4]} duration={200} />`,
    props: [
      { name: 'gridSize', type: '[number, number]', default: '—', description: 'Grid dimensions as \`[columns, rows]\`.' },
      { name: 'duration', type: 'number', default: '200', description: 'Milliseconds per frame.' },
      { name: 'animate', type: 'boolean', default: 'true', description: 'Whether the sequence plays.' },
      { name: 'cellActiveClassName', type: 'string', default: '—', description: 'Class applied to lit cells (e.g. to recolor them).' },
    ],
  },
  'progressive-blur': {
    tier: 'showcase',
    intro: `Gradient blur overlay — the soft "scroll fade" that dissolves content into a surface at a list's edge. Absolutely positioned, so put it inside a \`relative\` container.`,
    usage: `import { ProgressiveBlur } from '@constructive-io/ui/progressive-blur';

<div className="relative h-72 overflow-y-auto">
  {/* scrollable content */}
  <ProgressiveBlur position="bottom" height="64px" />
</div>`,
    props: [
      { name: 'position', type: `'top' | 'bottom' | 'both'`, default: `'bottom'`, description: 'Which edge(s) to fade.' },
      { name: 'height', type: 'string', default: `'24%'`, description: 'Height of the fade band (CSS length).' },
      { name: 'blurPx', type: 'number', default: '8', description: 'Blur strength in pixels.' },
      { name: 'surface', type: `'background' | 'card' | 'sidebar'`, default: `'background'`, description: 'Surface color the content fades into.' },
    ],
  },
  'progressive-blur-scroll-container': {
    tier: 'showcase',
    intro: `Scroll container that adds the progressive-blur fade automatically as you scroll — instead of wiring \`ProgressiveBlur\` and scroll detection by hand.`,
    usage: `import { ProgressiveBlurScrollContainer } from '@constructive-io/ui/progressive-blur-scroll-container';

<div className="flex h-72 flex-col rounded-lg border">
  <ProgressiveBlurScrollContainer>
    {/* long list of items */}
  </ProgressiveBlurScrollContainer>
</div>`,
    props: [
      { name: 'showBlur', type: 'boolean', default: 'true', description: 'Master switch for the fade (still gated by overflow).' },
      { name: 'minItemsForBlur', type: 'number', default: '0', description: 'Minimum items before the fade appears.' },
      { name: 'itemCount', type: 'number', default: '0', description: 'Current item count, checked against \`minItemsForBlur\`.' },
      { name: 'blurProps', type: 'Partial<ProgressiveBlurProps>', default: '—', description: 'Overrides forwarded to the underlying \`ProgressiveBlur\`.' },
    ],
  },
  'responsive-diagram': {
    tier: 'showcase',
    intro: `Scales fixed-width content down to fit its container, so wide diagrams and flow charts stay fully visible on narrow screens without horizontal scrolling.`,
    usage: `import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';

<ResponsiveDiagram>
  <div className="flex items-center gap-4">
    {/* wide, fixed-size diagram */}
  </div>
</ResponsiveDiagram>`,
    props: [
      { name: 'targetRatio', type: 'number', default: '0.95', description: 'Fraction of the container width the content should occupy when scaled.' },
      { name: 'className', type: 'string', default: '—', description: 'Classes for the outer measuring container.' },
    ],
  },
};
