# Sheets Visual Design Spec

The reference look-and-feel contract for `@constructive-io/sheets`. Any agent or
dev styling a cell, editor, header, or chrome element aligns to **this** doc.
It is the design source of truth; `FEATURES.md` is the functional one.

> **North star:** a refined, content-first data grid in the spirit of modern
> CRM-style grids (Linear, Notion) — generous whitespace, horizontal-only rules,
> restrained color used as
> *signal* (status, category, links), and motion reserved for the rare moment.
> The data is the interface; the chrome disappears.

## Lineage (governing craft sources)

- **`/baseline-ui`** — hard constraints (tokens over raw palette, `size-*`, fixed
  z-scale, `AlertDialog` for destructive, skeletons, compositor-only animation,
  `prefers-reduced-motion`, one accent per view). These are MUSTs.
- **`/frontend-design`** — taste & intentionality. Our chosen direction is
  *refined minimalism*: executed with restraint, precision, and attention to
  spacing/typography/subtle detail (not maximalism).
- **Emil Kowalski — `emil-design-eng` + `review-animations`** — the motion policy
  (§10) and micro-interaction craft. Applied LAST, as a polish pass.

## What we extracted from the reference

| Signal in the reference | Translation for Sheets |
| --- | --- |
| No vertical gridlines; faint horizontal row rules only | Kill `border-r` everywhere; one hairline `border-b` per row (§8) |
| Generous row height, comfortable padding | 44px default row, 12px cell padding (§5) |
| Colored category pills (tinted bg + colored text) | Tonal badge system — neutral by default, opt-in color (§7) |
| Muted, barely-there header | No fill; label `text-xs`/medium/muted, bottom hairline only (§9) |
| Primary field carries an avatar + heavier weight | First column = identity slot: avatar + `font-medium` (§9) |
| Links are blue, underline on hover | `--info` token, `underline-offset-2 hover:underline` (§9) |
| Right-aligned figures, aligned digits | `tabular-nums`, right-aligned, **proportional** font (drop `font-mono`) (§9) |
| Rounded avatars for logos/people | Image cell gains a `rounded-full` avatar variant (§9) |
| Subtle row hover; crisp selection | `hover:bg-muted/40`; 1px-inset ring selection (§10) |

## Design principles

1. **Tokens, not palette.** Chrome (text, surfaces, borders, focus) uses semantic
   tokens only (`foreground`, `muted-foreground`, `muted`, `border`, `primary`,
   `ring`, `info`, `destructive`). Raw `neutral-*` / `blue-*` / `gray-*` in a cell
   view is a bug — it breaks theming and dark mode. The **one** exception is the
   categorical badge palette (§7), which is intentional data-viz color.
2. **Horizontal rhythm only.** Rows are separated by a single hairline. No
   vertical gridlines. The grid breathes column-to-column; it reads row-to-row.
3. **Color is signal, not decoration.** One accent per view (selection = primary).
   Category hue, link blue, status green/red carry *meaning*. Never gradients,
   never glow.
4. **Density is a knob, not a default fight.** Ship `comfortable` (44px). Expose
   `compact`/`comfortable` so dense power-users and spacious browsers both win.
5. **Restraint in motion.** A grid is a keyboard instrument seen thousands of
   times a day. Nav/selection/fill NEVER animate. Motion lives only on rare
   surfaces (overlay open, popovers, feedback). See §10.
6. **Overridable by design.** Every default view is a `cellSlots` swap target.
   Defaults must look finished, but never assume they're the final pixel — keep
   each view a dumb presenter reading `CellProps`.

## 5. Token foundation

Density tokens (drive row height + cell padding; default = `comfortable`):

| Token | compact | comfortable (default) | spacious |
| --- | --- | --- | --- |
| Row height | 36px | **44px** | 52px |
| Header height | 36px | **40px** | 44px |
| Cell padding-x | 8px (`px-2`) | **12px (`px-3`)** | 16px (`px-4`) |

Type scale:

| Element | Spec |
| --- | --- |
| Body cell | `text-sm` (14px), `text-foreground` |
| First/identity column | `text-sm font-medium text-foreground` |
| Numbers / dates | `text-sm tabular-nums` (NOT `font-mono`) |
| Column header | `text-xs font-medium text-muted-foreground` |
| Badge / chip | `text-xs font-medium` |
| Secondary / empty | `text-sm text-muted-foreground` |

Radius (from `--radius: 0.5rem`): badges/chips `rounded-md`, avatars
`rounded-full` (people/logos) or `rounded-sm` (generic image), focus ring follows
cell box (square). Shadows: Tailwind default scale only; the grid itself is flat —
elevation belongs to overlays/popovers, not cells.

## 6. Color & theming law

- **Surfaces:** body `bg-background`; header `bg-background` (no fill); sticky col
  `bg-background` (so it occludes scrolled content); hover `bg-muted/40`;
  selected row `bg-primary/5`.
- **Borders:** `border-border` for the row hairline; `border-border` for the
  frozen-column divider (§8). Default border color in Tailwind v4 is
  `currentColor` — always name the color.
- **Text:** primary `text-foreground`, secondary/placeholder
  `text-muted-foreground`, link `text-info` (`--info`), never a raw hex.
- **Dark mode is non-negotiable.** Every class must have a working dark
  appearance. Token classes get it for free; the badge palette (§7) ships
  explicit `dark:` pairs. Verify both themes in Storybook.

## 7. The badge / category color system (signature element)

Category pills are the reference's defining look. We render them as a tinted chip:
soft same-hue background + saturated same-hue text. **Default tone is `neutral`;
color is opt-in** — the consumer assigns it via a `badgeTones?: Record<string,
BadgeTone>` map (exact value → tone) or a `badgeTone?: (value) => BadgeTone`
resolver. The 8-hue palette below is what those opt-in tones resolve to. No
automatic hashing by default — an unconfigured grid stays calm and on-brand.

```ts
// cell-model/badge-tones.ts (to be created in Phase 2)
export type BadgeTone =
  | 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'teal';

export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  blue:   'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  green:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber:  'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red:    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  pink:   'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  teal:   'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
};

// DEFAULT = 'neutral'. Color is opt-in: consumer supplies `badgeTones` (exact
// value -> tone) or a `badgeTone(value)` resolver (CRM grids let users assign
// category colors). No auto-hashing. Booleans/status may map to fixed semantic
// tones (true->green, false->neutral) independent of the badge map.
```

Chip shape: `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium`,
`max-w-full truncate`. Overflow in a multi-badge cell collapses to a `+N` neutral
chip (already computed by the relation/badges factories — view only paints).

## 8. Gridline & layout philosophy

- **Remove `border-r`** from the cell-host wrapper (`sheets-cell-host.tsx:218`)
  and every header/body cell in `grid-viewport.tsx`. No vertical gridlines.
- **One horizontal hairline per row:** `border-b border-border` on the cell-host
  wrapper (or hoist to the row container — preferred, one border per row not per
  cell). Last row's border is fine (table sits in a bordered container).
- **Frozen-column divider:** the sticky col0 (and marker col) get a `border-r
  border-border` ONLY as the pinned-column separator — the single intentional
  vertical line, signalling "this column is frozen." Optionally strengthen to a
  soft shadow when `scrollLeft > 0`.
- **Container:** the viewport sits in a `rounded-lg border border-border
  overflow-hidden bg-background` card so the horizontal rules terminate cleanly.
- **Z-scale (fixed, no arbitrary `z-[n]`):** body cell `z-0`, sticky col `z-10`,
  active cell `z-20`, sticky header `z-30`, header sticky cells `z-40`,
  range-band `z-20`, overlay editor `z-50`. Document any change here.

## 9. Per-element spec

| Element | Spec | Key classes | File |
| --- | --- | --- | --- |
| **Header cell** | No fill, label muted, bottom hairline, no vertical border; sort caret appears on hover/active; resize handle on hover | `bg-background border-b border-border px-3 text-xs font-medium text-muted-foreground` | `table/grid-viewport.tsx` `HeaderCell` |
| **Body cell frame** | Comfortable padding, vertically centered, truncate, horizontal hairline only | `flex items-center px-3 border-b border-border` | `grid-dom/sheets-cell-host.tsx:218` |
| **Text** | Single truncated span, `title` for overflow | `text-sm text-foreground truncate` | `views/text-view.tsx` |
| **Number** | Right-aligned, tabular, proportional | `justify-end text-right text-sm tabular-nums` (drop `font-mono`) | `views/number-view.tsx` |
| **Datetime** | Left, tabular | `text-sm tabular-nums text-foreground` | `views/datetime-view.tsx` |
| **Boolean** | A boolean column IS a checkbox column → render the design-system `Checkbox` read-only (checked = true, unchecked = false, empty for null); `pointer-events-none` so the cell's dbl-click-toggle still fires | `<Checkbox checked readOnly tabIndex={-1}>` from `@constructive-io/ui/checkbox` | `views/boolean-view.tsx` |
| **URI / email** | Blue link, underline on hover, new tab; empty = muted text | `text-info underline-offset-2 hover:underline` | `views/uri-view.tsx` |
| **Badges** | Tonal chips per §7 | `BADGE_TONES[tone]` + chip shape | `views/badges-view.tsx` |
| **Relation** | Count badge (neutral) + tonal chips; single = plain text + optional avatar | §7 chips; count chip `neutral` | `views/relation-view.tsx` |
| **Image / avatar** | Rounded thumbnail; `rounded-full` avatar variant for logos/people | `size-7 rounded-full object-cover` (avatar) / `rounded-sm` (generic) | `views/image-view.tsx` |
| **First/identity column** | avatar slot + `font-medium` name; the row's anchor | `flex items-center gap-2 font-medium` | sticky col render |
| **Draft-action** | Real `<Button variant="outline">` (already correct) | — | `views/draft-action-view.tsx` |
| **Row marker (checkbox)** | Reveal on row-hover or when any selection is active; always visible once checked | `opacity-0 group-hover:opacity-100 data-[selected]:opacity-100` | `grid-viewport.tsx` `RowMarkerCell` |
| **Toolbar / filters / pagination** | Already token-clean (`@constructive-io/ui`) — leave; only verify spacing rhythm | — | `grid/sheets.controls.tsx`, `sheets.pagination.tsx` |

## 10. Interaction & motion policy

States (color/opacity only — cheap, no layout):

| State | Spec |
| --- | --- |
| Row hover | `hover:bg-muted/40` (group hover; reveals the checkbox) |
| Selected row | `bg-primary/5` |
| Cell range | inert band `border border-primary/50 bg-primary/10` (drop the heavy `border-2`) |
| Active cell | `ring-2 ring-inset ring-primary z-20` (keep; it's the keyboard cursor) |
| Fill handle | `size-2 bg-primary` nub; `cursor-crosshair`; appears at range corner |
| Focus (grid root) | `outline-hidden` + visible active-cell ring (don't double up) |

Motion — **apply Emil's frequency table; default is NO motion:**

| Surface | Frequency | Decision |
| --- | --- | --- |
| Keyboard nav, cell selection, active-cell move, fill, scroll | 100+/day | **No animation. Ever.** |
| Row hover, checkbox reveal | tens/day | Color/opacity only, ≤120ms `ease`, no transform |
| **Overlay editor open** | occasional | Origin-aware `scale(0.97)→1` + `opacity 0→1`, 150ms `ease-out` (`var(--transform-origin)`) |
| Context menu / filter popover | occasional | Base UI default enter/exit, ≤200ms `ease-out`, scale-from-trigger |
| Mutation feedback / toast | occasional | Standard enter/exit, ≤200ms |
| Row insert / delete | occasional | Optional height+opacity, ≤200ms, interruptible; skip if it fights virtualization |

Rules (MUST): animate only `transform`/`opacity`; `ease-out` for enter/exit;
strong custom curve `cubic-bezier(0.23,1,0.32,1)`; never `scale(0)` (start
`0.97`); never `ease-in`; honor `prefers-reduced-motion` (drop transforms, keep
opacity); gate hover motion behind `@media (hover:hover)`. The animation pass is
reviewed against `review-animations/STANDARDS.md` before it lands.

## 11. Empty & loading states

- **Loading cell** (infinite-scroll in-flight): skeleton bar `bg-muted
  animate-pulse` (already present; retune to `bg-muted`, not `bg-primary/10`).
- **Loading grid** (first load): structural skeleton rows (faint bars at column
  widths), not a spinner — per baseline-ui.
- **Empty / filtered-empty:** centered message + ONE clear next action (e.g.
  "Add row" / "Clear filters"). Never a dead end.

## 12. Anti-slop checklist (Do / Don't)

- ✅ Semantic tokens for all chrome. ❌ `neutral-*`/`gray-*`/`blue-*` in chrome.
- ✅ Horizontal hairlines. ❌ Full gridlines / vertical borders (except frozen divider).
- ✅ `tabular-nums` proportional figures. ❌ `font-mono` numbers.
- ✅ One accent (primary) per view. ❌ Multiple competing accents, gradients, glow.
- ✅ `size-*` for square elements; fixed z-scale. ❌ `w-_ h-_` pairs; arbitrary `z-[n]`.
- ✅ Motion only on rare surfaces, compositor props. ❌ Animated nav/selection/sort.
- ✅ `aria-label` on icon-only controls; skeletons for loading. ❌ Spinners as the only loading state.

## 13. Verification

- **Surface:** Storybook on `:6008` (`pnpm --filter @constructive-io/sheets sb`,
  mock adapter, no backend). Consolidated to 3 story groups (enough to stress-test
  + enumerate cases): `all-cell-types` (every cell type, + dark / selection /
  paginated variants), `editing` (overlay editors + interactions), `stress`
  (10k–100k rows, wide, paginated).
- **Selectors (stable):** assert via `data-part-id` / `data-slot`
  (`sheets-header-cell`, `sheets-range-band`, `badges-cell`, `number-cell`, …),
  never text-matching (per standing project memory).
- **Both themes:** toggle light/dark; every element must read correctly in both.
- **Gates per phase:** `npx tsc --noEmit` (0) · `npx vitest run` (green) ·
  `npm run build` · Chrome visual check on `:6008` with the selectors above.
