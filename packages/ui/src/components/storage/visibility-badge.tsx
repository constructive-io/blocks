import { ClockIcon, GlobeIcon, LockIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge, type BadgeProps } from '../badge';
import { cn } from '../../lib/utils';
import type { BucketVisibility, StorageObjectStatus } from './types';

interface VisibilityBadgeProps {
	visibility: BucketVisibility;
	size?: BadgeProps['size'];
	className?: string;
	/** Hide the leading icon (e.g. in very dense rows). */
	hideIcon?: boolean;
}

const VISIBILITY_CONFIG: Record<BucketVisibility, { label: string; icon: LucideIcon; variant: BadgeProps['variant'] }> = {
	public: { label: 'Public', icon: GlobeIcon, variant: 'secondary' },
	private: { label: 'Private', icon: LockIcon, variant: 'outline' },
	temp: { label: 'Temp', icon: ClockIcon, variant: 'warning' },
};

/**
 * `VisibilityBadge` — neutral-by-default badge for a bucket's visibility.
 * Pure render. Public/private stay neutral; `temp` opts into the warning tone
 * since it signals expiring content.
 */
export function VisibilityBadge({ visibility, size, className, hideIcon }: VisibilityBadgeProps) {
	const config = VISIBILITY_CONFIG[visibility];
	const Icon = config.icon;
	return (
		<Badge variant={config.variant} size={size} className={cn('gap-1', className)}>
			{!hideIcon && <Icon aria-hidden />}
			{config.label}
		</Badge>
	);
}

interface ObjectStatusBadgeProps {
	status: StorageObjectStatus;
	size?: BadgeProps['size'];
	className?: string;
}

const STATUS_CONFIG: Record<StorageObjectStatus, { label: string; variant: BadgeProps['variant'] }> = {
	requested: { label: 'Requested', variant: 'outline' },
	uploaded: { label: 'Uploaded', variant: 'secondary' },
	processed: { label: 'Processed', variant: 'success' },
};

/**
 * `ObjectStatusBadge` — lifecycle status for a stored object. Neutral until
 * `processed`, which opts into the success tone.
 */
export function ObjectStatusBadge({ status, size, className }: ObjectStatusBadgeProps) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge variant={config.variant} size={size} className={className}>
			{config.label}
		</Badge>
	);
}
