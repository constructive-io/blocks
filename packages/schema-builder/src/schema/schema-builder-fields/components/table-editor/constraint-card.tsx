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

const CONSTRAINT_CONFIG: Record<ConstraintType, { label: string; description: string; icon: typeof Key; tint: string }> = {
	primaryKey: {
		label: 'Primary key',
		description: 'Uniquely identifies each row (automatically sets UNIQUE + NOT NULL)',
		icon: Key,
		tint: 'text-blue-600 dark:text-blue-400',
	},
	unique: {
		label: 'Unique',
		description: 'All values in this column must be different',
		icon: Fingerprint,
		tint: 'text-purple-600 dark:text-purple-400',
	},
	nullable: {
		label: 'Nullable',
		description: 'Allow NULL values in this column',
		icon: CircleDot,
		tint: 'text-green-600 dark:text-green-400',
	},
};

/**
 * A checkbox with room for an explanation. The whole card is the checkbox's
 * label, so it toggles like one: no press animation, just the tick and a
 * quiet selected surface.
 */
export function ConstraintCard({ type, selected, disabled, disabledReason, onToggle }: ConstraintCardProps) {
	const { label, description, icon: Icon, tint } = CONSTRAINT_CONFIG[type];
	const active = selected && !disabled;

	return (
		<label
			className={cn(
				'flex items-center gap-3 rounded-lg border px-3 py-2.5',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
				active ? 'border-primary/35 bg-primary/[0.04]' : cn('border-border bg-card', !disabled && 'hover:bg-overlay-hover'),
			)}
		>
			<span className={cn('grid size-7 shrink-0 place-items-center rounded-md', active ? cn('bg-background', tint) : 'bg-muted text-muted-foreground')}>
				<Icon aria-hidden='true' className='size-3.5' />
			</span>
			<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='flex items-baseline gap-1.5'>
					<span className='text-foreground text-[13px] font-medium'>{label}</span>
					{disabled && disabledReason ? <span className='text-muted-foreground text-xs'>({disabledReason})</span> : null}
				</span>
				<span className='text-muted-foreground text-xs'>{description}</span>
			</span>
			<Checkbox checked={selected} className='shrink-0' disabled={disabled} onCheckedChange={() => onToggle()} />
		</label>
	);
}
