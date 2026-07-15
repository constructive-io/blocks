import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';

export interface EmptyStateFeature {
	icon: LucideIcon;
	title: string;
	description: string;
}

export interface EmptyStateCardProps {
	icon: LucideIcon;
	title: ReactNode;
	description: string;
	actionLabel?: string;
	actionIcon?: LucideIcon;
	onAction?: () => void;
	/** data-testid for the action button */
	actionTestId?: string;
	features?: EmptyStateFeature[];
	className?: string;
}

export function EmptyStateCard({
	icon: Icon,
	title,
	description,
	actionLabel,
	actionIcon: ActionIcon,
	onAction,
	actionTestId,
	features,
	className,
}: EmptyStateCardProps) {
	return (
		<div className={cn('@container flex w-full items-center justify-center py-12', className)}>
			<div className='bg-card border-border max-w-2xl rounded-lg border p-6 @md:p-8'>
				<div className='flex flex-col items-center text-center'>
					<div className='border-primary/20 bg-primary/10 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border'>
						<Icon className='text-primary h-10 w-10' />
					</div>

					<h2 className='mb-2 text-xl font-semibold'>{title}</h2>

					<p className='text-muted-foreground mb-6 max-w-lg text-sm'>{description}</p>

					{actionLabel && onAction && (
						<Button onClick={onAction} size='xl' className='px-12' data-testid={actionTestId}>
							{ActionIcon && <ActionIcon className='mr-2 h-4 w-4' />}
							{actionLabel}
						</Button>
					)}
				</div>

				{features && features.length > 0 && (
					<div className='border-border mt-8 grid grid-cols-1 gap-4 border-t pt-6 @sm:grid-cols-3'>
						{features.map((feature) => (
							<div
								key={feature.title}
								className='flex flex-row items-center gap-3 text-left @sm:flex-col @sm:items-center @sm:gap-0 @sm:text-center'
							>
								<div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg @sm:mb-2'>
									<feature.icon className='text-muted-foreground h-5 w-5' />
								</div>
								<div>
									<h3 className='mb-0.5 text-sm font-medium @sm:mb-1'>{feature.title}</h3>
									<p className='text-muted-foreground text-xs'>{feature.description}</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
