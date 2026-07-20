import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactDom = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

const cva = {
  href: 'https://cva.style/docs/getting-started/variants',
  label: 'CVA variant options',
} as const;

export const cardDocs = definePrimitiveDocs({
  name: 'card',
  stateModel: 'stateless',
  whenToUse: [
    'Use Card to group related content and actions into a distinct surface that can stand beside other groups.',
    'Use a simple section when the content already belongs to the surrounding page hierarchy. Use a list or table when several records need direct comparison.',
  ],
  usage: {
    demo: 'BasicCardDemo',
    description:
      'Compose CardHeader, CardContent, and CardFooter as needed. Place a semantic heading inside CardTitle because the title part is a styled div.',
  },
  examples: [
    {
      title: 'Surface variants',
      description: 'Choose a variant from the surface hierarchy instead of recreating borders and shadows on each card.',
      demo: 'CardVariantsDemo',
    },
    {
      title: 'Interactive card',
      description: 'Wrap the interactive variant in a real link or button so its visual affordance has matching keyboard and activation behavior.',
      demo: 'InteractiveCardDemo',
    },
  ],
  accessibility: [
    'Card has no landmark or heading semantics by itself. Use a semantic heading inside CardTitle and add section or article semantics only when the content structure calls for them.',
    'The interactive variant changes appearance but Card still renders a div. Wrap it with one link or button, and do not place competing interactive controls inside that wrapper.',
    'Give icon-only controls in CardAction an accessible name and keep the visual reading order aligned with the DOM order.',
  ],
  api: [
    {
      name: 'Card',
      description: 'Root surface with spacing, color, radius, and an optional visual variant.',
      props: [
        {
          name: 'variant',
          type: "'default' | 'elevated' | 'flat' | 'ghost' | 'interactive'",
          default: "'default'",
          description: 'Selects the surface depth and interaction treatment.',
        },
      ],
      upstream: reactDom,
    },
    {
      name: 'CardHeader',
      description: 'Header grid that aligns title and description with an optional CardAction.',
      upstream: reactDom,
    },
    {
      name: 'CardTitle',
      description: 'Styled title container rendered as a div; place the appropriate heading element inside it.',
      upstream: reactDom,
    },
    {
      name: 'CardDescription',
      description: 'Muted supporting text for the card title.',
      upstream: reactDom,
    },
    {
      name: 'CardAction',
      description: 'Action area positioned at the upper end of CardHeader.',
      upstream: reactDom,
    },
    {
      name: 'CardContent',
      description: 'Main card content with horizontal inset spacing.',
      upstream: reactDom,
    },
    {
      name: 'CardFooter',
      description: 'Footer row for supporting actions or summary content.',
      upstream: reactDom,
    },
    {
      name: 'cardVariants',
      description: 'Public CVA helper that accepts variant and className options and returns the same classes as Card.',
      upstream: cva,
    },
  ],
});
