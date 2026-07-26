import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-a11y'],
	framework: {
		name: '@storybook/react-vite',
		options: {}
	},
	typescript: {
		check: false,
		reactDocgen: 'react-docgen-typescript'
	},
	viteFinal: async (config) => {
		// Tailwind v4 PostCSS plugin — the DOM grid emits utilities at runtime via cn(),
		// so the showcase MUST run Tailwind over the sheets src (see .storybook/storybook.css).
		config.css = {
			...config.css,
			postcss: {
				plugins: [(await import('@tailwindcss/postcss')).default]
			}
		};
		return config;
	}
};

export default config;
