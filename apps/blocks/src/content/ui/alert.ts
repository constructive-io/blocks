import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactDiv = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

const cva = {
  href: 'https://cva.style/docs/getting-started/variants',
  label: 'CVA variant options',
} as const;

export const alertDocs = definePrimitiveDocs({
  name: 'alert',
  stateModel: 'stateless',
  whenToUse: [
    'Use Alert for timely status, validation, or system feedback that should remain visible in the page.',
    'Use inline helper text for persistent instructions. Use Alert Dialog when someone must acknowledge or confirm a decision before continuing.',
  ],
  usage: {
    demo: 'BasicAlertDemo',
    description:
      'Compose AlertTitle and AlertDescription inside Alert. Add a direct-child icon when it helps identify the message without replacing its text.',
  },
  examples: [
    {
      title: 'Semantic variants',
      description: 'Choose a variant that matches the meaning of the message rather than its visual prominence.',
      demo: 'AlertVariantsDemo',
    },
  ],
  accessibility: [
    'Alert renders with role="alert", so reserve it for important content that should be announced when it appears. Do not use it for ordinary static page copy.',
    'Write a specific AlertTitle and a self-contained AlertDescription. AlertTitle renders an h5, so keep it consistent with the surrounding heading order.',
    'Color and icons must reinforce the message rather than carry its meaning alone. Mark decorative icons as aria-hidden.',
    'Alert does not move focus, so use Alert Dialog when the message requires an immediate response.',
  ],
  api: [
    {
      name: 'Alert',
      description: 'Callout container with alert semantics and semantic color variants.',
      props: [
        {
          name: 'variant',
          type: "'default' | 'destructive' | 'info' | 'success' | 'warning'",
          default: "'default'",
          description: 'Sets the semantic treatment and exposes the selected value through data-variant.',
        },
      ],
      upstream: reactDiv,
    },
    {
      name: 'AlertTitle',
      description: 'Heading rendered as an h5 and aligned with an optional direct-child icon.',
      upstream: reactDiv,
    },
    {
      name: 'AlertDescription',
      description: 'Supporting message container with variant-aware text treatment.',
      upstream: reactDiv,
    },
    {
      name: 'alertVariants',
      description:
        'Public CVA helper for producing the same Alert variant classes outside the component; it accepts the same variant values as Alert.',
      upstream: cva,
    },
  ],
});
