'use client';

// Option picker for choice columns (enums and text with an allowed-values list).
// Shows each option's label and writes its wire value. A single choice commits on
// pick; a list of choices toggles options and commits with Save. A long list gets a
// search box. A stored value that is not in the option list still shows, so the user
// can see it and remove it. Keyboard: arrows move, Enter picks, Escape cancels.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import type { ColumnOption } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';

import { EditorHeader, modifierKeyLabel, VALUE_REQUIRED_REASON } from '../../grid/editors/editor-frame';
import { fieldLabel } from '../../cell-types/field-label';
import { OVERLAY_SM } from '../../grid/editors/overlay-presets';
import { choiceLabel } from '../../cell-types/column-value';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

/** Option lists longer than this get a search box. */
const SEARCH_THRESHOLD = 7;
/** The footer buttons sit 5px inside the editor's 10px corners, like the options. */
const FOOTER_BUTTON_RADIUS = 'rounded-[calc(var(--radius-lg)-5px)] before:rounded-[calc(var(--radius-lg)-6px)]';

function initialSelection(value: unknown, multiple: boolean): string[] {
	if (value === null || value === undefined) return [];
	const values = multiple && Array.isArray(value) ? value : [value];
	return values.filter((entry): entry is string => typeof entry === 'string');
}

export function SelectEditorDom({ value, column, colKey, cell, onCommit }: EditorProps) {
	const multiple = column ? column.value.isArray : cell.meta?.cellType === 'multi-select';
	const options = useMemo<readonly ColumnOption[]>(() => column?.value.options ?? [], [column]);
	const [selected, setSelected] = useState<string[]>(() => initialSelection(value, multiple));
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const listRef = useRef<HTMLUListElement | null>(null);

	const searchable = options.length > SEARCH_THRESHOLD;
	// Stored values that are not options stay visible so they can be seen and removed.
	const unknownSelected = selected.filter((entry) => !options.some((option) => option.value === entry));
	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const all: ColumnOption[] = [...unknownSelected.map((entry) => ({ value: entry, label: entry })), ...options];
		if (!needle) return all;
		return all.filter((option) => option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle));
	}, [options, query, unknownSelected]);

	// Without a search box the list itself takes focus, after the focus trap's own pass.
	useEffect(() => {
		if (!searchable) listRef.current?.focus();
	}, [searchable]);

	const label = fieldLabel(column?.name ?? colKey);
	const clampedActive = Math.min(active, Math.max(visible.length - 1, 0));

	function pick(option: ColumnOption) {
		if (!multiple) {
			onCommit(option.value);
			return;
		}
		setSelected((current) =>
			current.includes(option.value) ? current.filter((entry) => entry !== option.value) : [...current, option.value],
		);
	}

	function save() {
		onCommit(multiple ? selected : selected[0] ?? null);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			setActive((current) => (visible.length ? (Math.min(current, visible.length - 1) + step + visible.length) % visible.length : 0));
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			if (multiple && (e.metaKey || e.ctrlKey)) {
				save();
				return;
			}
			const option = visible[clampedActive];
			if (option) pick(option);
		}
		// Escape is handled by the overlay's focus trap (onCancel).
	}

	return (
		<div
			data-slot='select-editor'
			// The options, the search field and the footer buttons sit 5px inside the 10px corners
			// (1px border + 4px padding), so their radius is 10px - 5px and the curves stay parallel.
			className={cn('bg-popover flex flex-col gap-1 rounded-lg border p-1 shadow-lg', OVERLAY_SM)}
			onKeyDown={handleKeyDown}
		>
			{/* The field's name, like every value editor's title; inset to line up with the options' text. */}
			<EditorHeader title={label} className='px-2 pt-1' />
			{searchable ? (
				<input
					aria-label={`Search ${label} options`}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setActive(0);
					}}
					placeholder='Search options'
					spellCheck={false}
					className='bg-muted/40 border-border/40 rounded-[calc(var(--radius-lg)-5px)] border px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/35'
					autoFocus
				/>
			) : null}
			<ul
				ref={listRef}
				role='listbox'
				aria-label={`${label} options`}
				aria-multiselectable={multiple || undefined}
				aria-activedescendant={visible[clampedActive] ? `select-option-${clampedActive}` : undefined}
				tabIndex={searchable ? -1 : 0}
				className='max-h-64 overflow-y-auto outline-none'
			>
				{visible.length === 0 ? (
					<li className='text-muted-foreground px-2 py-1.5 text-sm'>No matching options</li>
				) : (
					visible.map((option, index) => {
						const isSelected = selected.includes(option.value);
						const isUnknown = !options.some((entry) => entry.value === option.value);
						return (
							<li
								key={option.value}
								id={`select-option-${index}`}
								role='option'
								aria-selected={isSelected}
								onMouseEnter={() => setActive(index)}
								onClick={() => pick(option)}
								className={cn(
									'flex cursor-pointer items-center justify-between gap-2 rounded-[calc(var(--radius-lg)-5px)] px-2 py-1.5 text-sm',
									index === clampedActive && 'bg-muted',
								)}
							>
								{/* The chip swaps surfaces with the highlighted row (popover on muted), so its shape stays visible. */}
								<span
									className={cn(
										'text-muted-foreground truncate rounded-md px-2 py-0.5 text-xs font-medium',
										index === clampedActive ? 'bg-popover' : 'bg-muted',
									)}
									title={option.label}
								>
									{isUnknown ? choiceLabel(column, option.value) : option.label}
								</span>
								{isUnknown ? <span className='text-muted-foreground text-xs'>Not in the list</span> : null}
								{isSelected ? <Check aria-hidden className='size-4 shrink-0' /> : null}
							</li>
						);
					})
				)}
			</ul>
			{multiple || (column?.nullable && selected.length > 0) ? (
				<div className='-mx-1 flex items-center justify-end gap-2 border-t px-1 pt-1'>
					{/* The value editors' footer: Clear when the column takes no value (a list of choices
					    shows it disabled, with the reason, when it must have one), then Save. */}
					{column?.nullable ? (
						<Button size='xs' variant='ghost' className={FOOTER_BUTTON_RADIUS} onClick={() => onCommit(null)} title='Remove the value'>
							Clear
						</Button>
					) : (
						<Button size='xs' variant='ghost' className={FOOTER_BUTTON_RADIUS} disabled focusableWhenDisabled title={VALUE_REQUIRED_REASON}>
							Clear
						</Button>
					)}
					{multiple ? (
						<Button size='xs' className={FOOTER_BUTTON_RADIUS} onClick={save} title={`Save (${modifierKeyLabel()} Enter)`}>
							Save
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
