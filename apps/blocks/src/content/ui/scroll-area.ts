import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiScrollArea = {
  href: 'https://base-ui.com/react/components/scroll-area',
  label: 'Base UI Scroll Area props',
} as const;

export const scrollAreaDocs = definePrimitiveDocs({
  name: 'scroll-area',
  stateModel: 'stateless',
  whenToUse: [
    'Use Scroll Area when content must stay within a bounded region and the scrollbar needs a consistent visual treatment.',
    'Use normal page scrolling for primary document content. Avoid nested scroll regions unless the boundary represents a distinct workspace or list.',
  ],
  usage: {
    demo: 'BasicScrollAreaDemo',
    description:
      'Give ScrollArea an explicit width or height, then render normal document content inside it. The component supplies its viewport, both scrollbars, and the corner automatically.',
  },
  examples: [
    {
      title: 'Horizontal overflow',
      description: 'Use a content width larger than the viewport when items should remain in one horizontal row.',
      demo: 'HorizontalScrollAreaDemo',
    },
    {
      title: 'Reserved scrollbar gutter',
      description: 'Enable scrollbarGutter when an appearing scrollbar must not overlap edge-aligned content.',
      demo: 'ScrollAreaGutterDemo',
    },
  ],
  accessibility: [
    'Keep a visible focus indicator on the viewport and preserve a clear boundary around nested scrolling regions so keyboard users know which area will scroll.',
    'Use headings, lists, and other native structure inside ScrollArea; the viewport changes overflow behavior but does not provide content semantics.',
    'Do not hide essential controls behind scrollFade. The fade is a visual overflow cue, so content and controls still need sufficient contrast when they reach an edge.',
  ],
  api: [
    {
      name: 'ScrollArea',
      description: 'Root and viewport composition with built-in horizontal and vertical scrollbars.',
      props: [
        {
          name: 'scrollFade',
          type: 'boolean',
          default: 'false',
          description: 'Adds edge masks that reflect the remaining overflow in each direction.',
        },
        {
          name: 'scrollbarGutter',
          type: 'boolean',
          default: 'false',
          description: 'Reserves inline or block-end spacing when the corresponding scrollbar is present.',
        },
      ],
      upstream: baseUiScrollArea,
    },
    {
      name: 'ScrollBar',
      description: 'Styled scrollbar used internally by ScrollArea and available for custom Base UI compositions.',
      props: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'vertical'",
          description: 'Sets the scrollbar axis.',
        },
      ],
      upstream: baseUiScrollArea,
    },
  ],
});
