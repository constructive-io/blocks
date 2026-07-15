'use client';

import { Menu } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { useThemeHotkey } from '@/components/landing/theme-toggle';

import { MobileDrawer } from './mobile-drawer';
import { RightPanel } from './right-panel';
import { Sidebar, SidebarBrand } from './sidebar';
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
      <div className="isolate flex min-h-dvh">
        <Baseplate />

        {/* First focusable element — hidden until keyboard focus, then revealed
            top-left as a chip that jumps focus past the chrome to the content. */}
        <a
          href="#main"
          className="sr-only z-50 rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[13px] font-medium text-foreground shadow-surface-5 outline-none focus:not-sr-only focus:fixed focus:[left:calc(1rem+env(safe-area-inset-left))] focus:[top:calc(1rem+env(safe-area-inset-top))] focus:ring-1 focus:ring-ring"
        >
          Skip to content
        </a>

        <Sidebar />

        {/* Dedicated mobile header — keeps navigation clear of scrolled prose. */}
        <div className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.75rem+env(safe-area-inset-top))] items-end gap-2 bg-background pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shadow-surface-2 [padding-left:calc(0.75rem+env(safe-area-inset-left))] [padding-right:calc(0.75rem+env(safe-area-inset-right))] xl:hidden">
          <SiteButton variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>
            <Menu />
          </SiteButton>
          <SidebarBrand />
        </div>

        <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 max-w-full flex-1 pt-[calc(3.75rem+env(safe-area-inset-top))] outline-none xl:pt-0"
        >
          {children}
        </main>

        <RightPanel />
      </div>
    </MotionConfig>
  );
}

export default Shell;
