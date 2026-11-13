import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { XIcon } from 'lucide-react';

import { EditorFocusTrap } from './editor-focus-trap';
import { EditorFooter, EditorHeader, editorClear, modifierKeyLabel } from './editor-frame';
import { OVERLAY } from './overlay-presets';


// Minimal editor component for scalar arrays using tag chips UI
// It works with Glide's provideEditor by emitting a Text cell with JSON string

type Props = {
	value: unknown[];
	onChange: (next: unknown[]) => void;
	/** The saved list, null when cleared, or undefined when cancelled. */
	onFinished: (next?: unknown[] | null) => void;
	/** Check the list before it is saved; return the reason it cannot be saved, or null. */
	validate?: (next: unknown[]) => string | null;
	/** The field's readable name, shown as the title. */
	title?: string;
	/** The column takes no value, so Clear is offered. */
	nullable?: boolean;
};

// One item per line: a comma is part of an item ("Smith, Jane"), never a separator.
function parsePendingItems(input: string): string[] {
	if (!input) return [];
	return input
		.split(/\n/g)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
}

export function mergeArrayEditorValues(list: unknown[], pendingInput: string): unknown[] {
	const pendingItems = parsePendingItems(pendingInput);
	if (!pendingItems.length) return list;
	return [...list, ...pendingItems];
}

export function ArrayEditor({ value, onChange, onFinished, validate, title = 'List', nullable = false }: Props) {
	const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
	const [list, setList] = useState<unknown[]>(items);
	const [input, setInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const keyContainerRef = useRef<HTMLDivElement>(null);

	const handleCancel = useCallback(() => onFinished(undefined), [onFinished]);
	const handleSave = useCallback(() => {
		const next = mergeArrayEditorValues(list, input);
		setList(next);
		setInput('');
		const problem = validate?.(next) ?? null;
		setError(problem);
		if (problem) return;
		onChange(next);
		onFinished(next);
	}, [input, list, onChange, onFinished, validate]);

	const add = useCallback(() => {
		const next = mergeArrayEditorValues(list, input);
		if (next.length === list.length) return;
		setList(next);
		setInput('');
		setError(null);
		onChange(next);
	}, [input, list, onChange]);

	const remove = useCallback(
		(idx: number) => {
			const next = list.filter((_, i) => i !== idx);
			setList(next);
			onChange(next);
			// Refocus input after removing a tag
			inputRef.current?.focus();
		},
		[list, onChange],
	);

	// Keep refs to latest callbacks/state so the native handler always has fresh values.
	const actionsRef = useRef({ add, handleSave, remove, handleCancel });
	actionsRef.current = { add, handleSave, remove, handleCancel };
	const stateRef = useRef({ input, listLength: list.length });
	stateRef.current = { input, listLength: list.length };

	// Native DOM keydown listener on a wrapper div.
	// Glide's overlay intercepts Enter/Tab/Escape via React onKeyDown on .gdg-clip-region.
	// React's stopPropagation doesn't reliably prevent this in portal contexts.
	// A native listener fires before React's root delegation, so we handle keys here
	// and stopPropagation to prevent Glide from closing the overlay.
	useEffect(() => {
		const el = keyContainerRef.current;
		if (!el) return;
		const handler = (e: KeyboardEvent) => {
			const { add, handleSave, remove, handleCancel } = actionsRef.current;
			const { input, listLength } = stateRef.current;

			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				handleCancel();
				return;
			}
			if (e.key === 'Backspace' && !input && listLength > 0) {
				e.preventDefault();
				e.stopPropagation();
				remove(listLength - 1);
				return;
			}
			if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				e.stopPropagation();
				add();
				return;
			}
			if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 's' && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				e.stopPropagation();
				handleSave();
				return;
			}
			if (e.key === 'Tab') {
				e.stopPropagation();
			}
		};
		el.addEventListener('keydown', handler);
		return () => el.removeEventListener('keydown', handler);
	}, []);

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover ${OVERLAY.sm} rounded-lg border p-2.5 shadow-lg`}
		>
			{/* Key event boundary — native listener prevents Glide from intercepting */}
			<div ref={keyContainerRef} className='flex flex-col gap-2'>
				<EditorHeader title={title} className='px-1' />
				{/* Unified tag surface — tags and input share one container */}
				<div
					className='flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-2 rounded-md px-1 py-1'
					onClick={() => inputRef.current?.focus()}
				>
					{list.map((item, i) => (
						<Badge
							key={i}
							variant='outline'
							size='sm'
							className='group/tag !animate-none !transition-none gap-0.5 pe-0.5'
						>
							<span className='max-w-[180px] truncate tabular-nums' title={item === null ? 'Empty item' : String(item)}>
								{item === null ? '(empty)' : String(item)}
							</span>
							<button
								className='text-muted-foreground/60 hover:bg-muted hover:text-foreground -me-px inline-flex size-4 items-center justify-center rounded-xs'
								onClick={(e) => {
									e.stopPropagation();
									remove(i);
								}}
								aria-label={`Remove ${String(item)}`}
								tabIndex={-1}
							>
								<XIcon className='size-3' />
							</button>
						</Badge>
					))}

					<input
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder={list.length === 0 ? 'Type and press Enter...' : 'Add more...'}
						className='placeholder:text-muted-foreground/50 min-w-[80px] flex-1 bg-transparent py-0.5 text-sm outline-none'
					/>
				</div>

				{error ? (
					<p role='alert' className='text-destructive px-1 text-xs'>
						{error}
					</p>
				) : null}

				<EditorFooter
					className='px-1'
					onSave={handleSave}
					saveShortcut={`${modifierKeyLabel()} Enter`}
					clear={editorClear(nullable, () => onFinished(null))}
				/>
			</div>
		</EditorFocusTrap>
	);
}
