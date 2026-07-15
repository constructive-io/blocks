'use client';

import { useEffect, useState } from 'react';

import { ThemeControl } from '@/components/landing/theme-toggle';
import { RegistryMark } from '@/components/registry-mark';
import { PACKAGE_MANAGERS, usePm, type PackageManager } from '@/lib/pm-context';

import { SiteButton } from './site-button';

// The GitHub chip links to the Constructive org (the URL the footer already
// used) and shows a star count when the API resolves. The repo the count is read
// from is configurable here; any failure (private/renamed repo, offline, rate
// limit) degrades cleanly to no count — the link still works.
const GITHUB_ORG_URL = 'https://github.com/constructive-io';
const GITHUB_REPO = 'constructive-io/blocks';
const STARS_CACHE_KEY = 'cb-gh-stars';

function GitHubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function formatStars(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return String(n);
}

/** GitHub chip — links to the repo; shows a session-cached star count when the
 *  API resolves, gracefully omitting it on any failure. */
export function GitHubChip() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = window.sessionStorage.getItem(STARS_CACHE_KEY);
      if (cached !== null) {
        const n = Number(cached);
        if (Number.isFinite(n) && n > 0) setStars(n);
        return; // resolved this session already (0 = "no count") — don't refetch
      }
    } catch {
      // sessionStorage unavailable — fall through to a live fetch
    }
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const n = typeof data?.stargazers_count === 'number' ? data.stargazers_count : 0;
        if (!cancelled && n > 0) setStars(n);
        try {
          window.sessionStorage.setItem(STARS_CACHE_KEY, String(n));
        } catch {
          // ignore write failures
        }
      })
      .catch(() => {
        // network error — leave the count absent
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SiteButton
      variant="ghost"
      size="sm"
      aria-label="View on GitHub"
      onClick={() => window.open(GITHUB_ORG_URL, '_blank', 'noopener,noreferrer')}
    >
      <GitHubGlyph className="size-4" />
      {stars !== null ? <span className="tabular-nums">{formatStars(stars)}</span> : null}
    </SiteButton>
  );
}

/** Compact borderless package-manager picker — every install command on the site
 *  renders through this choice (DESIGN.md §4.6). */
function PmControl() {
  const { pm, setPm } = usePm();
  return (
    <select
      aria-label="Package manager"
      value={pm}
      onChange={(e) => setPm(e.target.value as PackageManager)}
      className="h-7 cursor-pointer rounded-lg bg-transparent px-2 text-[13px] text-foreground outline-none transition-colors duration-[var(--dur-fast)] hover:bg-hover active:bg-active focus-visible:ring-1 focus-visible:ring-ring"
    >
      {PACKAGE_MANAGERS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

/** Theme + package-manager rows — shared by the right panel and the drawer footer. */
export function SettingsRows() {
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">Theme</span>
        <ThemeControl />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">Package manager</span>
        <PmControl />
      </div>
    </div>
  );
}

/** Desktop right rail — "Make it yours" (DESIGN.md §4.6). Hidden below xl
 *  (`xl-fade-block`); the drawer footer carries the same rows on mobile. */
export function RightPanel() {
  return (
    <aside className="xl-fade-block sticky top-4 mr-4 mt-4 w-64 shrink-0 self-start rounded-xl bg-muted p-4">
      <div className="flex items-center justify-between pb-2 pl-1 pt-2">
        <h2 className="text-[16px] font-semibold leading-none text-foreground">Make it yours</h2>
        <GitHubChip />
      </div>
      <SettingsRows />
      <div className="flex items-center gap-2 pt-2">
        <RegistryMark size={18} className="shrink-0" />
        <p className="text-[13px] text-muted-foreground">
          Built by{' '}
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded outline-none transition-colors duration-[var(--dur-fast)] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            Constructive
          </a>
        </p>
      </div>
    </aside>
  );
}
