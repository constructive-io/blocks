'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { useMergedRefs } from '../lib/compose-refs';
import { useScrollFade } from '../lib/use-scroll-fade';
import { cn } from '../lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

/** Scrolls `scroller` along its inline axis just far enough to show `target`; the page never moves. */
function revealInline(scroller: HTMLElement, target: HTMLElement) {
	const frame = scroller.getBoundingClientRect();
	const box = target.getBoundingClientRect();
	if (box.left < frame.left) scroller.scrollBy({ left: box.left - frame.left - 8 });
	else if (box.right > frame.right) scroller.scrollBy({ left: box.right - frame.right + 8 });
}

/**
 * Tabs keep their width and scroll sideways once they no longer fit: the list never grows past its
 * container, edges fade where more tabs are hidden, and the active tab is scrolled into view.
 */
function TabsList({ className, children, style, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	const fade = useScrollFade<HTMLDivElement>();
	// The fade's ref and the one the consumer passes, merged once so React does not detach and attach them every render.
	const ref = useMergedRefs(fade.ref, props.ref);
	const { node: list, overflowing } = fade;

	React.useEffect(() => {
		if (!list || !overflowing) return;
		const revealActive = () => {
			const active = list.querySelector<HTMLElement>('[data-active]');
			if (active) revealInline(list, active);
		};
		// The list only becomes a scroller once it overflows, so the active tab is revealed then, and again whenever
		// another tab becomes active.
		revealActive();
		const observer = new MutationObserver(revealActive);
		observer.observe(list, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
		return () => observer.disconnect();
	}, [list, overflowing]);

	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				'bg-muted text-muted-foreground/70 relative inline-flex w-fit max-w-full items-center justify-center rounded-md p-0.5',
				// Scroll only when needed, so a list that fits keeps its focus rings uncropped.
				overflowing && 'justify-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				className,
			)}
			style={fade.style ? { ...style, ...fade.style } : style}
			{...props}
			ref={ref}
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
					focus-visible:ring-ring/50 relative inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-3
					text-sm font-medium whitespace-nowrap outline-none pointer-coarse:min-h-11 focus-visible:ring-[3px]
				data-[disabled]:pointer-events-none data-[disabled]:opacity-64 [&_svg]:shrink-0`,
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
	return <TabsPrimitive.Panel data-slot="tabs-content" className={cn('min-w-0 flex-1 outline-none [overflow-wrap:break-word]', className)} {...props} />;
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
