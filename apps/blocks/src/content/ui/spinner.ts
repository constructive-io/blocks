import { definePrimitiveDocs } from '@/lib/primitive-docs';

export const spinnerDocs = definePrimitiveDocs({
  name: 'spinner',
  stateModel: 'stateless',
  whenToUse: [
    'Use Spinner for a short, indeterminate wait — a query running, a deploy starting, or a button busy state.',
    'Use Progress when completion is measurable. Use Skeleton when the shape of the incoming content is known and you can preserve its layout.',
  ],
  usage: {
    demo: 'BasicSpinnerDemo',
    description:
      'Spinner renders a spinning status icon sized by className. It carries role="status" and an aria-label out of the box.',
  },
  examples: [
    {
      title: 'Inline status',
      description:
        'Pair the spinner with a short description of the work in progress so the wait is explained, not just animated.',
      demo: 'SpinnerInlineDemo',
    },
    {
      title: 'Sizes',
      description: 'Scale the spinner with size utilities to match the surrounding text or button.',
      demo: 'SpinnerSizesDemo',
    },
  ],
  accessibility: [
    'Spinner renders role="status" with a default “Loading” label — override aria-label with the specific task, such as “Deploying”, when context helps.',
    'Under prefers-reduced-motion the spinner falls back to a pulse, so meaning does not depend on rotation.',
    'Do not rely on the spinner alone for long operations — surface progress or a cancel affordance when a wait may exceed a few seconds.',
  ],
  api: [
    {
      name: 'Spinner',
      description: 'Status icon with rotation, reduced-motion fallback, and a default accessible name.',
      props: [
        {
          name: 'className',
          type: 'string',
          description: 'Size and color utilities, for example size-5 text-muted-foreground.',
        },
        {
          name: 'aria-label',
          type: 'string',
          default: '"Loading"',
          description: 'Accessible name announced with the status role.',
        },
      ],
    },
  ],
});
