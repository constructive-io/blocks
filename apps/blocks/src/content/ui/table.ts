import { definePrimitiveDocs } from '@/lib/primitive-docs';

const htmlTable = {
  href: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table',
  label: 'HTML table elements',
} as const;

export const tableDocs = definePrimitiveDocs({
  name: 'table',
  stateModel: 'stateless',
  whenToUse: [
    'Use Table for records whose meaning depends on comparing values across consistent rows and columns.',
    'Use a list when each record has a different structure or should be read independently. Use cards when each record needs richer actions and hierarchy than column comparison.',
  ],
  usage: {
    demo: 'BasicTableDemo',
    description:
      'Compose native table regions with TableHeader, TableBody, TableRow, TableHead, and TableCell. Add TableCaption when the surrounding heading does not fully identify the data.',
  },
  examples: [
    {
      title: 'Wide table',
      description: 'Set a practical minimum table width and let the Table container scroll horizontally on narrower viewports.',
      demo: 'WideTableDemo',
    },
  ],
  accessibility: [
    'Use Table only for tabular data, keep header and body regions intact, and set scope="col" or scope="row" when a header relationship is not obvious.',
    'Provide TableCaption or a nearby heading that clearly identifies the dataset. Keep captions concise and describe filtering or sorting state separately when it changes the result.',
    'Table does not own sorting, selection, or pagination. Use native buttons and checkboxes with explicit accessible names when the application adds those interactions.',
  ],
  api: [
    {
      name: 'Table',
      description: 'Native table wrapped in a horizontal overflow container.',
      props: [
        {
          name: 'containerClassName',
          type: 'string',
          description: 'Adds classes to the horizontal scroll wrapper rather than the table element.',
        },
        {
          name: 'containerProps',
          type: "Omit<ComponentProps<'div'>, 'className' | 'children'>",
          description: 'Passes refs, data attributes, and other div props to the scroll wrapper.',
        },
      ],
      upstream: htmlTable,
    },
    {
      name: 'TableHeader',
      description: 'Thead region with the shared header-row treatment.',
      upstream: htmlTable,
    },
    {
      name: 'TableBody',
      description: 'Tbody region that removes the final row divider.',
      upstream: htmlTable,
    },
    {
      name: 'TableFooter',
      description: 'Tfoot region for totals or other column summaries.',
      upstream: htmlTable,
    },
    {
      name: 'TableRow',
      description: 'Tr element with hover and data-state="selected" treatments.',
      upstream: htmlTable,
    },
    {
      name: 'TableHead',
      description: 'Th element for a column or row header.',
      props: [
        {
          name: 'scope',
          type: "'col' | 'row' | 'colgroup' | 'rowgroup'",
          description: 'Associates the header with the cells it describes.',
        },
      ],
      upstream: htmlTable,
    },
    {
      name: 'TableCell',
      description: 'Td element for one data or summary cell.',
      props: [
        {
          name: 'colSpan',
          type: 'number',
          description: 'Makes the cell span multiple columns, commonly for footer summaries.',
        },
      ],
      upstream: htmlTable,
    },
    {
      name: 'TableCaption',
      description: 'Caption that identifies or summarizes the table and renders at its visual bottom.',
      upstream: htmlTable,
    },
  ],
});
