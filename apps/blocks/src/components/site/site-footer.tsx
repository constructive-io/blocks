import Link from 'next/link';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

export function SiteFooter() {
  return (
    <footer className="site-rule mt-auto">
      <div className="site-container flex flex-col gap-3 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Constructive Blocks · {BASE_PRIMITIVES.length} base primitives ·{' '}
          <code className="text-xs text-foreground/80">@constructive</code>
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md px-2 outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Components
          </Link>
          <Link
            href="/blocks"
            className="inline-flex min-h-10 items-center rounded-md px-2 outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Setup
          </Link>
          <span className="px-2 font-mono text-xs">shadcn 4.13.1+</span>
        </nav>
      </div>
    </footer>
  );
}
