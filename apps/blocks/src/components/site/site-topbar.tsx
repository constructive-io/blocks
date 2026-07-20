'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Menu, Terminal } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { ThemeToggle } from '@/components/site/theme-toggle';
import { getBasePrimitive, registryInstall } from '@/lib/base-primitives';

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

function installActionFor(path: string) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath.startsWith('/blocks/ui/')) return null;

  const name = normalizedPath.slice('/blocks/ui/'.length);
  const primitive = getBasePrimitive(name);
  if (!primitive) return null;

  return {
    command: registryInstall(primitive),
    label: `shadcn add @constructive/${primitive.name}`,
    title: primitive.title,
  };
}

type SiteTopbarProps = {
  onMenuClick?: () => void;
};

export function SiteTopbar({ onMenuClick }: SiteTopbarProps) {
  const pathname = usePathname() ?? '';
  const crumb = crumbFor(pathname);
  const installAction = installActionFor(pathname);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const copied = installAction?.command === copiedCommand;

  async function copyCli() {
    if (!installAction) return;

    const { command } = installAction;
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      window.setTimeout(() => {
        setCopiedCommand((current) => (current === command ? null : current));
      }, 1600);
    } catch {
      setCopiedCommand((current) => (current === command ? null : current));
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
          <Menu aria-hidden />
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

        {installAction ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={copyCli}
            aria-label={
              copied
                ? `${installAction.title} install command copied`
                : `Copy ${installAction.title} install command`
            }
            title={installAction.command}
          >
            {copied ? (
              <Check data-icon="inline-start" className="text-emerald-500" />
            ) : (
              <Terminal data-icon="inline-start" />
            )}
            <span className="font-mono text-xs">{copied ? 'Copied' : installAction.label}</span>
          </Button>
        ) : null}

        <Button asChild size="sm">
          <Link href="/blocks">Setup</Link>
        </Button>
      </div>
    </header>
  );
}
