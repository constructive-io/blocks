import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiProgress = {
  href: 'https://base-ui.com/react/components/progress',
  label: 'Base UI Progress props',
} as const;

export const progressDocs = definePrimitiveDocs({
  name: 'progress',
  stateModel: 'controlled-only',
  whenToUse: [
    'Use Progress when an operation needs persistent feedback, either with measurable completion or an explicitly indeterminate state.',
    'Use Skeleton for the loading shape of page content, and use a compact spinner when available space cannot support a progress track.',
  ],
  usage: {
    demo: 'BasicProgressDemo',
    description: 'Pass the current numeric value and give Progress an accessible name that identifies the operation.',
  },
  state: {
    title: 'Externally owned progress',
    description:
      'Progress does not update itself. Pass a number between min and max for determinate work, or pass null explicitly while completion cannot be calculated; min defaults to 0 and max defaults to 100.',
    demo: 'ControlledProgressDemo',
  },
  examples: [
    {
      title: 'Indeterminate progress',
      description: 'Use a null value when work is active but no meaningful completion percentage is available.',
      demo: 'IndeterminateProgressDemo',
    },
    {
      title: 'Custom ranges',
      description: 'Set min and max for non-percentage ranges and provide a human-readable value for assistive technology.',
      demo: 'ProgressRangeDemo',
    },
  ],
  accessibility: [
    'Give each Progress an accessible name with aria-label or aria-labelledby so its value is tied to a specific operation.',
    'Pass null only when completion is genuinely unknown. For determinate work, keep value within min and max and update it as the operation advances.',
    'Use getAriaValueText or aria-valuetext when the numeric value represents units, steps, or another meaning that a percentage does not explain.',
  ],
  api: [
    {
      name: 'Progress',
      description: 'Base UI progress root with a Constructive track and animated indicator.',
      props: [
        {
          name: 'value',
          type: 'number | null',
          required: true,
          description: 'Required current value. Pass null explicitly for indeterminate progress.',
        },
        { name: 'min', type: 'number', default: '0', description: 'Lower bound of the progress range.' },
        { name: 'max', type: 'number', default: '100', description: 'Upper bound of the progress range.' },
        {
          name: 'getAriaValueText',
          type: '(formattedValue: string | null, value: number | null) => string',
          description: 'Returns the human-readable value announced by assistive technology.',
        },
        {
          name: 'format',
          type: 'Intl.NumberFormatOptions',
          description: 'Controls how Base UI formats the value.',
        },
        {
          name: 'locale',
          type: 'Intl.LocalesArgument',
          description: 'Locale used to format the value; the runtime locale is used by default.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Adds classes to the rendered track rather than the progress root.',
        },
      ],
      upstream: baseUiProgress,
    },
  ],
});
