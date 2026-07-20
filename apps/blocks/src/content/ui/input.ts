import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiInput = {
  href: 'https://base-ui.com/react/components/input',
  label: 'Base UI Input props',
} as const;

export const inputDocs = definePrimitiveDocs({
  name: 'input',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Input for a single line of text, a native typed value such as email or search, or a file selection.',
    'Use Textarea for multi-line content. Use Select or Radio Group when the value must come from a fixed set of options.',
  ],
  usage: {
    demo: 'BasicInputDemo',
    description: 'Pair Input with a visible Label and choose the native type that matches the value being collected.',
  },
  state: {
    title: 'Controlled and uncontrolled value',
    description:
      'Use defaultValue when the native input can own its value. Pass value with onValueChange or onChange when React state is authoritative.',
    demo: 'ControlledInputDemo',
  },
  examples: [
    {
      title: 'Validation and disabled states',
      description: 'Pair aria-invalid with an associated error message, and use disabled when the value cannot be edited or submitted.',
      demo: 'InputStatesDemo',
    },
    {
      title: 'Sizes',
      description: 'Use a named size to change the visual height or a numeric size to set the native input width hint.',
      demo: 'InputSizesDemo',
    },
  ],
  accessibility: [
    'Associate a visible Label with Input using matching htmlFor and id values. Placeholder text is an example, not a replacement for a label.',
    'Set aria-invalid when validation fails and connect the error text with aria-describedby. Do not communicate an error through border color alone.',
    'Choose an accurate type, name, autoComplete, and inputMode so browsers and assistive technology can provide the right interaction.',
  ],
  api: [
    {
      name: 'Input',
      description: 'Styled Base UI input wrapped in a Constructive control surface.',
      props: [
        {
          name: 'size',
          type: "'sm' | 'default' | 'lg' | number",
          default: "'default'",
          description: 'Selects a visual size, or forwards a numeric value to the native input size attribute.',
        },
        {
          name: 'unstyled',
          type: 'boolean',
          default: 'false',
          description: 'Removes the outer control styling for composition inside components such as Input Group.',
        },
        { name: 'value', type: 'string | number | readonly string[]', description: 'Controlled native value.' },
        { name: 'defaultValue', type: 'string | number | readonly string[]', description: 'Initial uncontrolled value.' },
        {
          name: 'onValueChange',
          type: '(value: string, eventDetails) => void',
          description: 'Base UI callback that reports the current string value.',
        },
        {
          name: 'placeholder',
          type: 'string',
          description: 'Native placeholder. A single space activates the control’s floating-label spacing.',
        },
      ],
      upstream: baseUiInput,
    },
  ],
});
