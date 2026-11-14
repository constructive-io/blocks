// Buttons of the grid toolbar.
//
// The toolbar is a size container (`@container/sheets-toolbar`). Labels fold into
// their icon only inside a narrow toolbar (`@max-*` variants), so a control rendered
// anywhere else keeps its label, and the accessible name never folds.
import type { ComponentProps, ComponentType, ReactNode } from 'react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '../../utils/cn';

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/**
 * When a label folds into its icon, by how much the toolbar's two groups need the room:
 * the data tools first (below 72rem), then Fields, Filters, Sort and Delete (below 58rem),
 * then New record (below 48rem), then Add row (below 44rem). Measured on the toolbar's
 * own width, so both groups keep one line from about 38rem.
 */
export type ToolbarFold = 'tools' | 'view' | 'create' | 'primary';

// Literal class names, so Tailwind sees every variant it must generate.
const FOLDED: Record<ToolbarFold, string> = {
	tools: '@max-6xl/sheets-toolbar:hidden',
	view: '@max-[58rem]/sheets-toolbar:hidden',
	create: '@max-[48rem]/sheets-toolbar:hidden',
	primary: '@max-[44rem]/sheets-toolbar:hidden',
};

/**
 * A label that folds into its button's icon on a narrow toolbar. A folded label leaves the
 * accessibility tree, so its button needs an `aria-label`.
 */
export function ToolbarLabel({ children, fold }: { children: ReactNode; fold: ToolbarFold }) {
	return <span className={FOLDED[fold]}>{children}</span>;
}

export interface ViewToggleButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
	icon: IconComponent;
	label: string;
	/** How much the control changes the view (filters applied, sort keys, hidden fields); 0 for nothing. */
	count?: number;
	/** Word after the count, folded with the label, e.g. "hidden". */
	countLabel?: string;
}

/**
 * Fields, Filters and Sort. Quiet while they leave the view as it is; once they change
 * it they take the accent tint and show by how much, so the view's state reads at a glance.
 */
export function ViewToggleButton({ icon: Icon, label, count = 0, countLabel, className, ...props }: ViewToggleButtonProps) {
	const active = count > 0;
	return (
		<Button
			variant='ghost'
			size='sm'
			data-active={active || undefined}
			className={cn(
				'text-muted-foreground hover:text-foreground',
				active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
				className,
			)}
			{...props}
		>
			<Icon className='size-4' aria-hidden='true' />
			<ToolbarLabel fold='view'>{label}</ToolbarLabel>
			{active && (
				<span className='tabular-nums'>
					{count.toLocaleString()}
					{countLabel && <ToolbarLabel fold='view'>{` ${countLabel}`}</ToolbarLabel>}
				</span>
			)}
		</Button>
	);
}

export interface ToolButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
	icon: IconComponent;
	label: string;
}

/** A quiet data tool (import, export of the view): icon and label, the label folding first. */
export function ToolButton({ icon: Icon, label, className, ...props }: ToolButtonProps) {
	return (
		// A folded label leaves the accessibility tree too, so the name is set on the button.
		<Button variant='ghost' size='sm' aria-label={label} className={cn('text-muted-foreground hover:text-foreground', className)} {...props}>
			<Icon className='size-4' aria-hidden='true' />
			<ToolbarLabel fold='tools'>{label}</ToolbarLabel>
		</Button>
	);
}
