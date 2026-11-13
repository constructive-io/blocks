'use client';

// Inline (in-cell) editor — a bare input rendered DIRECTLY inside the cell for the
// SIMPLE text-representable types (text-like + number-like). The non-overlay
// counterpart of the portal editors: there is no card, no Save button and no React
// portal — the input fills the cell (`absolute inset-0`) and overlays the cell view
// while editing. Routed here by `resolveEditIntent` → `{ mode: 'inline-edit' }`.
//
// VALUE RULES: with a table-model column, the text is parsed by the column's rules
// (`parseColumnInput`): whole numbers and exact decimals stay exact strings, a length
// limit is enforced, and a value that does not fit shows its reason under the cell and
// is never committed. Without a column (a host grid without a model) a numeric cell
// parses to a finite number and anything else commits as text.
//
// MULTI-LINE TEXT: a value with line breaks edits in a textarea anchored on the cell
// and taller than it; Shift+Enter adds a line break. A single-line <input> would drop
// the breaks. The textarea and the "does not fit" notice are portalled (fixed, at the
// cell's rect) because the next row paints over anything that overflows the cell.
//
// COMMIT MODEL (mirrors the overlay text/number editors, minus the chrome):
//   • Enter / blur (click-away) → commit. Escape → cancel. A value that does not fit
//     blocks Enter (stay editing, reason shown) and is discarded on blur, with the
//     reason reported through `onReject` — never written as garbage.
//   • `doneRef` makes commit/cancel idempotent: the explicit path returns focus to the
//     grid root (so keyboard nav resumes), and the blur THAT focus shift triggers is
//     short-circuited so it never double-fires.
//   • Pointer events stopPropagation so selecting text with the mouse does not trip the
//     cell's click-to-activate / range-drag handlers on the host wrapper.

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ColumnModel } from '@constructive-io/data';

import { parseColumnInput, type ColumnInputResult } from '../cell-types/column-value';
import { cn } from '../utils/cn';

interface InlineCellEditorProps {
	/** Accessible name derived from the owning column. */
	ariaLabel: string;
	/** The cell's committed value — seeds the input unless `initialText` overrides (type-to-edit). */
	value: unknown;
	/** Type-to-edit seed (OVERWRITE): a printable char that opened the editor replaces the value. */
	initialText?: string;
	/** Number-like cell — right-align like the view (and, without a column, parse to a number). */
	numeric?: boolean;
	/** The table-model column: its rules parse and check the text. */
	column?: ColumnModel | null;
	/** Commit the next value. */
	onCommit: (next: unknown) => void;
	/** Discard — Escape, or a value that does not fit on blur. */
	onCancel: () => void;
	/** A value that did not fit was discarded on blur; `reason` says why. */
	onReject?: (reason: string) => void;
}

/** Seed the input text from the raw value (anything stringifiable), else ''. */
function seedText(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

/** Parse without a column: '' → null (a valid clear); else a finite number, or a refusal. */
function parseLegacy(text: string, numeric: boolean): ColumnInputResult {
	if (!numeric) return { ok: true, value: text };
	const trimmed = text.trim();
	if (trimmed === '') return { ok: true, value: null };
	const n = Number(trimmed);
	return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: 'Enter a number.' };
}

export function InlineCellEditor({ ariaLabel, value, initialText, numeric, column, onCommit, onCancel, onReject }: InlineCellEditorProps) {
	const [text, setText] = useState(() => (initialText != null ? initialText : seedText(value)));
	const [multiline, setMultiline] = useState(() => /[\r\n]/.test(initialText ?? seedText(value)));
	const [error, setError] = useState<string | null>(null);
	const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	// The grid root (role=grid, tabIndex=0) — focus returns here on commit/cancel so arrow-key
	// nav resumes (the input unmounts and would otherwise drop focus to <body>). Captured once.
	const gridRef = useRef<HTMLElement | null>(null);
	// Guards commit/cancel idempotency: set before the explicit focus-return so the resulting
	// blur skips its commit-on-blur (no double commit, no commit-after-Escape).
	const doneRef = useRef(false);
	// Set when Shift+Enter switches to the textarea, so the remount keeps the caret at the end.
	const switchedRef = useRef(false);
	// Fills the cell; its rect anchors the portalled textarea and notice.
	const anchorRef = useRef<HTMLSpanElement | null>(null);
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
	const needsAnchor = multiline || error !== null;

	useLayoutEffect(() => {
		gridRef.current = (anchorRef.current?.closest('[role="grid"]') as HTMLElement | null) ?? null;
		if (needsAnchor) setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);
	}, [needsAnchor]);

	const fieldMounted = !multiline || anchorRect !== null;
	useLayoutEffect(() => {
		const el = fieldRef.current;
		if (!el || !fieldMounted) return;
		el.focus();
		// Seeded from the cell value (Enter / F2 / double-click) → select all so the first keystroke
		// replaces. A type-to-edit seed already IS the replacement, so leave the caret at the end.
		if (initialText == null && !switchedRef.current) el.select();
		else el.setSelectionRange(el.value.length, el.value.length);
	}, [initialText, multiline, fieldMounted]);

	const parse = (next: string): ColumnInputResult =>
		column ? parseColumnInput(column, next, { fromText: true }) : parseLegacy(next, Boolean(numeric));

	function finish(commit: boolean) {
		if (doneRef.current) return;
		doneRef.current = true;
		// Return focus to the grid BEFORE the input unmounts; doneRef makes the blur a no-op.
		gridRef.current?.focus();
		if (!commit) {
			onCancel();
			return;
		}
		const parsed = parse(text);
		if (parsed.ok === false) {
			onCancel(); // does not fit on commit-by-blur → discard rather than clobber
			onReject?.(parsed.reason);
			return;
		}
		onCommit(parsed.value);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
		if (e.key === 'Enter' && e.shiftKey && !numeric) {
			if (!multiline) {
				e.preventDefault();
				const el = e.currentTarget;
				const start = el.selectionStart ?? text.length;
				const end = el.selectionEnd ?? text.length;
				switchedRef.current = true;
				setText(`${text.slice(0, start)}\n${text.slice(end)}`);
				setMultiline(true);
			}
			return; // a textarea inserts the line break itself
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			// A value that does not fit on Enter → stay editing and say why.
			const parsed = parse(text);
			if (parsed.ok === false) {
				setError(parsed.reason);
				return;
			}
			finish(true);
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			finish(false);
		}
		// Other keys (incl. arrows / Home / End) act on the input text. They bubble to the grid
		// root, which ignores keys while an editor is active, so they never move the grid cursor.
	}

	const shared = {
		'aria-label': ariaLabel,
		'aria-invalid': error ? true : undefined,
		value: text,
		onKeyDown: handleKeyDown,
		onBlur: () => finish(true),
		onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
		onClick: (e: React.MouseEvent) => e.stopPropagation(),
		onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
		spellCheck: false,
	};

	const portalHost = typeof document !== 'undefined' ? (document.getElementById('portal-root') ?? document.body) : null;
	const floating = (rect: DOMRect, top: number): React.CSSProperties => ({
		position: 'fixed',
		left: rect.left,
		top,
		zIndex: 'var(--z-layer-floating)',
		pointerEvents: 'auto',
	});

	return (
		<>
			<span ref={anchorRef} aria-hidden className='pointer-events-none absolute inset-0' />
			{multiline ? (
				anchorRect && portalHost
					? createPortal(
						<textarea
							{...shared}
							data-slot='inline-cell-editor'
							ref={(node) => {
								fieldRef.current = node;
							}}
							rows={4}
							onChange={(e) => {
								setError(null);
								setText(e.target.value);
							}}
							style={{ ...floating(anchorRect, anchorRect.top), width: Math.max(anchorRect.width, 280) }}
							className='bg-background ring-primary min-h-[6rem] resize-y rounded-sm px-3 py-2 font-sans text-sm shadow-lg outline-none ring-2 ring-inset'
						/>,
						portalHost,
					)
					: null
			) : (
				<input
					{...shared}
					data-slot='inline-cell-editor'
					ref={(node) => {
						fieldRef.current = node;
					}}
					onChange={(e) => {
						setError(null);
						setText(e.target.value);
					}}
					inputMode={numeric ? 'decimal' : undefined}
					className={cn(
						'bg-background ring-primary absolute inset-0 h-full w-full px-3 font-sans text-sm outline-none ring-2 ring-inset',
						numeric && 'text-right tabular-nums',
						error && 'ring-destructive',
					)}
				/>
			)}
			{error && anchorRect && portalHost
				? createPortal(
					<p
						role='alert'
						style={floating(anchorRect, anchorRect.bottom + 4)}
						className='bg-popover text-destructive max-w-xs rounded-md border px-2 py-1 text-xs shadow-md'
					>
						{error}
					</p>,
					portalHost,
				)
				: null}
		</>
	);
}
