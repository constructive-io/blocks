'use client';

import { Check, Link2, Share2, Waypoints } from 'lucide-react';

import type { RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { cn } from '@/lib/utils';

interface RelationshipTypeSelectorProps {
	value: RelationshipType;
	onChange: (type: RelationshipType) => void;
	disabled?: boolean;
}

interface TypeOption {
	type: RelationshipType;
	icon: typeof Link2;
	iconClassName?: string;
	title: string;
	subtitle: string;
	colors: {
		iconBg: string;
		iconText: string;
		selectedBorder: string;
		selectedBg: string;
		checkBg: string;
	};
}

// Keep color choices in sync with RELATIONSHIP_STYLES in relationships-view.tsx
const TYPE_OPTIONS: TypeOption[] = [
	{
		type: 'one-to-one',
		icon: Link2,
		title: 'One-to-One',
		subtitle: 'Exactly one each',
		colors: {
			iconBg: 'bg-purple-500/10',
			iconText: 'text-purple-600 dark:text-purple-400',
			selectedBorder: 'border-purple-500',
			selectedBg: 'bg-purple-500/5',
			checkBg: 'bg-purple-500',
		},
	},
	{
		type: 'belongs-to',
		icon: Share2,
		iconClassName: 'rotate-180',
		title: 'Belongs To',
		subtitle: 'Many belong to one',
		colors: {
			iconBg: 'bg-green-500/10',
			iconText: 'text-green-600 dark:text-green-400',
			selectedBorder: 'border-green-500',
			selectedBg: 'bg-green-500/5',
			checkBg: 'bg-green-500',
		},
	},
	{
		type: 'one-to-many',
		icon: Share2,
		title: 'One-to-Many',
		subtitle: 'One has many',
		colors: {
			iconBg: 'bg-blue-500/10',
			iconText: 'text-blue-600 dark:text-blue-400',
			selectedBorder: 'border-blue-500',
			selectedBg: 'bg-blue-500/5',
			checkBg: 'bg-blue-500',
		},
	},
	{
		type: 'many-to-many',
		icon: Waypoints,
		title: 'Many-to-Many',
		subtitle: 'Linked via join table',
		colors: {
			iconBg: 'bg-amber-500/10',
			iconText: 'text-amber-600 dark:text-amber-400',
			selectedBorder: 'border-amber-500',
			selectedBg: 'bg-amber-500/5',
			checkBg: 'bg-amber-500',
		},
	},
];

export function RelationshipTypeSelector({ value, onChange, disabled }: RelationshipTypeSelectorProps) {
	return (
		<div className='space-y-3'>
			<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Select type</p>
			<div className='grid grid-cols-2 gap-2'>
				{TYPE_OPTIONS.map((option) => {
					const Icon = option.icon;
					const isSelected = value === option.type;

					return (
						<button
							key={option.type}
							type='button'
							onClick={() => onChange(option.type)}
							disabled={disabled}
							className={cn(
								`border-border relative flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2.5 text-left
								transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.96]`,
								!isSelected && 'disabled:pointer-events-none disabled:opacity-70',
							isSelected && 'disabled:pointer-events-none',
								isSelected
									? [option.colors.selectedBorder, option.colors.selectedBg]
									: 'hover:border-border/80 hover:bg-muted/30',
							)}
						>
							{isSelected && (
								<div className='absolute top-2 right-2'>
									<div className={cn('flex h-4 w-4 items-center justify-center rounded-full', option.colors.checkBg)}>
										<Check className='h-2.5 w-2.5 text-white' strokeWidth={3} />
									</div>
								</div>
							)}

							<div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', option.colors.iconBg)}>
								<Icon className={cn('h-4 w-4', option.colors.iconText, option.iconClassName)} />
							</div>
							<div className='min-w-0 flex-1 pr-4'>
								<h3 className='text-balance text-xs leading-tight font-semibold'>{option.title}</h3>
								<p className={cn('text-muted-foreground text-[10px]', isSelected && option.colors.iconText)}>
									{option.subtitle}
								</p>
							</div>
						</button>
					);
				})}
			</div>

		</div>
	);
}
