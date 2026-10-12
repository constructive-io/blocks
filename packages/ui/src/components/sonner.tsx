'use client';

import { useSyncExternalStore } from 'react';
import { Toaster as Sonner, ToasterProps } from 'sonner';

type ToasterComponentProps = ToasterProps & {
	/**
	 * Theme for the toaster. Defaults to the page's theme (the `dark` class on `<html>`), so
	 * Sonner's own text colours match the app's surfaces. Pass `'system'` to follow the OS
	 * instead, or your app's theme value to override.
	 */
	theme?: 'light' | 'dark' | 'system';
};

function subscribeToDocumentTheme(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
}

const documentTheme = (): 'light' | 'dark' => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

/** The theme the page is in, following the `dark` class on `<html>`. */
function useDocumentTheme() {
	return useSyncExternalStore(subscribeToDocumentTheme, documentTheme, () => 'light' as const);
}

const Toaster = ({ theme, ...props }: ToasterComponentProps) => {
	const pageTheme = useDocumentTheme();

	return (
		<Sonner
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
	);
};

export { Toaster };
export type { ToasterComponentProps };
