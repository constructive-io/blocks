'use client';

import { DatabaseIcon, HardDriveIcon, InboxIcon, PlusIcon, RefreshCwIcon, ShieldAlertIcon, UploadIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { EmptyState } from '../workspace-kit/surface';

export type StorageEmptyStateVariant = 'no-buckets' | 'not-provisioned' | 'empty-bucket' | 'no-access';

interface StorageEmptyStateProps {
	variant: StorageEmptyStateVariant;
	/** Primary action handler (e.g. create bucket, upload, provision). */
	onAction?: () => void;
	/**
	 * Secondary action handler. Only the `no-access` variant renders a
	 * secondary action (refresh / learn more); ignored otherwise.
	 */
	onSecondaryAction?: () => void;
	className?: string;
}

interface VariantConfig {
	icon: LucideIcon;
	title: string;
	description: string;
	/** Primary button label and icon, or null for variants with no primary action. */
	action: { label: string; icon: LucideIcon } | null;
	secondaryLabel?: string;
}

const VARIANTS: Record<StorageEmptyStateVariant, VariantConfig> = {
	'no-buckets': {
		icon: HardDriveIcon,
		title: 'No buckets yet',
		description: 'Buckets organize your uploaded files. Create your first one to start storing objects.',
		action: { label: 'New bucket', icon: PlusIcon },
	},
	'not-provisioned': {
		icon: DatabaseIcon,
		title: 'Storage not provisioned',
		description: 'This database has buckets defined but storage has not been provisioned yet. Provision to enable uploads.',
		action: { label: 'Provision storage', icon: DatabaseIcon },
	},
	'empty-bucket': {
		icon: InboxIcon,
		title: 'This bucket is empty',
		description: 'Upload files, or drop them here, and they will appear in this list.',
		action: { label: 'Upload files', icon: UploadIcon },
	},
	'no-access': {
		icon: ShieldAlertIcon,
		title: 'No access to storage',
		description:
			'You need to be an active member of this organization to view its storage. If you recently joined, an admin may still need to confirm your membership.',
		action: null,
		secondaryLabel: 'Refresh',
	},
};

/**
 * `StorageEmptyState` — a framed icon, a short title, one line of context,
 * and a single next step (`no-access` offers only a refresh).
 */
export function StorageEmptyState({ variant, onAction, onSecondaryAction, className }: StorageEmptyStateProps) {
	const config = VARIANTS[variant];
	const ActionIcon = config.action?.icon;
	return (
		<EmptyState
			icon={config.icon}
			title={config.title}
			description={config.description}
			className={cn('h-full w-full justify-center', className)}
			action={
				config.action && onAction && ActionIcon ? (
					<Button onClick={onAction} size="sm">
						<ActionIcon aria-hidden="true" data-icon="inline-start" />
						{config.action.label}
					</Button>
				) : variant === 'no-access' && config.secondaryLabel && onSecondaryAction ? (
					<Button onClick={onSecondaryAction} size="sm" variant="outline">
						<RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
						{config.secondaryLabel}
					</Button>
				) : null
			}
		/>
	);
}
