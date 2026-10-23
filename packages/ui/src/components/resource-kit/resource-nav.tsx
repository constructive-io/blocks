'use client';

import { NavIcon, NavRow, NavSection } from '../workspace-kit/nav';
import { useResourceIcon, useResourceKit } from './context';
import type { AnyResource } from './types';

export type ResourceNavProps = {
	/** Resource names in nav order; defaults to every resource the provider holds. */
	resources?: readonly string[];
	/** The current path, to mark the matching resource active. */
	activeHref?: string;
	/** Icon-rail mode, from the workspace sidebar's render props. */
	collapsed: boolean;
	/** Closes the navigation drawer after a choice. */
	onNavigate?: () => void;
	/** Heading above the rows. */
	title?: string;
};

function ResourceNavRow({ resource, active, collapsed, onNavigate }: { resource: AnyResource; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
	const { router } = useResourceKit();
	const icon = useResourceIcon(resource);
	return (
		<NavRow
			label={resource.label}
			collapsed={collapsed}
			active={active}
			leading={<NavIcon icon={icon} active={active} />}
			href={router.listHref(resource.name)}
			onClick={onNavigate}
			renderLink={(props) => <router.Link {...props} />}
		/>
	);
}

/**
 * Sidebar rows for the app's resources, built on the workspace nav: one link
 * per resource with its icon, the active one marked from the current path.
 * Render it inside a `SidebarFrame`.
 */
export function ResourceNav({ resources: order, activeHref, collapsed, onNavigate, title }: ResourceNavProps) {
	const { resources, byName, router } = useResourceKit();
	const shown = order ? order.flatMap((name) => byName.get(name) ?? []) : resources;
	return (
		<NavSection title={title} collapsed={collapsed}>
			{shown.map((resource) => {
				const href = router.listHref(resource.name);
				const active = Boolean(activeHref) && (activeHref === href || activeHref!.startsWith(`${href}/`));
				return <ResourceNavRow key={resource.name} resource={resource} active={active} collapsed={collapsed} onNavigate={onNavigate} />;
			})}
		</NavSection>
	);
}
