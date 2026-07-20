import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactSpan = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

const cva = {
  href: 'https://cva.style/docs/getting-started/variants',
  label: 'CVA variant options',
} as const;

export const badgeDocs = definePrimitiveDocs({
  name: 'badge',
  stateModel: 'stateless',
  whenToUse: [
    'Use Badge for compact status, category, count, or metadata that belongs beside another piece of content.',
    'Use Alert for a full message that needs attention, and use Button when the element performs an action.',
  ],
  usage: {
    demo: 'BasicBadgeDemo',
    description: 'Place a short text label inside Badge and select a variant that matches the information it conveys.',
  },
  examples: [
    {
      title: 'Variants',
      description: 'Use neutral variants for metadata and semantic variants for recognizable states.',
      demo: 'BadgeVariantsDemo',
    },
    {
      title: 'Sizes',
      description: 'Use size to match the badge to the density and type scale of its surrounding content.',
      demo: 'BadgeSizesDemo',
    },
  ],
  accessibility: [
    'Keep badge text concise and meaningful without color. A semantic variant does not add status semantics, so place changing information in an appropriate live region when it must be announced.',
    'Mark decorative icons as aria-hidden. Include visually hidden text when an icon or abbreviated value would otherwise be ambiguous.',
    'Badge renders a non-interactive span. Use a link or Button for navigation and actions instead of adding click behavior to Badge.',
  ],
  api: [
    {
      name: 'Badge',
      description: 'Inline span for compact metadata and status labels.',
      props: [
        {
          name: 'variant',
          type:
            "'default' | 'secondary' | 'outline' | 'destructive' | 'error' | 'info' | 'success' | 'warning'",
          default: "'default'",
          description: 'Sets the visual color treatment; the rendered span does not add status semantics.',
        },
        {
          name: 'size',
          type: "'sm' | 'default' | 'lg'",
          default: "'default'",
          description: 'Sets the badge padding and text size.',
        },
      ],
      upstream: reactSpan,
    },
    {
      name: 'badgeVariants',
      description:
        'Public CVA helper for applying Badge classes to another element; it accepts the same variant and size values as Badge.',
      upstream: cva,
    },
  ],
});
