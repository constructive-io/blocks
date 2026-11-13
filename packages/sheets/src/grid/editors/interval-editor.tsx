import React, { useCallback, useState } from 'react';

import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { EditorFocusTrap } from './editor-focus-trap';
import { EditorFooter, EditorHeader, editorClear, modifierKeyLabel } from './editor-frame';
import { OVERLAY } from './overlay-presets';

interface IntervalValue {
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
}

interface IntervalEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	/** The field's readable name, shown as the title. */
	title?: string;
	/** The column takes no value, so Clear is offered. */
	nullable?: boolean;
}

const INTERVAL_PATTERNS: { regex: RegExp; key: keyof IntervalValue }[] = [
	{ regex: /(\d+)\s*d(ays?)?/i, key: 'days' },
	{ regex: /(\d+)\s*h(ours?)?/i, key: 'hours' },
	{ regex: /(\d+)\s*m(in(utes?)?)?/i, key: 'minutes' },
	{ regex: /(\d+)\s*s(ec(onds?)?)?/i, key: 'seconds' },
];

function parseIntervalValue(data: string): IntervalValue {
	if (!data || typeof data !== 'string') {
		return { days: 0, hours: 0, minutes: 0, seconds: 0 };
	}

	try {
		const parsed = JSON.parse(data);
		if (typeof parsed === 'object' && parsed !== null) {
			return {
				days: parsed.days || 0,
				hours: parsed.hours || 0,
				minutes: parsed.minutes || 0,
				seconds: parsed.seconds || 0,
			};
		}
	} catch {
		// Try to parse text format like "1d 2h 30m 45s"
		const interval: IntervalValue = { days: 0, hours: 0, minutes: 0, seconds: 0 };

		INTERVAL_PATTERNS.forEach(({ regex, key }) => {
			const match = data.match(regex);
			if (match) {
				interval[key] = parseInt(match[1], 10);
			}
		});

		return interval;
	}

	return { days: 0, hours: 0, minutes: 0, seconds: 0 };
}

function formatIntervalValue(interval: IntervalValue): string {
	const parts = [];
	if (interval.days && interval.days > 0) parts.push(`${interval.days}d`);
	if (interval.hours && interval.hours > 0) parts.push(`${interval.hours}h`);
	if (interval.minutes && interval.minutes > 0) parts.push(`${interval.minutes}m`);
	if (interval.seconds && interval.seconds > 0) parts.push(`${interval.seconds}s`);
	return parts.join(' ') || '0s';
}

export const IntervalEditor: React.FC<IntervalEditorProps> = ({ value, onFinishedEditing, title = 'Duration', nullable = false }) => {
	// Extract current interval data from the raw value
	const currentIntervalData = typeof value === 'string' ? value : '';

	const [editingValue, setEditingValue] = useState<IntervalValue>(() => parseIntervalValue(currentIntervalData));

	const handleSave = useCallback(() => {
		onFinishedEditing(JSON.stringify(editingValue));
	}, [editingValue, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleInputChange = useCallback((field: keyof IntervalValue, newValue: string) => {
		const numValue = parseInt(newValue) || 0;
		setEditingValue((prev) => ({
			...prev,
			[field]: Math.max(0, numValue), // Ensure non-negative values
		}));
	}, []);

	// Handle Ctrl+Enter to save
	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				handleSave();
			}
		},
		[handleSave],
	);

	const previewText = formatIntervalValue(editingValue);

	return (
		<EditorFocusTrap onEscape={handleCancel} className={`bg-popover flex ${OVERLAY.sm} flex-col gap-3 rounded-lg border p-3 shadow-lg`}>
			<div onKeyDown={handleEditorKeyDown} className='flex flex-col gap-3'>
			<EditorHeader title={title} />

			{/* Input Fields */}
			<div className='grid grid-cols-2 gap-3'>
				<div className='space-y-1'>
					<Label htmlFor='days' className='text-muted-foreground text-xs'>
						Days
					</Label>
					<Input
						id='days'
						type='number'
						min='0'
						value={editingValue.days || ''}
						onChange={(e) => handleInputChange('days', e.target.value)}
						className='h-8 text-sm'
						placeholder='0'
					/>
				</div>
				<div className='space-y-1'>
					<Label htmlFor='hours' className='text-muted-foreground text-xs'>
						Hours
					</Label>
					<Input
						id='hours'
						type='number'
						min='0'
						max='23'
						value={editingValue.hours || ''}
						onChange={(e) => handleInputChange('hours', e.target.value)}
						className='h-8 text-sm'
						placeholder='0'
					/>
				</div>
				<div className='space-y-1'>
					<Label htmlFor='minutes' className='text-muted-foreground text-xs'>
						Minutes
					</Label>
					<Input
						id='minutes'
						type='number'
						min='0'
						max='59'
						value={editingValue.minutes || ''}
						onChange={(e) => handleInputChange('minutes', e.target.value)}
						className='h-8 text-sm'
						placeholder='0'
					/>
				</div>
				<div className='space-y-1'>
					<Label htmlFor='seconds' className='text-muted-foreground text-xs'>
						Seconds
					</Label>
					<Input
						id='seconds'
						type='number'
						min='0'
						max='59'
						value={editingValue.seconds || ''}
						onChange={(e) => handleInputChange('seconds', e.target.value)}
						className='h-8 text-sm'
						placeholder='0'
					/>
				</div>
			</div>

			{/* Preview */}
			<div className='space-y-1'>
				<Label className='text-muted-foreground text-xs'>Preview</Label>
				<div className='bg-muted rounded px-3 py-2 font-mono text-sm'>{previewText}</div>
			</div>

			<EditorFooter
				onSave={handleSave}
				saveShortcut={`${modifierKeyLabel()} Enter`}
				clear={editorClear(nullable, () => onFinishedEditing(null))}
			/>
			</div>
		</EditorFocusTrap>
	);
};
