'use client';

import { PlusIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { NavCount, NavRow, NavSection } from '../workspace-kit/nav';
import { TooltipIconButton } from '../workspace-kit/primitives';
import type { BucketVisibility, StorageBucket } from './types';
import { bucketDisplayName, formatCount } from './utils';
import { VISIBILITY } from './visibility-badge';

interface BucketRailProps {
	buckets: StorageBucket[];
	selectedBucketId?: string | null;
	onSelectBucket: (bucketId: string) => void;
	onNewBucket?: () => void;
	/** Icon-only rail, as in a collapsed workspace sidebar. */
	collapsed?: boolean;
	/** Heading above the list. */
	title?: string;
	/** Bucket whose contents are loading; its row shows a spinner. */
	busyBucketId?: string | null;
	/** When false, only the selected bucket is enabled, e.g. while policy forbids switching. */
	selectable?: boolean;
	className?: string;
}

/**
 * `BucketRail` — buckets as workspace nav rows: a visibility glyph, the name,
 * and a quiet object count, with "New bucket" beside the heading. Buckets
 * that are not provisioned yet read muted. Selection is controlled.
 */
export function BucketRail({
	buckets,
	selectedBucketId,
	onSelectBucket,
	onNewBucket,
	collapsed = false,
	title = 'Buckets',
	busyBucketId,
	selectable = true,
	className,
}: BucketRailProps) {
	return (
		<div className={cn('flex min-h-0 flex-col', className)}>
			<NavSection
				title={title}
				collapsed={collapsed}
				action={
					onNewBucket ? (
						<TooltipIconButton label="New bucket" size="sm" side={collapsed ? 'right' : 'top'} onClick={onNewBucket}>
							<PlusIcon aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
					) : null
				}
			>
				{buckets.map((bucket) => {
					const active = bucket.id === selectedBucketId;
					const { icon: Icon, label: visibility } = VISIBILITY[bucket.visibility] ?? VISIBILITY.private;
					const unprovisioned = bucket.provisioned === false;
					const name = bucketDisplayName(bucket);
					const details = [visibility, unprovisioned ? 'not provisioned' : null, bucket.objectCount != null ? `${bucket.objectCount} files` : null]
						.filter(Boolean)
						.join(', ');
					return (
						<NavRow
							key={bucket.id}
							label={`${name}, ${details}`}
							labelNode={
								<>
									{name}
									<span className="sr-only">, {details}</span>
								</>
							}
							collapsed={collapsed}
							active={active}
							muted={unprovisioned}
							busy={busyBucketId === bucket.id}
							disabled={!selectable && !active}
							leading={<Icon aria-hidden="true" className={cn('size-3.5 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />}
							trailing={
								unprovisioned ? (
									<span aria-hidden="true" className="text-[11px] text-subtle-foreground">
										Off
									</span>
								) : bucket.objectCount != null ? (
									<NavCount value={formatCount(bucket.objectCount)} />
								) : null
							}
							onClick={() => onSelectBucket(bucket.id)}
						/>
					);
				})}
			</NavSection>
		</div>
	);
}

export type { BucketVisibility };
