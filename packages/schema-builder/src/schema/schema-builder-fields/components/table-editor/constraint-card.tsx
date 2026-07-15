'use client';

import { Fingerprint, Key, CircleDot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Checkbox } from '@constructive-io/ui/checkbox';

type ConstraintType = 'primaryKey' | 'unique' | 'nullable';

interface ConstraintCardProps {
	type: ConstraintType;
	selected: boolean;
	disabled?: boolean;
	disabledReason?: string;
	onToggle: () => void;
}

const CONSTRAINT_CONFIG: Record<
	ConstraintType,
	{
		label: string;
		description: string;
		badge: string;
		icon: typeof Key;
		colors: {
			selected: string;
			badge: string;
			icon: string;
		};
	}
> = {
	primaryKey: {
		label: 'Primary Key',
		description: 'Uniquely identifies each row (automatically sets UNIQUE + NOT NULL)',
		badge: 'PK',
		icon: Key,
		colors: {
			selected: 'ring-2 ring-blue-500/50 bg-blue-500/5',
			badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
			icon: 'text-blue-500',
		},
	},
	unique: {
		label: 'Unique',
		description: 'All values in this column must be different',
		badge: 'UNIQUE',
		icon: Fingerprint,
		colors: {
			selected: 'ring-2 ring-purple-500/50 bg-purple-500/5',
			badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
			icon: 'text-purple-500',
		},
	},
	nullable: {
		label: 'Nullable',
		description: 'Allow NULL values in this column',
		badge: 'NULLABLE',
		icon: CircleDot,
		colors: {
			selected: 'ring-2 ring-green-500/50 bg-green-500/5',
			badge: 'bg-green-500/10 text-green-600 border-green-500/20',
			icon: 'text-green-500',
		},
	},
};

export function ConstraintCard({ type, selected, disabled, disabledReason, onToggle }: ConstraintCardProps) {
	const config = CONSTRAINT_CONFIG[type];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-4 rounded-lg border p-4 transition-all',
				disabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer hover:border-border',
				selected && !disabled ? config.colors.selected : 'bg-card border-border/50',
			)}
			onClick={() => !disabled && onToggle()}
		>
			<div className='flex items-start gap-3'>
				<div
					className={cn(
						'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
						selected && !disabled ? config.colors.icon : 'text-muted-foreground',
						selected && !disabled ? 'bg-background' : 'bg-muted/50',
					)}
				>
					<Icon className='size-4' />
				</div>
				<div className='flex-1 space-y-1'>
					<div className='flex items-center gap-2'>
						<span
							className={cn(
								'text-sm font-medium',
								selected && !disabled ? config.colors.icon : 'text-foreground',
							)}
						>
							{config.label}
						</span>
						{selected && (
							<span
								className={cn(
									'rounded border px-1.5 py-0.5 text-[10px] font-medium',
									config.colors.badge,
								)}
							>
								{config.badge}
							</span>
						)}
						{disabled && disabledReason && (
							<span className='text-muted-foreground text-xs'>({disabledReason})</span>
						)}
					</div>
					<p className='text-muted-foreground text-xs leading-relaxed'>{config.description}</p>
				</div>
			</div>
			<Checkbox
				checked={selected}
				disabled={disabled}
				onCheckedChange={() => !disabled && onToggle()}
				onClick={(e) => e.stopPropagation()}
				className='shrink-0'
			/>
		</div>
	);
}
