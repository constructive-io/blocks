import * as React from 'react';

import { type AnyResource, CRM_DEMO_ICONS, CRM_DEMO_NOW, MemoryRoute, ResourceKitProvider, ResourceNav, useMemoryRouter } from '../../components/resource-kit';
import { SidebarFrame, WorkspaceShell } from '../../components/workspace-kit';

type StoryAppProps = {
	resources: AnyResource[];
	initialPath: string;
	/** What `/` shows, e.g. a dashboard. */
	home?: React.ReactNode;
	/** Frame width, e.g. 700 for a narrow pane. */
	width?: number;
	brand?: string;
};

/** The resources inside the workspace shell with a resource nav, routed by path like a generated app. */
export function StoryApp({ resources, initialPath, home, width, brand = 'Acme CRM' }: StoryAppProps) {
	const { path, router } = useMemoryRouter(initialPath);
	return (
		<div className="h-dvh min-h-[640px] p-2" style={width ? { width } : undefined}>
			<div className="h-full overflow-hidden rounded-xl border border-border shadow-sm">
				<ResourceKitProvider router={router} resources={resources} icons={CRM_DEMO_ICONS} now={CRM_DEMO_NOW}>
					<WorkspaceShell
						sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => {
							const rail = mode === 'rail' && collapsed;
							return (
								<SidebarFrame
									label={brand}
									menu={<span className="min-w-0 flex-1 truncate px-1.5 text-sm font-medium">{rail ? brand.slice(0, 1) : brand}</span>}
									collapsed={collapsed}
									onCollapsedChange={onCollapsedChange}
									drawer={mode === 'drawer'}
									onClose={onNavigate}
								>
									<nav aria-label="Resources" className="flex w-full flex-col gap-3">
										<ResourceNav collapsed={rail} activeHref={path} onNavigate={onNavigate} />
									</nav>
								</SidebarFrame>
							);
						}}
					>
						<MemoryRoute path={path} home={home} />
					</WorkspaceShell>
				</ResourceKitProvider>
			</div>
		</div>
	);
}
