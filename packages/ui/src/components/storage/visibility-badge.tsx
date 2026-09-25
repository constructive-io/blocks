import { ClockIcon, GlobeIcon, LockIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { BadgeProps } from '../badge';
import { ToneBadge, type Tone } from '../workspace-kit/primitives';
import type { BucketVisibility, StorageObjectStatus } from './types';

interface VisibilityBadgeProps {
	visibility: BucketVisibility;
	/** Kept for compatibility; the badge has one size. */
	size?: BadgeProps['size'];
	className?: string;
	/** Hide the leading icon (e.g. in very dense rows). */
	hideIcon?: boolean;
}

export const VISIBILITY: Record<BucketVisibility, { label: string; icon: LucideIcon; tone: Tone; hint: string }> = {
	public: { label: 'Public', icon: GlobeIcon, tone: 'info', hint: 'Anyone with the link can read objects.' },
	private: { label: 'Private', icon: LockIcon, tone: 'neutral', hint: 'Only authorized requests can read objects.' },
	temp: { label: 'Temp', icon: ClockIcon, tone: 'warning', hint: 'Short-lived objects, cleaned up automatically.' },
};

/**
 * `VisibilityBadge` — a bucket's visibility as a small tinted label. Private
 * stays neutral, public reads as information, and temp warns that content
 * expires.
 */
export function VisibilityBadge({ visibility, className, hideIcon }: VisibilityBadgeProps) {
	const config = VISIBILITY[visibility] ?? VISIBILITY.private;
	const Icon = config.icon;
	return (
		<ToneBadge tone={config.tone} className={className}>
			{hideIcon ? null : <Icon aria-hidden="true" />}
			{config.label}
		</ToneBadge>
	);
}

interface ObjectStatusBadgeProps {
	status: StorageObjectStatus;
	/** Kept for compatibility; the badge has one size. */
	size?: BadgeProps['size'];
	className?: string;
}

const STATUS: Record<StorageObjectStatus, { label: string; tone: Tone }> = {
	requested: { label: 'Requested', tone: 'neutral' },
	uploaded: { label: 'Uploaded', tone: 'info' },
	processed: { label: 'Processed', tone: 'success' },
};

/** `ObjectStatusBadge` — lifecycle status for a stored object; `processed` reads as done. */
export function ObjectStatusBadge({ status, className }: ObjectStatusBadgeProps) {
	const config = STATUS[status];
	return (
		<ToneBadge tone={config.tone} className={className}>
			{config.label}
		</ToneBadge>
	);
}
