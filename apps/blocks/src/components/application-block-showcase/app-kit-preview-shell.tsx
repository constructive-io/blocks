'use client';

import { LayoutDashboard } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import {
  CRM_DEMO_ICONS,
  CRM_DEMO_NOW,
  createCrmDemo,
  MemoryRoute,
  ResourceKitProvider,
  ResourceNav,
  useMemoryRouter,
} from '@/components/ui/resource-kit';
import { NavIcon, NavRow, NavSection, SidebarFrame, WorkspaceShell } from '@/components/ui/workspace-kit';

/**
 * The CRM demo inside the workspace shell, routed by component state the way
 * a host routes it by URL: `/` for home, `/<resource>` for a list, and
 * `/<resource>/<id>` for a record.
 */
export function AppKitPreviewShell({ initialPath, home }: { initialPath: string; home?: ReactNode }) {
  const { path, setPath, router } = useMemoryRouter(initialPath);
  const [resources] = useState(() => createCrmDemo({ latency: 200 }));

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
          <MemoryRoute path={path} home={home} />
        </WorkspaceShell>
      </ResourceKitProvider>
    </div>
  );
}
