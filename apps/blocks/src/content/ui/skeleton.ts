import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactDiv = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

export const skeletonDocs = definePrimitiveDocs({
  name: 'skeleton',
  stateModel: 'stateless',
  whenToUse: [
    'Use Skeleton while content is loading when preserving its eventual layout reduces movement and helps people understand what is coming.',
    'Use Progress when completion can be measured. Use a short status message when the final layout is unknown or the wait represents an action rather than content loading.',
  ],
  usage: {
    demo: 'BasicSkeletonDemo',
    description:
      'Size each Skeleton to approximate the content it replaces, then group the placeholders inside a loading region with a concise accessible status.',
  },
  examples: [
    {
      title: 'List placeholder',
      description: 'Repeat a stable row shape when the final content is a list, while keeping the loading announcement singular.',
      demo: 'SkeletonListDemo',
    },
  ],
  accessibility: [
    'Mark the loading region aria-busy="true" and provide concise status text for assistive technology. Remove or update that state when the real content arrives.',
    'Hide purely visual placeholder shapes with aria-hidden so a screen reader does not announce a collection of empty div elements.',
    'Match the final layout closely enough to avoid disruptive movement. Skeleton disables its shimmer when reduced motion is requested.',
  ],
  api: [
    {
      name: 'Skeleton',
      description: 'Div placeholder with a theme-aware shimmer and a reduced-motion fallback.',
      upstream: reactDiv,
    },
  ],
});
