'use client';

import * as React from 'react';

import { RecordDetail } from './record-detail';
import { ResourcePage } from './resource-page';
import type { ResourceRouter } from './types';

/**
 * A router over component state, for demos, stories, tests, and prototypes
 * without a framework: `/<resource>` for a list and `/<resource>/<id>` for a
 * record. Links render as `#/<path>`, so a static page never points outside
 * its base path and a click never leaves the page. Render the screen for its
 * `path` with `MemoryRoute`.
 */
export function useMemoryRouter(initialPath: string) {
	const [path, setPath] = React.useState(initialPath);
	const router = React.useMemo<ResourceRouter>(
		() => ({
			Link: ({ href, onClick, ...rest }) => (
				<a
					{...rest}
					href={`#${href}`}
					onClick={(event) => {
						onClick?.(event);
						if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
						event.preventDefault();
						setPath(href);
					}}
				/>
			),
			navigate: setPath,
			listHref: (resource) => `/${resource}`,
			detailHref: (resource, id) => `/${resource}/${encodeURIComponent(id)}`,
		}),
		[],
	);
	return { path, setPath, router };
}

/** The screen for a `useMemoryRouter` path: `home` at `/`, a resource's list, or one of its records. */
export function MemoryRoute({ path, home }: { path: string; home?: React.ReactNode }) {
	const [, name, id] = path.split('/');
	if (!name) return home ?? null;
	// Each record and each list mounts fresh, the way a route change would.
	if (id) return <RecordDetail key={path} resource={name} id={decodeURIComponent(id)} />;
	return <ResourcePage key={name} resource={name} />;
}
