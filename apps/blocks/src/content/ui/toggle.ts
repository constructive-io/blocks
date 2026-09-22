import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiToggle = {
  href: 'https://base-ui.com/react/components/toggle',
  label: 'Base UI Toggle props',
} as const;

export const toggleDocs = definePrimitiveDocs({
  name: 'toggle',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Toggle for a view or formatting option that stays pressed, such as pinning a filter, showing line numbers, or toggling bold in a toolbar.',
    'Use Switch for a persistent setting that applies immediately and reads as on or off. Use Button when the control performs a one-shot action rather than holding a state.',
  ],
  usage: {
    demo: 'BasicToggleDemo',
    description:
      'Toggle renders a button that holds a pressed state. Use defaultPressed when the control can own its initial state, and give icon-only toggles an aria-label.',
  },
  state: {
    title: 'Controlled and uncontrolled pressed state',
    description:
      'Use defaultPressed when Toggle can own its state. Pass pressed and onPressedChange when the pressed state is derived from application state such as an active filter.',
    demo: 'ControlledToggleDemo',
  },
  examples: [
    {
      title: 'Toolbar options',
      description: 'A row of icon toggles for view options. Each icon-only toggle needs an accessible name.',
      demo: 'ToggleToolbarDemo',
    },
  ],
  accessibility: [
    'Give every Toggle an accessible name — visible text, aria-label, or aria-labelledby. Icon-only toggles always need aria-label.',
    'The pressed state is exposed to assistive technology automatically, so names like “Show diff view” stay meaningful in either state.',
    'Describe the option rather than the gesture. “Pin filter” reads clearly whether the toggle is pressed or not.',
  ],
  api: [
    {
      name: 'Toggle',
      description: 'Base UI toggle with Constructive variants and sizes.',
      props: [
        { name: 'pressed', type: 'boolean', description: 'Controlled pressed state.' },
        {
          name: 'defaultPressed',
          type: 'boolean',
          default: 'false',
          description: 'Initial uncontrolled pressed state.',
        },
        {
          name: 'onPressedChange',
          type: '(pressed: boolean, eventDetails) => void',
          description: 'Runs when the pressed state changes.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents interaction.' },
        {
          name: 'variant',
          type: "'default' | 'outline'",
          default: "'default'",
          description: 'Visual treatment.',
        },
        { name: 'size', type: "'sm' | 'default' | 'lg'", default: "'default'", description: 'Control size.' },
      ],
      upstream: baseUiToggle,
    },
  ],
});
