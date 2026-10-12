import type { Preview } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { DialRoot } from 'dialkit';
import { MotionConfig } from 'motion/react';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { useGlobals } from 'storybook/preview-api';
import { BreakUiToggle, datasetStates, type BreakUiParameter, type Dataset } from '../src/stories/break-ui/dataset';
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
    // Break-UI fixture switch; stories opt in with `parameters.breakUi` and read it via `pickDataset`.
    dataset: {
      name: 'Dataset',
      description: 'Fixture dataset for break-ui stories',
      defaultValue: 'demo',
      toolbar: {
        icon: 'database',
        items: [
          { value: 'demo', title: 'Demo data' },
          { value: 'worst', title: 'Worst case' },
          { value: 'empty', title: 'Empty' },
          { value: 'one', title: 'One' },
          { value: 'huge', title: '1,000 rows' },
        ],
        showName: true,
      },
    },
    direction: {
      name: 'Direction',
      description: 'Text direction for the story canvas',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
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
      const direction = context.globals.direction === 'rtl' ? 'rtl' : 'ltr';
      const breakUiStates = datasetStates(context.parameters.breakUi as BreakUiParameter | undefined);
      const [, updateGlobals] = useGlobals();

      // Apply dark class to document root so Base UI portals inherit dark mode
      useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }, [theme]);

      useEffect(() => {
        document.documentElement.dir = direction;
      }, [direction]);

      // A correctly configured host tells Base UI its direction; without this, RTL stories test a misconfigured app.
      return React.createElement(
        DirectionProvider,
        { direction },
        React.createElement(
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
          breakUiStates.length > 0
            ? React.createElement(BreakUiToggle, {
                states: breakUiStates,
                active: (context.globals.dataset as Dataset | undefined) ?? 'demo',
                onSelect: (dataset: Dataset) => updateGlobals({ dataset }),
              })
            : null,
          // Live theme/motion tuning panel (dev tooling; any story can register
          // a folder via useDialKit — the Kitchen Sink registers "Constructive theme")
          React.createElement(DialRoot, {
            position: 'bottom-right',
            productionEnabled: true,
            theme,
          })
        )
      ));
    },
  ],
};

export default preview;
