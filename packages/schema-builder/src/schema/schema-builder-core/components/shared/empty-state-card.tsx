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
		<div className={cn('@container flex w-full items-center justify-center py-10', className)}>
			<div className='bg-card w-full max-w-xl rounded-xl p-6 shadow-card @md:p-8'>
				<div className='flex flex-col items-center text-center'>
					<span className='bg-primary/10 text-primary ring-primary/20 mb-4 grid size-10 place-items-center rounded-xl ring-1 ring-inset'>
						<Icon aria-hidden='true' className='size-4' />
					</span>

					<h2 className='text-foreground mb-1 text-balance text-base font-medium tracking-tight'>{title}</h2>

					<p className='text-muted-foreground mb-5 max-w-md text-pretty text-[13px] leading-5'>{description}</p>

					{actionLabel && onAction && (
						<Button onClick={onAction} size='sm' data-testid={actionTestId}>
							{ActionIcon && <ActionIcon aria-hidden='true' data-icon='inline-start' />}
							{actionLabel}
						</Button>
					)}
				</div>

				{features && features.length > 0 && (
					<div className='mt-6 grid grid-cols-1 gap-3 border-t border-dashed border-foreground/10 pt-5 @sm:grid-cols-3'>
						{features.map((feature) => (
							<div
								key={feature.title}
								className='flex flex-row items-center gap-3 text-left @sm:flex-col @sm:items-center @sm:gap-2 @sm:text-center'
							>
								<span className='bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-lg'>
									<feature.icon aria-hidden='true' className='size-3.5' />
								</span>
								<div>
									<h3 className='text-foreground text-balance text-[13px] font-medium'>{feature.title}</h3>
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
