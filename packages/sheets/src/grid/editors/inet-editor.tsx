import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_FULL_RE = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
const IPV6_COMPRESSED_RE =
	/^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)*::$/;
const MAC_UA_RE = /Mac|iPod|iPhone|iPad/;

interface InetEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
}

function isValidIPv4(ip: string): boolean {
	return IPV4_RE.test(ip);
}

function isValidIPv6(ip: string): boolean {
	return IPV6_FULL_RE.test(ip) || IPV6_COMPRESSED_RE.test(ip);
}

function isValidCIDR(cidr: string): boolean {
	const parts = cidr.split('/');
	if (parts.length !== 2) return false;

	const [ip, prefix] = parts;
	const prefixNum = parseInt(prefix, 10);

	if (isValidIPv4(ip)) {
		return prefixNum >= 0 && prefixNum <= 32;
	} else if (isValidIPv6(ip)) {
		return prefixNum >= 0 && prefixNum <= 128;
	}

	return false;
}

function isValidInet(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	const trimmed = value.trim();

	if (trimmed.includes('/')) {
		return isValidCIDR(trimmed);
	}

	return isValidIPv4(trimmed) || isValidIPv6(trimmed);
}

function getInetType(value: string): string {
	if (!value) return '';

	const trimmed = value.trim();

	if (trimmed.includes('/')) {
		const [ip] = trimmed.split('/');
		if (isValidIPv4(ip)) return 'IPv4 Network';
		if (isValidIPv6(ip)) return 'IPv6 Network';
	} else {
		if (isValidIPv4(trimmed)) return 'IPv4 Address';
		if (isValidIPv6(trimmed)) return 'IPv6 Address';
	}

	return 'Invalid';
}

export const InetEditor: React.FC<InetEditorProps> = ({ value, onFinishedEditing }) => {
	const currentInetData = typeof value === 'string' ? value : '';
	const [editingValue, setEditingValue] = useState<string>(currentInetData);
	const [validationError, setValidationError] = useState<string>('');
	const keyContainerRef = useRef<HTMLDivElement>(null);

	const handleSave = useCallback(() => {
		if (editingValue.trim() && !isValidInet(editingValue.trim())) {
			setValidationError('Invalid IP address or CIDR');
			return;
		}

		onFinishedEditing(editingValue.trim());
	}, [editingValue, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setEditingValue(e.target.value);
		setValidationError('');
	}, []);

	// Refs for native key handler
	const actionsRef = useRef({ handleSave, handleCancel });
	actionsRef.current = { handleSave, handleCancel };

	// Native DOM keydown listener — prevents Glide from intercepting keys in portal context
	useEffect(() => {
		const el = keyContainerRef.current;
		if (!el) return;
		const handler = (e: KeyboardEvent) => {
			const { handleSave, handleCancel } = actionsRef.current;

			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				handleCancel();
				return;
			}
			if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				e.stopPropagation();
				handleSave();
				return;
			}
			if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 's' && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				e.stopPropagation();
				handleSave();
				return;
			}
			// Stop Tab from reaching Glide
			if (e.key === 'Tab') {
				e.stopPropagation();
			}
		};
		el.addEventListener('keydown', handler);
		return () => el.removeEventListener('keydown', handler);
	}, []);

	const trimmed = editingValue.trim();
	const isValid = !trimmed || isValidInet(trimmed);
	const inetType = trimmed ? getInetType(trimmed) : '';

	const isMac = typeof navigator !== 'undefined' && MAC_UA_RE.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover ${OVERLAY.sm} rounded-lg border p-2.5 shadow-lg`}
		>
			<div ref={keyContainerRef}>
				{/* Input + inline type badge */}
				<div className='space-y-1.5'>
					<div className='relative'>
						<input
							type='text'
							value={editingValue}
							onChange={handleInputChange}
							placeholder='192.168.1.1 or 10.0.0.0/24'
							className='bg-muted/40 border-border/40 text-foreground w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20'
							autoFocus
						/>
					</div>

					{/* Inline type indicator + validation */}
					<div className='flex items-center gap-2 px-0.5'>
						{validationError ? (
							<span className='text-destructive text-xs'>{validationError}</span>
						) : trimmed && isValid && inetType ? (
							<span className='text-muted-foreground text-xs tabular-nums'>{inetType}</span>
						) : trimmed && !isValid ? (
							<span className='text-destructive text-xs'>Invalid format</span>
						) : null}
					</div>
				</div>

				{/* Footer — hints + save */}
				<div className='mt-3 flex items-center justify-between gap-4 border-t px-1 pt-2.5'>
					<div className='text-muted-foreground flex items-center gap-3 text-xs'>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Enter</kbd>
							<span>save</span>
						</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Esc</kbd>
							<span>cancel</span>
						</span>
					</div>
					<Button onClick={handleSave} size='xs' variant='default' className='shrink-0' disabled={!!validationError}>
						Save
					</Button>
				</div>
			</div>
		</EditorFocusTrap>
	);
};
