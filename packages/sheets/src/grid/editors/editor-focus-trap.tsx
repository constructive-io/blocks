import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface EditorFocusTrapProps {
	children: React.ReactNode;
	onEscape?: () => void;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	className?: string;
	style?: React.CSSProperties;
}

const FOCUSABLE_SELECTOR = [
	'button:not([disabled])',
	'input:not([disabled])',
	'textarea:not([disabled])',
	'select:not([disabled])',
	'a[href]',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Filter to only truly visible focusable elements */
function getVisibleFocusable(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) => el.offsetParent !== null,
	);
}

export function EditorFocusTrap({ children, onEscape, onKeyDown, className, style }: EditorFocusTrapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const previousActiveElement = useRef<Element | null>(null);

	// Focus the first visible focusable element synchronously before paint, so the
	// editor input is focused instantly on open (no setTimeout settle, no focus-jump
	// off an input the user already started typing in). Runs once on mount.
	useLayoutEffect(() => {
		previousActiveElement.current = document.activeElement;

		if (!containerRef.current) return;

		const visibleElements = getVisibleFocusable(containerRef.current);
		if (visibleElements.length > 0) {
			visibleElements[0].focus();
		} else {
			// If no visible focusable elements, focus the container itself
			containerRef.current.focus();
		}
	}, []);

	// Restore focus to the previously active element when unmounting (only if still
	// in DOM).
	useEffect(() => {
		return () => {
			if (previousActiveElement.current instanceof HTMLElement && previousActiveElement.current.isConnected) {
				previousActiveElement.current.focus();
			}
		};
	}, []);

	// Handle keyboard events — forward all keys to parent, then handle Escape/Tab
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Forward all key events to parent before handling
			onKeyDown?.(e);

			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				onEscape?.();
				return;
			}

			if (e.key !== 'Tab') return;

			const container = containerRef.current;
			if (!container) return;

			const focusableElements = getVisibleFocusable(container);
			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];
			const activeElement = document.activeElement;

			if (e.shiftKey) {
				// Shift+Tab: going backwards
				if (activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab: going forwards
				if (activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		},
		[onEscape, onKeyDown],
	);

	return (
		<div
			ref={containerRef}
			className={className}
			style={style}
			onKeyDown={handleKeyDown}
			tabIndex={-1}
			role="dialog"
			aria-modal="true"
		>
			{children}
		</div>
	);
}
