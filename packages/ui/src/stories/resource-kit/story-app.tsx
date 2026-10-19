import * as React from 'react';

import {
	type AnyResource,
	CRM_DEMO_ICONS,
	CRM_DEMO_NOW,
	RecordDetail,
	ResourceKitProvider,
	ResourceNav,
	ResourcePage,
	type ResourceRouter,
} from '../../components/resource-kit';
import { SidebarFrame, WorkspaceShell } from '../../components/workspace-kit';

/** A router over component state, so stories navigate between list and detail without a framework. */
export function useMemoryRouter(initialPath: string) {
	const [path, setPath] = React.useState(initialPath);
	const router = React.useMemo<ResourceRouter>(
		() => ({
			Link: ({ href, className, children, ...rest }: { href: string; className?: string; children: React.ReactNode } & React.ComponentProps<'a'>) => (
				<a
					{...rest}
					href={href}
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
	return { path, router, setPath };
}

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
	const [, name, id] = path.split('/');
	let view: React.ReactNode;
	if (!name) view = home ?? null;
	else if (id) view = <RecordDetail key={path} resource={name} id={decodeURIComponent(id)} />;
	else view = <ResourcePage key={name} resource={name} />;
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
						{view}
					</WorkspaceShell>
				</ResourceKitProvider>
			</div>
		</div>
	);
}
