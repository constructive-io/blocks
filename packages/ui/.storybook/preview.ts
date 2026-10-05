import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { DialRoot } from 'dialkit';
import { MotionConfig } from 'motion/react';
import 'dialkit/styles.css';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The canvas is painted by the theme (`html`/`body` use --background), which follows the Theme toolbar.
    // Storybook's own backgrounds forced `#fff !important` on the body regardless of that toggle.
    backgrounds: { disable: true },
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
      // `fullscreen` stories own the whole viewport (app shells, templates); everything else gets a 16px gutter.
      const fullscreen = context.parameters.layout === 'fullscreen';

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
        MotionConfig,
        { reducedMotion: 'user' },
        React.createElement(
          'div',
          {
            // No viewport sizing here: Storybook already pads non-fullscreen roots, so a 100vh/100vw box overflowed
            // by that padding (and by the scrollbar width). The page background comes from `html`, which the
            // theme paints with --background and which carries the dark class set above.
            className: theme,
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
            { className: fullscreen ? 'bg-background text-foreground' : 'bg-background text-foreground p-4' },
            React.createElement(Story)
          ),
          // Live theme/motion tuning panel (dev tooling; any story can register
          // a folder via useDialKit — the Kitchen Sink registers "Constructive theme")
          React.createElement(DialRoot, {
            position: 'bottom-right',
            productionEnabled: true,
            theme,
          })
        )
      );
    },
  ],
};

export default preview;
