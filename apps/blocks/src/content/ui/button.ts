import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactButton = {
  href: 'https://react.dev/reference/react-dom/components/button',
  label: 'React button props',
} as const;

const cva = {
  href: 'https://cva.style/docs/getting-started/variants',
  label: 'CVA variant options',
} as const;

export const buttonDocs = definePrimitiveDocs({
  name: 'button',
  stateModel: 'stateless',
  whenToUse: [
    'Use Button for an immediate action such as saving, creating, opening, or deleting.',
    'Use a link for navigation to another location. Use an icon-only Button only when the symbol is familiar and the control has an accessible name.',
  ],
  usage: {
    demo: 'BasicButtonDemo',
    description: 'Use the default variant for the primary action in a region and write a short verb-led label.',
  },
  examples: [
    {
      title: 'Variants and states',
      description: 'Match visual hierarchy to the action, and disable a button while the same action is already running.',
      demo: 'ButtonVariantsDemo',
    },
    {
      title: 'Sizes and icons',
      description: 'Use text sizes for density changes and icon sizes for controls whose visible content is only an icon.',
      demo: 'ButtonSizesDemo',
    },
    {
      title: 'Render as a child',
      description: 'Set asChild to apply Button behavior and styles to one child element, such as a navigation link.',
      demo: 'ButtonAsChildDemo',
    },
  ],
  accessibility: [
    'Give every Button a concise accessible name. Add aria-label to icon-only buttons and keep decorative icons out of the accessibility tree.',
    'Button defaults type to "button" so it does not submit a form accidentally. Set type="submit" for the form’s submit action.',
    'Use disabled while an action cannot run. For pending work, pair disabled with aria-busy and visible status text rather than showing an unlabeled spinner alone.',
  ],
  api: [
    {
      name: 'Button',
      description: 'Native button by default, with Constructive variants, sizes, and optional child-slot composition.',
      props: [
        {
          name: 'variant',
          type:
            "'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive' | 'destructive-outline'",
          default: "'default'",
          description: 'Sets the action hierarchy and color treatment.',
        },
        {
          name: 'size',
          type:
            "'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg' | 'icon-xl'",
          default: "'default'",
          description: 'Sets the control dimensions, spacing, and icon scale.',
        },
        {
          name: 'static',
          type: 'boolean',
          default: 'false',
          description: 'Disables the tactile press-scale animation when motion would distract from the interaction.',
        },
        {
          name: 'asChild',
          type: 'boolean',
          default: 'false',
          description: 'Merges Button props and classes onto its single child instead of rendering a button element.',
        },
        {
          name: 'type',
          type: "'button' | 'submit' | 'reset'",
          default: "'button'",
          description: 'Sets native button behavior when asChild is false.',
        },
      ],
      upstream: reactButton,
    },
    {
      name: 'buttonVariants',
      description:
        'Public CVA helper for producing Button classes without rendering Button; it accepts the same variant, size, and static options.',
      upstream: cva,
    },
  ],
});
