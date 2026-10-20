'use client';

import { LayoutDashboard } from 'lucide-react';
import { type ComponentProps, type ReactNode, useMemo, useState } from 'react';

import {
  CRM_DEMO_ICONS,
  CRM_DEMO_NOW,
  createCrmDemo,
  RecordDetail,
  ResourceKitProvider,
  ResourceNav,
  ResourcePage,
  type ResourceRouter,
} from '@/components/ui/resource-kit';
import { NavIcon, NavRow, NavSection, SidebarFrame, WorkspaceShell } from '@/components/ui/workspace-kit';

/**
 * The CRM demo inside the workspace shell, routed by component state the way
 * a host routes it by URL: `/` for home, `/<resource>` for a list, and
 * `/<resource>/<id>` for a record. Links render as `#/<path>` so the static
 * page never points outside the site's base path.
 */
export function AppKitPreviewShell({ initialPath, home }: { initialPath: string; home?: ReactNode }) {
  const [path, setPath] = useState(initialPath);
  const [resources] = useState(() => createCrmDemo({ latency: 200 }));
  const router = useMemo<ResourceRouter>(
    () => ({
      Link: ({ href, className, children, ...rest }: ComponentProps<'a'> & { href: string }) => (
        <a
          {...rest}
          href={`#${href}`}
          className={className}
          onClick={(event) => {
            rest.onClick?.(event);
            if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
            event.preventDefault();
            setPath(href);
          }}
        >
          {children}
        </a>
      ),
      navigate: setPath,
      listHref: (resource) => `/${resource}`,
      detailHref: (resource, id) => `/${resource}/${encodeURIComponent(id)}`,
    }),
    [],
  );
  const [, name, id] = path.split('/');
  const view = !name ? home : id ? <RecordDetail key={path} resource={name} id={decodeURIComponent(id)} /> : <ResourcePage key={name} resource={name} />;

  return (
    <div className="flex h-dvh min-h-[640px] w-full flex-col" data-slot="application-block-showcase-canvas">
      <ResourceKitProvider router={router} resources={resources} icons={CRM_DEMO_ICONS} now={CRM_DEMO_NOW}>
        <WorkspaceShell
          className="min-h-0 flex-1"
          sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => {
            const rail = mode === 'rail' && collapsed;
            return (
              <SidebarFrame
                label="Acme CRM"
                menu={<span className="min-w-0 flex-1 truncate px-1.5 text-sm font-medium">{rail ? 'A' : 'Acme CRM'}</span>}
                collapsed={collapsed}
                onCollapsedChange={onCollapsedChange}
                drawer={mode === 'drawer'}
                onClose={onNavigate}
              >
                <nav aria-label="Acme CRM" className="flex w-full flex-col gap-3">
                  {home ? (
                    <NavSection collapsed={rail}>
                      <NavRow
                        label="Overview"
                        collapsed={rail}
                        active={path === '/'}
                        leading={<NavIcon icon={LayoutDashboard} active={path === '/'} />}
                        onClick={() => {
                          setPath('/');
                          onNavigate();
                        }}
                      />
                    </NavSection>
                  ) : null}
                  <ResourceNav collapsed={rail} activeHref={path} onNavigate={onNavigate} title={home ? 'Records' : undefined} />
                </nav>
              </SidebarFrame>
            );
          }}
        >
          {view}
        </WorkspaceShell>
      </ResourceKitProvider>
    </div>
  );
}
