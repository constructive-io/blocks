'use client';

import { GrainGradient } from '@paper-design/shaders-react';
import { useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

/**
 * Baseplate — the landing atmosphere layer (DESIGN.md §11).
 *
 * One element only: a slow Constructive-blue grain aurora breathing behind the
 * landing intro. (An earlier revision also painted a site-wide dot grid; it
 * overlapped the transparent cards and was cut — texture must never sit under
 * content.) Doc pages render no atmosphere at all.
 *
 * Guardrails:
 * - Decorative only: `aria-hidden`, `pointer-events-none`, negative z-index
 *   (the Shell root is `isolate`, so the layer stays above the page
 *   background but behind every sibling).
 * - Shader colors are concrete hexes (canvas uniforms can't read CSS vars):
 *   the back matches the theme canvas exactly (#171717 / #FAFAFA), blues are
 *   the Constructive tokens converted from OKLCH (#02A2FF / #0076C8).
 * - Motion: `useReducedMotion` freezes the shader (speed 0).
 * - Mounted via next/dynamic ssr:false in the Shell — next-themes resolves
 *   the theme synchronously on the client only, so SSR'ing this is a
 *   guaranteed hydration mismatch.
 */

const AURORA = {
  dark: { back: '#171717', colors: ['#02A2FF', '#66C4FF'], opacity: 0.3 },
  light: { back: '#FAFAFA', colors: ['#0076C8', '#4FA8E8'], opacity: 0.2 },
} as const;

export function Baseplate() {
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const isLanding = usePathname() === '/';

  if (!isLanding) return null;
  if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return null;
  const t = AURORA[resolvedTheme];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 select-none">
      {/* Radial mask feathers the canvas edge (its back is solid). */}
      <div
        className="absolute left-1/2 top-[-140px] h-[640px] w-[min(1040px,100vw)] -translate-x-1/2 [mask-image:radial-gradient(closest-side,black,transparent_88%)]"
        style={{ opacity: t.opacity }}
      >
        <GrainGradient
          colorBack={t.back}
          colors={[...t.colors]}
          shape="blob"
          softness={0.8}
          intensity={0.45}
          noise={0.3}
          speed={reducedMotion ? 0 : 0.55}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}

export default Baseplate;
