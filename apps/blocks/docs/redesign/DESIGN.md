# DESIGN.md — Fluid-Functionalism Redesign (v2)

**Status: ACTIVE — the single reference for the 2026-07 UI refactor.**
Supersedes the visual prescriptions in `RESEARCH.md` / `IMPLEMENTATION_PLAN.md` (v1 "calm dark-first" pass). Those documents remain useful for pipeline/architecture background only. Where they conflict with this file, **this file wins**.

Reference implementation: `~/workspace/projects/fluid-functionalism` (local clone, called **FF** below). All values in this doc were extracted from FF source, not eyeballed. When in doubt, open the FF file cited and copy the real thing.

---

## 0. Mission

The current site is a coherent but conservative docs app wrapped in dev-tool marketing chrome. The redesign makes it feel like FF: **you land on the product itself**. No hero theater, no atmosphere, no scroll animations — a quiet neutral shell whose only job is to present live, working components beautifully, with motion spent exclusively on *interaction* (hover, press, open), never on *decoration*.

Principles (in priority order):

1. **Immediate value** — the landing page IS a grid of live, usable component demos.
2. **Neutral canvas, product carries the color** — chrome is achromatic; Constructive blue appears as accent (links, focus, dots, washes) and inside the showcased blocks themselves.
3. **One measure, one scale, one radius table** — no competing vocabularies.
4. **Motion = communication** — spring enters, quicker tween exits, weight-shift actives; zero entrance/scroll theater.
5. **Elevation by ladder** — bg-surface-N pairs with shadow-surface-N; borders are hairlines, never structure.

Brand deltas from FF (locked, do not "fix" these toward FF):
- **Geist + Geist Mono stay** (FF uses Inter). Geist has a `wght` axis but **no `opsz`** — see §4.3.
- **Constructive blue stays** the accent: `oklch(0.688 0.175 245.6)` dark / `oklch(0.55 0.16 245.6)` light. It replaces FF's periwinkle `#6B97FF` everywhere that color appears (focus rings, hover washes, new-dots).
- Dark remains the default theme (`next-themes`, `defaultTheme="dark"`, System available).

---

## 1. Token system — `src/app/globals.css` rewrite

> **Values tuned for contrast 2026-07-03, light ladder retuned 2026-07-06 — see section 1.10.** The FF aesthetic (pure neutral, hairline, calm, single accent) is preserved; the tuning raised the contrast *floor*, not the character. The 07-06 pass strengthened the LIGHT ladder only (secondary text, borders, overlays, card shadow) — dark output is unchanged.

Replace the current OKLCH knob system (`--cb-bg-l`, `--cb-hue: 264` cool charcoal) with FF's **pure-neutral hex ladders**. The cool tint and the L=0.145 near-black canvas are two of the biggest "not-FF" tells: FF's dark canvas is `#171717` — lighter, and dead neutral.

Keep: the `@import '@constructive-io/ui/globals.css'` + `@source` scanning setup (lines 1–27 — the Tailwind-v4 `@source`-in-`@import` gotcha comment must survive), the `.prose` token bridge, the `@tailwindcss/typography` plugin, the reduced-motion net.

Delete: `registry-theme.css` (see kill list §8; fold the few survivors into `globals.css`).

### 1.1 Surfaces + canvas

```css
:root {
  /* LIGHT — canvas #FAFAFA, ladder compresses to flat white; shadow does the work */
  --surface-1: #FAFAFA;
  --surface-2: #FCFCFC;
  --surface-3: #FFFFFF;
  --surface-4: #FFFFFF;
  --surface-5: #FFFFFF;
  --surface-6: #FFFFFF;
  --surface-7: #FFFFFF;
  --surface-8: #FFFFFF;

  --background: var(--surface-1);
  --foreground: #171717;
  --card: var(--surface-3);
  --card-foreground: #171717;
  --popover: var(--surface-5);
  --popover-foreground: #171717;
  --muted: #EFEFEF;             /* decoupled from surface-2 — FF rationale: the light
                                   ladder is so compressed that bg-muted must be
                                   a real gray to read at all. Darkened #F4F4F5→#EFEFEF
                                   2026-07-03 for canvas separation (delta 6→11) */
  --muted-foreground: #4F4F4F;  /* 7.85:1 canvas / 8.19:1 card / 7.12:1 muted — #737373
                                   (~4.5:1) → #5F5F5F (~5.5–6.4, still washed out) → #4F4F4F
                                   (2026-07-06 retune, clears the ≥7 target everywhere); see §1.10 */
  --accent: #EBEBEB;            /* solid tint for chips/menu-hover fills; sits below
                                   --muted in the fill ladder (was #F0F0F0) */
  --accent-foreground: #171717;
  --secondary: #E5E5E5;         /* FF secondary-button fill */
  --secondary-foreground: #171717;
  --selected: #D4D4D4;
}

.dark {
  /* DARK — additive white over #171717, exact FF ladder */
  --surface-1: #171717;
  --surface-2: #1E1E1E;
  --surface-3: #252525;
  --surface-4: #2C2C2C;
  --surface-5: #333333;
  --surface-6: #3A3A3A;
  --surface-7: #414141;
  --surface-8: #484848;

  --background: var(--surface-1);
  --foreground: #F5F5F5;
  --card: var(--surface-3);
  --card-foreground: #F5F5F5;
  --popover: var(--surface-5);
  --popover-foreground: #F5F5F5;
  --muted: var(--surface-2);
  --muted-foreground: #A3A3A3;  /* KEPT: already 6.1–7.1:1 on dark surfaces (passes the
                                   ≥5.5 secondary floor). Not darkened like light's twin —
                                   it would compress the primary↔secondary hierarchy and
                                   drift off the FF anchor. See §1.10 */
  --accent: #333333;
  --accent-foreground: #F5F5F5;
  --secondary: #525252;
  --secondary-foreground: #F5F5F5;
  --selected: #525252;
}
```

### 1.2 Borders (contrast-tuned formula, both themes)

```css
/* LIGHT (:root) — raised 2026-07-06 so flat-white hairlines read */
--border: color-mix(in oklab, var(--foreground) 22%, transparent);
--border-strong: color-mix(in oklab, var(--foreground) 34%, transparent);
--input: color-mix(in oklab, var(--foreground) 24%, transparent);
/* DARK (.dark) — kept: near-black canvas + additive-white ring shadows need less */
--border: color-mix(in oklab, var(--foreground) 17%, transparent);
--border-strong: color-mix(in oklab, var(--foreground) 30%, transparent);
--input: color-mix(in oklab, var(--foreground) 18%, transparent);
```
Hairlines only. The mix strengths were raised in two passes; the **2026-07-06 light-contrast retune split the themes** because a flat-white hairline needs more ink than a hairline on the near-black dark canvas (where additive-white ring shadows already separate cards). **Light** (`:root`): border 12→17→**22**, strong 22→30→**34**, input 16→18→**24** — resting card/input hairlines (`border-border/60`) now = **13.2%** effective mix (was 10.2%), internal dividers (`/40`) = **8.8%** (was 6.8%, the sub-8% "borders too weak" case). **Dark** (`.dark`) keeps **17/30/18** (re-declared so color-mix recomputes against the dark foreground). In both themes: full-strength `border-border` is the *hover/emphasis* baseline, `--border-strong` the explicit emphasis tier (kept clearly above resting), and `--input` keeps form fields a hair above the resting card hairline. This also auto-strengthens `.bento-card-border` (it references `--border`).

### 1.3 Shadow ladder (offsets FF verbatim; light `--shadow-color` alpha contrast-tuned)

```css
:root {
  --shadow-color: rgb(0 0 0 / 0.11);  /* 0.06→0.08 (07-03) → 0.11 (07-06 retune) — on the
                                         flat-white light ladder the 1px ring in --shadow-1 IS
                                         the card edge (canvas↔card WCAG 1.04), so this alpha
                                         is the card-separation lever */
  --shadow-1: 0 0 0 1px var(--shadow-color);
  --shadow-2: 0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color);
  --shadow-3: /* + 0 3px 3px -1.5px */;
  --shadow-4: /* + 0 6px 6px -3px */;
  --shadow-5: /* + 0 12px 12px -6px */;
  --shadow-6: /* + 0 24px 24px -12px */;
  --shadow-7: /* + 0 48px 48px -24px */;
  --shadow-8: /* + 0 96px 96px -48px */;
}
.dark {
  --dm-hi-base: rgba(255,255,255,0.01);  --dm-hi-mid: rgba(255,255,255,0.02);
  --dm-hi-high: rgba(255,255,255,0.04);  --dm-hi-peak: rgba(255,255,255,0.06);
  --dm-ring-base: rgba(255,255,255,0.02); --dm-ring-mid: rgba(255,255,255,0.04);
  --dm-ring-high: rgba(255,255,255,0.06); --dm-drop: rgba(0,0,0,0.18);
  --shadow-1: inset 0 0 0 1px var(--dm-ring-base);
  --shadow-2: inset 0 1px 0 0 var(--dm-hi-base), inset 0 0 0 1px var(--dm-ring-base), 0 1px 1px -0.5px var(--dm-drop);
  /* …levels 3–8: copy EXACTLY from FF app/globals.css lines 119–124 —
     inset highlight + inset ring + 1px black ring + stacked drops */
}
```
Copy levels 3–8 for both themes **verbatim** from FF `app/globals.css` (light L174–181, dark L117–124). Additive layers, halving offsets (1/3/6/12/24/48/96). Keep the existing `@theme inline` mapping (`--shadow-surface-N: var(--shadow-N)`) and the `@source inline("bg-surface-{1..8}")` force-generation — the utility names `bg-surface-N` / `shadow-surface-N` don't change, so consumers keep working. Retire the legacy `--shadow-sm/md/lg` + `--inset-hi` tokens and all their usages.

### 1.4 Interaction overlays (new — replaces ad-hoc `bg-foreground/[0.04]`)

```css
:root { --overlay: 0 0 0;       --hover: rgb(var(--overlay) / 0.08); --active: rgb(var(--overlay) / 0.14); }
.dark { --overlay: 255 255 255; --hover: rgb(var(--overlay) / 0.08); --active: rgb(var(--overlay) / 0.13); }
@theme inline { --color-hover: var(--hover); --color-active: var(--active); }
```
`bg-hover` = pointer-over surface, `bg-active` = current/selected/pressed surface. These work at any elevation (they're overlays, not fixed grays). All chrome hover/selected fills use these two utilities — no more per-component alpha literals. Light alphas were raised again in the **2026-07-06 retune** (light 0.04/0.07→0.06/0.10→**0.08/0.14**; dark kept 0.08/0.13) so the fills read on white: light hover fill `#E6E6E6` = Δ20 over the `#FAFAFA` canvas, active fill `#D7D7D7` = Δ35 over canvas / Δ15 over hover (and stays lighter than the solid `--selected` `#D4D4D4`, so the fill ladder holds); dark active ≈ Δ30 vs hover ≈ Δ19.

### 1.5 Accent + status

```css
:root {
  --primary: oklch(0.55 0.16 245.6);   --primary-foreground: #FFFFFF;
  --ring: var(--primary);
  --destructive: #EF4444;  --destructive-light: #FEF2F2;
  --success: #22C55E;  --warning: #F59E0B;  --info: var(--primary);
}
.dark {
  --primary: oklch(0.688 0.175 245.6); --primary-foreground: oklch(0.985 0 0);
  --ring: var(--primary);
  --destructive: #F87171;  --destructive-light: #450A0A;
  --success: #22C55E;  --warning: #F59E0B;  --info: var(--primary);
}
```
Status colors appear ONLY as (a) dot-badge dots at full strength, or (b) 15% washes: `color-mix(in srgb, <hex> 15%, var(--background))` with **foreground** text (FF Badge recipe — never saturated fills, never colored body text). Keep `--success-foreground`/`--warning-foreground` tokens for the shipped-ui compatibility but the docs chrome should stop using colored text on tints.

### 1.6 Radius

**Keep `--radius: 0.375rem` (6px).** The ui package derives the whole scale from it (`packages/ui/src/styles/globals.css:162-167`): `rounded-md = 6px`, `rounded-lg = +2px = 8px`, `rounded-xl = +6px = 12px`. That means the FF "rounded" table falls out of the EXISTING knob — and product components inside previews keep their consumer-faithful 6px `rounded-md`. Do not change the knob; change which utilities chrome uses:

| Use | Class | Computed px |
|---|---|---|
| Rows, buttons, inputs, pills, tab pills | `rounded-lg` | 8 |
| Cards, preview containers, code panels, right panel, bento cards | `rounded-xl` | 12 |
| Focus ring (concentric, +2px outside an 8px item) | `rounded-[10px]` | 10 |
| Dots, avatars | `rounded-full` | — |

Kill: `rounded-[5px]`, `rounded-[1px]`, `rounded-sm`, `rounded-md` in chrome (audit found all of these). `rounded-md` inside shipped `src/blocks/**` / `packages/ui` is not our concern.

### 1.7 Type scale

Keep the `@theme` text tokens but retune to FF sizes; the workhorse stays 13px:

| Token / literal | Size | Weight | Use |
|---|---|---|---|
| `text-h1` | 22px mobile / 28px sm+ | 600, `leading-none`, `-0.02em` | Page titles |
| `text-h2` → **16px** | 16px | 600, `leading-none` | Section headings ("Installation", "Live preview") |
| h3 literal | 15–16px | 600 | Sub-features, thesis blocks |
| `text-body` | 14px | 400, `leading-relaxed` | Guide/introduction prose (`text-foreground/90`) |
| `text-[13px]` | 13px | 400 | THE workhorse: nav, descriptions, labels, table cells, buttons |
| `text-[12px]` | 12px | 400 | Mono code, props table mono, captions, install notes |
| `text-[11px]` | 11px | 400–500 | Counts, badges, kbd |

Rules: no `text-sm`/`text-xs`/`text-base` in chrome; no sizes below 11px in chrome (demo-internal 9px literals are demo content, leave them); heading elements set `leading-none` and rely on flex `gap` for rhythm (FF pattern) rather than margins.

### 1.8 Motion CSS vars

```css
--dur-fast: 80ms;    /* hover, color, weight, focus  (was 120ms) */
--dur: 160ms;        /* indicators, small travel */
--dur-slow: 240ms;   /* panels, dialogs */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* unify: this is the JS reveal curve; kill the second curve */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```
CSS transitions in chrome default to `duration-[var(--dur-fast)]` — FF runs micro-transitions at `duration-80` and that snappiness is part of the feel. Delete `--ease-in-out` (unused after the kill list).

### 1.9 Utilities to port from FF `app/globals.css`

- `.bento-card-border` (+ hover, + `:focus-within`, + dark variants) — L396–444.
- `.bento-grid` (`grid-auto-flow: dense`, `grid-auto-rows: 300px` at md+) — L446–456.
- `.scroll-fade` / `.scroll-fade-x` with the `@supports (animation-timeline: scroll())` scroll-aware variant — L588–706.
- `.xl-fade-flex` / `.xl-fade-block` (side-panel display+opacity cross-fade with `@starting-style`) — L536–586.
- `.scrollbar-hide` + the `@media (pointer: fine)` native scrollbar theming (thin, `color-mix` thumb) — L344–378.
- `html { scrollbar-gutter: stable }` and NO explicit overflow on html/body (FF comment L334–339 explains: an explicit overflow breaks dialog scroll-locks + sticky).

### 1.10 Contrast floors (added 2026-07-03)

The token values in §1.1–1.4 were tuned to satisfy these WCAG contrast floors, measured against the surface the text/border actually sits on. This is the contrast contract — do not regress a token below its tier. Same tokens, same pairings, pure neutrals (chroma 0), single Constructive-blue accent: the floor was raised, the FF character was not.

| Tier | Applies to | Floor | How it's met now |
|---|---|---|---|
| **Primary** | headings, body, values (`--foreground`) | **≥ 12:1** | `#F5F5F5`/`#171717` dark, `#171717`/`#FAFAFA` light — already clear this; unchanged. |
| **Secondary** | 13px workhorse muted text: descriptions, nav resting rows, table cells, intros, install notes (`--muted-foreground`) | **≥ 5.5:1** (target ~7) | Light `#4F4F4F` = 7.85 canvas / 8.19 card / 7.12 muted (`#737373` ~4.5 → `#5F5F5F` ~5.5–6.4, still read washed out → `#4F4F4F`, 2026-07-06 retune: clears the ≥7 target on every surface). Dark `#A3A3A3` = 7.1 / 6.1 / 6.6 — **kept** (already passes; darkening would compress the primary↔secondary hierarchy and drift off the FF anchor). |
| **Decorative** | section caption labels, counts, kbd hints, footer status (alpha'd `--muted-foreground`) | **≥ 3.5:1** | Class-usage tier: decorative text renders at `/75` off the bases above — light `#4F4F4F` at `/75` = **4.13:1** (was 3.5 at the razor floor; the darker 07-06 base now gives margin), dark `#A3A3A3` at `/75` = 4.54:1. Literal `/50–/60` caption usages sit below 3.5 and rely on the darker base — a chrome-file concern, not a token one. |
| **Borders** | resting card/input hairlines (`--border` at `/60`), internal `/40` dividers | **≥ 8% effective** foreground-mix after alpha | Light (`:root`) `--border` **22%** → `/60` = **13.2%**, `/40` = **8.8%** (both clear 8%; the old 17% gave `/40` = 6.8%, under floor); `--border-strong` **34%**, `--input` **24%** keep the emphasis/field tiers above resting. Dark (`.dark`) keeps 17/30/18 — its ring shadows + lighter surfaces separate cards, so `/60` = 10.2% suffices. |
| **Active fills** | `bg-active` (selected nav row, active tab, segmented control) | visibly distinct from hover *and* canvas | Light active **0.14** → `#D7D7D7` (Δ35 over canvas, Δ15 over hover **0.08** → `#E6E6E6`, Δ20), capped just under the solid `--selected` `#D4D4D4`; dark active 0.13 (Δ≈30) vs hover 0.08 (Δ≈19). |

---

## 2. Motion system — `src/lib/motion/springs.ts` (new)

Port FF `registry/default/lib/springs.ts` verbatim (it's ~45 lines):

```ts
export const spring = {
  fast:     { type: 'spring', duration: 0.08, bounce: 0,    exit: { duration: 0.06 } },
  moderate: { type: 'spring', duration: 0.16, bounce: 0.08, exit: { duration: 0.12 } },
  settle:   { type: 'spring', duration: 0.16, bounce: 0,    exit: { duration: 0.12 } },
  slow:     { type: 'spring', duration: 0.24, bounce: 0.12, exit: { duration: 0.16 } },
} as const;
export const exitFallbackMs = (tier) => Math.round(tier.exit.duration * 1000) + 100;
```

Rules (from FF guidelines, adopted wholesale for docs chrome):
- The bigger the moving thing, the slower the spring. Enter on a tier; **exit on `tier.exit`** (a plain tween, one tier quicker — dismissals read crisp, never bouncy).
- Never hand-write a duration in JS motion. Never `ease-in` on UI.
- `<MotionConfig reducedMotion="user">` wraps the app at root layout (moves out of the landing-only `MotionProvider`). Animate `transform`/`opacity` only, so reduced-motion coverage is automatic.
- **Kill scroll/entrance theater**: `Reveal`, `Stagger`, `StaggerItem`, `CountUp`, `useScrollSpy`, hero entrance sequences, `whileInView` everywhere. FF pages render instantly, static. Motion lives in hover/press/open/close only.
- Keep the CSS-token transitions for non-JS surfaces (tabs indicator via Base UI, drawer, nav rows).

---

## 3. Interaction language

### 3.1 Weight-shift actives (ghost-span, Geist-adapted)

Active/selected text gets **heavier, not recolored-only**: `'wght' 400 → 550` via `font-variation-settings`, transitioned at `duration-[var(--dur-fast)]`. The transition class MUST list `font-variation-settings` explicitly (`transition-[color,font-variation-settings]`).

`src/lib/motion/font-weight.ts` (new):
```ts
export const fontWeights = {
  normal:   "'wght' 400",
  medium:   "'wght' 500",
  semibold: "'wght' 550",
  bold:     "'wght' 640",
} as const;
```
(Geist has no `opsz` axis — FF's optical-size compensation doesn't apply; the ghost span alone absorbs the width delta.)

Ghost-span pattern (required wherever weight animates — nav rows, tab labels):
```tsx
<span className="inline-grid flex-1 text-[13px]">
  <span className="col-start-1 row-start-1 invisible" aria-hidden="true"
        style={{ fontVariationSettings: fontWeights.semibold }}>{label}</span>
  <span className="col-start-1 row-start-1 transition-[color,font-variation-settings] duration-[var(--dur-fast)]"
        style={{ fontVariationSettings: active ? fontWeights.semibold : fontWeights.normal }}>{label}</span>
</span>
```
Skip the ghost only when weight never changes for the node's lifetime. Don't invent new weight pairs: resting `normal`, active `semibold`; that's it.

### 3.2 Focus

`focus-visible:ring-1 focus-visible:ring-ring` (1px Constructive-blue ring; FF uses ring-1, our current ring-2 is louder than reference). Rings that would clip in `overflow` containers use FF's negative-margin trick: `-mx-1 px-1 -my-1 py-1` on the scroll container. Keyboard-focus containers (bento cards, preview frames) strengthen their border via `:focus-within` instead of drawing a second ring.

### 3.3 Buttons (docs chrome only — shipped ui Button untouched)

New `src/components/docs/site-button.tsx` implementing FF's two-layer recipe:
- Element carries text/border + `focus-visible:ring-1 ring-ring`; an inset `<span aria-hidden className="absolute inset-0 rounded-[inherit] transition-[background-color,transform] duration-[var(--dur-fast)] group-active:scale-[0.98]">` carries the FILL. Press squishes the fill, not the label.
- Variants: `primary` = fill `bg-foreground`, text `text-background` (monochrome inverted — the FF look; Constructive blue is NOT a button fill in chrome). `secondary` = fill `bg-secondary`. `tertiary` = `border border-border`, transparent fill, `hover:bg-hover`. `ghost` = `text-muted-foreground hover:text-foreground`, fill `hover:bg-hover active:bg-active`.
- Sizes: sm `h-7 px-3 text-[12px]`, md `h-8 px-4 text-[13px]`, icon `h-9 w-9 [&_svg]:size-4`. Icons `strokeWidth={1.5}` → `group-hover:stroke-[2]`.
- Replaces: `cb-btn-primary`/`cb-btn-secondary` CSS classes and all ad-hoc chrome `<button>` styling (theme toggle, copy buttons, pager arrows, reset).

### 3.4 Hover-glide policy (proximity)

FF's signature magnetic highlight (one shared `motion.div` gliding between item rects, `useProximityHover`) is adopted **only where the item list is flat and static**:
- The right-panel rows: no (they're selects, not a menu).
- The sidebar top-level menu (Showcase / Introduction): yes — port FF `use-proximity-hover.ts` + a minimal `NavMenu` wrapper (`src/components/docs/nav-menu.tsx`), axis `y`.
- The big grouped/filterable/collapsible section nav: **no measured overlay** — this codebase already had a drift incident there. Rows get the FF *look* via pure CSS: `hover:bg-hover`, active `bg-active` + ghost-span weight shift, `duration-[var(--dur-fast)]`. Revisit gliding here only as a follow-up experiment, never in this pass.
- Preview/Code tabs: Base UI `Tabs.Indicator` already gives a sliding pill without measurement code — restyle it (§7.1); do not add proximity.

---

## 4. Page anatomies

### 4.1 Global shell (all routes incl. landing)

FF shell = plain 3-child flex row, `xl`-and-up for the side columns:

```
<div class="flex min-h-screen">
  <Sidebar  class="sticky top-0 h-screen w-60 shrink-0 overflow-y-auto p-4 scroll-fade xl-fade-flex flex-col gap-4" />
  <main     class="flex-1 min-w-0">{page}</main>
  <RightPanel class="w-64 shrink-0 sticky top-4 self-start mt-4 mr-4 rounded-xl bg-muted p-4 xl-fade-block" />
</div>
```

- The shell moves UP so `/` (landing) renders inside it — sidebar visible on landing, "Showcase" its active item. Implement as a shared layout component used by root `layout.tsx`; the docs `blocks/layout.tsx` reduces to the content column.
- **Topbar: retired.** No breadcrumb, no sticky header, no backdrop-blur. Its jobs move: theme → right panel; install command → each page's Installation section; hamburger → floating `fixed top-4 left-4 z-50 xl:hidden` ghost icon button.
- **TOC right rail: retired** (right panel takes that slot; FF has no TOC).
- Skip-link stays (a11y P0 from the last review), targeting `#main`.
- Sidebar: NO border-r. It sits on the canvas; the column boundary is whitespace (FF has no sidebar border — check the screenshots).
- Mobile drawer keeps Base UI Dialog, restyled: `w-[min(20rem,86vw)] bg-background shadow-surface-6`, slide via `--ease-drawer` `--dur-slow`, backdrop `bg-black/40`. Drawer footer gains the theme row (since topbar died).
- ←/→ **keyboard paging** over the full nav ORDER (guides + reference, same chain as prev/next): port FF's key handler incl. its guards (skip when focus is in `input/textarea/slider/tablist/listbox/menu`).

### 4.2 Landing — `/` becomes the showcase

Composition (FF `app/page.tsx` adapted):

1. **Intro block** — `w-full max-w-[680px] mx-auto pt-20 sm:pt-28 pb-10 px-6`, `mt-12 xl:mt-0` (clears the floating hamburger):
   - `h1` `text-h1` "Constructive Blocks"
   - `p` `text-[14px] text-muted-foreground` — one sentence. Draft: "Full-stack auth, org and admin blocks for the Constructive platform — install with shadcn."
   - Buttons row `mt-2 gap-2`: `SiteButton primary sm` "Get started" → `/blocks/getting-started`; `SiteButton tertiary sm` "Browse docs" → `/blocks`.
   - Right side: prev/next ghost arrows (prev disabled, next → `/blocks`) — the same pager chrome as every doc page. The landing is page 0 of the chain.
2. **Bento grid** — `w-full max-w-[1200px] mx-auto px-6 pb-16`:
   - `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 bento-grid` (dense flow, 300px auto-rows at md+).
   - **BentoCard** (new `src/components/landing/bento-card.tsx`, FF anatomy): `relative flex flex-col rounded-xl border overflow-hidden bento-card-border transition-[box-shadow,border-color] duration-[var(--dur-fast)]`; demo well `flex-1 min-h-0 flex items-center justify-center px-6 py-10 overflow-hidden`; footer = `<Link>` `flex items-center gap-2 px-4 py-3 border-t border-border/40 hover:bg-hover` with 13px medium label (muted → foreground on hover) + optional dot-badge "New". Sizes: `large: md:col-span-2 md:row-span-2`, `medium: md:col-span-2`, `small: col-span-1`. **No unnamed `group` on the card** (FF comment: it would trigger every inner component's `group-hover:` at once); footer link uses `group/link`.
   - **Curation**: a hand-authored `SHOWCASE: { slug, size }[]` list (new file `src/components/landing/showcase-manifest.ts`) of ~20 entries drawn from the existing `DEMOS`/`UI_DEMOS` maps. (`DEMOS` is currently module-local in `showcase.tsx:310` — the doc-templates phase exports it; the landing phase imports, never edits, `showcase.tsx`.) Rubric: interactive without needing a dialog trigger, visually self-contained at card size, spread across categories (≥1 each of auth/org/ui/storage/schema/flows), size mix ≈ 1–2 large, 4–6 medium, rest small. Starter set (verify each slug exists in the maps; drop/replace any that don't): `auth-sign-in-card` (large), `org-members-list` (medium), `ui-command` (medium), `auth-mfa-totp-challenge`, `auth-social-buttons`, `ui-autocomplete`, `ui-tags`, `auth-passkey-sign-in`, `ui-storage-upload-dropzone`, `auth-email-otp-input`, `ui-combobox`, `org-invite-dialog`→(skip if dialog-gated), `ui-collapsible`, `auth-verify-email-banner`, `ui-slider`-family equivalent, `user-*` pick, `schema-*` pick (medium), `ui-flickering-grid` (visual, small), `auth-magic-link-request-card`, `shell-*` pick.
   - The whole grid wraps in ONE `PreviewProvider` (QueryClient + `DocsMockAdapter` + `StepUpProvider` + `PortalRoot`) — demos are live, not screenshots. Each card body renders the demo directly (no PreviewFrame chrome, no label bar — the card footer is the label).
   - Cards contain interactive content: keep them as plain divs with a footer link (FF pattern), NOT wholly-clickable cards.
3. **Footer** — one quiet line, `max-w-[1200px] mx-auto px-6 pb-10`: `v0.1.0 · N blocks · N ui components · GitHub` in `text-[12px] text-muted-foreground`, links underlined on hover. The entire current `site-footer.tsx` (watermark, terminal, link columns) dies.

Retired landing files (delete): `hero.tsx`, `for-agents.tsx`, `block-anatomy.tsx`, `feature-sequence.tsx`, `featured-blocks.tsx`, `categories.tsx`, `principle.tsx`, `trust.tsx`, `top-nav.tsx`, `site-footer.tsx`, `mockups.tsx`, `motion.tsx` (MotionConfig moves to root), plus `primitives.tsx` if no survivor imports it. `brand.tsx` (RegistryMark/wordmark) survives for sidebar + footer. `theme-toggle.tsx` logic survives but is re-homed (right panel + drawer).

### 4.3 Reference page template (`[...slug]` → `doc-page.tsx`)

Content column: `w-full max-w-[760px] mx-auto py-20 sm:py-28 px-6 mt-12 xl:mt-0`, root `flex flex-col gap-8`. (FF uses 680px; we take 760px because our blocks are wider than FF's primitives — single measure for EVERYTHING: text, previews, code, tables. No TOC, no eyebrow, no breadcrumb.)

1. **Header row** `flex items-start justify-between gap-4`:
   - Left: `h1` `text-h1` + `p` `text-[13px] text-muted-foreground` description `mt-2`.
   - Right: prev/next as `SiteButton ghost icon` with `ArrowRight` (prev rotated 180°), tooltips showing target title + `<kbd className="font-mono opacity-50">←/→</kbd>`, disabled state at chain ends. (Replaces the current bordered `size-7` pager at the bottom; pager lives up top like FF.)
2. **Status strip** (blocks only, when applicable): dot-badge (§7.4) + one-line blurb; non-ready callout as a plain `rounded-xl border border-border/60 bg-muted p-3 text-[13px]` panel — no warning-tinted borders.
3. **Installation** `DocSection`: h2 16px semibold + `InstallField` (§7.3) + optional 12px muted note.
4. **Live preview / feature sections**: each `DocSection` = h2 + 13px muted intro + `PreviewCard` (§7.1).
5. **API / props / messages tables**: FF PropsTable styling (§7.2), one table per sub-surface, `overflow-x-auto` wrapper.
6. **Requires panel**: plain `rounded-xl border border-border/60 bg-card shadow-surface-1 p-4`; operation chips `font-mono text-[12px] bg-muted rounded-lg px-1.5 py-0.5` — no accent borders.

`DocSection`: `flex flex-col gap-3`; h2 `text-[16px] leading-none` semibold; anchored ids stay (deep links), `scroll-mt-8`.

### 4.4 Guides + Introduction

Same shell + column as 4.3 (guides keep `max-w-[720px]` if already there — fine within ±40px; do NOT create a third measure).

- **Introduction (`/blocks`)** restructures to FF's Introduction shape: h1 + one-line sub, then 4–5 thesis blocks (`h3` 16px semibold `leading-none` + `p` `text-[14px] text-foreground/90 leading-relaxed`), `hr border-border/60 my-8`, then **Installation** with FF's numbered circular step badges: `inline-flex size-[18px] items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground` + 13px instruction + `InstallField` commands. Content (what Blocks is, generated SDK, adapters) is preserved — restyled, not rewritten.
- **prose.tsx** retune: `proseCls` → `text-[14px] leading-relaxed text-foreground/90` (FF body reads at 90% foreground, NOT muted — muted is for one-liners under headings); links `underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground` (calm, not accent-colored); `InlineCode` `rounded bg-muted px-1 py-0.5 font-mono text-[12px]`.
- Guide pages (11 files) then need only mechanical sweeps: kill `Reveal`/`Stagger` imports, eyebrows, `cb-*` classes; headings/prose inherit the new primitives.

### 4.5 Sidebar anatomy (restyle of `sidebar.tsx` / `sidebar-nav.tsx` / `nav-item.tsx`)

- Rail: `w-60 p-4 flex flex-col gap-4`, no border, canvas bg, `scroll-fade` on the scroll region.
- Brand block: RegistryMark 22px + "Constructive Blocks" 13px medium — one line, quiet; no version pill here.
- Top menu (NavMenu w/ proximity glide, §3.4): `Showcase` → `/`, `Introduction` → `/blocks`.
- Filter input stays (our 170-item reality), restyled: `h-8 rounded-lg border-none bg-transparent hover:bg-hover focus-visible:bg-hover text-[13px] placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring` — quieter than the current bordered box; sticky top with `bg-background`.
- Section headers: `text-[13px] text-muted-foreground/50 pl-1 pb-1.5 flex items-center gap-2` + count `text-[11px]` (FF exact). NOT the current `px-3 font-medium`.
- Rows (NavItem): `h-8 rounded-lg px-3 text-[13px]`, resting `text-muted-foreground`, hover `bg-hover text-foreground`, active-route `bg-active text-foreground` + ghost-span weight 400→550. Kill the accent bar / `bg-foreground/[0.07]` actives. `isNew`/`isUpdated` dot: `size-1.5 rounded-full bg-primary inline-block ml-2 align-middle` (FF places the dot INSIDE the label span, after text).
- Sub-group captions (collapse): keep mechanics (chevron button, aria-expanded, state-adjust-on-render), restyle: `text-[12px] text-muted-foreground/60 hover:text-foreground`, chevron `size-3`, `duration-[var(--dur-fast)]`; indented rows `pl-6`.
- Footer status line: `text-[11px] text-muted-foreground/50` — `v0.1.0 · 75 blocks · 76 ui`. Green dot dies (decoration).

### 4.6 Right panel — "Make it yours" (new `src/components/docs/right-panel.tsx`)

`aside w-64 shrink-0 sticky top-4 self-start mt-4 mr-4 rounded-xl bg-muted p-4 xl-fade-block` (FF exact, radius adapted).

- Header row `flex items-center justify-between pl-1 pt-2 pb-2`: `h2 text-[16px] leading-none` semibold "Make it yours" + GitHub chip (`SiteButton ghost sm` w/ GH glyph + star count `tabular-nums`; count fetched client-side from `api.github.com/repos/constructive-io/…` with graceful fallback to no-count; cache in sessionStorage).
- Rows (`flex flex-col gap-1.5 py-3`, each row `flex items-center justify-between`, label `text-[13px] text-muted-foreground`):
  1. **Theme** — compact borderless select or 3-way segmented (System/Light/Dark) `h-7 text-[13px]`, wired to next-themes. Keyboard `T` cycles (guarded like ←/→).
  2. **Package manager** — `pnpm / npm / bun / yarn`; persists to localStorage (`cb-pm`), context-provided; **every install command on the site** (`InstallField`, Introduction steps) renders through `installCommand(pm, url)` → `pnpm dlx shadcn@latest add <url>` / `npx …` / `bunx --bun …` / `yarn dlx …`.
- Footer `flex items-center gap-2 pt-2`: RegistryMark 18px + `text-[13px] text-muted-foreground` "Built by <a class="hover:text-foreground transition-colors">Constructive</a>".
- Hidden below xl (`xl-fade-block`); theme + pm rows duplicate into the mobile drawer footer.

---

## 7. Component recipes

### 7.1 PreviewCard (restyle `component-preview.tsx` + fold in `preview-frame.tsx`)

FF ComponentPreview anatomy, adapted to our Base UI Tabs:

```
<div class="flex w-full flex-col rounded-xl border border-border/60
            transition-[border-color] duration-[var(--dur-fast)] focus-within:border-foreground/40">
  <div class="flex min-h-[52px] items-center gap-0 px-3 pt-3">      ← header
    [Tabs.List: Preview | Code]                                      ← left-aligned pills
    [spacer]
    [reset ghost icon button — only when resettable]
  </div>
  <div class="overflow-hidden" style="border-bottom radii inherit">
    Preview panel: flex items-center justify-center min-h-[120px] bg-background px-8 py-12
    Code panel:    overflow-auto text-[12.5px] p-4 (Shiki dual-theme, transparent bg)
  </div>
</div>
```

- Tabs restyle: **transparent track** (`gap-0.5 -mx-1 px-1 -my-1 py-1` for ring room), items `h-8 px-3 text-[13px] bg-transparent`, labels ghost-span weight-shift + `text-muted-foreground → text-foreground`; `Tabs.Indicator` = `bg-active rounded-lg` sliding via existing transform transition at `--dur` (this replaces the current bordered `bg-surface-2/60` track + white `bg-card shadow` pill).
- **The stage chrome dies**: no `cb-block-bar` label row, no `· preview` mono suffix, no 18px dotted backdrop, no per-preview light/dark toggle (site theme lives in the right panel; `.cb-stage-light` scope is deleted). Reset survives as the ghost icon button in the header (FF's playback slot).
- Preview well is plain `bg-background`. Demos keep `.not-prose`. `next/dynamic({ssr:false})` + skeleton mounting stays (hydration fix). `keepMounted` stays.
- Wide-demo policy: the well is 760px-column width; demos are responsive and preview-width wrappers already cap intrinsic widths. If a specific demo overflows, it scrolls horizontally inside the well (`overflow-x-auto`) — do NOT widen the column per-page.
- **Fullscreen** (added 2026-07-03): every preview header carries a `Maximize2` ghost button opening a viewport-spanning Base UI Dialog (`inset-3 sm:inset-6`, `rounded-xl border-border/60 bg-background shadow-surface-8`, scale+fade on the slow tier with centered origin, ESC/backdrop dismiss, focus trap + restore). The modal mounts a SECOND, fresh `<BlockShowcase>` instance (own provider) only while open — no state fights with the inline instance, clean on every open. This is the escape hatch for demos wider than the doc measure (storage browser, org tables).
- **Fullscreen viewports**: the modal header centers a mobile (375) / tablet (768) / desktop (full) switcher — the ThemeControl segmented pattern (`role=group`, icon buttons, `aria-pressed`, `bg-active` selected). It clamps the demo's CONTAINER width; constrained widths get a hairline device frame + a `375px`/`768px` mono readout by the title; width SNAPS (never animated — layout property). Container-clamping (not an iframe) is faithful here because the block corpus is container-driven (22 media-query classes total); the same instance survives switches so demo state carries across viewports. Resets to desktop on every open (modal unmounts on close).

### 7.2 Tables (props/messages + any chrome table)

`<table class="w-full border-collapse text-[13px]">`; header `<th class="px-3 py-2 text-left text-foreground border-b border-border">` semibold; body rows `border-b border-border/40`; cells `px-3 py-2`; prop names `font-mono text-[12px] text-foreground`; types/defaults `font-mono text-[12px] text-muted-foreground`; descriptions 13px `text-muted-foreground`; missing default `—`. Drop the Default column when no row has one (FF behavior).

### 7.3 InstallField (new, replaces install-command pills + code-surface for one-liners)

FF InputCopy anatomy: `<button class="group flex w-full items-center rounded-lg cursor-pointer outline-none transition-all duration-[var(--dur-fast)] focus-visible:ring-1 focus-visible:ring-ring">` → mono value `flex-1 truncate py-2 text-left font-mono text-[13px]` wrapped in a `<mark class="bg-transparent group-hover:bg-primary/15 transition-colors">`, copy icon `px-1.5 text-muted-foreground group-hover:text-foreground` with copy→check morph (`AnimatePresence mode="wait"`, `spring.fast`, scale 0.6→1). Whole field is the copy button. Renders through the package-manager context (§4.6). `align="left"` variant for step lists.

### 7.4 StatusBadge (docs-side `status-badge.tsx`)

FF dot badge: `inline-flex h-5 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground` + `size-1.5 rounded-full` dot colored by status (ready `#22C55E`, pending `#F59E0B`, planned `var(--muted-foreground)`, info `var(--primary)`). Solid variant (rare): `color-mix(in srgb, <hex> 15%, var(--background))` bg + foreground text. Kill `cb-status-*` classes and colored-text pills.

### 7.5 Code panels (`code-surface.tsx`)

Theme-following (constant-dark mode dies): `rounded-xl border border-border/60 bg-card shadow-surface-1`, header `px-4 py-2 border-b border-border/40` w/ `font-mono text-[11px] text-muted-foreground` filename + copy ghost; body `p-4 text-[12.5px]` Shiki dual-theme (`--shiki-light`/`--shiki-dark` mapping kept), `bg-transparent`.

### 7.6 kbd

`<kbd class="font-mono text-[11px] opacity-50">` inline in tooltips (FF). No bordered keycaps.

---

## 8. Kill list (delete, don't restyle)

| What | Where |
|---|---|
| Isometric hero (cb-hero, cb-blk-*, float pills, CountUp stats, blinking cursor) | `hero.tsx`, `registry-theme.css` |
| Atmosphere dots + accent radial glows (`cb-atmo-*`, hero `::before/::after`, stage dots) | `registry-theme.css` |
| Landing sections: for-agents, block-anatomy, feature-sequence, featured-blocks, categories, principle, trust | `landing/*` |
| TopNav + giant-watermark footer + constant-dark terminals | `top-nav.tsx`, `site-footer.tsx` |
| Scroll/entrance theater: Reveal, Stagger, CountUp, useScrollSpy, whileInView | `motion.tsx` + all consumers |
| Topbar (breadcrumb, blur, install pill) + `breadcrumbFor` usage | `topbar.tsx` |
| TOC rail + scroll-spy | `toc.tsx` |
| Per-preview theme toggle + `.cb-stage-light` forced-light scope | `preview-frame.tsx`, `registry-theme.css` |
| Stage bar + dotted stage backdrop (`cb-block-bar`, `cb-block-stage`) | `preview-frame.tsx`, `registry-theme.css` |
| `cb-btn-*`, `cb-card`/`cb-card-hover`, `cb-chip`, `cb-eyebrow`, `cb-hero-*`, `cb-code-surface` + `--cb-code-*` | `registry-theme.css` |
| Category eyebrow on doc pages | `doc-page.tsx`, `[...slug]/page.tsx` |
| Legacy `--shadow-sm/md/lg`, `--inset-hi`, `--ease-in-out`, cool-charcoal knobs (`--cb-bg-l/hue`) | `globals.css` |
| `registry-mark-hop` keyframes + green status dot + component-scoped `<style>` blocks | `globals.css`, `categories.tsx`, `sidebar.tsx` |
| RegistryMark landing hop animation | `globals.css` (keep the mark itself) |

`registry-theme.css` (922 lines) should be **deleted entirely**; survivors (only the `.prose` helpers if any prove load-bearing) fold into `globals.css`. Expect the app's custom CSS to shrink to roughly FF's size (~700 lines incl. ported utilities).

## 9. Do-not-touch constraints

- **Generated**: `src/lib/docs/registry-data.ts`, `src/blocks-manifest.json`, `src/flows/flows.json` — never hand-edit; regenerate via `pnpm --filter blocks gen`. This redesign requires NO content/generator changes (`scripts/**` untouched; `gen:check` must stay green with zero drift).
- **Shipped verbatim**: `src/blocks/**` and `packages/ui/**` — the PRODUCT. The redesign styles the docs site only. Demos (`src/components/docs/demos/*`) may have their framing/wrappers adjusted, never the block invocations themselves.
- **Nav data** (`src/lib/docs/nav.ts` taxonomy, sub-group maps, pager ORDER, `getAdjacent`) — presentation changes only; the data model and build-time assertions stay.
- Preview mount mechanics: `PreviewProvider`, `DocsMockAdapter`, `next/dynamic ssr:false` + skeleton, `keepMounted`, `.not-prose`, `PortalRoot` — keep; these are hard-won fixes.
- `@source` scanning lines in `globals.css` and the `ui-parity` test contract.
- Git: never `checkout/reset/stash/commit`; the branch carries 5 uncommitted change sets (safety snapshot exists).

## 10. Implementation phases (workflow plan)

| Phase | Owns (exclusive) | Blocks on |
|---|---|---|
| **P0 Foundations** | `globals.css` value-rewrite (tokens/ladders/utilities — utility NAMES unchanged so nothing breaks mid-flight; do NOT delete `registry-theme.css` yet); NEW shared atoms: `src/lib/motion/{springs,font-weight}.ts`, `src/lib/pm-context.tsx`, `src/components/docs/{site-button,install-field,nav-menu}.tsx`, `src/lib/use-proximity-hover.ts` | — |
| **P1 Shell** | root `layout.tsx` (MotionConfig + global shell), `blocks/layout.tsx`, `providers.tsx` (mount pm-context), `sidebar.tsx`, `sidebar-nav.tsx`, `nav-item.tsx`, `right-panel.tsx` (new), `mobile-drawer.tsx`, retire `topbar.tsx`/`toc.tsx`, ←/→ paging hook, `theme-toggle.tsx` re-home | P0 |
| **P2 Doc templates** | `doc-page.tsx`, `doc-section.tsx`, `component-preview.tsx`, `preview-frame.tsx`, `code-surface.tsx`, `props-table.tsx`, `messages-table.tsx`, `block-status-header.tsx`, `status-badge.tsx`, `requires-panel.tsx`, `showcase-kit.tsx`, `showcase.tsx` (restyle wrapper + `export const DEMOS`), `copy-button.tsx`, `[...slug]/page.tsx` | P0 (runs parallel with P1, P3) |
| **P3 Landing** | `app/page.tsx`, `bento-card.tsx` + `showcase-manifest.ts` (new), delete retired landing files, minimal footer, `brand.tsx` touch-up | P0 (parallel with P1/P2; imports SiteButton from P0, DEMOS via `showcase.tsx` — if the export isn't in yet when it starts, write the import anyway; P2 lands it) |
| **P4 Guides** | `(guides)/**` incl. Introduction restructure, `prose.tsx`, `markdown.tsx` | P2 |
| **P5 Review + fix** | visual-fidelity vs FF screenshots, consistency (scale/radius/duration sweep), a11y (focus/contrast/keyboard), THEN: delete `registry-theme.css` + its import + all remaining `cb-*` usages, dead-code prune, cross-phase dedupe | P1–P4 |
| **P6 Gates + Chrome verify** | `pnpm gen` + `gen:check` + `lint:types` + `test` + `build`; Chrome dark+light walkthrough | P5 |

File-ownership is exclusive per phase (the table IS the lock table). Shared atoms (SiteButton, InstallField, pm-context, springs) live in P0 so P1/P2/P3 can run in parallel and just import. Individual agents must NOT run `pnpm build` mid-flight (transient cross-phase breakage is expected); the final phase gates.

## 11. Atmosphere + showcase wall (added 2026-07-03; revised same day)

Two sanctioned decorative surfaces, both landing-only. **Doc pages carry no atmosphere at all** — a first revision painted a site-wide shader dot grid, and it overlapped the transparent cards; the standing rule from that cut: **texture never sits under content.**

**Aurora** (`src/components/docs/baseplate.tsx`, `@paper-design/shaders-react` pinned `0.0.77`): one `GrainGradient` blue grain cloud breathing behind the landing intro (`shape blob`, `softness 0.8`, `intensity 0.45`, `noise 0.3`, `speed 0.55`, wrapper opacity 0.30 dark / 0.20 light, radial CSS mask feathers the solid-back canvas edge). Mounted in the Shell via `next/dynamic ssr:false` (next-themes resolves the theme client-only — SSR'ing it is a guaranteed hydration mismatch). Shader color rules: uniforms can't read CSS vars — backs are the exact theme canvas hexes (`#171717`/`#FAFAFA`), blues are the OKLCH tokens converted (`#02A2FF` dark / `#0076C8` light); intensity lives on wrapper `opacity` so §1.10 floors hold.

**GridMotion wall** (`src/components/landing/grid-motion.tsx`, adapted from React Bits; dep `gsap`): the landing showcase — a `-15°`-rotated 4-row wall of **live block demos** (150vw×150vh in a clipped 72vh section). Two motion layers: (1) each row is an infinite marquee — its 6 tiles render twice in a track that gsap translates by exactly one copy (`xPercent`, `ease none`, `repeat -1`, per-row durations 58–78s, alternating directions) so rows drift forever and recycle seamlessly; (2) the pointer adds per-row inertia on the wrappers (`power3.out`, lag 0.2–0.6, ±80px). Curation lives in `showcase-manifest.ts` `SHOWCASE_ROWS` — **complex blocks only** (auth flows, org management, storage, shell subsystems; primitives are deliberately absent: the wall sells the blocks, the docs sell the primitives). Tiles: `w-[420px] rounded-xl border-border/60 bg-surface-2 shadow-surface-1`, demo on a 460px inner stage at `scale-[0.8]`, one shared `PreviewProvider` for the whole wall.

**Guardrails (both):** `aria-hidden` + `inert` on the wall (live demos are full of focusables that must not catch Tab/clicks while rotated and moving) + `pointer-events-none`; `useReducedMotion` → all tweens skipped / `speed 0`; negative z-index under the Shell's `isolate` for the aurora; wall loaded `ssr:false` (demo registry renders non-deterministically server-vs-client).

## 12. Acceptance checklist (Chrome-verifiable)

- [ ] `/` shows sidebar + intro block + live bento grid; every card's demo is interactive; footer links work; no hero/marketing sections remain.
- [ ] Dark canvas computes to `#171717`; light to `#FAFAFA`; card `#252525` / `#FFFFFF`; zero blue-tinted grays anywhere in chrome.
- [ ] A reference page (e.g. `/blocks/auth/sign-in-card`) renders: h1 + desc + top-right pager, Installation InstallField (command switches with the pm row), Preview/Code card with sliding `bg-active` pill tabs + weight-shift labels, plain `bg-background` well (no dots), FF-style props tables.
- [ ] Right panel present at xl: theme + package-manager rows work; GitHub chip renders (count or fallback); panel `bg-muted rounded-xl`, sticky.
- [ ] Sidebar: no right border; section headers muted/50 with 11px counts; rows h-8 with `bg-hover` hover, `bg-active` + semibold active; filter + collapse + auto-expand still work; ←/→ pages through the chain; Showcase/Introduction glide-highlight follows the cursor.
- [ ] Guides + Introduction restyled (step badges, 14px/90% prose, no eyebrows); no `Reveal`/stagger imports anywhere.
- [ ] `prefers-reduced-motion`: no transform motion; fades remain.
- [ ] Both themes: focus rings 1px Constructive blue; `:focus-within` strengthens preview/bento borders.
- [ ] Gates: `gen:check` zero drift; `lint:types` 0; tests green (incl. `ui-parity`); `build` succeeds; no console errors on `/`, one reference page, one guide.
