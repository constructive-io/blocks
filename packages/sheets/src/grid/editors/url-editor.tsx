import React, { useCallback, useState } from 'react';
import { Check, ExternalLink, Link, X } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

interface UrlEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
}

function isValidUrl(string: string): boolean {
	if (!string || typeof string !== 'string') return false;

	try {
		// Add protocol if missing for validation
		const urlToTest = string.startsWith('http') ? string : `https://${string}`;
		new URL(urlToTest);
		return true;
	} catch {
		return false;
	}
}

function formatUrl(url: string): string {
	if (!url) return '';

	// Add https:// if no protocol is specified
	if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
		return `https://${url}`;
	}

	return url;
}

function displayUrl(url: string): string {
	if (!url) return '';

	// Remove protocol for display to save space
	return url.replace(/^https?:\/\//, '');
}

export const UrlEditor: React.FC<UrlEditorProps> = ({ value, onFinishedEditing }) => {
	// Extract current URL data from the raw value
	const currentUrlData = typeof value === 'string' ? value : '';
	const [editingValue, setEditingValue] = useState<string>(currentUrlData);
	const [validationError, setValidationError] = useState<string>('');

	const handleSave = useCallback(() => {
		// Validate URL before saving
		if (editingValue.trim() && !isValidUrl(editingValue.trim())) {
			setValidationError('Please enter a valid URL');
			return;
		}

		const formattedUrl = editingValue.trim() ? formatUrl(editingValue.trim()) : '';
		onFinishedEditing(formattedUrl);
	}, [editingValue, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			setEditingValue(newValue);

			// Clear validation error when user starts typing
			if (validationError) {
				setValidationError('');
			}
		},
		[validationError],
	);

	const handleTestUrl = useCallback(() => {
		if (editingValue.trim() && isValidUrl(editingValue.trim())) {
			const fullUrl = formatUrl(editingValue.trim());
			window.open(fullUrl, '_blank', 'noopener,noreferrer');
		}
	}, [editingValue]);

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

	const isValid = !editingValue.trim() || isValidUrl(editingValue.trim());
	const displayText = editingValue.trim() ? displayUrl(editingValue.trim()) : '';

	return (
		<EditorFocusTrap onEscape={handleCancel} className={`bg-popover flex ${OVERLAY.md} flex-col gap-4 rounded-lg border p-4 shadow-lg`}>
			<div onKeyDown={handleEditorKeyDown}>
			{/* Header */}
			<div className='flex items-center gap-2'>
				<Link className='text-muted-foreground h-4 w-4' />
				<h3 className='text-sm font-medium'>Edit URL</h3>
			</div>

			{/* URL Input */}
			<div className='space-y-2'>
				<Label htmlFor='url' className='text-muted-foreground text-xs'>
					URL
				</Label>
				<Input
					id='url'
					type='url'
					value={editingValue}
					onChange={handleInputChange}
					placeholder='https://example.com'
					className={cn('text-sm', validationError && 'border-destructive focus-visible:ring-destructive')}
					autoFocus
				/>
				{validationError && <p className='text-destructive text-xs'>{validationError}</p>}
			</div>

			{/* Preview */}
			{editingValue.trim() && (
				<div className='space-y-2'>
					<Label className='text-muted-foreground text-xs'>Preview</Label>
					<div className='bg-muted flex items-center gap-2 rounded p-2 text-sm'>
						<Link className='text-muted-foreground h-3 w-3 flex-shrink-0' />
						{isValid ? (
							<div className='flex min-w-0 flex-1 items-center gap-2'>
								<span className='text-primary truncate'>{displayText}</span>
								<Button
									variant='ghost'
									size='sm'
									onClick={handleTestUrl}
									className='text-muted-foreground hover:text-primary h-6 w-6 p-0'
									title='Test URL'
								>
									<ExternalLink className='h-3 w-3' />
								</Button>
							</div>
						) : (
							<span className='text-destructive truncate'>{editingValue}</span>
						)}
					</div>
				</div>
			)}

			{/* URL Format Help */}
			<div className='text-muted-foreground text-xs'>
				<p>Examples:</p>
				<ul className='mt-1 list-inside list-disc space-y-1'>
					<li>https://example.com</li>
					<li>example.com (https:// will be added automatically)</li>
					<li>subdomain.example.com/path</li>
				</ul>
			</div>

			{/* Action Buttons */}
			<div className='flex justify-end gap-2'>
				<Button variant='outline' size='sm' onClick={handleCancel}>
					<X className='mr-1 h-3 w-3' />
					Cancel
				</Button>
				<Button size='sm' onClick={handleSave} disabled={!!validationError}>
					<Check className='mr-1 h-3 w-3' />
					Save
				</Button>
			</div>
			</div>
		</EditorFocusTrap>
	);
};
