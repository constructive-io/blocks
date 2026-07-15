'use client';

import { ChevronRight, Search, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { NAV_GROUPS, normalizePath, type NavGroup, type NavSubgroup } from '@/lib/docs/nav';
import { cn } from '@/lib/utils';

import { NavItem } from './nav-item';

/**
 * Substring-filter the nav tree by item title. A hit on the group's own label
 * keeps the whole group, so typing a category name ("auth") reveals its items;
 * a hit on a sub-group caption ("passkeys") keeps that whole sub-group.
 */
function filterGroups(groups: NavGroup[], query: string): NavGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const out: NavGroup[] = [];
  for (const group of groups) {
    if (group.label?.toLowerCase().includes(q)) {
      out.push(group);
      continue;
    }
    if (group.subgroups?.length) {
      const subgroups = group.subgroups
        .map((sg) =>
          sg.label.toLowerCase().includes(q)
            ? sg
            : { ...sg, items: sg.items.filter((i) => i.title.toLowerCase().includes(q)) },
        )
        .filter((sg) => sg.items.length);
      if (subgroups.length) out.push({ ...group, subgroups });
      continue;
    }
    const items = group.items.filter((i) => i.title.toLowerCase().includes(q));
    if (items.length) out.push({ ...group, items });
  }
  return out;
}

/** Live row count for the header badge — descends into sub-groups when present. */
function itemCount(group: NavGroup): number {
  return group.subgroups?.length
    ? group.subgroups.reduce((n, sg) => n + sg.items.length, 0)
    : group.items.length;
}

/** The sub-group containing the current page, if any — it renders expanded. */
function activeSubgroupIdFor(path: string): string | null {
  for (const group of NAV_GROUPS) {
    for (const subgroup of group.subgroups ?? []) {
      if (subgroup.items.some((i) => i.href === path)) return subgroup.id;
    }
  }
  return null;
}

interface SidebarNavProps {
  className?: string;
  /** Called when a row is activated — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}

/**
 * Renders the `NAV_GROUPS` tree (minus the top-level menu, which the sidebar
 * draws separately as a glide menu) with a calm filter fixed above a scroll-fade
 * scroll region. Hover is a per-row `bg-hover`; the current row is `bg-active` +
 * a ghost-span weight shift. There is deliberately NO measured/animated overlay
 * behind the rows: a transform-positioned pill has to re-measure on every route +
 * filter + scroll change, and any stale read leaves the highlight off the active
 * row. Pure CSS on the row can't drift.
 */
export function SidebarNav({ className, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const path = normalizePath(pathname);
  const [query, setQuery] = useState('');
  const hasQuery = query.trim().length > 0;

  const groups = useMemo(() => filterGroups(NAV_GROUPS.filter((g) => g.id !== 'top'), query), [query]);
  const activeSubgroupId = useMemo(() => activeSubgroupIdFor(path), [path]);

  // Sub-groups are collapsed by default; the one holding the current page is
  // open, and `openOverrides` records explicit caption toggles. When navigation
  // moves into a sub-group the user had closed, drop that stale override so the
  // destination row is always revealed (state adjust during render, no effect).
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});
  const [prevActiveSubgroupId, setPrevActiveSubgroupId] = useState(activeSubgroupId);
  if (activeSubgroupId !== prevActiveSubgroupId) {
    setPrevActiveSubgroupId(activeSubgroupId);
    if (activeSubgroupId && openOverrides[activeSubgroupId] === false) {
      const next = { ...openOverrides };
      delete next[activeSubgroupId];
      setOpenOverrides(next);
    }
  }

  // Filtering force-expands the surviving sub-groups; toggles are ignored then.
  const isOpen = (subgroup: NavSubgroup) =>
    hasQuery || (openOverrides[subgroup.id] ?? subgroup.id === activeSubgroupId);

  return (
    <nav aria-label="Registry navigation" className={cn('flex flex-col', className)}>
      {/* Client-side filter — a fixed header above the scrolling tree, so the
          scroll-fade mask never dims it. */}
      <div className="pb-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/75"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter navigation"
            placeholder="Filter…"
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-lg border border-border/60 bg-transparent pl-8 pr-12 text-[13px] text-foreground outline-none transition-colors duration-[var(--dur-fast)] placeholder:text-muted-foreground/75 hover:bg-hover focus-visible:bg-hover focus-visible:ring-1 focus-visible:ring-ring sm:h-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,scale] duration-150 ease-out hover:text-foreground motion-safe:active:scale-[0.96] motion-reduce:transition-none focus-visible:ring-1 focus-visible:ring-ring sm:size-10"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-pretty px-3 py-6 text-[13px] text-muted-foreground">No matches</p>
      ) : (
        <div className="scroll-fade -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-4">
          {groups.map((group, i) => (
            <div
              key={group.id}
              className={cn(i !== 0 && (group.separated ? 'mt-3 border-t border-border/60 pt-3' : 'mt-6'))}
            >
              {group.label ? (
                <div className="flex items-center gap-2 pb-1.5 pl-1">
                  <span className="text-[13px] text-muted-foreground/75">{group.label}</span>
                  {group.count != null ? (
                    <span aria-hidden className="text-[11px] tabular-nums text-muted-foreground/75">
                      {itemCount(group)}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {group.subgroups?.length ? (
                group.subgroups.map((subgroup, j) => {
                  const open = isOpen(subgroup);
                  return (
                    <div key={subgroup.id} className={j === 0 ? 'mt-0.5' : 'mt-1.5'}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => {
                          if (hasQuery) return;
                          setOpenOverrides((prev) => ({ ...prev, [subgroup.id]: !open }));
                        }}
                        className="flex min-h-11 w-full items-center gap-1 rounded-lg py-1 pl-1 pr-3 text-left text-[12px] text-muted-foreground/75 outline-none transition-[color,background-color,scale] duration-150 ease-out hover:text-foreground active:bg-active active:text-foreground motion-safe:active:scale-[0.96] motion-reduce:transition-none focus-visible:ring-1 focus-visible:ring-ring sm:min-h-10"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn(
                            'size-3 shrink-0 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-reduce:transition-none',
                            open && 'rotate-90',
                          )}
                        />
                        {subgroup.label}
                      </button>
                      {open ? (
                        <div className="flex flex-col">
                          {subgroup.items.map((item) => (
                            <NavItem
                              key={item.slug}
                              href={item.href}
                              title={item.title}
                              active={item.href === path}
                              isNew={item.isNew}
                              isUpdated={item.isUpdated}
                              indent
                              onNavigate={onNavigate}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.slug}
                      href={item.href}
                      title={item.title}
                      active={item.href === path}
                      isNew={item.isNew}
                      isUpdated={item.isUpdated}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}

export default SidebarNav;
