/**
 * ui-content — Utilities & theme family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'cn': {
    tier: 'lean',
    intro: `\`cn\` is the class-name merge helper every component uses: it runs \`clsx\` to resolve conditional classes and then \`tailwind-merge\` to dedupe conflicting Tailwind utilities, so the last one wins. Reach for it whenever you compose a \`className\` from a base, variants, and an incoming override.`,
    usage: `import { cn } from '@constructive-io/ui';

<div className={cn('rounded-md border p-4', isActive && 'border-primary', className)} />`,
  },
  'slot': {
    tier: 'lean',
    intro: `Slot powers the \`asChild\` pattern: instead of rendering its own wrapper, it merges its props, event handlers, refs, and \`className\` onto the single child element you pass. Use it to build polymorphic components — e.g. a button that can render as a link without losing its styling or behavior.`,
    usage: `import { Slot } from '@constructive-io/ui';

function Button({ asChild, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className="btn" {...props} />;
}

// Renders an <a> with the button's props merged in:
<Button asChild><a href="/docs">Docs</a></Button>`,
    parts: [
      { name: 'Slot', description: 'Merges props/refs/className onto its single child.' },
      { name: 'Slottable', description: 'Marks which child should receive slot props when there are several.' },
      { name: 'composeRefs / mergeProps', description: 'Lower-level helpers for combining refs and prop objects.' },
    ],
  },
  'motion-config': {
    tier: 'lean',
    intro: `Motion Config is the shared animation vocabulary used across the library — named easing curves, duration presets, spring configs, transitions, and variants — tuned to keep UI motion fast and consistent (mostly under 300ms, never scaling from zero). Import these presets when animating with the \`motion\` library instead of hand-tuning magic numbers.`,
    usage: `import { easings, durations, springs, transitions, variants } from '@constructive-io/ui';
import { motion } from 'motion/react';

<motion.div
  initial={variants.fadeSlideUp.initial}
  animate={variants.fadeSlideUp.animate}
  transition={{ duration: durations.normal, ease: easings.easeOut }}
/>`,
    parts: [
      { name: 'easings', description: 'Named cubic-bezier curves: \`easeOut\`, \`easeInOut\`, \`snappy\`, \`bounce\`, and more.' },
      { name: 'durations', description: 'Second-based presets: \`instant\`, \`fast\`, \`normal\`, \`slow\`, \`deliberate\`.' },
      { name: 'springs', description: 'Physics presets: \`snappy\`, \`bouncy\`, \`gentle\`, \`stiff\`, \`panel\`.' },
      { name: 'transitions / variants', description: 'Ready-made transitions and AnimatePresence variants (\`fadeScale\`, \`fadeSlideUp\`, …).' },
    ],
  },
  'use-controllable-state': {
    tier: 'lean',
    intro: `\`useControllableState\` lets a component work in both controlled and uncontrolled modes from one state hook. Pass \`prop\` to control it from outside, or \`defaultProp\` to let the component own the value; \`onChange\` fires either way. It is the standard pattern for open/value-style props across the library.`,
    usage: `import { useControllableState } from '@constructive-io/ui';

function Toggle({ pressed, defaultPressed, onPressedChange }) {
  const [value, setValue] = useControllableState({
    prop: pressed,
    defaultProp: defaultPressed ?? false,
    onChange: onPressedChange,
  });
  return <button aria-pressed={value} onClick={() => setValue(!value)} />;
}`,
  },
  'use-debounce': {
    tier: 'lean',
    intro: `\`useDebounce\` returns a debounced copy of a value that only updates after it stops changing for a given delay. Use it to throttle expensive work — search queries, autosave, live validation — off a fast-changing input. It ships as a copy-in hook from the registry under \`@/hooks/use-debounce\`.`,
    usage: `import { useDebounce } from '@/hooks/use-debounce';

function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // runs 300ms after the user stops typing
    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}`,
  },
  'use-mobile': {
    tier: 'lean',
    intro: `\`useIsMobile\` returns whether the viewport is below the mobile breakpoint (768px), updating on resize. Use it to branch layout or behavior — collapse a sidebar, swap a dialog for a drawer. It defaults to \`false\` during server rendering to avoid hydration mismatches, and ships as a copy-in hook from the registry under \`@/hooks/use-mobile\`.`,
    usage: `import { useIsMobile } from '@/hooks/use-mobile';

function Nav() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileNav /> : <DesktopNav />;
}`,
  },
  'constructive-theme': {
    tier: 'lean',
    intro: `The Constructive theme is the design-token layer that powers every component — OKLCH color tokens, a structured z-index layer system, a shadow scale, radii, and animations, all with a matching dark variant. It ships automatically when you import the package's global stylesheet; the utility classes components use (\`bg-background\`, \`text-foreground\`, \`border\`, \`ring\`) resolve to these tokens.`,
    usage: `// Import once at the root of your app — the theme tokens come with it:
import '@constructive-io/ui/globals.css';

// Tokens are then available as CSS variables and Tailwind utilities, e.g.:
// colors:  --background, --foreground, --primary, --muted, --border, --ring, --destructive
// z-index: --z-layer-floating, --z-layer-modal-content, --z-layer-toast, --z-layer-portal-root
// shadows: --shadow-xs … --shadow-2xl   radii: --radius (with -sm/-md/-lg steps)
// A .dark variant remaps every color token for dark mode.`,
    parts: [
      { name: 'Color tokens', description: 'OKLCH semantic colors: \`--background\`, \`--foreground\`, \`--primary\`, \`--secondary\`, \`--muted\`, \`--accent\`, \`--destructive\`, \`--border\`, \`--ring\`.' },
      { name: 'Z-index layers', description: 'Named stacking layers: \`--z-layer-floating\`, \`--z-layer-modal-backdrop\`/\`--z-layer-modal-content\`, \`--z-layer-floating-elevated\`, \`--z-layer-toast\`, \`--z-layer-portal-root\`.' },
      { name: 'Shadows & radii', description: 'A shadow scale (\`--shadow-xs\` … \`--shadow-2xl\`) and radius steps derived from \`--radius\`.' },
      { name: 'Dark variant', description: 'A \`.dark\` class remaps every color token for dark mode.' },
    ],
  },
};
