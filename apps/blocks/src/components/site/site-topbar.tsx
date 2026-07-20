'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Menu, Terminal } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { ThemeToggle } from '@/components/site/theme-toggle';
import { getBasePrimitive } from '@/lib/base-primitives';

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function crumbFor(path: string): string {
  const p = normalizePath(path);
  if (p === '/') return 'Overview';
  if (p === '/blocks') return 'Setup';
  if (p === '/blocks/styling') return 'Styling';
  if (p.startsWith('/blocks/ui/')) {
    const name = p.slice('/blocks/ui/'.length);
    return getBasePrimitive(name)?.title ?? name;
  }
  return 'Registry';
}

const CLI = 'pnpm dlx shadcn@4.13.1 add @constructive/button';

type SiteTopbarProps = {
  onMenuClick?: () => void;
};

export function SiteTopbar({ onMenuClick }: SiteTopbarProps) {
  const pathname = usePathname() ?? '';
  const crumb = crumbFor(pathname);
  const [copied, setCopied] = useState(false);

  async function copyCli() {
    try {
      await navigator.clipboard.writeText(CLI);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <header className="registry-topbar">
      <div className="registry-topbar-inner">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 min-[861px]:hidden"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          <Menu className="size-4" />
        </Button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground"
        >
          <Link
            href="/"
            className="shrink-0 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Registry
          </Link>
          <span aria-hidden>/</span>
          <b className="truncate font-medium text-foreground">{crumb}</b>
        </nav>

        <div className="flex-1" />

        <ThemeToggle />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={copyCli}
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Terminal className="size-3.5" />
          )}
          <span className="font-mono text-xs">{copied ? 'Copied' : 'npx shadcn add'}</span>
        </Button>

        <Button asChild size="sm">
          <Link href="/blocks">Setup</Link>
        </Button>
      </div>
    </header>
  );
}
