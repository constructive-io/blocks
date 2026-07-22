import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import './storybook.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		backgrounds: {
			options: {
				light: { name: 'light', value: '#ffffff' },
				dark: { name: 'dark', value: '#0a0a0a' }
			}
		}
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
			useEffect(() => {
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
	],

	initialGlobals: {
		backgrounds: { value: 'light' }
	}
};

export default preview;
