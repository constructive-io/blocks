import type { ReactNode } from 'react';
import { Label } from '@constructive-io/ui/label';

import { cn } from '@/lib/utils';

/**
 * One labelled control with an optional hint. Every field in the field
 * editor uses it, so the rhythm stays the same everywhere: 8px from label to
 * control, 6px from control to hint.
 */
export function FormField({
	label,
	htmlFor,
	hint,
	subtle = false,
	children,
	className,
}: {
	label: ReactNode;
	htmlFor?: string;
	hint?: ReactNode;
	/** A secondary field inside a section, labelled in small muted type. */
	subtle?: boolean;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('flex min-w-0 flex-col gap-2', className)}>
			<Label className={subtle ? 'text-muted-foreground text-xs' : undefined} htmlFor={htmlFor}>
				{label}
			</Label>
			<div className='flex flex-col gap-1.5'>
				{children}
				{hint ? <p className='text-muted-foreground text-xs'>{hint}</p> : null}
			</div>
		</div>
	);
}

/** A titled group of fields, such as Constraints or Validation rules. */
export function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
	return (
		<div className='flex flex-col gap-2'>
			<Label>{title}</Label>
			{children}
		</div>
	);
}
