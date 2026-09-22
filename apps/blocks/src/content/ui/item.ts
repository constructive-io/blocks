import { definePrimitiveDocs } from '@/lib/primitive-docs';

export const itemDocs = definePrimitiveDocs({
  name: 'item',
  stateModel: 'stateless',
  whenToUse: [
    'Use Item for a row of entity content — media, title, description, and actions — in lists, settings screens, and search results.',
    'Use Table when rows share strict columns. Use Card when the content needs a standalone surface rather than a list row.',
  ],
  usage: {
    demo: 'BasicItemDemo',
    description:
      'Compose ItemMedia, ItemContent with ItemTitle and ItemDescription, and ItemActions inside an Item. Group rows in an ItemGroup, which renders list semantics.',
  },
  examples: [
    {
      title: 'List group',
      description: 'ItemGroup applies role="list" and separates rows with hairline dividers via ItemSeparator.',
      demo: 'ItemGroupDemo',
    },
    {
      title: 'Link row',
      description: 'Set asChild on Item and render an anchor child to make the whole row navigate.',
      demo: 'ItemLinkDemo',
    },
  ],
  accessibility: [
    'Render rows inside ItemGroup so they expose listitem semantics within a list.',
    'Give icon-only controls inside ItemActions their own accessible names — the row title does not describe the action.',
    'With asChild the Item merges onto its child element, so a link row keeps real anchor semantics and keyboard behavior.',
  ],
  api: [
    {
      name: 'Item',
      description: 'Row container with density and surface variants.',
      props: [
        {
          name: 'variant',
          type: "'default' | 'outline' | 'muted'",
          default: "'default'",
          description: 'Surface treatment.',
        },
        { name: 'size', type: "'default' | 'sm' | 'xs'", default: "'default'", description: 'Row density.' },
        {
          name: 'asChild',
          type: 'boolean',
          default: 'false',
          description: 'Merges props onto the child element, for example to render the row as a link.',
        },
      ],
    },
    {
      name: 'ItemMedia',
      description: 'Leading media slot.',
      props: [
        {
          name: 'variant',
          type: "'default' | 'icon' | 'image'",
          default: "'default'",
          description: 'Icon chip or outlined image treatment.',
        },
      ],
    },
    { name: 'ItemContent', description: 'Flexible middle column that holds the title and description.' },
    { name: 'ItemTitle', description: 'Primary row text.' },
    { name: 'ItemDescription', description: 'Secondary supporting text that clamps to two lines.' },
    { name: 'ItemActions', description: 'Trailing actions slot.' },
    { name: 'ItemGroup', description: 'List wrapper that applies role="list" and groups related rows.' },
    { name: 'ItemSeparator', description: 'Hairline divider between rows in a group.' },
    { name: 'ItemHeader', description: 'Optional slot laid out across the top of the row.' },
    { name: 'ItemFooter', description: 'Optional slot laid out across the bottom of the row.' },
  ],
});
