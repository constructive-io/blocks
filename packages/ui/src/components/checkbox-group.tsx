'use client';

import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';

import { cn } from '../lib/utils';

type CheckboxGroupProps = CheckboxGroupPrimitive.Props;

function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
	return <CheckboxGroupPrimitive className={cn('flex flex-col items-start gap-3', className)} data-slot="checkbox-group" {...props} />;
}

export { CheckboxGroup };
export type { CheckboxGroupProps };
