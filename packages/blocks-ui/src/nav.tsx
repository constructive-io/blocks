'use client';

/**
 * Navigation blocks, as generated from `_meta` by `meta-to-blocks`.
 *
 * A link renders as a plain anchor so a document navigates without a router; a
 * host on client-side routing gives the node a `click` action (or overrides
 * `NavLink` with its own framework `Link`) and the anchor defers to it. The
 * active link is whichever `href` matches `scope.pathname`, so highlighting is
 * declarative rather than a second source of truth.
 */

import { useRenderer } from 'blocks-renderer';
import type { BlockProps } from 'blocks-renderer';
import type { UINodeProps } from 'blocks-schema';
import type { MouseEvent } from 'react';

function text(props: UINodeProps, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = props[key];
		if (typeof value === 'string') return value;
	}
	return undefined;
}

export function NavBlock({ props, children }: BlockProps) {
	const label = text(props, 'label');

	return (
		<nav
			className={['flex flex-col gap-4', props.className ? String(props.className) : ''].join(' ').trim()}
			{...(label ? { 'aria-label': label } : {})}
		>
			{children}
		</nav>
	);
}

export function NavGroupBlock({ props, children }: BlockProps) {
	const label = text(props, 'label', 'title');
	const count = typeof props.count === 'number' ? props.count : undefined;

	return (
		<div className="flex flex-col gap-1">
			{label && (
				<div className="flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
					<span>{label}</span>
					{count !== undefined && <span className="tabular-nums">{count}</span>}
				</div>
			)}
			<ul className="flex flex-col gap-0.5">{children}</ul>
		</div>
	);
}

export function NavLinkBlock({ node, props }: BlockProps) {
	const { scope, onAction } = useRenderer();
	const label = text(props, 'label', 'title') ?? String(props.table ?? '');
	const href = text(props, 'href') ?? '#';
	const action = node.actions?.click;
	const active = props.active === true || (typeof scope.pathname === 'string' && scope.pathname === href);

	return (
		<li>
			<a
				href={href}
				aria-current={active ? 'page' : undefined}
				className={[
					'block rounded-md px-2 py-1.5 text-sm transition-colors',
					active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
				].join(' ')}
				{...(action
					? {
							onClick: (event: MouseEvent) => {
								event.preventDefault();
								onAction?.(action, 'click');
							},
						}
					: {})}
			>
				{label}
			</a>
		</li>
	);
}
