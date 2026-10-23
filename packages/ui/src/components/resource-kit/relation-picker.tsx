'use client';

import { CircleAlertIcon } from 'lucide-react';
import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { useDebounce } from '../../lib/use-debounce';
import { cn } from '../../lib/utils';
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxStatus,
	ComboboxValue,
} from '../combobox';
import { Spinner } from '../spinner';
import { focusRingClass } from '../workspace-kit/primitives';
import { useResourceDefinition } from './context';
import { inSentence, recordId } from './fields';
import { errorMessage } from './form-values';
import { useRecordLabels, useRowTitles } from './labels';
import { queryFailure, useResourceList } from './queries';
import type { ListQuery, ResourceRef } from './types';

/** One choosable record: its id and the text that names it. */
export type RelationOption = { id: string; label: string };

type RelationPickerBaseProps = {
	/** The target resource the picker searches. */
	resource: ResourceRef;
	/** Field on the target that labels a record; defaults to its `titleField`. */
	labelField?: string;
	/** Records fetched per search. */
	limit?: number;
	id?: string;
	placeholder?: string;
	disabled?: boolean;
	invalid?: boolean;
	'aria-describedby'?: string;
	className?: string;
};

export type RelationPickerProps = RelationPickerBaseProps &
	(
		| { multiple?: false; value: string | null; onChange: (value: string | null) => void }
		| { multiple: true; value: readonly string[]; onChange: (value: string[]) => void }
	);

/**
 * Picks related records by searching the target resource as you type
 * (`source.list({ search })`). Single mode holds one id; `multiple` holds a set
 * of ids for a many-to-many field. Selected labels load through `get` once and
 * stay cached.
 */
export function RelationPicker(props: RelationPickerProps) {
	const { resource: resourceRef, labelField, limit = 20, id, placeholder, disabled, invalid, className } = props;
	const target = useResourceDefinition(resourceRef);
	const describedBy = props['aria-describedby'];
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState('');
	const debounced = useDebounce(search.trim(), 250);

	// Hosts often pass a fresh array; key the selection by its contents so labels and items stay stable.
	const selectionKey = props.multiple ? props.value.join('\u0000') : (props.value ?? '');
	const selectedIds = React.useMemo(() => (selectionKey ? selectionKey.split('\u0000') : []), [selectionKey]);
	const { labels, missing } = useRecordLabels(target, selectedIds, labelField);

	// A target without search fields is searched among the loaded records instead of by the source.
	const searchable = (target.searchFields?.length ?? 0) > 0;
	const [shown, setShown] = React.useState(limit);
	const [lastSearch, setLastSearch] = React.useState(debounced);
	if (lastSearch !== debounced) {
		setLastSearch(debounced);
		setShown(limit);
	}
	const query: ListQuery = { search: searchable ? debounced || undefined : undefined, sort: target.defaultSort, offset: 0, limit: shown };
	const results = useResourceList(target, query, { enabled: open });

	// Base UI resets the typed text whenever the selected value changes identity, so an option keeps one object per id and label.
	const optionCache = React.useRef(new Map<string, RelationOption>());
	const stableOption = React.useCallback((optionId: string, label: string) => {
		const cached = optionCache.current.get(optionId);
		if (cached?.label === label) return cached;
		const option = { id: optionId, label };
		optionCache.current.set(optionId, option);
		return option;
	}, []);
	const rows = results.data?.rows;
	const titleOf = useRowTitles(target, rows ?? [], labelField);
	const titles = (rows ?? []).map((row) => titleOf(row) ?? '…');
	const titlesKey = titles.join('\u0000');
	const localFilter = searchable ? '' : debounced.toLocaleLowerCase();
	const found = React.useMemo<RelationOption[]>(
		() =>
			(rows ?? [])
				.map((row, index) => stableOption(recordId(target, row), titles[index]!))
				.filter((option) => !localFilter || option.label.toLocaleLowerCase().includes(localFilter)),
		// The titles are read through `titlesKey`, so a new array with the same labels keeps the same options.
		[rows, titlesKey, target, stableOption, localFilter],
	);
	const more = (results.data?.totalCount ?? 0) - (rows?.length ?? 0);
	const selected = React.useMemo<RelationOption[]>(
		() =>
			selectedIds.map((selectedId) =>
				stableOption(selectedId, labels.get(selectedId) ?? found.find((option) => option.id === selectedId)?.label ?? (missing.has(selectedId) ? 'Unavailable' : '…')),
			),
		[selectedIds, labels, missing, found, stableOption],
	);
	// Selected records stay in the list even when the current search does not return them.
	const items = React.useMemo(() => [...found, ...selected.filter((option) => !found.some((candidate) => candidate.id === option.id))], [found, selected]);

	const failure = queryFailure(results);
	const searching = results.isFetching && !failure;
	const status = failure ? (
		<span role="alert" className="flex items-start gap-2 font-normal text-destructive [overflow-wrap:anywhere]">
			<CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
			{`Couldn’t load ${inSentence(target.label)}: ${errorMessage(failure)}`}
		</span>
	) : searching ? (
		<span className="flex items-center gap-2">
			<Spinner decorative className="size-3.5" />
			Searching…
		</span>
	) : null;
	const shared = {
		items,
		filter: null,
		open,
		onOpenChange: (next: boolean) => {
			setOpen(next);
			if (!next) setSearch('');
		},
		onInputValueChange: (next: string, details: { reason: string }) => {
			if (details.reason === 'input-change' || details.reason === 'input-clear') setSearch(next);
		},
		itemToStringLabel: (option: RelationOption) => option.label,
		isItemEqualToValue: (option: RelationOption, value: RelationOption) => option.id === value.id,
		disabled,
	};
	const popup = (
		<ComboboxPopup aria-busy={searching || undefined}>
			<ComboboxStatus>{status}</ComboboxStatus>
			<ComboboxEmpty>{searching || failure ? null : debounced ? `No ${inSentence(target.label)} match “${debounced}”.` : `No ${inSentence(target.label)} yet.`}</ComboboxEmpty>
			<ComboboxList>
				{(option: RelationOption) => (
					<ComboboxItem key={option.id} value={option}>
						<span dir="auto" className="block truncate" title={option.label}>
							{option.label}
						</span>
					</ComboboxItem>
				)}
			</ComboboxList>
			{more > 0 && !failure ? (
				<button
					type="button"
					// Keeps focus in the input so the list stays open.
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => setShown((count) => count + limit)}
					className={cn('mx-1 mb-1 cursor-pointer rounded-sm px-2 py-1.5 text-start text-xs text-muted-foreground tabular-nums hover:bg-accent hover:text-foreground', focusRingClass)}
				>
					{results.isFetching ? 'Loading…' : `Show ${formatCount(Math.min(limit, more))} more${more > limit ? ` (${formatCount(more)} left)` : ''}`}
				</button>
			) : null}
		</ComboboxPopup>
	);
	const fallbackPlaceholder = placeholder ?? `Search ${inSentence(target.label)}…`;

	if (props.multiple) {
		const onChange = props.onChange;
		return (
			<Combobox<RelationOption, true>
				{...shared}
				multiple
				value={selected}
				onValueChange={(next, details) => {
					// Escape backs out of a form sheet; it never clears a choice there.
					if (details.reason !== 'escape-key') onChange(next.map((option) => option.id));
				}}
			>
				<ComboboxChips aria-invalid={invalid || undefined} className={className}>
					<ComboboxValue>
						{(value: RelationOption[]) => (
							<>
								{value.map((option) => (
									<ComboboxChip key={option.id} aria-label={option.label}>
										{option.label}
									</ComboboxChip>
								))}
								<ComboboxInput id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} placeholder={value.length > 0 ? undefined : fallbackPlaceholder} />
							</>
						)}
					</ComboboxValue>
				</ComboboxChips>
				{popup}
			</Combobox>
		);
	}

	const onChange = props.onChange;
	return (
		<Combobox<RelationOption>
			{...shared}
			value={selected[0] ?? null}
			onValueChange={(next, details) => {
				if (details.reason !== 'escape-key') onChange(next?.id ?? null);
			}}
		>
			<ComboboxInput
				id={id}
				aria-describedby={describedBy}
				aria-invalid={invalid || undefined}
				placeholder={fallbackPlaceholder}
				showClear={Boolean(selected[0])}
				className={className}
			/>
			{popup}
		</Combobox>
	);
}
