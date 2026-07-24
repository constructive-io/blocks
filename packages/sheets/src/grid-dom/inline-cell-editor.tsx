'use client';

// Inline (in-cell) editor — a bare single-line <input> rendered DIRECTLY inside the
// cell for the SIMPLE text-representable types (text-like + number-like). The
// non-overlay counterpart of the portal editors: there is no card, no Save button and
// no React portal — the input fills the cell (`absolute inset-0`) and overlays the
// cell view while editing. Routed here by `resolveEditIntent` → `{ mode: 'inline-edit' }`
// (url/inet/json/date/relation/… keep their specialised overlay editors).
//
// COMMIT MODEL (mirrors the overlay text/number editors, minus the chrome):
//   • Enter / blur (click-away)  → commit. Escape → cancel. A numeric field that does
//     not parse blocks Enter (stay editing) and discards on blur (never clobbers the
//     value with garbage) — same guard as the overlay NumberEditor.
//   • `doneRef` makes commit/cancel idempotent: the explicit path returns focus to the
//     grid root (so keyboard nav resumes), and the blur THAT focus shift triggers is
//     short-circuited so it never double-fires.
//   • Pointer events stopPropagation so selecting text with the mouse does not trip the
//     cell's click-to-activate / range-drag handlers on the host wrapper.

import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../utils/cn';

interface InlineCellEditorProps {
	/** The cell's committed value — seeds the input unless `initialText` overrides (type-to-edit). */
	value: unknown;
	/** Type-to-edit seed (OVERWRITE): a printable char that opened the editor replaces the value. */
	initialText?: string;
	/** Number-like cell — parse to a finite number (or null) on commit and right-align like the view. */
	numeric?: boolean;
	/** Commit the next raw value (string, or number|null when numeric). */
	onCommit: (next: unknown) => void;
	/** Discard — Escape, or an unparseable numeric field on blur. */
	onCancel: () => void;
}

/** Seed the input text from the raw value (anything stringifiable), else ''. */
function seedText(value: unknown): string {
	if (value === null || value === undefined) return '';
	return String(value);
}

/** Parse numeric input: '' → null (a valid clear); else a finite number, or `ok:false` for garbage. */
function parseNumeric(text: string): { ok: boolean; value: number | null } {
	const trimmed = text.trim();
	if (trimmed === '') return { ok: true, value: null };
	const n = Number(trimmed);
	return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, value: null };
}

export function InlineCellEditor({ value, initialText, numeric, onCommit, onCancel }: InlineCellEditorProps) {
	const [text, setText] = useState(() => (initialText != null ? initialText : seedText(value)));
	const inputRef = useRef<HTMLInputElement | null>(null);
	// The grid root (role=grid, tabIndex=0) — focus returns here on commit/cancel so arrow-key
	// nav resumes (the input unmounts and would otherwise drop focus to <body>). Captured once.
	const gridRef = useRef<HTMLElement | null>(null);
	// Guards commit/cancel idempotency: set before the explicit focus-return so the resulting
	// blur skips its commit-on-blur (no double commit, no commit-after-Escape).
	const doneRef = useRef(false);

	useLayoutEffect(() => {
		const el = inputRef.current;
		gridRef.current = (el?.closest('[role="grid"]') as HTMLElement | null) ?? null;
		// Seeded from the cell value (Enter / F2 / double-click) → select all so the first keystroke
		// replaces. A type-to-edit seed already IS the replacement, so leave the caret at the end.
		if (el && initialText == null) el.select();
	}, [initialText]);

	function finish(commit: boolean) {
		if (doneRef.current) return;
		doneRef.current = true;
		// Return focus to the grid BEFORE the input unmounts; doneRef makes the blur a no-op.
		gridRef.current?.focus();
		if (!commit) {
			onCancel();
			return;
		}
		if (numeric) {
			const parsed = parseNumeric(text);
			if (!parsed.ok) {
				onCancel(); // unparseable on commit-by-blur → discard rather than clobber
				return;
			}
			onCommit(parsed.value);
			return;
		}
		onCommit(text);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			// Unparseable number on Enter → stay editing (mirror the overlay editor's Enter no-op).
			if (numeric && !parseNumeric(text).ok) return;
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

	return (
		<input
			ref={inputRef}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={() => finish(true)}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			inputMode={numeric ? 'decimal' : undefined}
			spellCheck={false}
			data-slot='inline-cell-editor'
			className={cn(
				'bg-background ring-primary absolute inset-0 h-full w-full px-3 font-sans text-sm outline-none ring-2 ring-inset',
				numeric && 'text-right tabular-nums',
			)}
			autoFocus
		/>
	);
}
