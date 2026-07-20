import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactDom = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

export const breadcrumbDocs = definePrimitiveDocs({
  name: 'breadcrumb',
  stateModel: 'stateless',
  whenToUse: [
    'Use Breadcrumb when a page sits inside a hierarchy and people benefit from seeing or moving through its parent levels.',
    'Use primary navigation for top-level destinations and browser back behavior for chronological history. Breadcrumbs describe location, not the order in which someone visited pages.',
  ],
  usage: {
    demo: 'BasicBreadcrumbDemo',
    description:
      'Compose BreadcrumbItem elements inside BreadcrumbList, insert a BreadcrumbSeparator between each item, and render the current location with BreadcrumbPage.',
  },
  examples: [
    {
      title: 'Collapsed path',
      description: 'Use BreadcrumbEllipsis to summarize middle levels that do not need direct access while keeping the root and current location visible.',
      demo: 'CollapsedBreadcrumbDemo',
    },
    {
      title: 'Custom separator',
      description: 'Pass a child to BreadcrumbSeparator when the hierarchy uses a different visual delimiter.',
      demo: 'CustomSeparatorBreadcrumbDemo',
    },
  ],
  accessibility: [
    'Breadcrumb renders a navigation landmark labeled “breadcrumb”. Keep BreadcrumbList and BreadcrumbItem intact so assistive technology receives ordered-list semantics.',
    'Render ancestor destinations as BreadcrumbLink and the final location as BreadcrumbPage. BreadcrumbPage sets aria-current="page" and must not navigate to itself.',
    'BreadcrumbSeparator and BreadcrumbEllipsis are hidden from assistive technology. If collapsed levels must remain navigable, pair the ellipsis with an accessible menu or another explicit control.',
  ],
  api: [
    {
      name: 'Breadcrumb',
      description: 'Navigation landmark that labels the hierarchy as a breadcrumb.',
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbList',
      description: 'Ordered list that contains every breadcrumb item and separator.',
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbItem',
      description: 'List item for one destination, current page, or collapsed-path marker.',
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbLink',
      description: 'Ancestor link with muted and hover treatments.',
      props: [
        {
          name: 'asChild',
          type: 'boolean',
          default: 'false',
          description: 'Merges breadcrumb link behavior onto one child, such as a framework Link.',
        },
      ],
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbPage',
      description: 'Current location exposed as a disabled link with aria-current="page".',
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbSeparator',
      description: 'Presentation-only list item between levels; defaults to a chevron.',
      props: [
        {
          name: 'children',
          type: 'ReactNode',
          description: 'Optional visual delimiter that replaces the default chevron.',
        },
      ],
      upstream: reactDom,
    },
    {
      name: 'BreadcrumbEllipsis',
      description: 'Presentation-only marker for levels omitted from the visible path.',
      upstream: reactDom,
    },
  ],
});
