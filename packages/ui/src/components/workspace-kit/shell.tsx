'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Sheet, SheetContent, SheetTitle } from '../sheet';
import { TooltipProvider } from '../tooltip';

type WorkspaceShellContextValue = {
	/** Opens the navigation drawer shown below the sidebar breakpoint. */
	openNav: () => void;
};

const WorkspaceShellContext = React.createContext<WorkspaceShellContextValue>({ openNav: () => {} });

/** The enclosing workspace shell. Outside one, `openNav` is a no-op. */
function useWorkspaceShell() {
	return React.useContext(WorkspaceShellContext);
}

type WorkspaceSidebarRenderProps = {
	/** `rail` sits beside the content from the `3xl` container width up; `drawer` renders inside the mobile sheet. */
	mode: 'rail' | 'drawer';
	/** Icon-rail state. Always false in the drawer. */
	collapsed: boolean;
	onCollapsedChange: (collapsed: boolean) => void;
	/** Closes the drawer. Call it after any navigation item is chosen. */
	onNavigate: () => void;
};

type WorkspaceShellProps = {
	/** Rendered twice: once as the rail and once inside the navigation drawer. */
	sidebar: (props: WorkspaceSidebarRenderProps) => React.ReactNode;
	children: React.ReactNode;
	/** `data-slot` on the root, so hosts and tests can target a specific template. */
	slot?: string;
	defaultSidebarCollapsed?: boolean;
	className?: string;
};

/**
 * Workspace layout shared by the application templates: a collapsible sidebar
 * rail beside the main region, a left drawer below the `3xl` container width,
 * a skip link, and one tooltip provider. The root is the `ws` container, so
 * every view sizes itself to the space it is given rather than the viewport.
 */
function WorkspaceShell({ sidebar, children, slot = 'workspace-shell', defaultSidebarCollapsed = false, className }: WorkspaceShellProps) {
	const [collapsed, setCollapsed] = React.useState(defaultSidebarCollapsed);
	const [navOpen, setNavOpen] = React.useState(false);
	const mainId = React.useId();
	const context = React.useMemo<WorkspaceShellContextValue>(() => ({ openNav: () => setNavOpen(true) }), []);
	const closeNav = React.useCallback(() => setNavOpen(false), []);

	return (
		<WorkspaceShellContext.Provider value={context}>
			<TooltipProvider>
				<div
					data-slot={slot}
					className={cn('@container/ws relative flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground', className)}
				>
					<a
						href={`#${mainId}`}
						className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm shadow-card focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
					>
						Skip to main content
					</a>
					<div className="hidden h-full @3xl/ws:flex">
						{sidebar({ mode: 'rail', collapsed, onCollapsedChange: setCollapsed, onNavigate: () => {} })}
					</div>
					<main id={mainId} tabIndex={-1} className="@container/view flex min-w-0 flex-1 outline-none">
						{children}
					</main>
				</div>
				<Sheet open={navOpen} onOpenChange={setNavOpen}>
					<SheetContent side="left" showClose={false} className="w-72 max-w-[85vw] gap-0 p-0 sm:max-w-72">
						<SheetTitle className="sr-only">Navigation</SheetTitle>
						{sidebar({ mode: 'drawer', collapsed: false, onCollapsedChange: setCollapsed, onNavigate: closeNav })}
					</SheetContent>
				</Sheet>
			</TooltipProvider>
		</WorkspaceShellContext.Provider>
	);
}

export { useWorkspaceShell, WorkspaceShell, WorkspaceShellContext };
export type { WorkspaceShellContextValue, WorkspaceShellProps, WorkspaceSidebarRenderProps };
