'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { SiteSidebar } from '@/components/site/site-sidebar';
import { SiteTopbar } from '@/components/site/site-topbar';

const MOBILE_NAV_QUERY = '(max-width: 860px)';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1,
  );
}

function isMobileNavViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_NAV_QUERY).matches;
}

export function RegistryShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isConsoleKitProof = pathname === '/__integration/console-kit';
  const isStandalonePreview =
    isConsoleKitProof ||
    /^\/blocks\/(?:billing\/[^/]+|features\/[^/]+)\/preview\/?$/.test(pathname);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close the drawer if the viewport crosses into desktop layout.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(MOBILE_NAV_QUERY);
    const onChange = () => {
      if (!media.matches) setMobileOpen(false);
    };
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen || !isMobileNavViewport()) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const sidebar = sidebarRef.current;
    // Defer focus until after the drawer paint so the first tabbable is available.
    const focusFrame = window.requestAnimationFrame(() => {
      const focusables = sidebar ? getFocusable(sidebar) : [];
      focusables[0]?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !sidebar) return;
      const items = getFocusable(sidebar);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === firstItem || !sidebar.contains(active)) {
          event.preventDefault();
          lastItem.focus();
        }
        return;
      }

      if (active === lastItem || !sidebar.contains(active)) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      const restoreTarget = previouslyFocusedRef.current ?? menuButtonRef.current;
      // Only restore when still in the mobile drawer context.
      if (isMobileNavViewport()) {
        restoreTarget?.focus();
      }
    };
  }, [mobileOpen]);

  if (isConsoleKitProof) return children;
  if (isStandalonePreview) {
    return <main id="main-content" tabIndex={-1}>{children}</main>;
  }

  return (
    <div className="registry-app">
      {mobileOpen ? (
        <button
          type="button"
          className="registry-side-backdrop min-[861px]:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <SiteSidebar
        open={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        ref={sidebarRef}
        aria-labelledby={mobileOpen ? titleId : undefined}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
      />
      <span className="sr-only" id={titleId}>
        Documentation navigation
      </span>

      <div className="registry-main">
        <SiteTopbar
          onMenuClick={() => setMobileOpen((open) => !open)}
          menuButtonRef={menuButtonRef}
          menuExpanded={mobileOpen}
        />
        <main className="registry-content flex-1" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
