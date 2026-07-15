import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    // Add PostCSS plugin for Tailwind v4
    config.css = {
      ...config.css,
      postcss: {
        plugins: [
          (await import('@tailwindcss/postcss')).default,
        ],
      },
    };
    return config;
  },
};

export default config;
