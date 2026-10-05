'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Sheet, SheetContent, SheetTitle } from '../sheet';
import { TooltipProvider } from '../tooltip';

/** An icon for a navigation row or account action: any component that takes a class name. */
type WorkspaceIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** The product mark at the top of the sidebar. */
type WorkspaceBrand = {
	name: React.ReactNode;
	description?: React.ReactNode;
	href?: string;
	logo?: React.ReactNode;
};

/** One sidebar destination. Rows are links, so hosts keep their own router. */
type WorkspaceNavigationItem = {
	id: string;
	label: React.ReactNode;
	href: string;
	isActive?: boolean;
	disabled?: boolean;
	icon?: WorkspaceIcon;
	/** Quiet trailing value, such as a count. */
	badge?: React.ReactNode;
};

/** A titled run of sidebar rows. */
type WorkspaceNavigationGroup = {
	id: string;
	label?: React.ReactNode;
	items: readonly WorkspaceNavigationItem[];
};

type WorkspaceAccountActionBase = {
	id: string;
	label: React.ReactNode;
	icon?: WorkspaceIcon;
	disabled?: boolean;
	variant?: 'default' | 'destructive';
};

/** A session action in the account menu: a link, or a callback. */
type WorkspaceAccountAction = WorkspaceAccountActionBase &
	({ href: string; onSelect?: never } | { href?: never; onSelect: () => void });

type WorkspaceAccountActionGroup = {
	id: string;
	label?: React.ReactNode;
	actions: readonly WorkspaceAccountAction[];
};

/** The signed-in person shown at the foot of the sidebar. */
type WorkspaceAccount = {
	name: string;
	secondaryLabel?: string;
	avatarUrl?: string;
	avatarAlt?: string;
	/** Initials when there is no avatar; derived from `name` by default. */
	fallback?: string;
	actionGroups?: readonly WorkspaceAccountActionGroup[];
};

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
	/**
	 * Sits the workspace in a rounded, hairline-edged frame on a canvas one tier
	 * darker than the content, for hosts that present it as an app window rather
	 * than the whole page. `className` then lands on the canvas.
	 */
	framed?: boolean;
	className?: string;
};

/**
 * Workspace layout shared by the application templates: a collapsible sidebar
 * rail beside the main region, a left drawer below the `3xl` container width,
 * a skip link, and one tooltip provider. The root is the `ws` container, so
 * every view sizes itself to the space it is given rather than the viewport.
 */
function WorkspaceShell({
	sidebar,
	children,
	slot = 'workspace-shell',
	defaultSidebarCollapsed = false,
	framed = false,
	className,
}: WorkspaceShellProps) {
	const [collapsed, setCollapsed] = React.useState(defaultSidebarCollapsed);
	const [navOpen, setNavOpen] = React.useState(false);
	const mainId = React.useId();
	const context = React.useMemo<WorkspaceShellContextValue>(() => ({ openNav: () => setNavOpen(true) }), []);
	const closeNav = React.useCallback(() => setNavOpen(false), []);

	const shell = (
		<div
			data-slot={slot}
			data-framed={framed || undefined}
			className={cn(
				'@container/ws relative flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground',
				framed ? 'min-w-0 flex-1 rounded-xl border border-border shadow-xs' : className,
			)}
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
	);

	return (
		<WorkspaceShellContext.Provider value={context}>
			<TooltipProvider>
				{framed ? (
					<div
						data-slot="workspace-canvas"
						// One tier past the sidebar so the frame edge reads against it: the page mixed toward the text colour
						// in light (about #f1f1f1 on the builtin theme, and preset-aware), and toward black in dark.
						className={cn(
							'flex h-full min-h-0 w-full bg-[color-mix(in_oklab,var(--background),var(--foreground)_6%)] p-2 sm:p-3',
							'dark:bg-[color-mix(in_oklab,var(--background),black_35%)]',
							className,
						)}
					>
						{shell}
					</div>
				) : (
					shell
				)}
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
export type {
	WorkspaceAccount,
	WorkspaceAccountAction,
	WorkspaceAccountActionGroup,
	WorkspaceBrand,
	WorkspaceIcon,
	WorkspaceNavigationGroup,
	WorkspaceNavigationItem,
	WorkspaceShellContextValue,
	WorkspaceShellProps,
	WorkspaceSidebarRenderProps,
};
