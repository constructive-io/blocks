'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { ConstructiveMark } from '@/components/brand/constructive-mark';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

const NAV_LINK =
  'flex min-h-9 items-center rounded-[var(--radius)] px-2.5 py-1.5 text-[13px] text-sidebar-foreground outline-none transition-[background-color,color] duration-150 ease-out hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function NavLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(NAV_LINK, active && 'bg-sidebar-accent font-medium text-foreground')}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

function NavSection({
  title,
  open,
  onToggle,
  children,
  count,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  count?: number;
}) {
  const panelId = useId();
  const labelId = useId();

  return (
    <div className="mt-1">
      <button
        type="button"
        id={labelId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'group flex w-full min-h-8 items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1.5',
          'text-left text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground',
          'outline-none transition-[background-color,color] duration-150 ease-out',
          'hover:bg-sidebar-accent/70 hover:text-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 opacity-70 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
            'motion-reduce:transition-none',
            open && 'rotate-90',
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {typeof count === 'number' ? (
          <span className="font-mono text-[10px] font-normal normal-case tracking-normal tabular-nums opacity-70">
            {count}
          </span>
        ) : null}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={labelId}
        className="registry-nav-panel"
        data-open={open ? 'true' : 'false'}
        // Keep closed content out of the tab order
        inert={!open ? true : undefined}
      >
        <div className="registry-nav-panel-inner">
          <div className="pb-0.5 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

type SiteSidebarProps = {
  open?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function SiteSidebar({ open, onNavigate, className }: SiteSidebarProps) {
  const pathname = normalizePath(usePathname() ?? '');
  const onComponents = pathname.startsWith('/blocks/ui/');
  const onFoundations =
    pathname === '/' || pathname === '/blocks' || pathname === '/blocks/styling';

  const [foundationsOpen, setFoundationsOpen] = useState(true);
  const [componentsOpen, setComponentsOpen] = useState(true);

  // Expand the section that owns the active route so deep links stay visible
  useEffect(() => {
    if (onComponents) setComponentsOpen(true);
    if (onFoundations) setFoundationsOpen(true);
  }, [onComponents, onFoundations]);

  const componentLinks = BASE_PRIMITIVES.map((p) => ({
    href: `/blocks/ui/${p.name}`,
    label: p.title,
  }));

  return (
    <aside
      className={cn('registry-side', open && 'registry-side-open', className)}
      data-open={open ? 'true' : undefined}
    >
      <div className="registry-side-brand">
        <Link
          href="/"
          className="flex min-h-10 min-w-0 items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onNavigate}
          aria-label="Constructive Blocks home"
        >
          <ConstructiveMark
            className="h-6 w-[15px] shrink-0 text-primary"
            style={{ overflow: 'visible' }}
          />
          <span className="flex min-w-0 items-baseline gap-1.5 leading-none">
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              Constructive
            </span>
            <span className="shrink-0 text-[15px] font-medium tracking-tight text-muted-foreground">
              Blocks
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Registry">
        <NavSection
          title="Foundations"
          open={foundationsOpen}
          onToggle={() => setFoundationsOpen((v) => !v)}
        >
          <div className="flex flex-col gap-0.5">
            <NavLink href="/" active={pathname === '/'} onNavigate={onNavigate}>
              Overview
            </NavLink>
            <NavLink href="/blocks" active={pathname === '/blocks'} onNavigate={onNavigate}>
              Setup
            </NavLink>
            <NavLink
              href="/blocks/styling"
              active={pathname === '/blocks/styling'}
              onNavigate={onNavigate}
            >
              Styling
            </NavLink>
          </div>
        </NavSection>

        <div className="mt-3">
          <NavSection
            title="Components"
            open={componentsOpen}
            onToggle={() => setComponentsOpen((v) => !v)}
            count={componentLinks.length}
          >
            <ul className="flex flex-col gap-0.5">
              {componentLinks.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <NavLink href={href} active={active} onNavigate={onNavigate}>
                      {label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </NavSection>
        </div>
      </nav>

      <footer className="px-4 pb-4 pt-2 text-[11.5px] text-muted-foreground">
        Built by <span className="font-medium text-sidebar-foreground">Constructive</span>
      </footer>
    </aside>
  );
}
