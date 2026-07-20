'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ConstructiveLogo } from '@/components/brand/constructive-logo';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { cn } from '@/lib/utils';

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

const NAV = [
  {
    href: '/',
    label: 'Components',
    match: (path: string) => {
      const p = normalizePath(path);
      return p === '/' || p.startsWith('/blocks/ui');
    },
  },
  {
    href: '/blocks',
    label: 'Setup',
    match: (path: string) => normalizePath(path) === '/blocks',
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname() ?? '';

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/70">
      <div className="site-container relative flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex min-h-10 min-w-10 shrink-0 items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ConstructiveLogo priority className="h-4 sm:h-[1.125rem]" />
          </Link>
          <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden text-sm text-muted-foreground sm:inline">Blocks</span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <nav aria-label="Primary" className="flex items-center gap-0.5 text-sm">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-md px-3 text-muted-foreground outline-none',
                    'transition-colors duration-150 ease-out hover:text-foreground',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'bg-muted/70 text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
