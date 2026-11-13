'use client';

// The parts every value editor shares, so their frames read the same: a title row (the
// field's readable name, an optional chip for the kind of value, optional controls on
// the right) and a footer with Clear and Save. Keyboard shortcuts are in the buttons'
// titles, not printed in the popover.

import type { ReactNode } from 'react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '../../utils/cn';

const MAC_UA_RE = /Mac|iPod|iPhone|iPad/;

/** The platform's name for the modifier key in a shortcut ("⌘" or "Ctrl"). */
export function modifierKeyLabel(): string {
	return typeof navigator !== 'undefined' && MAC_UA_RE.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

/** Why Clear is not offered: the column requires a value. */
export const VALUE_REQUIRED_REASON = 'This field cannot be empty.';

/** Clear for a nullable column, or the reason it cannot be cleared. */
export type EditorClear = { onClear: () => void } | { reason: string };

export function editorClear(nullable: boolean | undefined, onClear: () => void): EditorClear {
	return nullable ? { onClear } : { reason: VALUE_REQUIRED_REASON };
}

interface EditorHeaderProps {
	title: string;
	/** Extra detail on hover (the field's API name, for example). */
	titleHint?: string;
	/** The kind of value, when it helps (a shape kind, for example). */
	chip?: string | null;
	/** Controls on the right (a mode switch). */
	children?: ReactNode;
	className?: string;
}

export function EditorHeader({ title, titleHint, chip, children, className }: EditorHeaderProps) {
	return (
		<div data-slot='editor-header' className={cn('flex items-center justify-between gap-2', className)}>
			{/* As tall as a small switch, so a header is the same height with or without one. */}
			<div className='flex min-h-7 min-w-0 items-center gap-2'>
				<h3 className='truncate text-sm font-medium' title={titleHint}>
					{title}
				</h3>
				{chip ? (
					<span className='bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs font-medium'>{chip}</span>
				) : null}
			</div>
			{children}
		</div>
	);
}

interface EditorFooterProps {
	onSave: () => void;
	/** The keys that save, for the Save button's title ("Enter", or "⌘ Enter"). */
	saveShortcut?: string;
	/** Why Save is not available (an invalid value), shown as its title. */
	saveBlockedReason?: string | null;
	/** Clear, or why the value cannot be cleared; omitted when clearing does not apply. */
	clear?: EditorClear | null;
	/** A short status on the left, such as why the value is not valid. */
	status?: ReactNode;
	className?: string;
}

export function EditorFooter({ onSave, saveShortcut, saveBlockedReason, clear, status, className }: EditorFooterProps) {
	const blocked = Boolean(saveBlockedReason);
	return (
		<div data-slot='editor-footer' className={cn('flex items-center justify-end gap-2 border-t pt-2', className)}>
			{status ? <div className='me-auto min-w-0 truncate text-xs'>{status}</div> : null}
			{clear ? (
				'onClear' in clear ? (
					<Button size='xs' variant='ghost' onClick={clear.onClear} title='Remove the value'>
						Clear
					</Button>
				) : (
					<Button size='xs' variant='ghost' disabled focusableWhenDisabled title={clear.reason}>
						Clear
					</Button>
				)
			) : null}
			<Button
				size='xs'
				onClick={onSave}
				disabled={blocked}
				focusableWhenDisabled={blocked}
				title={blocked ? saveBlockedReason ?? undefined : saveShortcut ? `Save (${saveShortcut})` : undefined}
			>
				Save
			</Button>
		</div>
	);
}
