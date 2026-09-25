'use client';

import { ChevronRightIcon, HardDriveIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass, scrollRowClass } from '../workspace-kit/primitives';

/** A single path segment inside a bucket (folder-style). */
export interface StorageBreadcrumbSegment {
	/** Label rendered for the segment. */
	label: string;
	/** Full prefix path this segment navigates to (e.g. "images/avatars/"). */
	path: string;
}

interface StorageBreadcrumbProps {
	/** The bucket name shown as the root crumb. */
	bucketKey: string;
	/** Folder segments after the bucket root. Empty = just the bucket. */
	segments?: StorageBreadcrumbSegment[];
	/**
	 * Navigate callback. `path` is the segment's prefix, or `null` for the
	 * bucket root crumb. Without it every crumb is plain text.
	 */
	onNavigate?: (path: string | null) => void;
	/** Disable navigation, e.g. while a folder is loading. */
	disabled?: boolean;
	className?: string;
}

const CRUMB = 'inline-flex h-6 min-w-0 max-w-48 items-center gap-1.5 rounded-md px-1.5';

/**
 * `StorageBreadcrumb` — the bucket root and folder segments as quiet, compact
 * crumbs. The last crumb is the current location; earlier ones navigate
 * when `onNavigate` is set. Scrolls sideways instead of wrapping.
 */
export function StorageBreadcrumb({ bucketKey, segments = [], onNavigate, disabled = false, className }: StorageBreadcrumbProps) {
	const crumbs = [{ label: bucketKey, path: null as string | null }, ...segments.map((segment) => ({ label: segment.label, path: segment.path as string | null }))];

	return (
		<nav aria-label="Folder path" className={cn(scrollRowClass, 'min-w-0', className)}>
			<ol className="flex w-max items-center gap-0.5 text-[13px]">
				{crumbs.map((crumb, index) => {
					const last = index === crumbs.length - 1;
					const content = (
						<>
							{index === 0 ? <HardDriveIcon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
							<span className="truncate">{crumb.label}</span>
						</>
					);
					return (
						<li key={crumb.path ?? '__root__'} className="flex min-w-0 items-center gap-0.5">
							{index > 0 ? <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" /> : null}
							{last || !onNavigate ? (
								<span aria-current={last ? 'location' : undefined} className={cn(CRUMB, last ? 'font-medium text-foreground' : 'text-muted-foreground')} title={crumb.label}>
									{content}
								</span>
							) : (
								<button
									type="button"
									disabled={disabled}
									onClick={() => onNavigate(crumb.path)}
									title={crumb.label}
									className={cn(CRUMB, 'cursor-pointer text-muted-foreground hover:bg-overlay-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60', focusRingClass)}
								>
									{content}
								</button>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
