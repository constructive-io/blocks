import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiSeparator = {
  href: 'https://base-ui.com/react/components/separator',
  label: 'Base UI Separator props',
} as const;

export const separatorDocs = definePrimitiveDocs({
  name: 'separator',
  stateModel: 'stateless',
  whenToUse: [
    'Use Separator between related groups when the visual division also helps communicate their structure.',
    'Use spacing or a border when the division is purely decorative. Use a heading when a new section needs a name rather than a line.',
  ],
  usage: {
    demo: 'BasicSeparatorDemo',
    description:
      'Place Separator between sibling content groups. It is horizontal by default and stretches across the available width.',
  },
  examples: [
    {
      title: 'Vertical separator',
      description: 'Set orientation="vertical" inside a container with an explicit height.',
      demo: 'VerticalSeparatorDemo',
    },
  ],
  accessibility: [
    'Separator uses Base UI separator semantics, including orientation. Place it where a structural divider is meaningful to assistive technology.',
    'The deprecated decorative prop is ignored. Use a CSS border or another presentation-only element when no separator semantics are intended.',
    'Do not use Separator as a substitute for a heading, list boundary, or other native structure that better describes the relationship between groups.',
  ],
  api: [
    {
      name: 'Separator',
      description: 'Semantic divider with horizontal and vertical layout treatments.',
      props: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'Sets both the separator semantics and its rendered axis.',
        },
        {
          name: 'decorative',
          type: 'boolean',
          deprecated: true,
          description: 'Compatibility prop that is ignored because Base UI owns separator accessibility.',
        },
      ],
      upstream: baseUiSeparator,
    },
  ],
});
