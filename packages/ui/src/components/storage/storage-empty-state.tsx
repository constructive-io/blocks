import { DatabaseIcon, HardDriveIcon, InboxIcon, ShieldAlertIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '../button';
import { cn } from '../../lib/utils';

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
	/** Primary button label, or null for variants with no primary action. */
	actionLabel: string | null;
	secondaryLabel?: string;
}

const VARIANTS: Record<StorageEmptyStateVariant, VariantConfig> = {
	'no-buckets': {
		icon: HardDriveIcon,
		title: 'No buckets yet',
		description: 'Buckets organize your uploaded files. Create your first one to start storing objects.',
		actionLabel: 'New bucket',
	},
	'not-provisioned': {
		icon: DatabaseIcon,
		title: 'Storage not provisioned',
		description: 'This database has buckets defined but storage has not been provisioned yet. Provision to enable uploads.',
		actionLabel: 'Provision storage',
	},
	'empty-bucket': {
		icon: InboxIcon,
		title: 'This bucket is empty',
		description: 'Upload files to this bucket and they will appear here.',
		actionLabel: 'Upload files',
	},
	'no-access': {
		icon: ShieldAlertIcon,
		title: 'No access to storage',
		description:
			'You need to be an active member of this organization to view its storage. If you recently joined, an admin may still need to confirm your membership.',
		actionLabel: null,
		secondaryLabel: 'Refresh',
	},
};

/**
 * `StorageEmptyState` — a centered icon, balanced heading, body line, and a
 * single primary action (except `no-access`, which offers only a secondary
 * refresh). Pure render, mirrors the stateless `PageHeader` style.
 */
export function StorageEmptyState({ variant, onAction, onSecondaryAction, className }: StorageEmptyStateProps) {
	const config = VARIANTS[variant];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				'flex h-full w-full flex-col items-center justify-center gap-4 px-6 py-12 text-center',
				className,
			)}
		>
			<div className='flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
				<Icon className='size-6' aria-hidden />
			</div>
			<div className='flex max-w-sm flex-col gap-1.5'>
				<h2 className='text-balance text-base font-semibold text-foreground'>{config.title}</h2>
				<p className='text-pretty text-sm text-muted-foreground'>{config.description}</p>
			</div>
			{config.actionLabel && (
				<Button onClick={onAction} size='sm'>
					{config.actionLabel}
				</Button>
			)}
			{variant === 'no-access' && config.secondaryLabel && (
				<Button onClick={onSecondaryAction} size='sm' variant='outline'>
					{config.secondaryLabel}
				</Button>
			)}
		</div>
	);
}
