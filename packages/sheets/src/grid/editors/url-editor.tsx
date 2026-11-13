import React, { useCallback, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';

import { openUriCellLink } from '../../cell-model/uri-link';
import { EditorFocusTrap } from './editor-focus-trap';
import { EditorFooter, EditorHeader, editorClear, modifierKeyLabel } from './editor-frame';
import { OVERLAY } from './overlay-presets';

interface UrlEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	/** The field's readable name, shown as the title. */
	title?: string;
	/** The column takes no value, so Clear is offered. */
	nullable?: boolean;
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

export const UrlEditor: React.FC<UrlEditorProps> = ({ value, onFinishedEditing, title = 'Web address', nullable = false }) => {
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
	// Opened through the grid's link rule (http and https only, no opener).
	const openable = editingValue.trim() && isValid ? formatUrl(editingValue.trim()) : null;

	return (
		<EditorFocusTrap onEscape={handleCancel} className={`bg-popover flex ${OVERLAY.md} flex-col gap-3 rounded-lg border p-3 shadow-lg`}>
			<div onKeyDown={handleEditorKeyDown} className='flex flex-col gap-3'>
				<EditorHeader title={title} />
				<div className='flex flex-col gap-1.5'>
					<Input
						id='url'
						type='url'
						aria-label={title}
						value={editingValue}
						onChange={handleInputChange}
						placeholder='https://example.com'
						className={cn('text-sm', validationError && 'border-destructive focus-visible:ring-destructive')}
						autoFocus
					/>
					{validationError ? (
						<p className='text-destructive text-xs'>{validationError}</p>
					) : (
						<p className='text-muted-foreground text-xs'>https:// is added when the address has no scheme.</p>
					)}
				</div>
				{displayText ? (
					<div className='bg-muted/40 flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm'>
						{isValid ? (
							<>
								<span className='text-link min-w-0 flex-1 truncate'>{displayText}</span>
								{openable ? (
									<Button
										variant='ghost'
										size='icon-xs'
										onClick={() => openUriCellLink(openable)}
										aria-label='Open link in a new tab'
										title='Open link in a new tab'
									>
										<ExternalLink aria-hidden />
									</Button>
								) : null}
							</>
						) : (
							<span className='text-destructive min-w-0 truncate'>Not a valid web address</span>
						)}
					</div>
				) : null}
				<EditorFooter
					onSave={handleSave}
					saveShortcut={`${modifierKeyLabel()} Enter`}
					saveBlockedReason={validationError || null}
					clear={editorClear(nullable, () => onFinishedEditing(null))}
				/>
			</div>
		</EditorFocusTrap>
	);
};
