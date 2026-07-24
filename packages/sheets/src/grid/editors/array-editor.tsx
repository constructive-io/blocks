import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { XIcon } from 'lucide-react';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

const MAC_UA_RE = /Mac|iPod|iPhone|iPad/;

// Minimal editor component for scalar arrays using tag chips UI
// It works with Glide's provideEditor by emitting a Text cell with JSON string

type Props = {
	value: unknown[];
	onChange: (next: unknown[]) => void;
	onFinished: (next?: unknown[]) => void;
};

function parsePendingItems(input: string): string[] {
	if (!input) return [];
	return input
		.split(/[\n,]/g)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
}

export function mergeArrayEditorValues(list: unknown[], pendingInput: string): unknown[] {
	const pendingItems = parsePendingItems(pendingInput);
	if (!pendingItems.length) return list;
	return [...list, ...pendingItems];
}

export function ArrayEditor({ value, onChange, onFinished }: Props) {
	const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
	const [list, setList] = useState<unknown[]>(items);
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const keyContainerRef = useRef<HTMLDivElement>(null);

	const handleCancel = useCallback(() => onFinished(undefined), [onFinished]);
	const handleSave = useCallback(() => {
		const next = mergeArrayEditorValues(list, input);
		setList(next);
		setInput('');
		onChange(next);
		onFinished(next);
	}, [input, list, onChange, onFinished]);

	const add = useCallback(() => {
		const next = mergeArrayEditorValues(list, input);
		if (next.length === list.length) return;
		setList(next);
		setInput('');
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

	const isMac = typeof navigator !== 'undefined' && MAC_UA_RE.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover ${OVERLAY.sm} rounded-lg border p-2.5 shadow-lg`}
		>
			{/* Key event boundary — native listener prevents Glide from intercepting */}
			<div ref={keyContainerRef}>
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
							<span className='max-w-[180px] truncate'>{String(item)}</span>
							<button
								className='text-muted-foreground/60 hover:bg-muted hover:text-foreground -me-px inline-flex size-4 items-center justify-center rounded-xs transition-colors'
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

				{/* Footer — hints + save */}
				<div className='mt-3 flex items-center justify-between gap-4 border-t px-1 pt-2.5'>
					<div className='text-muted-foreground flex items-center gap-3 text-xs'>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Enter</kbd>
							<span>add</span>
						</span>
						<span className='text-border'>|</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>{modKey}</kbd>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>↵</kbd>
							<span>save</span>
						</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>⌫</kbd>
							<span>remove</span>
						</span>
					</div>
					<Button onClick={handleSave} size='xs' variant='default' className='shrink-0'>
						Save
					</Button>
				</div>
			</div>
		</EditorFocusTrap>
	);
}
