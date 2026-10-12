'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '../lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

const FADE = '1.5rem';

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
	const listRef = React.useRef<HTMLDivElement | null>(null);
	// Physical sides that have more tabs behind them, so the fade masks the right edge in both text directions.
	const [hidden, setHidden] = React.useState({ left: false, right: false });

	const revealActive = React.useCallback(() => {
		const list = listRef.current;
		const active = list?.querySelector<HTMLElement>('[data-active]');
		if (list && active && list.scrollWidth > list.clientWidth) revealInline(list, active);
	}, []);

	React.useEffect(() => {
		const list = listRef.current;
		if (!list) return;

		const measure = () => {
			const rtl = getComputedStyle(list).direction === 'rtl';
			const distance = Math.abs(list.scrollLeft);
			const room = list.scrollWidth - list.clientWidth;
			const before = room > 1 && distance > 1;
			const after = room > 1 && room - distance > 1;
			const next = { left: rtl ? after : before, right: rtl ? before : after };
			setHidden((current) => (current.left === next.left && current.right === next.right ? current : next));
		};
		measure();
		list.addEventListener('scroll', measure, { passive: true });
		const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		resizeObserver?.observe(list);
		// Tabs added or removed, or a new tab becoming active.
		const mutationObserver = new MutationObserver((records) => {
			measure();
			if (records.some((record) => record.type === 'attributes')) revealActive();
		});
		mutationObserver.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-active'] });
		return () => {
			list.removeEventListener('scroll', measure);
			resizeObserver?.disconnect();
			mutationObserver.disconnect();
		};
	}, [revealActive]);

	const overflowing = hidden.left || hidden.right;
	// The list only becomes a scroller once it overflows, so the initially active tab is revealed then.
	React.useEffect(() => {
		if (overflowing) revealActive();
	}, [overflowing, revealActive]);
	const mask = overflowing
		? `linear-gradient(to right, transparent, black ${hidden.left ? FADE : '0px'}, black calc(100% - ${hidden.right ? FADE : '0px'}), transparent)`
		: undefined;

	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				'bg-muted text-muted-foreground/70 relative inline-flex w-fit max-w-full items-center justify-center rounded-md p-0.5',
				// Scroll only when needed, so a list that fits keeps its focus rings uncropped.
				overflowing && 'justify-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				className,
			)}
			style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}
			{...props}
			ref={(node: HTMLDivElement | null) => {
				listRef.current = node;
				const forwarded = props.ref;
				if (typeof forwarded === 'function') forwarded(node);
				else if (forwarded) (forwarded as React.MutableRefObject<HTMLDivElement | null>).current = node;
			}}
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
