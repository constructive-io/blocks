'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { RegistryMark } from '@/components/registry-mark';
import { normalizePath } from '@/lib/docs/nav';
import { publishedBlockCount, uiCount } from '@/lib/blocks';
import { cn } from '@/lib/utils';

import { NavMenu, NavMenuItem } from './nav-menu';
import { SidebarNav } from './sidebar-nav';

/**
 * Brand line — the block mark + "Constructive Blocks", quiet on one line, linking
 * home. Shared by the desktop rail and the mobile drawer (DESIGN.md §4.5).
 */
export function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      aria-label="Constructive Blocks — home"
      className="inline-flex items-center gap-2 self-start rounded-lg pl-1 outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <RegistryMark size={22} className="shrink-0" />
      <span className="text-[13px] font-medium text-foreground">Constructive Blocks</span>
    </Link>
  );
}

/**
 * Footer status line — version + published counts. Counts come from the generated
 * manifest so the figure can never drift. Quiet, no decorative dot (DESIGN.md §4.5).
 */
export function SidebarStatus({ className }: { className?: string }) {
  return (
    <div className={cn('px-1 text-[11px] tabular-nums text-muted-foreground/75', className)}>
      v0.1.0 <span aria-hidden>·</span> {publishedBlockCount} blocks <span aria-hidden>·</span> {uiCount} ui
    </div>
  );
}

interface SidebarProps {
  /** Rendered inside the mobile drawer — full width, part of the sheet's scroll. */
  mobile?: boolean;
  /** Close the drawer on navigation (mobile only). */
  onNavigate?: () => void;
}

/**
 * The left rail (DESIGN.md §4.5). Sits on the canvas with no border — the column
 * boundary is whitespace. Brand, a top-level glide menu (Showcase / Introduction),
 * the filterable section tree, and a quiet status footer. Hidden below xl on
 * desktop (`xl-fade-flex`); the drawer covers mobile.
 */
export function Sidebar({ mobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const path = normalizePath(pathname);
  const topActive = path === '/' ? '/' : path === '/blocks' ? '/blocks' : null;

  return (
    <aside
      className={cn(
        'flex-col gap-4 p-4',
        mobile ? 'flex min-h-0 w-full flex-1' : 'xl-fade-flex sticky top-0 h-screen w-60 shrink-0',
      )}
    >
      <SidebarBrand onNavigate={onNavigate} />

      <NavMenu activeSlug={topActive} aria-label="Primary">
        <NavMenuItem index={0} href="/" label="Showcase" onClick={onNavigate} />
        <NavMenuItem index={1} href="/blocks" label="Introduction" onClick={onNavigate} />
      </NavMenu>

      <SidebarNav className="min-h-0 flex-1" onNavigate={onNavigate} />

      <SidebarStatus />
    </aside>
  );
}

export default Sidebar;
