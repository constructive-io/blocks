'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '../lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				'bg-muted text-muted-foreground/70 relative inline-flex w-fit items-center justify-center rounded-md p-0.5',
				className,
			)}
			{...props}
		>
			<TabsIndicator />
			{children}
		</TabsPrimitive.List>
	);
}

/**
 * Traveling active-tab pill — Base UI feeds it --active-tab-* CSS vars, so
 * transitioning left/top/width/height animates the slide between tabs.
 * TabsList renders one automatically before the triggers (whose `relative`
 * labels paint above it); exported for custom list compositions.
 */
function TabsIndicator({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Indicator>) {
	return (
		<TabsPrimitive.Indicator
			data-slot="tabs-indicator"
			className={cn(
				`bg-background absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height)
				w-(--active-tab-width) rounded-[calc(var(--radius-md)-2px)] shadow-xs transition-[left,top,width,height]
				duration-(--duration-moderate) ease-out motion-reduce:transition-none`,
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				`hover:text-muted-foreground data-[active]:text-foreground
					focus-visible:ring-ring/50 relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-3
					text-sm font-medium whitespace-nowrap outline-none pointer-coarse:min-h-11 focus-visible:ring-[3px]
				data-[disabled]:pointer-events-none data-[disabled]:opacity-64 [&_svg]:shrink-0`,
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
	return <TabsPrimitive.Panel data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
