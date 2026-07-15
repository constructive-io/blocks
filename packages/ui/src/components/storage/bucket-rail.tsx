'use client';

import { PlusIcon } from 'lucide-react';

import { Badge } from '../badge';
import { Button } from '../button';
import { ScrollArea } from '../scroll-area';
import { Separator } from '../separator';
import { cn } from '../../lib/utils';
import type { BucketVisibility, StorageBucket } from './types';
import { bucketDisplayName } from './utils';
import { VisibilityBadge } from './visibility-badge';

interface BucketRailItemProps {
	bucket: StorageBucket;
	selected: boolean;
	onSelect: (bucketId: string) => void;
}

/**
 * A single row in the bucket rail. Highlights when selected, shows a visibility
 * badge, an optional object count, and a subtle "unprovisioned" hint.
 */
function BucketRailItem({ bucket, selected, onSelect }: BucketRailItemProps) {
	const unprovisioned = bucket.provisioned === false;

	return (
		<button
			type='button'
			aria-current={selected ? 'true' : undefined}
			onClick={() => onSelect(bucket.id)}
			className={cn(
				`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors
				focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background`,
				selected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/50',
			)}
		>
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='truncate font-medium'>{bucketDisplayName(bucket)}</span>
				<span className='flex items-center gap-1.5'>
					<VisibilityBadge visibility={bucket.visibility} size='sm' />
					{unprovisioned && (
						<span className='truncate text-[0.625rem] text-muted-foreground'>Not provisioned</span>
					)}
				</span>
			</div>
			{bucket.objectCount != null && (
				<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>{bucket.objectCount}</span>
			)}
		</button>
	);
}

interface BucketRailProps {
	buckets: StorageBucket[];
	selectedBucketId?: string | null;
	onSelectBucket: (bucketId: string) => void;
	onNewBucket?: () => void;
	className?: string;
}

/**
 * `BucketRail` — a vertical, scrollable list of buckets with a pinned
 * "New bucket" action at the bottom. Stateless: selection is controlled via
 * `selectedBucketId` + `onSelectBucket`.
 */
export function BucketRail({ buckets, selectedBucketId, onSelectBucket, onNewBucket, className }: BucketRailProps) {
	return (
		<div className={cn('flex h-full min-h-0 flex-col', className)}>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='flex flex-col gap-0.5 p-2'>
					{buckets.map((bucket) => (
						<BucketRailItem
							key={bucket.id}
							bucket={bucket}
							selected={bucket.id === selectedBucketId}
							onSelect={onSelectBucket}
						/>
					))}
				</div>
			</ScrollArea>
			<Separator />
			<div className='p-2'>
				<Button variant='ghost' size='sm' className='w-full justify-start' onClick={onNewBucket}>
					<PlusIcon aria-hidden />
					New bucket
				</Button>
			</div>
		</div>
	);
}

export type { BucketVisibility };
