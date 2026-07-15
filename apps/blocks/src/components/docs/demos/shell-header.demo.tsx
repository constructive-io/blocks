'use client';

import { useState } from 'react';

import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';

import { ShellHeader } from '@/blocks/shell/header/header';

import { Demo } from '@/components/docs/showcase-kit';

/** Minimal inline logo wordmark — no external assets required. */
function DemoLogo() {
  return (
    <span className="flex items-center gap-1.5 font-semibold text-sm leading-none select-none">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-primary"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      Acme
    </span>
  );
}

/** Simple avatar circle used as a stand-in for shell-account-menu. */
function DemoAvatar() {
  return (
    <button
      type="button"
      className="inline-flex size-11 items-center justify-center rounded-full transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10"
      aria-label="Account menu"
    >
      <Avatar>
        <AvatarFallback className="font-semibold">AL</AvatarFallback>
      </Avatar>
    </button>
  );
}

export function BlockDemo() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteHit, setPaletteHit] = useState(false);

  return (
    <Demo>
      {/* Header spans the full available width inside the ~480px stage. */}
      {/* breadcrumbsSlot and showSearch are omitted to prevent overlap/clipping at narrow widths. */}
      <div className="w-full overflow-hidden rounded-xl border shadow-sm">
        <ShellHeader
          logo={<DemoLogo />}
          showBreadcrumbs={false}
          showSearch={false}
          accountMenuSlot={<DemoAvatar />}
          showCommandPalette={true}
          showSidebarToggle={true}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen((v) => !v)}
          onCommandPaletteOpen={() => setPaletteHit(true)}
        />
        {paletteHit && (
          <p className="border-t bg-muted/30 px-4 py-2 text-pretty text-xs text-muted-foreground">
            Command palette triggered — wire <code>onCommandPaletteOpen</code> to open your palette.
          </p>
        )}
      </div>
    </Demo>
  );
}
