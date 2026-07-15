'use client';

import { Menu } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { useThemeHotkey } from '@/components/landing/theme-toggle';

import { MobileDrawer } from './mobile-drawer';
import { RightPanel } from './right-panel';
import { Sidebar } from './sidebar';
import { SiteButton } from './site-button';
import { usePagerKeys } from './use-pager-keys';

// Client-only: the shader canvas reads the resolved theme, which next-themes
// knows synchronously on the client but never on the server — SSR'ing it is a
// guaranteed hydration mismatch (same pattern as the live previews).
const Baseplate = dynamic(() => import('./baseplate').then((m) => m.Baseplate), { ssr: false });

/**
 * The global 3-column shell (DESIGN.md §4.1), mounted at the root so every route
 * — including the landing — sits inside it: Sidebar | main | RightPanel. Below xl
 * the side columns fade out (`xl-fade-*`) and a floating hamburger opens the
 * mobile drawer. `MotionConfig reducedMotion="user"` wraps the tree here (a
 * client boundary) so the whole app honors `prefers-reduced-motion` automatically.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  usePagerKeys();
  useThemeHotkey();

  return (
    <MotionConfig reducedMotion="user">
      <div className="isolate flex min-h-screen">
        <Baseplate />

        {/* First focusable element — hidden until keyboard focus, then revealed
            top-left as a chip that jumps focus past the chrome to the content. */}
        <a
          href="#main"
          className="sr-only z-[60] rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[13px] font-medium text-foreground shadow-surface-5 outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-1 focus:ring-ring"
        >
          Skip to content
        </a>

        <Sidebar />

        {/* Floating hamburger — mobile only; opens the drawer. */}
        <SiteButton
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen(true)}
          className="fixed left-4 top-4 z-50 xl:hidden"
        >
          <Menu />
        </SiteButton>

        <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </main>

        <RightPanel />
      </div>
    </MotionConfig>
  );
}

export default Shell;
