'use client';

/**
 * grid-motion — the landing showcase wall (adapted from React Bits' GridMotion).
 *
 * A rotated wall of live block demos with two layers of motion:
 *
 * 1. Each row is an INFINITE MARQUEE — its 6 tiles are rendered twice inside a
 *    track that a gsap tween translates by exactly one copy (`xPercent`,
 *    `ease: 'none'`, `repeat: -1`), so rows drift forever and recycle
 *    seamlessly, alternating direction with per-row speeds (parallax).
 * 2. The pointer adds INERTIA on top — each row's outer wrapper eases toward a
 *    mouse-derived offset with its own lag (`power3.out`), the React Bits
 *    signature.
 *
 * Tiles are LIVE previews of the complex blocks (auth flows, org management,
 * storage, shell) inside one shared `PreviewProvider` — the wall is literally
 * built out of the product. It is decorative: `aria-hidden` + `inert`
 * (demos are full of inputs that must not catch Tab or clicks while rotated
 * and moving). `useReducedMotion` skips all tweens — a static composition.
 *
 * Loaded client-only (next/dynamic ssr:false from page.tsx): the registry shell
 * stays light and only the demos selected in SHOWCASE_ROWS request their lazy
 * chunks. Those demos render non-deterministically between server and client
 * (TanStack Query + useId).
 */

import { gsap } from 'gsap';
import { useReducedMotion } from 'motion/react';
import { type ComponentType, useEffect, useRef } from 'react';

import { DEMOS } from '@/components/docs/showcase';
import { UI_DEMOS } from '@/components/docs/showcase-ui';
import { PreviewProvider } from '@/components/docs/preview-provider';

import { SHOWCASE_ROWS } from './showcase-manifest';

// `DEMOS` already folds in `UI_DEMOS`; re-spreading is idempotent.
const REGISTRY: Record<string, ComponentType> = { ...UI_DEMOS, ...DEMOS };

/** Seconds per full loop, per row — staggered so rows never sync up. */
const LOOP_DURATIONS = [64, 78, 58, 72];

export function GridMotionWall() {
  const rootRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    gsap.ticker.lagSmoothing(0);

    const rows = [...rowRefs.current];
    const tracks = [...trackRefs.current];

    // Layer 1 — the infinite marquee per track. The track holds two copies of
    // the row, so translating by -50% is exactly one copy: the wrap is
    // invisible and the loop is seamless. Odd rows run the reverse direction.
    const marquees = tracks.map((track, index) => {
      if (!track) return null;
      const leftward = index % 2 === 0;
      return gsap.fromTo(
        track,
        { xPercent: leftward ? 0 : -50 },
        {
          xPercent: leftward ? -50 : 0,
          duration: LOOP_DURATIONS[index % LOOP_DURATIONS.length],
          ease: 'none',
          repeat: -1,
        }
      );
    });
    marquees.forEach((tween) => tween?.pause());

    // Layer 2 — pointer inertia on the row wrappers (React Bits signature).
    const maxMoveAmount = 160;
    const baseDuration = 0.8;
    const inertiaFactors = [0.6, 0.4, 0.3, 0.2];
    const inertiaSetters = rows.map((row, index) =>
      row
        ? gsap.quickTo(row, 'x', {
            duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
            ease: 'power3.out',
          })
        : null
    );
    const targets: Array<number | undefined> = [];

    const updateTarget = (clientX: number) => {
      inertiaSetters.forEach((setX, index) => {
        if (!setX) return;
        const direction = index % 2 === 0 ? 1 : -1;
        const target = ((clientX / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction;
        if (targets[index] === target) return;
        targets[index] = target;
        setX(target);
      });
    };

    let isIntersecting = false;
    const setAnimationActive = (active: boolean) => {
      marquees.forEach((tween) => (active ? tween?.play() : tween?.pause()));
      [...rows, ...tracks].forEach((element) => {
        if (!element) return;
        if (active) element.style.willChange = 'transform';
        else element.style.removeProperty('will-change');
      });
    };
    const syncAnimation = () => setAnimationActive(isIntersecting && !document.hidden);
    const handleMouseMove = (event: MouseEvent) => {
      if (!isIntersecting || document.hidden) return;
      updateTarget(event.clientX);
    };
    const handleVisibilityChange = () => syncAnimation();

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            isIntersecting = entry?.isIntersecting ?? false;
            syncAnimation();
          }, { rootMargin: '160px' });

    if (observer && rootRef.current) observer.observe(rootRef.current);
    else {
      isIntersecting = true;
      syncAnimation();
    }

    updateTarget(window.innerWidth / 2);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      observer?.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      marquees.forEach((tween) => tween?.kill());
      [...rows, ...tracks].forEach((element) => {
        if (!element) return;
        element.style.removeProperty('transform');
        element.style.removeProperty('will-change');
      });
      rows.forEach((row) => row && gsap.killTweensOf(row));
    };
  }, [reducedMotion]);

  return (
    <PreviewProvider>
      <section
        ref={rootRef}
        aria-hidden
        {...{ inert: true }}
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <div
          className="flex flex-none rotate-[-15deg] flex-col gap-4"
          style={{ width: '150vw', height: '150vh', transformOrigin: 'center center' }}
        >
          {SHOWCASE_ROWS.map((slugs, rowIndex) => (
            <div
              key={rowIndex}
              ref={(el) => {
                rowRefs.current[rowIndex] = el;
              }}
              className="min-h-0 flex-1"
            >
              {/* The marquee track — two copies of the row, translated by one
                  copy per loop. `w-max` so the copies set the track width. */}
              <div
                ref={(el) => {
                  trackRefs.current[rowIndex] = el;
                }}
                className="flex h-full w-max"
              >
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex h-full" aria-hidden={copy === 1}>
                    {slugs.map((slug) => {
                      const Demo = REGISTRY[slug];
                      if (!Demo) return null;
                      return (
                        <div
                          key={`${copy}-${slug}`}
                          className="relative mr-4 flex h-full w-[420px] flex-none items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-surface-3 shadow-surface-2"
                        >
                          {/* Live demo, miniaturized: a fixed inner stage wider
                              than the tile, scaled down — demos fill the frame
                              and tall ones crop like a screen in a window. */}
                          <div className="pointer-events-none w-[460px] max-w-none flex-none scale-[0.8] select-none">
                            <div className="flex items-center justify-center p-2">
                              <Demo />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Depth layers — solid surface color is revealed through gradient
            masks, so the tiles dissolve without a decorative color gradient.
            A soft inner vignette seats the field below the slab's rim. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-28 bg-surface-2 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-surface-2 [mask-image:linear-gradient(to_top,black,transparent)]" />
          <div className="absolute inset-y-0 left-0 w-24 bg-surface-2 [mask-image:linear-gradient(to_right,black,transparent)]" />
          <div className="absolute inset-y-0 right-0 w-24 bg-surface-2 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="absolute inset-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),inset_0_0_80px_rgb(0_0_0/0.18)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),inset_0_0_110px_rgb(0_0_0/0.45)]" />
        </div>
      </section>
    </PreviewProvider>
  );
}

export default GridMotionWall;
