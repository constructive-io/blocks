import { definePrimitiveDocs } from '@/lib/primitive-docs';

const panelProps = {
  href: 'https://github.com/bvaughn/react-resizable-panels',
  label: 'react-resizable-panels props',
} as const;

export const resizableDocs = definePrimitiveDocs({
  name: 'resizable',
  stateModel: 'host-owned',
  whenToUse: [
    'Use Resizable when adjacent work areas need user-adjustable space, such as an editor beside a preview or a sidebar beside a data grid.',
    'Use a fixed responsive layout when resizing would not improve the task. Use a collapsible disclosure when a secondary panel only needs to be shown or hidden.',
  ],
  usage: {
    demo: 'BasicResizableDemo',
    description:
      'Place ResizablePanel and ResizableHandle as alternating children of ResizablePanelGroup, set the group direction, and give each panel practical size constraints.',
  },
  state: {
    title: 'Layout callbacks and persistence',
    description:
      'The panel group owns its live layout: defaultSize initializes panels and onLayout reports each committed percentage. Use autoSaveId for persistence, or an imperative group or panel ref when the application must set a layout directly.',
    demo: 'ObservedResizableDemo',
  },
  examples: [
    {
      title: 'Vertical panels',
      description: 'Set direction="vertical" to stack panels and rotate the handle treatment automatically.',
      demo: 'VerticalResizableDemo',
    },
  ],
  accessibility: [
    'Keep one ResizableHandle between every pair of ResizablePanel elements. The underlying library gives each handle separator semantics and keyboard resizing behavior.',
    'Give each handle an aria-label when the adjacent panel names do not make its purpose obvious. A visible grip is decorative and does not replace that name.',
    'Choose minSize and maxSize values that keep both panels usable at every supported viewport, and verify resizing with arrow keys as well as a pointer.',
  ],
  api: [
    {
      name: 'ResizablePanelGroup',
      description: 'Root layout that coordinates panel percentages and resize handles.',
      props: [
        {
          name: 'direction',
          type: "'horizontal' | 'vertical'",
          required: true,
          description: 'Sets the panel axis and matching keyboard resize direction.',
        },
        {
          name: 'onLayout',
          type: '(layout: number[]) => void',
          description: 'Reports the current panel sizes as percentages after layout changes.',
        },
        {
          name: 'autoSaveId',
          type: 'string',
          description: 'Persists and restores the layout under a stable identifier.',
        },
        {
          name: 'keyboardResizeBy',
          type: 'number',
          description: 'Sets the percentage moved by an arrow-key interaction.',
        },
      ],
      upstream: panelProps,
    },
    {
      name: 'ResizablePanel',
      description: 'One region in the group with percentage-based constraints and resize callbacks.',
      props: [
        { name: 'defaultSize', type: 'number', description: 'Initial panel size as a percentage.' },
        { name: 'minSize', type: 'number', description: 'Smallest allowed panel size as a percentage.' },
        { name: 'maxSize', type: 'number', description: 'Largest allowed panel size as a percentage.' },
        { name: 'collapsible', type: 'boolean', description: 'Allows the panel to collapse beyond its minimum size.' },
        { name: 'collapsedSize', type: 'number', description: 'Panel percentage used in its collapsed state.' },
        {
          name: 'onResize',
          type: '(size: number, previousSize?: number) => void',
          description: 'Runs when this panel changes size.',
        },
      ],
      upstream: panelProps,
    },
    {
      name: 'ResizableHandle',
      description: 'Accessible divider that supports pointer and keyboard resizing.',
      props: [
        {
          name: 'withHandle',
          type: 'boolean',
          default: 'false',
          description: 'Shows the Constructive grip treatment in the center of the divider.',
        },
        { name: 'disabled', type: 'boolean', description: 'Prevents the divider from resizing its adjacent panels.' },
        {
          name: 'onDragging',
          type: '(isDragging: boolean) => void',
          description: 'Reports when pointer-driven resizing starts and stops.',
        },
      ],
      upstream: panelProps,
    },
  ],
});
