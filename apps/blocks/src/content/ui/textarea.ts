import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactTextarea = {
  href: 'https://react.dev/reference/react-dom/components/textarea',
  label: 'React textarea props',
} as const;

export const textareaDocs = definePrimitiveDocs({
  name: 'textarea',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Textarea for plain-text values that may span multiple lines, such as descriptions, notes, or messages.',
    'Use Input for a single line. Use a purpose-built rich text editor when people need formatting, embedded media, or structured content.',
  ],
  usage: {
    demo: 'BasicTextareaDemo',
    description: 'Pair Textarea with a visible Label and provide enough context for the expected content rather than relying on placeholder text.',
  },
  state: {
    title: 'Controlled and uncontrolled value',
    description:
      'Use defaultValue when the native textarea can own its value. Pass value and onChange when React state is authoritative.',
    demo: 'ControlledTextareaDemo',
  },
  examples: [
    {
      title: 'Validation and read-only states',
      description: 'Connect validation text with aria-describedby, and use readOnly when the value should remain selectable but not editable.',
      demo: 'TextareaStatesDemo',
    },
    {
      title: 'Sizes',
      description: 'Use named size presets to match the vertical density of the surrounding form.',
      demo: 'TextareaSizesDemo',
    },
  ],
  accessibility: [
    'Associate a visible Label with Textarea using matching htmlFor and id values. Placeholder text is not a persistent accessible label.',
    'Set aria-invalid when validation fails and connect the error or guidance with aria-describedby.',
    'When enforcing maxLength, show the limit or remaining count in nearby text so the constraint is available before submission.',
  ],
  api: [
    {
      name: 'Textarea',
      description: 'Auto-sizing native textarea wrapped in a Constructive control surface.',
      props: [
        {
          name: 'size',
          type: "'sm' | 'default' | 'lg' | number",
          default: "'default'",
          description: 'Selects a visual size; numeric values are exposed through data-size for custom styling.',
        },
        {
          name: 'unstyled',
          type: 'boolean',
          default: 'false',
          description: 'Removes the outer control styling for composition inside components such as Input Group.',
        },
        { name: 'value', type: 'string', description: 'Controlled textarea value.' },
        { name: 'defaultValue', type: 'string', description: 'Initial uncontrolled value.' },
        {
          name: 'onChange',
          type: 'ChangeEventHandler<HTMLTextAreaElement>',
          description: 'Runs when the native textarea value changes.',
        },
      ],
      upstream: reactTextarea,
    },
  ],
});
