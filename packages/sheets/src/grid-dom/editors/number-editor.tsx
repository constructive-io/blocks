'use client';

// Native number editor — value-native single-line numeric <input> for the
// NUMBER_TYPES family (number/integer/smallint/decimal/currency/percentage/
// rating). Sibling of TextEditor: dependency-light (no glide cell types), the
// OverlayManager hosts the focus-trap + error-guard + width sizing, so this is
// just the input + a Save affordance. Glide-free by construction.
//
// VALUE editor (no server mutation): seeds from EditorProps.value, parses the
// text on commit and pushes a `number` (or `null` for empty) down the glide
// value-commit path (onCommit). Non-numeric text is rejected — Save is disabled
// and Enter is a no-op while the field cannot parse — so the last committed
// value is never clobbered by garbage.

import { useRef, useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { OVERLAY_SM } from '../../grid/editors/overlay-presets';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

/** Seed the input text from the raw value (number or numeric string), else ''. */
function seedText(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
	return String(value);
}

/** Parse the input text to the committed value: '' -> null, else a finite number or NaN. */
function parseValue(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	return Number(trimmed);
}

export function NumberEditorDom({ value, initialText, onCommit, onCancel }: EditorProps) {
	// Type-to-edit seed (OVERWRITE): a typed printable char replaces the cell value; the
	// parse/canSave guard below still rejects non-numeric content (e.g. a typed letter).
	const [text, setText] = useState(() => (initialText != null ? initialText : seedText(value)));
	// COMMIT-ON-BLUR GUARD (Stage B): an Escape-cancel also blurs the input as it unmounts —
	// `escapedRef` tells the blur handler to skip its commit so Escape never double-fires.
	const escapedRef = useRef(false);

	const parsed = parseValue(text);
	// Save is blocked only when the field has content that does not parse to a
	// finite number; an empty field is a valid `null` commit.
	const canSave = parsed === null || Number.isFinite(parsed);

	function commit() {
		if (!canSave) return;
		onCommit(parsed);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			escapedRef.current = true;
			onCancel();
		}
	}

	// Commit-on-click-away: commit only when focus genuinely leaves the whole overlay (the
	// focus-trap `[role="dialog"]`) — testing the element focus actually moved to (relatedTarget,
	// else post-blur document.activeElement) against the dialog root, NOT the slot. This avoids a
	// spurious commit on the open-time focus churn (focus momentarily lands on the trap container,
	// inside the dialog), while the in-overlay Save button (focus stays inside) does NOT
	// double-commit. Non-numeric garbage is still rejected (`commit()` no-ops when !canSave,
	// mirroring the Enter no-op). Skipped right after an Escape-cancel.
	function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
		if (escapedRef.current) return;
		// Containment root: the focus-trap dialog in production (so the trap container counts as
		// "inside"); the editor slot when rendered bare (tests). Use whichever encloses the input.
		const root = e.currentTarget.closest('[role="dialog"]') ?? e.currentTarget.closest('[data-slot="number-editor"]');
		const landed = (e.relatedTarget as Node | null) ?? document.activeElement;
		if (root && landed && root.contains(landed)) return;
		commit();
	}

	return (
		<div
			data-slot='number-editor'
			className={cn('bg-popover flex items-center gap-2 rounded-lg border p-2.5 shadow-lg', OVERLAY_SM)}
		>
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				inputMode='decimal'
				spellCheck={false}
				className='bg-muted/40 border-border/40 min-w-0 flex-1 rounded-md border px-2.5 py-1.5 font-sans text-sm outline-none'
				autoFocus
			/>
			<Button onClick={commit} disabled={!canSave} size='xs' variant='default' className='shrink-0'>
				Save
			</Button>
		</div>
	);
}

// Opt into commit-on-click-away (Stage B) — see TextEditor.commitsOnBlur. The OverlayManager
// reads this to pick `dismissMode='commit'` (blur → onBlur commits) instead of cancelling.
NumberEditorDom.commitsOnBlur = true as const;
