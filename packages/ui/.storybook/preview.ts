import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        light: {
          name: 'light',
          value: '#ffffff',
        },
        dark: {
          name: 'dark',
          value: '#0a0a0a',
        },
      },
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1200px',
            height: '800px',
          },
        },
      },
    },
  },

  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        showName: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';

      // Apply dark class to document root so Base UI portals inherit dark mode
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
          style: { height: '100vh', width: '100vw', backgroundColor: 'var(--background)' },
        },
        // Portal root for all overlay components - matches PortalRoot component
        React.createElement(
          'div',
          {
            id: 'portal-root',
            'data-slot': 'portal-root',
            style: {
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 'var(--z-layer-portal-root)',
            }
          }
        ),
        React.createElement(
          'div',
          { className: 'bg-background text-foreground p-4' },
          React.createElement(Story)
        )
      );
    },
  ],

  initialGlobals: {
    backgrounds: {
      value: 'light',
    },
  },
};

export default preview;
