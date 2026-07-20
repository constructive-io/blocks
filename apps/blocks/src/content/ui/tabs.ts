import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiTabs = {
  href: 'https://base-ui.com/react/components/tabs',
  label: 'Base UI Tabs props',
} as const;

export const tabsDocs = definePrimitiveDocs({
  name: 'tabs',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Tabs to switch among a small set of peer views while keeping one view visible at a time.',
    'Use Collapsible for independently expandable supporting sections. Use normal navigation when each destination needs its own URL and browser history entry.',
  ],
  usage: {
    demo: 'BasicTabsDemo',
    description:
      'Keep TabsTrigger elements inside TabsList and pair each trigger value with one TabsContent value inside the same Tabs root. When render supplies a non-button trigger, set nativeButton to false.',
  },
  state: {
    title: 'Controlled and uncontrolled selection',
    description:
      'Use defaultValue when Tabs can remember its own selection. Pass value and onValueChange when the selection must synchronize with application state.',
    demo: 'ControlledTabsDemo',
  },
  examples: [
    {
      title: 'Vertical tabs',
      description: 'Set orientation to vertical and align the list and panels to match the reading direction.',
      demo: 'VerticalTabsDemo',
    },
  ],
  accessibility: [
    'Use a concise label for each TabsTrigger and keep every trigger inside TabsList so Base UI can provide the tablist relationship.',
    'Match each trigger value to exactly one TabsContent value. Base UI manages arrow-key navigation, selection, and tab-panel relationships.',
    'A disabled tab remains discoverable but unavailable; do not use disabled tabs to hide permissions or required information.',
  ],
  api: [
    {
      name: 'Tabs',
      description: 'Root that manages the active tab and orientation.',
      props: [
        { name: 'value', type: 'any', description: 'Controlled active tab value.' },
        { name: 'defaultValue', type: 'any', description: 'Initial active value in uncontrolled usage.' },
        { name: 'onValueChange', type: 'Base UI callback', description: 'Runs when the selected tab changes.' },
        { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Sets layout and arrow-key behavior.' },
      ],
      upstream: baseUiTabs,
    },
    { name: 'TabsList', description: 'Container that gives its triggers tablist semantics.', upstream: baseUiTabs },
    {
      name: 'TabsTrigger',
      description: 'Interactive tab that selects the panel with the same value.',
      props: [
        { name: 'value', type: 'any', required: true, description: 'Value shared with its TabsContent.' },
        { name: 'disabled', type: 'boolean', description: 'Prevents selection and keyboard activation.' },
        { name: 'render', type: 'ReactElement | render function', description: 'Base UI composition API.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set to false when render resolves to a non-button element.',
        },
      ],
      upstream: baseUiTabs,
    },
    {
      name: 'TabsContent',
      description: 'Panel associated with a TabsTrigger value.',
      props: [{ name: 'value', type: 'any', required: true, description: 'Value shared with its TabsTrigger.' }],
      upstream: baseUiTabs,
    },
  ],
});
