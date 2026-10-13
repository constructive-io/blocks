'use client';

import { useRef } from 'react';
import { Toaster as Sonner, ToasterProps } from 'sonner';

import { useDocumentTheme } from '../lib/use-document-theme';
import { ToastDetailsHost } from './toast/toast-details';

type ToasterComponentProps = ToasterProps & {
	/**
	 * Theme for the toaster. Defaults to the page's theme (the `dark` class on `<html>`), so
	 * Sonner's own text colours match the app's surfaces. Pass `'system'` to follow the OS
	 * instead, or your app's theme value to override.
	 */
	theme?: 'light' | 'dark' | 'system';
};

/**
 * Mount it once. It also shows the "View details" dialog of the toasts from `./toast`, next to Sonner, so the dialog
 * gets the app's providers and focus returns sensibly. Mounting Sonner's own `Toaster` instead still works: the
 * dialog then opens in a React root of its own, without the app's providers.
 */
const Toaster = ({ theme, ...props }: ToasterComponentProps) => {
	const pageTheme = useDocumentTheme(theme === undefined);
	const region = useRef<HTMLElement>(null);

	return (
		<>
			<Sonner
				ref={region}
				theme={theme ?? pageTheme}
				className="toaster group"
				style={
					{
						'--normal-bg': 'var(--popover)',
						'--normal-text': 'var(--popover-foreground)',
						'--normal-border': 'var(--border)',
					} as React.CSSProperties
				}
				{...props}
			/>
			{/* Beside Sonner, not inside it: Sonner must not see the details dialog's events, and the dialog should get the app's providers. */}
			<ToastDetailsHost regionRef={region} />
		</>
	);
};

export { Toaster };
export type { ToasterComponentProps };
