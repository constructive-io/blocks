import { definePrimitiveDocs } from '@/lib/primitive-docs';

export const buttonGroupDocs = definePrimitiveDocs({
  name: 'button-group',
  stateModel: 'stateless',
  whenToUse: [
    'Use Button Group to join related actions into one control — a save button with a more-actions menu, or previous and next pagination.',
    'Use separate Buttons when the actions are unrelated. Use Toggle Group when the controls hold selection state rather than triggering actions.',
  ],
  usage: {
    demo: 'BasicButtonGroupDemo',
    description:
      'ButtonGroup collapses shared borders and corner radii so the children read as a single segmented control. Insert ButtonGroupSeparator or ButtonGroupText between buttons.',
  },
  examples: [
    {
      title: 'Split action',
      description: 'A primary action joined to a menu trigger for secondary variants of the same action.',
      demo: 'ButtonGroupSplitDemo',
    },
    {
      title: 'Vertical group',
      description: 'Set orientation="vertical" to stack the joined controls.',
      demo: 'ButtonGroupVerticalDemo',
    },
  ],
  accessibility: [
    'ButtonGroup renders role="group" — place it where the grouping is meaningful, and give the group context through a surrounding label or aria-label when the purpose is not obvious.',
    'Every button inside the group keeps its own accessible name; icon-only segments such as a more-actions trigger need aria-label.',
    'Keep related actions only. Grouping unrelated controls implies a relationship that does not exist.',
  ],
  api: [
    {
      name: 'ButtonGroup',
      description: 'Segmented container that joins child controls.',
      props: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'Direction the controls are joined.',
        },
      ],
    },
    {
      name: 'ButtonGroupSeparator',
      description: 'Divider rendered between segments.',
      props: [
        {
          name: 'orientation',
          type: "'vertical' | 'horizontal'",
          description: 'Axis of the divider line — perpendicular to the group.',
        },
      ],
    },
    {
      name: 'ButtonGroupText',
      description: 'A non-interactive text segment inside the group, useful for counts or labels.',
      props: [{ name: 'children', type: 'ReactNode', description: 'Text or icon content.' }],
    },
  ],
});
