import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiToggleGroup = {
  href: 'https://base-ui.com/react/components/toggle-group',
  label: 'Base UI Toggle Group props',
} as const;

export const toggleGroupDocs = definePrimitiveDocs({
  name: 'toggle-group',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Toggle Group for a small set of related options rendered as attached controls, such as text alignment, density, or a time-range picker.',
    'Use Tabs when each option swaps a whole panel of content. Use Radio Group inside forms, and Button Group when the controls trigger actions rather than hold selection.',
  ],
  usage: {
    demo: 'BasicToggleGroupDemo',
    description:
      'Group ToggleGroupItem children inside ToggleGroup. spacing={0} renders the attached segmented style; larger spacing gaps items so each keeps its own radius.',
  },
  state: {
    title: 'Single and multiple selection',
    description:
      'By default one item is selected at a time and a highlight pill slides under the pressed item. Set multiple to allow several pressed items, each painting its own accent fill. Use defaultValue for uncontrolled state or value and onValueChange for controlled state.',
    demo: 'ToggleGroupMultipleDemo',
  },
  examples: [
    {
      title: 'Gapped group',
      description: 'Set spacing above 0 to separate the items while keeping the shared group semantics.',
      demo: 'ToggleGroupSpacingDemo',
    },
  ],
  accessibility: [
    'Give every icon-only ToggleGroupItem an aria-label. The group moves focus with arrow keys, so each item needs its own name.',
    'Choose multiple deliberately — single-select communicates one-of, while multi-select communicates any-of, and the difference matters to assistive technology.',
    'Keep the group next to the content it controls so the relationship is clear without a visible label.',
  ],
  api: [
    {
      name: 'ToggleGroup',
      description: 'Base UI toggle group with a sliding highlight in single-select mode.',
      props: [
        { name: 'value', type: 'string[]', description: 'Controlled selected item values.' },
        { name: 'defaultValue', type: 'string[]', description: 'Initial uncontrolled selection.' },
        {
          name: 'onValueChange',
          type: '(value: string[], eventDetails) => void',
          description: 'Runs when the selection changes.',
        },
        { name: 'multiple', type: 'boolean', default: 'false', description: 'Allows more than one pressed item.' },
        {
          name: 'spacing',
          type: 'number',
          default: '0',
          description: 'Pixel gap between items; 0 renders the attached segmented style.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'Direction items are laid out.',
        },
        {
          name: 'variant',
          type: "'default' | 'outline'",
          default: "'default'",
          description: 'Visual treatment applied to items.',
        },
        { name: 'size', type: "'sm' | 'default' | 'lg'", default: "'default'", description: 'Size applied to items.' },
      ],
      upstream: baseUiToggleGroup,
    },
    {
      name: 'ToggleGroupItem',
      description: 'One selectable item inside the group.',
      props: [
        {
          name: 'value',
          type: 'string',
          required: true,
          description: 'Value reported by the group when this item is selected.',
        },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Prevents selecting this item.' },
      ],
      upstream: baseUiToggleGroup,
    },
  ],
});
