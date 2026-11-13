import type { Preview } from '@storybook/react-vite';
import React, { useLayoutEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './storybook.css';

// Storybook's test tooling (storybook/test) replaces `HTMLElement.prototype.focus` with a
// getter that reads `this.ownerDocument`. Reading `focus` on a prototype itself then throws
// "Illegal invocation", and react-aria does exactly that when its first component mounts
// (it wraps focus to track keyboard use), so the grid's date and time editors fail to
// render in Storybook. Host apps have no such patch, so this lives here, not in the
// package. A read on a prototype gets a function that calls whatever focus Storybook
// gives the element it is called on; every read on an element still goes to Storybook.
const GUARDED = Symbol.for('sheets.storybook.focusReadGuard');

function allowFocusReadOnPrototype(): void {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus');
	const readFocus = descriptor?.get;
	if (!descriptor || !readFocus || GUARDED in readFocus) return;
	function focus(this: HTMLElement, ...args: unknown[]) {
		return (readFocus!.call(this) as (...rest: unknown[]) => void).apply(this, args);
	}
	const guardedRead = Object.assign(
		function (this: unknown) {
			try {
				return readFocus.call(this);
			} catch {
				return focus;
			}
		},
		{ [GUARDED]: true },
	);
	Object.defineProperty(HTMLElement.prototype, 'focus', { ...descriptor, get: guardedRead });
}

const preview: Preview = {
	// After the loaders, so Storybook's focus getter is already in place.
	beforeEach: allowFocusReadOnPrototype,

	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		// The page background is the theme's `--background` token on <html> and <body>
		// (from the UI stylesheet), so it follows the theme toolbar. The backgrounds tool
		// would paint <body> with a fixed color of its own, white behind a dark story.
		backgrounds: { disable: true }
	},

	globalTypes: {
		theme: {
			name: 'Theme',
			description: 'Global theme for the sheets grid',
			defaultValue: 'light',
			toolbar: {
				icon: 'circlehollow',
				items: [
					{ value: 'light', icon: 'sun', title: 'Light' },
					{ value: 'dark', icon: 'moon', title: 'Dark' }
				],
				showName: true
			}
		}
	},

	decorators: [
		(Story, context) => {
			const theme = context.globals.theme || 'light';

			// Toggle the `dark` class on <html> so the design-token dark variant + any
			// portal-rendered overlay editor inherit dark mode (matches the ui template).
			// A layout effect sets it before the first paint, so a dark story never
			// shows a light page first.
			useLayoutEffect(() => {
				const root = document.documentElement;
				if (theme === 'dark') {
					root.classList.add('dark');
				} else {
					root.classList.remove('dark');
				}
			}, [theme]);

			return React.createElement(
				'div',
				{
					className: theme,
					style: { minHeight: '100vh', width: '100%', backgroundColor: 'var(--background)' }
				},
				// Portal root for overlay editors (OverlayManager renders into a portal).
				React.createElement('div', {
					id: 'portal-root',
					'data-slot': 'portal-root',
					style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }
				}),
				React.createElement(
					'div',
					{ className: 'bg-background text-foreground p-4' },
					React.createElement(Story)
				)
			);
		}
	]
};

export default preview;
