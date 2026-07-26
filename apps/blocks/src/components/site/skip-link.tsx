'use client';

import * as React from 'react';

export function SkipLink() {
  const focusMainContent = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const main = document.getElementById('main-content');
      if (!main) return;

      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: 'start' });
    },
    []
  );

  return (
    <a
      href="#main-content"
      className="sr-only fixed left-4 top-4 z-[var(--z-layer-toast)] rounded-md bg-background px-3 py-2 text-sm focus:fixed focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
      onClick={focusMainContent}
    >
      Skip to content
    </a>
  );
}
