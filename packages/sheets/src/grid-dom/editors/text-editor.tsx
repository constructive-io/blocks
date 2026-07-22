'use client';

// Native text editor — value-native single-line <input> for text/varchar cells.
// The Phase-4 analogue of glide's built-in text overlay (text/varchar return
// `undefined` from the glide factory to use it). Dependency-light: no UI-package
// Button, no glide types. Commit/cancel flow through EditorProps; the
// OverlayManager already hosts the focus-trap + error-guard + width sizing, so
// this is just the input + a Save affordance.

import { useRef, useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { OVERLAY_SM } from '../../grid/editors/overlay-presets';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

export function TextEditor({ value, initialText, onCommit, onCancel }: EditorProps) {
	// Type-to-edit seed (OVERWRITE): when opened by typing a printable char, start from that
	// char instead of the cell value; otherwise seed from the cell value as usual.
	const [text, setText] = useState(() => (initialText != null ? initialText : String(value ?? '')));
	// COMMIT-ON-BLUR GUARD (Stage B): Escape cancels WITHOUT committing, but the cancel also
	// blurs the input as it unmounts — `escapedRef` tells the blur handler to skip its commit
	// so an Escape never double-fires as a commit.
	const escapedRef = useRef(false);

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onCommit(text);
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			escapedRef.current = true;
			onCancel();
		}
	}

	// Commit-on-click-away: commit the current value only when focus genuinely leaves the whole
	// overlay (the focus-trap `[role="dialog"]`). We test the element focus actually MOVED TO —
	// `e.relatedTarget` when set, else the post-blur `document.activeElement` — against the
	// dialog root, NOT the text-editor slot. This is what distinguishes a real click-away (focus
	// lands on body / an outside element) from the open-time focus churn the EditorFocusTrap
	// causes (focus momentarily lands on the trap CONTAINER, which is inside the dialog but
	// outside the slot — committing on that would fire a spurious commit on mount). Clicking the
	// in-overlay Save button keeps focus inside the dialog, so it does NOT double-commit either.
	// Skipped right after an Escape-cancel (escapedRef).
	function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
		if (escapedRef.current) return;
		// Containment root: the focus-trap dialog in production (so the trap container counts as
		// "inside"); the editor slot when rendered bare (tests). Use whichever encloses the input.
		const root = e.currentTarget.closest('[role="dialog"]') ?? e.currentTarget.closest('[data-slot="text-editor"]');
		const landed = (e.relatedTarget as Node | null) ?? document.activeElement;
		if (root && landed && root.contains(landed)) return;
		onCommit(text);
	}

	return (
		<div data-slot='text-editor' className={cn('bg-popover flex items-center gap-2 rounded-lg border p-2.5 shadow-lg', OVERLAY_SM)}>
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				spellCheck={false}
				className='bg-muted/40 border-border/40 min-w-0 flex-1 rounded-md border px-2.5 py-1.5 font-sans text-sm outline-none'
				autoFocus
			/>
			<Button onClick={() => onCommit(text)} size='xs' variant='default' className='shrink-0'>
				Save
			</Button>
		</div>
	);
}

// Opt this editor into commit-on-click-away (Stage B): the OverlayManager reads this off the
// resolved component to pick `dismissMode='commit'` (blur the input → onBlur commits) instead
// of cancelling. Only editors with a real `onBlur → onCommit` set this.
TextEditor.commitsOnBlur = true as const;
