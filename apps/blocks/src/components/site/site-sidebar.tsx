'use client';

import { forwardRef, useEffect, useId, useState, type AriaRole, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { ConstructiveMark } from '@/components/brand/constructive-mark';
import { AI_COMPONENTS } from '@/lib/ai-components';
import { docSectionForPack, isDocSectionPath } from '@/lib/doc-sections';
import { APPLICATION_BLOCKS, applicationBlockHref } from '@/lib/application-blocks';
import { COMPONENT_DOC_SEQUENCE } from '@/lib/component-doc-navigation';
import { FEATURE_PACK_DOCS } from '@/lib/feature-packs';
import { SOURCE_BLOCKS } from '@/lib/source-blocks';
import { cn } from '@/lib/utils';

/*
 * The same scale as the workspace sidebars: 32px rows, 13px type, instant
 * hover. Each section hangs off one guide line under its chevron, and the
 * current page is a blue segment on that line, as in the Schema Builder.
 */
const NAV_LINK = cn(
  'relative flex h-8 items-center rounded-md px-2 text-[13px] text-sidebar-foreground outline-none pointer-coarse:h-10',
  'hover:bg-overlay-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
);

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
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(NAV_LINK, active && 'bg-sidebar-accent font-medium text-foreground')}
        aria-current={active ? 'page' : undefined}
      >
        <span
          aria-hidden
          className={cn('absolute inset-y-1.5 -left-[7.5px] w-0.5 rounded-full', active ? 'bg-primary' : 'bg-transparent')}
        />
        <span className="min-w-0 truncate">{children}</span>
      </Link>
    </li>
  );
}

/** The rows of one section, hung off a guide line that starts under the section's chevron. */
function NavList({ children }: { children: ReactNode }) {
  return <ul className="ml-[13px] flex flex-col gap-px border-l border-sidebar-border py-0.5 pl-1.5">{children}</ul>;
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
    <div>
      <button
        type="button"
        id={labelId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'group flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-xs text-muted-foreground outline-none pointer-coarse:h-9',
          'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
        )}
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 opacity-70 transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
            open && 'rotate-90',
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {typeof count === 'number' ? <span className="text-subtle-foreground tabular-nums">{count}</span> : null}
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
          <div className="pt-0.5 pb-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

type SiteSidebarProps = {
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  className?: string;
  role?: AriaRole;
  'aria-modal'?: boolean | 'true' | 'false';
  'aria-labelledby'?: string;
};

export const SiteSidebar = forwardRef<HTMLElement, SiteSidebarProps>(function SiteSidebar(
  { open, onClose, onNavigate, className, role, 'aria-modal': ariaModal, 'aria-labelledby': ariaLabelledBy },
  ref,
) {
  const pathname = normalizePath(usePathname() ?? '');
  const onComponents = pathname.startsWith('/blocks/ui/') || pathname === '/blocks/command-palette';
  const onAi = pathname === '/blocks/ai' || pathname.startsWith('/blocks/ai/');
  const onAccountDocs = pathname === '/blocks/account' || pathname.startsWith('/blocks/account/');
  const onFoundations =
    pathname === '/' || pathname === '/blocks' || pathname === '/blocks/styling' || pathname === '/blocks/create';

  const [foundationsOpen, setFoundationsOpen] = useState(true);
  const [applicationOpen, setApplicationOpen] = useState(true);
  // Collapse Components while browsing AI so the AI group is not buried under 30 primitives.
  const [componentsOpen, setComponentsOpen] = useState(() => !onAi);
  const [aiOpen, setAiOpen] = useState(true);

  // Expand the section that owns the active route so deep links stay visible
  useEffect(() => {
    if (onComponents) setComponentsOpen(true);
    if (onAi) {
      setAiOpen(true);
      setComponentsOpen(false);
    }
    if (onFoundations) setFoundationsOpen(true);
  }, [onComponents, onAi, onFoundations]);

  const componentLinks = COMPONENT_DOC_SEQUENCE.map((component) => ({
    href: component.href,
    label: component.title,
  }));
  const aiLinks = [
    { href: '/blocks/ai', label: 'Overview' },
    ...AI_COMPONENTS.map((component) => ({
      href: `/blocks/ai/${component.name}`,
      label: component.title,
    })),
  ];
  // Billing and Storage are sections (application blocks plus their feature pack), so each gets one entry pointing at its hub.
  const featurePackLinks = FEATURE_PACK_DOCS.map((pack) => {
    const section = docSectionForPack(pack.id);
    return section
      ? { href: section.hub, label: section.title, active: isDocSectionPath(section, pathname) }
      : { href: `/blocks/features/${pack.id}`, label: pack.title, active: pathname === `/blocks/features/${pack.id}` };
  });
  const applicationBlockLinks = APPLICATION_BLOCKS.filter((block) => !block.section).map((block) => ({
    href: applicationBlockHref(block),
    label: block.title,
  }));
  const sourceBlockLinks = SOURCE_BLOCKS.map((block) => ({
    href: `/blocks/${block.name}`,
    label: block.title,
  }));

  return (
    <aside
      ref={ref}
      id="registry-mobile-nav"
      className={cn('registry-side', open && 'registry-side-open', className)}
      data-open={open ? 'true' : undefined}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
    >
      <div className="registry-side-brand">
        <Link
          href="/"
          className="flex min-h-10 min-w-0 items-center gap-2.5 outline-none pointer-coarse:min-h-11 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={onNavigate}
          aria-label="Constructive Blocks home"
        >
          <ConstructiveMark className="h-6 w-[15px] shrink-0 text-primary" style={{ overflow: 'visible' }} />
          <span className="flex min-w-0 items-baseline gap-1.5 leading-none">
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">Constructive</span>
            <span className="shrink-0 text-[15px] font-medium tracking-tight text-muted-foreground">Blocks</span>
          </span>
        </Link>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 min-[861px]:hidden"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3" aria-label="Registry">
        <NavSection title="Foundations" open={foundationsOpen} onToggle={() => setFoundationsOpen((v) => !v)}>
          <NavList>
            <NavLink href="/" active={pathname === '/'} onNavigate={onNavigate}>
              Overview
            </NavLink>
            <NavLink href="/blocks" active={pathname === '/blocks'} onNavigate={onNavigate}>
              Setup
            </NavLink>
            <NavLink href="/blocks/styling" active={pathname === '/blocks/styling'} onNavigate={onNavigate}>
              Styling
            </NavLink>
            <NavLink href="/blocks/create" active={pathname === '/blocks/create'} onNavigate={onNavigate}>
              Create
            </NavLink>
          </NavList>
        </NavSection>

        <NavSection
          title="Application"
          open={applicationOpen}
          onToggle={() => setApplicationOpen((v) => !v)}
          count={featurePackLinks.length + applicationBlockLinks.length + sourceBlockLinks.length + 4}
        >
          <NavList>
            <NavLink href="/blocks/features" active={pathname === '/blocks/features'} onNavigate={onNavigate}>
              Feature packs
            </NavLink>
            {featurePackLinks.map(({ href, label, active }) => (
              <NavLink active={active} href={href} key={href} onNavigate={onNavigate}>
                {label}
              </NavLink>
            ))}
            <NavLink href="/blocks/account" active={onAccountDocs} onNavigate={onNavigate}>
              Account
            </NavLink>
            {[...applicationBlockLinks, ...sourceBlockLinks].map(({ href, label }) => (
              <NavLink active={pathname === href} href={href} key={href} onNavigate={onNavigate}>
                {label}
              </NavLink>
            ))}
            <NavLink href="/blocks/console-kit" active={pathname === '/blocks/console-kit'} onNavigate={onNavigate}>
              Console Kit
            </NavLink>
            <NavLink href="/blocks/documents" active={pathname === '/blocks/documents'} onNavigate={onNavigate}>
              JSON documents
            </NavLink>
          </NavList>
        </NavSection>

        <NavSection
          title="Components"
          open={componentsOpen}
          onToggle={() => setComponentsOpen((v) => !v)}
          count={componentLinks.length}
        >
          <NavList>
            {componentLinks.map(({ href, label }) => (
              <NavLink active={pathname === href} href={href} key={href} onNavigate={onNavigate}>
                {label}
              </NavLink>
            ))}
          </NavList>
        </NavSection>

        <NavSection title="AI" open={aiOpen} onToggle={() => setAiOpen((v) => !v)} count={aiLinks.length}>
          <NavList>
            {aiLinks.map(({ href, label }) => (
              <NavLink active={pathname === href} href={href} key={href} onNavigate={onNavigate}>
                {label}
              </NavLink>
            ))}
          </NavList>
        </NavSection>
      </nav>

      <footer className="border-t border-sidebar-border px-5 py-3 text-xs text-muted-foreground">
        Built by <span className="font-medium text-sidebar-foreground">Constructive</span>
      </footer>
    </aside>
  );
});
