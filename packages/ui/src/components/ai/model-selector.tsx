'use client';

import { Check, ChevronDown, CircleDollarSign } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../command';
import { Kbd } from '../kbd';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { MarkTile } from './mark-tile';

/** Prices in currency units per one million tokens. */
type AiModelPricing = {
	input: number;
	output: number;
	cachedInput?: number;
	/** ISO 4217 code. Defaults to USD. */
	currency?: string;
};

type AiModelLevel = {
	id: string;
	/** Short name shown beside the model, e.g. "Medium" or "High thinking". */
	label: string;
	description?: string;
	/** Overrides the model's pricing when this level bills differently. */
	pricing?: AiModelPricing;
};

type AiModelTag = 'new' | 'free' | 'beta' | 'preview' | 'deprecated';

type AiModel = {
	id: string;
	name: string;
	/** Provider or family name; used for grouping and search. */
	provider: string;
	/** Provider mark or model glyph. */
	icon?: React.ReactNode;
	description?: string;
	/** Reasoning or effort levels, in ascending order. */
	levels?: AiModelLevel[];
	defaultLevel?: string;
	pricing?: AiModelPricing;
	contextWindow?: number;
	tags?: AiModelTag[];
	disabled?: boolean;
	/** Why the model can't be chosen, e.g. "Requires the Team plan". */
	disabledReason?: string;
};

type ModelSelection = { modelId: string; levelId?: string };

type ModelSelectorProps = {
	models: AiModel[];
	value: ModelSelection;
	onValueChange: (value: ModelSelection) => void;
	/** Routers or defaults listed first, without a heading (e.g. "Auto"). */
	pinnedIds?: string[];
	recentIds?: string[];
	recommendedIds?: string[];
	/** How cost appears in each row. `meter` shows relative cost; `price` shows input and output per million. */
	priceDisplay?: 'meter' | 'price' | 'none';
	/** Lets people switch between meter and price from the search row. Defaults to true when any model has pricing. */
	allowPriceToggle?: boolean;
	disabled?: boolean;
	align?: 'start' | 'center' | 'end';
	side?: 'top' | 'bottom';
	triggerClassName?: string;
	contentClassName?: string;
	/** Accessible label prefix for the trigger. Defaults to "Model". */
	label?: string;
};

const TAG_LABEL: Record<AiModelTag, string> = {
	new: 'New',
	free: 'Free',
	beta: 'Beta',
	preview: 'Preview',
	deprecated: 'Deprecated',
};

function levelOf(model: AiModel, levelId: string | undefined) {
	return model.levels?.find((level) => level.id === levelId) ?? model.levels?.find((level) => level.id === model.defaultLevel) ?? model.levels?.[0];
}

function pricingOf(model: AiModel, level: AiModelLevel | undefined) {
	return level?.pricing ?? model.pricing;
}

function formatPrice(amount: number, currency = 'USD') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
		maximumFractionDigits: amount > 0 && amount < 1 ? 3 : 2,
	}).format(amount);
}

function formatTokens(tokens: number) {
	if (tokens >= 1_000_000) return `${tokens / 1_000_000}M`;
	return `${Math.round(tokens / 1000)}K`;
}

/** Blended cost used to rank models on the meter: output weighted 3:1, as in typical chat traffic. */
function blendedCost(pricing: AiModelPricing | undefined) {
	return pricing ? (pricing.input + pricing.output * 3) / 4 : 0;
}

function isFree(pricing: AiModelPricing | undefined) {
	return pricing !== undefined && pricing.input === 0 && pricing.output === 0;
}

/** Number of blocks in the cost indicator. */
const COST_TIERS = 4;

/** Maps a log-scaled cost share (0-1) to 1-4 blocks. Free models get 0. */
function costTier(share: number, free: boolean) {
	if (free) return 0;
	return Math.min(COST_TIERS, Math.max(1, Math.ceil(share * COST_TIERS)));
}

/**
 * Relative cost as a row of building blocks: one to four filled in the accent
 * color, stepping up in height like a stack being built. Discrete tiers read
 * faster than a continuous bar and keep the list calm while scanning.
 */
function CostBlocks({ tier }: { tier: number }) {
	return (
		<span role="img" aria-label={`Cost tier ${tier} of ${COST_TIERS}`} className="flex h-3 shrink-0 items-end gap-[3px]">
			{Array.from({ length: COST_TIERS }, (_, index) => (
				<span
					key={index}
					aria-hidden="true"
					className={cn(
						'w-1.5 rounded-[1.5px]',
						index < tier ? 'bg-primary' : 'bg-[color-mix(in_oklab,currentColor_14%,transparent)]',
					)}
					style={{ height: `${6 + index * 2}px` }}
				/>
			))}
		</span>
	);
}

function PriceText({ pricing }: { pricing: AiModelPricing }) {
	return (
		<span className="text-xs text-muted-foreground tabular-nums">
			{formatPrice(pricing.input, pricing.currency)}
			<span className="text-subtle-foreground"> / </span>
			{formatPrice(pricing.output, pricing.currency)}
		</span>
	);
}

function Tag({ tag }: { tag: AiModelTag }) {
	return (
		<span
			className={cn(
				'shrink-0 text-xs font-medium',
				tag === 'deprecated' ? 'text-muted-foreground line-through' : 'text-link',
			)}
		>
			{TAG_LABEL[tag]}
		</span>
	);
}

function ModelGlyph({ model }: { model: AiModel }) {
	return (
		<MarkTile className="text-foreground">{model.icon ?? <span className="font-semibold">{model.provider.charAt(0)}</span>}</MarkTile>
	);
}

/** A model's reasoning levels as a stacked menu: one row each, with its description and a check on the current one. */
function LevelMenu({
	model,
	levelId,
	onPick,
}: {
	model: AiModel;
	levelId: string | undefined;
	onPick: (levelId: string) => void;
}) {
	if (!model.levels?.length) {
		return <p className="px-2 py-1.5 text-xs text-muted-foreground">One mode, no reasoning levels</p>;
	}
	return (
		<div role="radiogroup" aria-label={`${model.name} reasoning level`} className="flex flex-col gap-px">
			{model.levels.map((level) => {
				const checked = level.id === levelId;
				return (
					<button
						key={level.id}
						type="button"
						role="radio"
						aria-checked={checked}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => onPick(level.id)}
						className={cn(
							'flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none pointer-coarse:min-h-11',
							'hover:bg-overlay-hover focus-visible:ring-[3px] focus-visible:ring-ring/50',
							checked && 'bg-overlay-hover',
						)}
					>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className={cn('text-[13px]', checked ? 'font-medium text-foreground' : 'text-foreground/85')}>{level.label}</span>
							{level.description ? <span className="text-xs text-muted-foreground">{level.description}</span> : null}
						</span>
						<Check aria-hidden="true" className={cn('size-3.5 shrink-0 text-foreground', checked ? 'opacity-100' : 'opacity-0')} />
					</button>
				);
			})}
		</div>
	);
}

/**
 * The side card for the active model: what it is, its reasoning levels as a
 * menu, and its prices. It opens beside the list like a submenu, so the list
 * never changes size while moving through it.
 */
function ModelDetails({
	model,
	levelId,
	onPickLevel,
}: {
	model: AiModel;
	levelId: string | undefined;
	onPickLevel: (levelId: string) => void;
}) {
	const level = levelOf(model, levelId);
	const pricing = pricingOf(model, level);
	const free = isFree(pricing);
	const price = (amount: number | undefined) =>
		free ? 'Free' : amount === undefined || !pricing ? '—' : formatPrice(amount, pricing.currency);
	const facts = [
		{ label: 'Input /1M', value: price(pricing?.input) },
		{ label: 'Output /1M', value: price(pricing?.output) },
		{ label: 'Cached /1M', value: free ? 'Free' : price(pricing?.cachedInput) },
		{ label: 'Context', value: model.contextWindow ? formatTokens(model.contextWindow) : '—' },
	];

	return (
		<>
			<div className="flex items-center gap-2 px-3 pt-3 pb-2">
				<ModelGlyph model={model} />
				<div className="min-w-0">
					<p className="truncate text-[13px] font-medium text-foreground">{model.name}</p>
					<p className="truncate text-xs text-muted-foreground">{model.description ?? model.provider}</p>
				</div>
			</div>
			<div className="px-1 pb-1">
				<LevelMenu model={model} levelId={level?.id} onPick={onPickLevel} />
			</div>
			<dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border px-3 py-2.5">
				{facts.map((fact) => (
					<div key={fact.label} className="min-w-0">
						<dt className="truncate text-[11px] leading-4 text-muted-foreground">{fact.label}</dt>
						<dd className="truncate text-xs leading-4 text-foreground tabular-nums">{fact.value}</dd>
					</div>
				))}
			</dl>
			<p className="hidden h-8 items-center gap-1 border-t border-border px-3 text-[11px] text-muted-foreground pointer-fine:flex">
				{model.levels && model.levels.length > 1 ? (
					<>
						<Kbd>←</Kbd>
						<Kbd>→</Kbd>
						<span className="mr-2">level</span>
					</>
				) : null}
				<Kbd>↵</Kbd>
				<span>choose</span>
			</p>
		</>
	);
}

type Point = { x: number; y: number };

/** Whether `point` lies inside the triangle `a b c` (sign test). */
function inTriangle(point: Point, a: Point, b: Point, c: Point) {
	const side = (p: Point, q: Point, r: Point) => (p.x - r.x) * (q.y - r.y) - (q.x - r.x) * (p.y - r.y);
	const d1 = side(point, a, b);
	const d2 = side(point, b, c);
	const d3 = side(point, c, a);
	return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** How long a row crossed on the way to the side card waits before taking it over. */
const PANEL_INTENT_MS = 240;

/**
 * Model picker for composers: searchable list with pinned routers, recent and
 * recommended sections, per-provider groups, reasoning levels, relative cost
 * or per-million pricing, tags, and a side card for the highlighted model
 * with its reasoning levels.
 * Controlled: the host owns the selection and persists recents.
 */
function ModelSelector({
	models,
	value,
	onValueChange,
	pinnedIds = [],
	recentIds = [],
	recommendedIds = [],
	priceDisplay: priceDisplayProp = 'meter',
	allowPriceToggle,
	disabled,
	align = 'start',
	side = 'top',
	triggerClassName,
	contentClassName,
	label = 'Model',
}: ModelSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [highlighted, setHighlighted] = React.useState('');
	const [pendingLevels, setPendingLevels] = React.useState<Record<string, string>>({});
	const [priceDisplay, setPriceDisplay] = React.useState(priceDisplayProp);
	/** The row the side card shows. Follows the highlight, except while the pointer heads for the card. */
	const [active, setActive] = React.useState('');
	const [panel, setPanel] = React.useState<{ top: number; side: 'left' | 'right' | 'below' }>({ top: 0, side: 'right' });
	const contentRef = React.useRef<HTMLDivElement>(null);
	const panelRef = React.useRef<HTMLDivElement>(null);
	const trail = React.useRef<Point[]>([]);
	const intentTimer = React.useRef<number | undefined>(undefined);

	const byId = React.useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
	const selected = byId.get(value.modelId);
	const selectedLevel = selected ? levelOf(selected, value.levelId) : undefined;
	const hasPricing = models.some((model) => model.pricing || model.levels?.some((level) => level.pricing));
	const canTogglePrice = (allowPriceToggle ?? hasPricing) && priceDisplayProp !== 'none';
	const maxCost = React.useMemo(
		() => Math.max(0, ...models.map((model) => blendedCost(pricingOf(model, levelOf(model, undefined))))),
		[models],
	);

	const sections = React.useMemo(() => {
		const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((model): model is AiModel => Boolean(model));
		const providers = new Map<string, AiModel[]>();
		// Unavailable models sink to the bottom of their provider group.
		for (const model of [...models].sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)))) {
			if (pinnedIds.includes(model.id)) continue;
			const group = providers.get(model.provider);
			if (group) group.push(model);
			else providers.set(model.provider, [model]);
		}
		const browsing = [
			{ id: 'pinned', label: undefined, items: pick(pinnedIds) },
			{ id: 'recent', label: 'Recently used', items: pick(recentIds) },
			{ id: 'recommended', label: 'Recommended', items: pick(recommendedIds) },
		];
		const all = [...providers].map(([provider, items]) => ({ id: `provider:${provider}`, label: provider, items }));
		return { browsing: browsing.filter((section) => section.items.length > 0), all };
	}, [byId, models, pinnedIds, recentIds, recommendedIds]);

	const levelFor = (model: AiModel) =>
		pendingLevels[model.id] ?? (model.id === value.modelId ? value.levelId : undefined) ?? levelOf(model, undefined)?.id;

	const choose = (model: AiModel, levelId = levelFor(model)) => {
		if (model.disabled) return;
		onValueChange({ modelId: model.id, levelId });
		setOpen(false);
	};

	const highlightedModel = byId.get(highlighted.split('::')[1] ?? '');
	/** Falls back to the selection so the card is present from the first frame. */
	const detailModel = byId.get(active.split('::')[1] ?? '') ?? selected;

	/** The pointer is moving toward the side card through the rows between (the submenu "safe triangle"). */
	const headingToPanel = () => {
		const card = panelRef.current?.getBoundingClientRect();
		const from = trail.current[0];
		const to = trail.current[trail.current.length - 1];
		if (!card || !from || !to || panel.side === 'below') return false;
		const edge = panel.side === 'right' ? card.left : card.right;
		const towards = panel.side === 'right' ? to.x > from.x : to.x < from.x;
		return towards && inTriangle(to, from, { x: edge, y: card.top - 8 }, { x: edge, y: card.bottom + 8 });
	};

	React.useEffect(() => {
		if (!open) return;
		if (headingToPanel()) intentTimer.current = window.setTimeout(() => setActive(highlighted), PANEL_INTENT_MS);
		else setActive(highlighted);
		return () => window.clearTimeout(intentTimer.current);
		// headingToPanel only reads refs and the card's side.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [highlighted, open]);

	/** Lines the card up with its row, clamped to the list, on whichever side has room. */
	const placePanel = React.useCallback(() => {
		const content = contentRef.current;
		const card = panelRef.current;
		if (!content || !card) return;
		if (window.innerWidth < 640) {
			setPanel((current) => (current.side === 'below' ? current : { top: 0, side: 'below' }));
			return;
		}
		const box = content.getBoundingClientRect();
		const rows = Array.from(content.querySelectorAll<HTMLElement>('[data-model-value]'));
		const row =
			rows.find((element) => element.dataset.modelValue === active) ??
			rows.find((element) => element.dataset.modelValue?.endsWith(`::${value.modelId}`));
		const rowTop = row ? row.getBoundingClientRect().top - box.top - 4 : 0;
		// Aligned with its row; only the viewport edges push it, not the list's own height.
		const top = Math.round(Math.min(Math.max(8 - box.top, rowTop), window.innerHeight - box.top - card.offsetHeight - 8));
		const side = box.right + card.offsetWidth + 8 > window.innerWidth ? 'left' : 'right';
		setPanel((current) => (current.top === top && current.side === side ? current : { top, side }));
	}, [active, value.modelId]);

	React.useLayoutEffect(() => {
		if (!open) return;
		placePanel();
		// The popover positions itself after mounting, so measure again once it has settled.
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(placePanel);
		});
		return () => cancelAnimationFrame(frame);
	}, [open, placePanel, detailModel]);

	const onKeyDown = (event: React.KeyboardEvent) => {
		// Keys move the highlight directly, so the card follows at once.
		window.clearTimeout(intentTimer.current);
		trail.current = [];
		if (query || !highlightedModel?.levels?.length || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
		event.preventDefault();
		const levels = highlightedModel.levels;
		const index = levels.findIndex((level) => level.id === levelFor(highlightedModel));
		const next = levels[Math.min(levels.length - 1, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1)))];
		if (next) setPendingLevels((current) => ({ ...current, [highlightedModel.id]: next.id }));
	};

	/** Right-aligned column with a fixed minimum width, so prices, blocks, and checks line up down the list. */
	const trailing = (model: AiModel, pricing: AiModelPricing | undefined) => {
		if (model.disabled && model.disabledReason) return <span className="truncate text-xs text-muted-foreground">{model.disabledReason}</span>;
		if (priceDisplay === 'none' || !pricing) return null;
		if (isFree(pricing)) return <span className="text-xs font-medium text-link">Free</span>;
		if (priceDisplay === 'price') return <PriceText pricing={pricing} />;
		const share = maxCost > 0 ? Math.log1p(blendedCost(pricing)) / Math.log1p(maxCost) : 0;
		return <CostBlocks tier={costTier(share, false)} />;
	};

	const renderItem = (model: AiModel, section: string) => {
		const level = levelOf(model, levelFor(model));
		const pricing = pricingOf(model, level);
		const tags = model.tags?.filter((tag) => !(tag === 'free' && isFree(pricing) && priceDisplay !== 'none'));
		return (
			<CommandItem
				key={`${section}::${model.id}`}
				value={`${section}::${model.id}`}
				data-model-value={`${section}::${model.id}`}
				keywords={[model.name, model.provider, ...(model.levels?.map((entry) => entry.label) ?? []), ...(model.tags ?? [])]}
				disabled={model.disabled}
				onSelect={() => choose(model)}
				className="h-9 gap-2 rounded-sm pointer-coarse:h-11"
			>
				<ModelGlyph model={model} />
				<span className="flex min-w-0 flex-1 items-baseline gap-1.5">
					<span className="truncate text-foreground">{model.name}</span>
					{level ? <span className="shrink truncate text-muted-foreground">{level.label}</span> : null}
					{tags?.map((tag) => <Tag key={tag} tag={tag} />)}
				</span>
				<span className="flex min-w-14 shrink-0 justify-end text-muted-foreground">{trailing(model, pricing)}</span>
				<Check
					aria-hidden="true"
					className={cn('size-3.5 shrink-0 text-foreground', model.id === value.modelId ? 'opacity-100' : 'opacity-0')}
				/>
			</CommandItem>
		);
	};

	const visible = query ? sections.all : [...sections.browsing, ...sections.all];

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setQuery('');
					setPendingLevels({});
					// Open on the current model, so its card is the first one shown.
					const home = [...sections.browsing, ...sections.all].find((section) =>
						section.items.some((model) => model.id === value.modelId),
					);
					if (home) setHighlighted(`${home.id}::${value.modelId}`);
				}
			}}
		>
			<PopoverTrigger
				aria-label={selected ? `${label}: ${selected.name}${selectedLevel ? `, ${selectedLevel.label}` : ''}` : label}
				disabled={disabled}
				onClick={(event) => event.stopPropagation()}
				className={cn(
					'flex h-8 max-w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] text-foreground outline-none',
					'hover:bg-overlay-hover focus-visible:ring-[3px] focus-visible:ring-ring/50 data-popup-open:bg-overlay-hover',
					'transition-transform duration-(--duration-fast) motion-safe:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-64',
					triggerClassName,
				)}
			>
				{selected ? <ModelGlyph model={selected} /> : null}
				<span className="truncate">{selected?.name ?? 'Choose a model'}</span>
				{selectedLevel ? <span className="truncate text-muted-foreground">{selectedLevel.label}</span> : null}
				<ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent
				side={side}
				align={align}
				className={cn('relative w-[min(22rem,calc(100vw-1.5rem))] p-0', contentClassName)}
			>
				<div
					ref={contentRef}
					onPointerMove={(event) => {
						trail.current = [...trail.current.slice(-3), { x: event.clientX, y: event.clientY }];
					}}
				>
					<Command
						value={highlighted}
						onValueChange={setHighlighted}
						onKeyDown={onKeyDown}
						loop
						className="rounded-[inherit]"
					>
						<div className="relative border-b border-border">
							<CommandInput value={query} onValueChange={setQuery} placeholder="Search models" className="pr-9" />
							{canTogglePrice ? (
								<Tooltip>
									<TooltipTrigger
										render={
											<button
												type="button"
												aria-label="Show prices per million tokens"
												aria-pressed={priceDisplay === 'price'}
												onClick={() => setPriceDisplay((current) => (current === 'price' ? 'meter' : 'price'))}
												className={cn(
													'absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
													priceDisplay === 'price' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
												)}
											>
												<CircleDollarSign aria-hidden="true" className="size-4" />
											</button>
										}
									/>
									<TooltipContent>{priceDisplay === 'price' ? 'Show relative cost' : 'Show prices per 1M tokens'}</TooltipContent>
								</Tooltip>
							) : null}
						</div>
						<CommandList className="h-[min(20rem,50vh)] max-h-none p-1 not-empty:p-1" onScroll={placePanel}>
							<CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No models matched</CommandEmpty>
							{visible.map((section) => (
								<CommandGroup key={section.id} heading={section.label}>
									{section.items.map((model) => renderItem(model, section.id))}
								</CommandGroup>
							))}
						</CommandList>
					</Command>
				</div>
				{detailModel ? (
					<div
						ref={panelRef}
						data-slot="model-selector-details"
						onPointerEnter={() => {
							// Arriving at the card keeps its model and moves the row highlight back to it.
							window.clearTimeout(intentTimer.current);
							if (active && active !== highlighted) setHighlighted(active);
						}}
						style={panel.side === 'below' ? undefined : { top: panel.top }}
						className={cn(
							panel.side === 'below'
								? 'border-t border-border'
								: cn(
										'absolute w-64 rounded-lg border bg-popover text-popover-foreground shadow-lg',
										panel.side === 'right' ? 'left-full ml-1.5' : 'right-full mr-1.5',
									),
						)}
					>
						<ModelDetails
							model={detailModel}
							levelId={levelFor(detailModel)}
							onPickLevel={(levelId) => {
								setPendingLevels((current) => ({ ...current, [detailModel.id]: levelId }));
								choose(detailModel, levelId);
							}}
						/>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

export { ModelSelector, CostBlocks };
export type { AiModel, AiModelLevel, AiModelPricing, AiModelTag, ModelSelection, ModelSelectorProps };
