import type { ReactNode } from 'react';
import { RiCloseLine } from '@remixicon/react';

import { cn } from '@/lib/utils';
import type { ConditionLeafNode } from '@/blocks/schema/schema-builder-core/components/policies/condition-builder/types';

import type { CompositeConditionData, CompositePolicyData } from '@/blocks/schema/schema-builder-core/components/policies/composite-policy-builder/types';

interface FlatConditionListProps {
	value: CompositePolicyData;
	renderCondition: (leaf: ConditionLeafNode<CompositeConditionData>, index: number) => ReactNode;
	onAddCondition: () => void;
	onDeleteCondition: (id: string) => void;
	onToggleOperator: () => void;
	activeLeafId?: string | null;
	disabled?: boolean;
}

export function FlatConditionList({
	value,
	renderCondition,
	onAddCondition,
	onDeleteCondition,
	onToggleOperator,
	activeLeafId,
	disabled,
}: FlatConditionListProps) {
	const isAll = value.operator === 'AND';
	const isAny = !isAll;
	const leaves = value.children.filter((c): c is ConditionLeafNode<CompositeConditionData> => c.type === 'condition');

	return (
		<div className='space-y-3 p-3'>
			{/* Header: ANY/ALL toggle + label */}
			<div className='flex items-center gap-2'>
				<div className='bg-background inline-flex rounded-lg border p-0.5 text-xs font-semibold'>
					<button
						type='button'
						disabled={disabled}
						onClick={() => {
							if (!isAny) onToggleOperator();
						}}
						className={cn(
							'cursor-pointer rounded-lg px-2 py-1 disabled:pointer-events-none disabled:opacity-50',
							isAny ? 'bg-amber-500 text-white' : 'text-muted-foreground bg-transparent',
						)}
					>
						ANY
					</button>
					<button
						type='button'
						disabled={disabled}
						onClick={() => {
							if (!isAll) onToggleOperator();
						}}
						className={cn(
							'cursor-pointer rounded-lg px-2 py-1 disabled:pointer-events-none disabled:opacity-50',
							isAll ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-transparent',
						)}
					>
						ALL
					</button>
				</div>
				<span className='text-muted-foreground text-sm'>of the following are true:</span>
			</div>

			{/* Condition rows */}
			<div className='space-y-2'>
				{leaves.map((leaf, index) => (
					<div
						key={leaf.id}
						className={cn(
							'bg-card border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2',
							activeLeafId === leaf.id && 'ring-primary/50 ring-2',
						)}
					>
						<div className='flex-1'>{renderCondition(leaf, index)}</div>

						{/* Delete */}
						<button
							type='button'
							onClick={() => onDeleteCondition(leaf.id)}
							disabled={disabled}
							aria-label='Delete condition'
							className='text-muted-foreground/60 hover:text-destructive flex h-6 w-6 shrink-0 cursor-pointer
								items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-50'
						>
							<RiCloseLine className='size-4' />
						</button>
					</div>
				))}
			</div>

			{/* Add condition */}
			<button
				type='button'
				onClick={onAddCondition}
				disabled={disabled}
				className='text-primary hover:text-primary/80 cursor-pointer text-xs font-medium disabled:pointer-events-none
					disabled:opacity-50'
			>
				+ Add Condition
			</button>
		</div>
	);
}
