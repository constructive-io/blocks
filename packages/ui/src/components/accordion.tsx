'use client';

import * as React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root>;

function Accordion({ className, ...props }: AccordionProps) {
	return (
		<AccordionPrimitive.Root
			data-slot="accordion"
			className={cn('flex w-full flex-col', className)}
			{...props}
		/>
	);
}

type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>;

function AccordionItem({ className, ...props }: AccordionItemProps) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn('border-b border-border/60 last:border-b-0', className)}
			{...props}
		/>
	);
}

type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger>;

function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					'group/accordion-trigger flex w-full flex-1 cursor-pointer items-center justify-between gap-4 py-3 text-left text-sm font-medium outline-none',
					'hover:text-foreground',
					'focus-visible:ring-[3px] focus-visible:ring-ring/50',
					'disabled:pointer-events-none disabled:opacity-64',
					className,
				)}
				{...props}
			>
				{children}
				<ChevronDown
					data-slot="accordion-trigger-icon"
					className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-moderate) ease-out group-data-[panel-open]/accordion-trigger:rotate-180 motion-reduce:transition-none"
					aria-hidden
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

type AccordionContentProps = React.ComponentProps<typeof AccordionPrimitive.Panel>;

function AccordionContent({ className, children, ...props }: AccordionContentProps) {
	return (
		<AccordionPrimitive.Panel
			data-slot="accordion-content"
			className={cn(
				'h-[var(--accordion-panel-height)] overflow-hidden',
				'transition-[height] duration-(--duration-moderate) ease-out motion-reduce:transition-none',
				'data-[ending-style]:h-0 data-[starting-style]:h-0',
				className,
			)}
			{...props}
		>
			<div data-slot="accordion-content-inner" className="pb-3 text-[13px] leading-5 text-muted-foreground">
				{children}
			</div>
		</AccordionPrimitive.Panel>
	);
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
export type { AccordionProps, AccordionItemProps, AccordionTriggerProps, AccordionContentProps };
