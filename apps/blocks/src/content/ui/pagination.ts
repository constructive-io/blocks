import { definePrimitiveDocs } from '@/lib/primitive-docs';

const reactDom = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM props',
} as const;

export const paginationDocs = definePrimitiveDocs({
  name: 'pagination',
  stateModel: 'host-owned',
  whenToUse: [
    'Use Pagination when a large result set is divided into addressable pages and people need to move between them.',
    'Use a load-more action when preserving context matters more than direct page access. Use infinite scrolling only when the content is exploratory and returning to a precise position is unimportant.',
  ],
  usage: {
    demo: 'BasicPaginationDemo',
    description:
      'Place each PaginationLink, PaginationPrevious, PaginationNext, or PaginationEllipsis inside a PaginationItem and mark the current destination with isActive.',
  },
  state: {
    title: 'Application-owned page state',
    description:
      'Pagination does not own a page value. Derive href, isActive, and isDisabled from router or application state, then update that state through normal link navigation or guarded event handlers.',
    demo: 'InteractivePaginationDemo',
  },
  examples: [
    {
      title: 'Previous and next',
      description: 'Use only the directional controls when direct page numbers do not add useful context.',
      demo: 'SimplePaginationDemo',
    },
  ],
  accessibility: [
    'Pagination renders a navigation landmark labeled “pagination”. Provide meaningful href values so links retain native navigation, open-in-new-tab, and history behavior.',
    'Set isActive on exactly one PaginationLink; it applies aria-current="page". Set isDisabled on unavailable directional links and ensure routing logic cannot navigate past the valid range.',
    'Keep PaginationEllipsis non-interactive because it is hidden from assistive technology. Use a labeled link or menu instead when omitted pages must be directly reachable.',
  ],
  api: [
    {
      name: 'Pagination',
      description: 'Navigation landmark that centers the pagination controls.',
      upstream: reactDom,
    },
    {
      name: 'PaginationContent',
      description: 'Wrapping list for pagination items, with responsive spacing and line wrapping.',
      upstream: reactDom,
    },
    {
      name: 'PaginationItem',
      description: 'List item that contains one page control or ellipsis.',
      upstream: reactDom,
    },
    {
      name: 'PaginationLink',
      description: 'Anchor styled as a compact button for a page destination.',
      props: [
        {
          name: 'isActive',
          type: 'boolean',
          default: 'false',
          description: 'Marks the destination as the current page and selects the outline treatment.',
        },
        {
          name: 'isDisabled',
          type: 'boolean',
          default: 'false',
          description: 'Marks the anchor unavailable, removes it from the tab order, and applies disabled pointer behavior.',
        },
        {
          name: 'size',
          type:
            "'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg' | 'icon-xl'",
          default: "'icon'",
          description: 'Selects sizing from the public Button size variants.',
        },
      ],
      upstream: reactDom,
    },
    {
      name: 'PaginationPrevious',
      description: 'Previous-page PaginationLink with a built-in accessible label and responsive visible text.',
      upstream: reactDom,
    },
    {
      name: 'PaginationNext',
      description: 'Next-page PaginationLink with a built-in accessible label and responsive visible text.',
      upstream: reactDom,
    },
    {
      name: 'PaginationEllipsis',
      description: 'Presentation-only marker for a gap in the visible page range.',
      upstream: reactDom,
    },
  ],
});
