'use client';

// Read-only viewer for values the grid shows but does not edit: raw bytes, number
// vectors and values of a kind the grid does not know. It shows the whole value and
// a short summary (size or length), says why the value cannot be changed here, and
// copies the value as text.

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { OVERLAY_MD } from '../../grid/editors/overlay-presets';
import { formatColumnValue, VIEW_ONLY_REASON } from '../../cell-types/column-value';
import { fieldLabel } from '../../cell-types/field-label';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

function summary(cellType: string | undefined, value: unknown): string | null {
	if (value === null || value === undefined) return 'No value';
	if (cellType === 'binary' && typeof value === 'string') {
		const clean = value.replace(/\s/g, '');
		const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
		const size = Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
		return `${size} ${size === 1 ? 'byte' : 'bytes'}, shown as base64`;
	}
	if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
	return null;
}

export function ValueViewerDom({ value, column, colKey, cell, readOnlyReason, onCancel }: EditorProps) {
	const [copied, setCopied] = useState(false);
	const text = formatColumnValue(column, value);
	const detail = summary(cell.meta?.cellType, value);

	function copy() {
		const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
		if (!clipboard) return;
		void clipboard.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false));
	}

	return (
		<div data-slot='value-viewer' className={cn('bg-popover flex flex-col gap-2 rounded-lg border p-3 shadow-lg', OVERLAY_MD)}>
			<div className='flex items-baseline justify-between gap-2'>
				<h3 className='text-sm font-medium'>{fieldLabel(column?.name ?? colKey)}</h3>
				{detail ? <span className='text-muted-foreground text-xs'>{detail}</span> : null}
			</div>
			<pre className='bg-muted/40 max-h-64 overflow-auto rounded-md p-2 text-xs break-all whitespace-pre-wrap'>{text}</pre>
			<p className='text-muted-foreground text-xs'>{readOnlyReason ?? VIEW_ONLY_REASON}</p>
			<div className='flex justify-end gap-2 border-t pt-2'>
				<Button size='xs' variant='outline' onClick={copy} disabled={!text} autoFocus>
					{copied ? 'Copied' : 'Copy'}
				</Button>
				<Button size='xs' variant='ghost' onClick={onCancel}>
					Close
				</Button>
			</div>
		</div>
	);
}
