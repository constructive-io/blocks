'use client';

/**
 * ComponentPreview — the Preview / Code card for a doc section (DESIGN.md §7.1).
 *
 * FF's ComponentPreview anatomy on our Base UI Tabs: an outer `rounded-xl`
 * hairline card that warms its border on `focus-within`; a header row carrying
 * transparent-track tabs (a sliding `bg-active` pill, weight-shift labels) plus a
 * re-homed reset ghost button; and a clipped body with a plain `bg-background`
 * preview well and a transparent-Shiki code panel.
 *
 *   • Preview — the live block, mounted client-only via <BlockShowcase>.
 *   • Code    — the server-highlighted usage snippet (Shiki, dual-theme).
 *
 * When only one surface is present the tabs collapse: a lone code snippet renders
 * as the standalone <CodeSurface> card (§7.5); a lone preview keeps the card + well.
 *
 * HYDRATION — the live preview is loaded CLIENT-ONLY (see <BlockShowcase> below).
 * The subtree (TanStack Query + DocsMockAdapter + per-block Suspense) is an
 * inherently client runtime that renders non-deterministically between the server
 * and the first client paint. Base UI derives the Tabs' `id`s from `useId()` (a
 * tree-position value), so letting that subtree render during SSR shifts the id
 * tree and the TabsTab/TabPanel ids drift on hydration. Gating it behind
 * `next/dynamic({ ssr: false })` keeps the subtree out of BOTH the server render
 * AND the hydration pass — the deterministic skeleton stands in for both — so the
 * Tabs chrome hydrates with identical ids and the real preview mounts only as a
 * post-hydration client update. (No hasMounted flag: the dynamic boundary itself
 * makes the render deterministic.)
 *
 * Reset — the live preview owns a key-bump reset inside <PreviewFrame>; it
 * publishes that fn upward through `onReset`, so the ghost button in THIS header
 * can fire it across the dynamic boundary.
 *
 * Docs harness only — never imported by block source.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Tabs } from '@base-ui/react/tabs';
import dynamic from 'next/dynamic';
import { Maximize2, Monitor, RotateCcw, Smartphone, Tablet, X } from 'lucide-react';

import { Skeleton } from '@constructive-io/ui/skeleton';

import { CodeSurface } from '@/components/docs/code-surface';
import { SiteButton } from '@/components/docs/site-button';
import { fontWeights } from '@/lib/motion/font-weight';
import { cn } from '@/lib/utils';

/** Outer card — hairline that warms on focus-within (§7.1). */
const cardCls =
  'flex w-full flex-col rounded-xl border border-border/60 transition-[border-color] duration-[var(--dur-fast)] focus-within:border-foreground/40';

/**
 * Structural placeholder for the live preview while its client-only chunk loads
 * (and the only thing the SSR + hydration passes ever see in its place). It sits
 * inside the preview well, so it only needs to mirror the block's inner card —
 * the well supplies the centering + `bg-background`. Uses the shared <Skeleton>
 * primitive (reduced-motion honoured).
 */
function PreviewSkeleton() {
  return (
    <div className="w-full max-w-md space-y-3 rounded-xl border border-border/60 bg-card p-5 shadow-surface-1" role="status">
      <Skeleton aria-hidden className="h-4 w-1/3 motion-reduce:animate-none" />
      <Skeleton aria-hidden className="h-9 w-full motion-reduce:animate-none" />
      <Skeleton aria-hidden className="h-9 w-full motion-reduce:animate-none" />
      <Skeleton aria-hidden className="h-9 w-2/5 motion-reduce:animate-none" />
      <span className="sr-only">Loading preview…</span>
    </div>
  );
}

// Client-only live preview — see the HYDRATION note above. The lightweight
// registry shell loads after hydration, then requests only the selected demo's
// literal dynamic-import chunk (plus its shared runtime dependencies).
const BlockShowcase = dynamic(() => import('./showcase').then((m) => m.BlockShowcase), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

/** A single tab — transparent, with the ghost-span weight-shift label (§3.1). */
function PreviewTab({ value, label, active }: { value: string; label: string; active: boolean }) {
  return (
    <Tabs.Tab
      value={value}
      className="relative z-10 flex h-8 cursor-pointer items-center rounded-lg bg-transparent px-3 outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="inline-grid whitespace-nowrap text-[13px]">
        <span
          aria-hidden
          className="col-start-1 row-start-1 invisible"
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {label}
        </span>
        <span
          className={cn(
            'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-[var(--dur-fast)]',
            active ? 'text-foreground' : 'text-muted-foreground',
          )}
          style={{ fontVariationSettings: active ? fontWeights.semibold : fontWeights.normal }}
        >
          {label}
        </span>
      </span>
    </Tabs.Tab>
  );
}

/** Plain preview well — centers the live block on the page canvas (§7.1). */
function PreviewWell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[120px] items-center justify-center bg-background px-8 py-12">{children}</div>;
}

/** Transparent-Shiki code panel — dual-theme var mapping, no inner card (§7.1). */
function CodePanel({ codeHtml }: { codeHtml: string }) {
  return (
    <div
      className={cn(
        'overflow-auto p-4 text-[12.5px] leading-relaxed',
        '[&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:[color:var(--shiki-light)]',
        '[&_.shiki_span]:[color:var(--shiki-light)]',
        'dark:[&_.shiki]:[color:var(--shiki-dark)] dark:[&_.shiki_span]:[color:var(--shiki-dark)]',
        '[&_code]:font-mono',
      )}
      dangerouslySetInnerHTML={{ __html: codeHtml }}
    />
  );
}

// Clips the body's square bottom corners to the card's rounded-xl WITHOUT
// re-clipping the tab focus rings above (the outer card keeps overflow visible).
const clipBottom = { borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' } as const;

/** Fullscreen viewport presets. `width: null` = span the whole modal. */
const VIEWPORTS = [
  { id: 'mobile', label: 'Mobile viewport (375px)', width: 375, Icon: Smartphone },
  { id: 'tablet', label: 'Tablet viewport (768px)', width: 768, Icon: Tablet },
  { id: 'desktop', label: 'Desktop viewport (full width)', width: null, Icon: Monitor },
] as const;
type ViewportId = (typeof VIEWPORTS)[number]['id'];

/**
 * Fullscreen preview — a viewport-spanning modal for demos too wide for the
 * 760px doc measure (storage browser, org tables). Renders a SECOND, fresh
 * <BlockShowcase> instance (its own PreviewFrame/provider) mounted only while
 * open, so the modal never fights the inline instance's state and each open
 * starts clean. Base UI Dialog supplies focus trap, scroll lock, ESC +
 * backdrop dismiss; the popup scales in on the slow tier (modals keep a
 * centered origin) and honors reduced motion.
 *
 * The header carries a mobile / tablet / desktop switcher (same segmented
 * pattern as ThemeControl): it constrains the demo's CONTAINER to 375 / 768 /
 * full and frames the constrained widths with a hairline. Width snaps — no
 * layout-property animation. The blocks are overwhelmingly container-driven
 * (22 media-query classes across the whole corpus), so a container clamp is a
 * faithful device simulation without an iframe; the same instance survives
 * switches, so demo state carries across viewports.
 */
function FullscreenPreview({ slug, open, onOpenChange }: { slug: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [viewportId, setViewportId] = useState<ViewportId>('desktop');
  const viewport = VIEWPORTS.find((v) => v.id === viewportId) ?? VIEWPORTS[2];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-out)] data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-surface-8 outline-none transition-[scale,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)] data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0 motion-reduce:transition-none sm:inset-6">
          <Dialog.Title className="sr-only">Fullscreen preview</Dialog.Title>
          <Dialog.Description className="sr-only">
            The live preview at full viewport width. Press Escape to close.
          </Dialog.Description>

          <div className="flex min-h-[52px] shrink-0 items-center gap-3 border-b border-border/40 px-3">
            <span className="flex-1 px-1 text-[13px] font-medium text-muted-foreground">
              Preview
              {viewport.width ? (
                <span aria-hidden className="ml-2 font-mono text-[11px] font-normal tabular-nums opacity-70">
                  {viewport.width}px
                </span>
              ) : null}
            </span>

            {/* Viewport switcher — the ThemeControl segmented pattern. */}
            <div role="group" aria-label="Preview viewport" className="inline-flex items-center gap-0.5 rounded-lg bg-hover p-0.5">
              {VIEWPORTS.map(({ id, label, Icon }) => {
                const on = viewportId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    aria-label={label}
                    onClick={() => setViewportId(id)}
                    className={cn(
                      'grid size-7 place-items-center rounded-[6px] outline-none transition-[color,background-color] duration-[var(--dur-fast)] focus-visible:ring-1 focus-visible:ring-ring',
                      '[&_svg]:transition-[stroke-width,scale] [&_svg]:duration-[var(--dur-fast)] motion-safe:active:[&_svg]:scale-90',
                      on ? 'bg-active text-foreground [&_svg]:[stroke-width:2]' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>

            <span className="flex flex-1 items-center justify-end gap-2">
              <kbd aria-hidden className="font-mono text-[11px] text-muted-foreground opacity-70">
                esc
              </kbd>
              <Dialog.Close
                render={<SiteButton variant="ghost" size="icon" aria-label="Close fullscreen preview" />}
              >
                <X />
              </Dialog.Close>
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="flex min-h-full w-full items-center justify-center p-6 sm:p-10">
              {/* The device frame: full-bleed on desktop; hairline-framed clamp
                  on mobile/tablet (width snaps — never animated, §baseline-ui).
                  One instance across switches, so demo state carries over. */}
              <div
                className={cn(
                  'flex items-center justify-center',
                  viewport.width && 'shrink-0 rounded-xl border border-border/60 bg-background p-4 shadow-surface-2',
                )}
                style={{ width: viewport.width ?? '100%', maxWidth: '100%' }}
              >
                <BlockShowcase slug={slug} />
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface ComponentPreviewProps {
  /** Key into DEMOS/UI_DEMOS — renders the live preview when set. */
  showcaseSlug?: string;
  /** Server-highlighted (Shiki, dual-theme) HTML for the Code tab. */
  codeHtml?: string;
  /** Raw snippet for the copy control (the highlighted HTML is not copy-friendly). */
  rawCode?: string;
  /** Language label shown in the code header (e.g. "tsx", "bash"). */
  codeLang?: string;
  className?: string;
}

export function ComponentPreview({ showcaseSlug, codeHtml, rawCode, codeLang, className }: ComponentPreviewProps) {
  const hasPreview = Boolean(showcaseSlug);
  const hasCode = Boolean(codeHtml);

  // Controlled so the ghost-span labels know which tab is active (Base UI's
  // internal state is opaque). Deterministic initial value → hydration-safe.
  const [tab, setTab] = useState('preview');

  // The reset fn published up from <PreviewFrame> (null until the preview mounts).
  const [reset, setReset] = useState<(() => void) | null>(null);
  const registerReset = useCallback((fn: () => void) => setReset(() => fn), []);

  // Fullscreen modal — for demos wider than the doc measure (§7.1).
  const [fullscreen, setFullscreen] = useState(false);

  if (!hasPreview && !hasCode) return null;

  // Lone code snippet → the standalone code card (§7.5).
  if (hasCode && !hasPreview)
    return (
      <div className={className}>
        <CodeSurface codeHtml={codeHtml ?? ''} copyValue={rawCode} label={codeLang ?? 'tsx'} />
      </div>
    );

  const preview = showcaseSlug ? <BlockShowcase slug={showcaseSlug} onReset={registerReset} /> : null;
  const headerActions = (
    <span className="ml-auto flex items-center gap-1">
      {reset ? (
        <SiteButton variant="ghost" size="icon" aria-label="Reset preview" onClick={reset}>
          <RotateCcw />
        </SiteButton>
      ) : null}
      <SiteButton variant="ghost" size="icon" aria-label="Open fullscreen preview" onClick={() => setFullscreen(true)}>
        <Maximize2 />
      </SiteButton>
    </span>
  );
  const fullscreenModal = showcaseSlug ? (
    <FullscreenPreview slug={showcaseSlug} open={fullscreen} onOpenChange={setFullscreen} />
  ) : null;

  // Lone preview → the card + well, no tabs (the header carries only the actions).
  if (hasPreview && !hasCode)
    return (
      <div className={cn(cardCls, className)}>
        <div className="flex min-h-[52px] items-center gap-0 px-3 pt-3">{headerActions}</div>
        <div className="overflow-hidden" style={clipBottom}>
          <PreviewWell>{preview}</PreviewWell>
        </div>
        {fullscreenModal}
      </div>
    );

  return (
    <Tabs.Root value={tab} onValueChange={(value) => setTab(value as string)} className={cn(cardCls, className)}>
      <div className="flex min-h-[52px] items-center gap-0 px-3 pt-3">
        <Tabs.List
          aria-label="Preview or code"
          // -mx-1 px-1 / -my-1 py-1 give the tab focus rings room to draw
          // without the outer card clipping them.
          className="relative -mx-1 -my-1 flex items-center gap-0.5 px-1 py-1"
        >
          <PreviewTab value="preview" label="Preview" active={tab === 'preview'} />
          <PreviewTab value="code" label="Code" active={tab === 'code'} />
          {/* Sliding pill — transform + width animate so it glides AND resizes. */}
          <Tabs.Indicator
            renderBeforeHydration
            className="absolute inset-y-1 left-0 z-0 rounded-lg bg-active [width:var(--active-tab-width)] [transform:translateX(var(--active-tab-left))] transition-[transform,width] duration-[var(--dur)] ease-[var(--ease-out)] motion-reduce:transition-none"
          />
        </Tabs.List>
        {headerActions}
      </div>

      <div className="overflow-hidden" style={clipBottom}>
        {/* keepMounted on Preview so toggling Code↔Preview never tears down the
            live block (state preserved, no re-init flash). */}
        <Tabs.Panel value="preview" keepMounted className="outline-none">
          <PreviewWell>{preview}</PreviewWell>
        </Tabs.Panel>
        <Tabs.Panel value="code" className="outline-none">
          <CodePanel codeHtml={codeHtml ?? ''} />
        </Tabs.Panel>
      </div>
      {fullscreenModal}
    </Tabs.Root>
  );
}

export default ComponentPreview;
