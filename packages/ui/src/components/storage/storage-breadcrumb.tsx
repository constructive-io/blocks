import { HardDriveIcon } from 'lucide-react';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '../breadcrumb';
import { cn } from '../../lib/utils';

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
	 * bucket root crumb.
	 */
	onNavigate?: (path: string | null) => void;
	className?: string;
}

/**
 * `StorageBreadcrumb` — bucket root plus optional folder segments. Pure render;
 * the final crumb is the current location and is not a link.
 */
export function StorageBreadcrumb({ bucketKey, segments = [], onNavigate, className }: StorageBreadcrumbProps) {
	const hasSegments = segments.length > 0;

	return (
		<Breadcrumb className={cn('min-w-0', className)}>
			<BreadcrumbList className='flex-nowrap'>
				<BreadcrumbItem className='min-w-0'>
					{hasSegments ? (
						<BreadcrumbLink
							className='inline-flex min-w-0 cursor-pointer items-center gap-1.5'
							onClick={() => onNavigate?.(null)}
						>
							<HardDriveIcon className='size-3.5 shrink-0' aria-hidden />
							<span className='truncate'>{bucketKey}</span>
						</BreadcrumbLink>
					) : (
						<BreadcrumbPage className='inline-flex min-w-0 items-center gap-1.5'>
							<HardDriveIcon className='size-3.5 shrink-0' aria-hidden />
							<span className='truncate'>{bucketKey}</span>
						</BreadcrumbPage>
					)}
				</BreadcrumbItem>

				{segments.map((segment, index) => {
					const isLast = index === segments.length - 1;
					return (
						<BreadcrumbItem key={segment.path} className='min-w-0'>
							<BreadcrumbSeparator />
							{isLast ? (
								<BreadcrumbPage className='truncate'>{segment.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									className='cursor-pointer truncate'
									onClick={() => onNavigate?.(segment.path)}
								>
									{segment.label}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
