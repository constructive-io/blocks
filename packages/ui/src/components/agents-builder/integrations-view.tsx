'use client';

import { Blocks, Check, CircleCheck, LayoutGrid, type LucideIcon, MessageSquarePlus, SearchX } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { useAgentsBuilder } from './agents-builder-context';
import { buildIntegrationSections, type IntegrationScope } from './integration-sections';
import { IntegrationMark } from './integration-mark';
import { focusRingClass, pressClass, scrollRowClass, SearchField, ViewHeader } from './primitives';
import type { Integration } from './types';
import { startViewTransition, ViewAnimation } from './view-transition';

/** A 200px fractal-noise tile, rasterized once and repeated, to break up gradient banding. */
const NOISE_TILE =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

const BUBBLES = [
	'left-[6%] top-[18%] size-10',
	'left-[2%] -bottom-[18%] size-28',
	'right-[8%] top-[12%] size-6',
	'-right-[4%] -bottom-[30%] size-40',
	'left-[34%] -top-[20%] size-16',
	'right-[30%] bottom-[8%] size-4',
];
/** Staggers the highlight chips once there is room; they stack centred on narrow containers. */
const CHIP_OFFSETS = ['@2xl/view:-translate-x-16', '@2xl/view:translate-x-24', '@2xl/view:-translate-x-10'];

const SCOPES: { value: IntegrationScope; label: string; icon: LucideIcon }[] = [
	{ value: 'all', label: 'All', icon: LayoutGrid },
	{ value: 'connected', label: 'Connected', icon: CircleCheck },
];

function IntegrationRow({ integration }: { integration: Integration }) {
	const { isConnected, requestConnect, emit } = useAgentsBuilder();

	return (
		<li className="flex min-h-14 items-center gap-3 py-2">
			<IntegrationMark integration={integration} size="md" />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{integration.name}</p>
				<p className="truncate text-[13px] text-muted-foreground">{integration.description}</p>
			</div>
			{isConnected(integration.id) ? (
				<Button
					size="xs"
					variant="secondary"
					aria-label={`Manage ${integration.name}`}
					onClick={() => emit({ type: 'manage-integration', integrationId: integration.id })}
				>
					<Check className="size-3.5" />
					Connected
				</Button>
			) : (
				<Button
					size="xs"
					variant="outline"
					aria-label={`Connect ${integration.name}`}
					onClick={() => requestConnect({ integrationId: integration.id })}
				>
					Connect
				</Button>
			)}
		</li>
	);
}

function Hero() {
	const { data, integration } = useAgentsBuilder();

	return (
		<div
			aria-hidden="true"
			className="relative isolate flex h-40 shrink-0 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-3 @md/view:h-48 @md/view:gap-3 bg-[radial-gradient(120%_140%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,var(--card)),color-mix(in_oklab,var(--primary)_28%,var(--card)))] shadow-card"
		>
			<span
				className="pointer-events-none absolute inset-0 -z-10 bg-size-[200px_200px] bg-repeat opacity-[0.08] mix-blend-overlay"
				style={{ backgroundImage: NOISE_TILE }}
			/>
			{BUBBLES.map((bubble) => (
				<span
					key={bubble}
					className={cn('absolute -z-10 rounded-full border border-white/50 bg-white/15 dark:border-white/10 dark:bg-white/5', bubble)}
				/>
			))}
			{data.heroHighlights.map((highlight, index) => (
				<span
					key={highlight.text}
					className={cn(
						'flex h-9 max-w-full items-center gap-2 rounded-full bg-card/85 pr-3.5 pl-1.5 text-[13px] text-foreground shadow-card backdrop-blur-sm',
						CHIP_OFFSETS[index % CHIP_OFFSETS.length],
					)}
				>
					<IntegrationMark integration={integration(highlight.integrationId)} className="rounded-full" />
					<span className="truncate">{highlight.text}</span>
				</span>
			))}
		</div>
	);
}

/**
 * Integrations directory: scope and category rail, a highlight banner, and
 * recommended plus per-category app rows with connect or manage actions.
 */
function IntegrationsView() {
	const { data, isConnected, emit } = useAgentsBuilder();
	const [scope, setScope] = React.useState<IntegrationScope>('all');
	const [query, setQuery] = React.useState('');
	const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const idPrefix = React.useId();
	const sectionId = (id: string) => `${idPrefix}-${id}`;

	const sections = buildIntegrationSections(data.integrations, data.categories, { scope, query, isConnected });
	const available = new Set(sections.map((section) => section.id));
	const matchCount = sections.reduce((count, section) => count + section.items.length, 0);
	const sectionKey = sections.map((section) => section.id).join();

	React.useEffect(() => {
		const root = scrollRef.current;
		if (!root) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const top = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
				const category = top?.target.getAttribute('data-category');
				if (category) setActiveCategory(category === 'recommended' ? null : category);
			},
			{ root, rootMargin: '0px 0px -70% 0px' },
		);
		root.querySelectorAll('[data-category]').forEach((node) => observer.observe(node));
		return () => observer.disconnect();
	}, [sectionKey]);

	const chipClass = cn('h-8 shrink-0 cursor-pointer rounded-full px-3 text-[13px] whitespace-nowrap pointer-coarse:h-9', pressClass, focusRingClass);
	const railItem = cn('flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm', focusRingClass);

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={Blocks} title="Sources">
				<SearchField
					label="Search sources"
					value={query}
					placeholder="Search sources…"
					className="w-36 @md/view:w-56"
					onChange={(event) => setQuery(event.target.value)}
				/>
				<Button size="xs" variant="outline" aria-label="Request app" onClick={() => emit({ type: 'request-app' })}>
					<MessageSquarePlus className="size-3.5" />
					<span className="hidden @md/view:inline">Request app</span>
				</Button>
			</ViewHeader>

			<div className="flex min-h-0 flex-1">
				<div role="listbox" aria-label="Filter sources" className="hidden w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border p-2.5 @3xl/view:flex">
					<div role="group" className="flex flex-col gap-0.5">
						{SCOPES.map(({ value, label, icon: Icon }) => (
							<button
								key={value}
								type="button"
								role="option"
								aria-selected={scope === value}
								onClick={() =>
									startViewTransition(() => {
										setScope(value);
										scrollRef.current?.scrollTo({ top: 0 });
									})
								}
								className={cn(railItem, 'text-foreground', scope === value ? 'bg-muted' : 'hover:bg-overlay-hover')}
							>
								<Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
								{label}
							</button>
						))}
					</div>
					<hr className="border-border" />
					<div role="group" aria-labelledby={`${idPrefix}-categories`} className="flex flex-col gap-0.5">
						<span id={`${idPrefix}-categories`} className="px-2 pb-1 text-xs text-muted-foreground">
							Categories
						</span>
						{data.categories.map((category) => (
							<button
								key={category.id}
								type="button"
								role="option"
								aria-selected={activeCategory === category.id}
								aria-disabled={!available.has(category.id) || undefined}
								onClick={() => document.getElementById(sectionId(category.id))?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
								className={cn(
									railItem,
									'hover:bg-overlay-hover hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50',
									activeCategory === category.id ? 'text-foreground' : 'text-muted-foreground',
								)}
							>
								{category.label}
							</button>
						))}
					</div>
				</div>

				<div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
					<div className="flex flex-col gap-6 p-3 pb-10 @md/view:gap-8">
						<div role="group" aria-label="Filter sources" className={cn(scrollRowClass, '-mx-3 flex gap-1.5 px-3 @3xl/view:hidden')}>
							{SCOPES.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									aria-pressed={scope === value}
									onClick={() => startViewTransition(() => setScope(value))}
									className={cn(chipClass, scope === value ? 'bg-foreground text-background' : 'bg-card text-foreground shadow-card')}
								>
									{label}
								</button>
							))}
							<span aria-hidden="true" className="my-1.5 w-px shrink-0 bg-border" />
							{sections
								.filter((section) => section.id !== 'recommended' && section.id !== 'models')
								.map((section) => (
									<button
										key={section.id}
										type="button"
										onClick={() => document.getElementById(sectionId(section.id))?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
										className={cn(chipClass, 'bg-card text-muted-foreground shadow-card')}
									>
										{section.label}
									</button>
								))}
						</div>
						<Hero />
						<div role="status" className="sr-only">
							{query.trim() ? `${matchCount} ${matchCount === 1 ? 'source matches' : 'sources match'} your search` : ''}
						</div>
						<ViewAnimation>
							<div className="flex flex-col gap-6 @md/view:gap-8">
								{sections.length === 0 ? (
									<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
										<span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground shadow-card">
											<SearchX aria-hidden="true" className="size-4" />
										</span>
										<p className="text-sm text-muted-foreground">No sources matched</p>
									</div>
								) : (
									sections.map((section) => (
										<section
											key={section.id}
											id={sectionId(section.id)}
											data-category={section.id}
											aria-labelledby={`${sectionId(section.id)}-heading`}
											className="scroll-mt-3 px-1 @md/view:px-6"
										>
											<h2 id={`${sectionId(section.id)}-heading`} className="mb-1 text-[13px] text-muted-foreground">
												{section.label}
											</h2>
											<ul className="grid grid-cols-1 gap-x-10 @4xl/view:grid-cols-2">
												{section.items.map((integration) => (
													<IntegrationRow key={integration.id} integration={integration} />
												))}
											</ul>
										</section>
									))
								)}
							</div>
						</ViewAnimation>
					</div>
				</div>
			</div>
		</div>
	);
}

export { IntegrationsView };
