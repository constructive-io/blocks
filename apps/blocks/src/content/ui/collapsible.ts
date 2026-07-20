import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiCollapsible = {
  href: 'https://base-ui.com/react/components/collapsible',
  label: 'Base UI Collapsible props',
} as const;

const mdnSvg = {
  href: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/svg',
  label: 'MDN SVG element reference',
} as const;

export const collapsibleDocs = definePrimitiveDocs({
  name: 'collapsible',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Collapsible for optional supporting content that can be revealed without leaving the current context.',
    'Use Tabs when several peer sections share one area. Use Dialog when the task needs modal focus or a separate decision.',
  ],
  usage: {
    demo: 'BasicCollapsibleDemo',
    description:
      'Place CollapsibleTrigger and CollapsibleContent inside Collapsible. CollapsibleIcon rotates from the root open state without application code. When render or asChild supplies a non-button trigger, set nativeButton to false.',
  },
  state: {
    title: 'Controlled and uncontrolled open state',
    description:
      'Use defaultOpen for an initially expanded uncontrolled disclosure. Pass open and onOpenChange when another control or application state determines visibility.',
    demo: 'ControlledCollapsibleDemo',
  },
  examples: [
    {
      title: 'Initially expanded',
      description: 'Set defaultOpen when the supporting content should be visible on first render.',
      demo: 'DefaultOpenCollapsibleDemo',
    },
  ],
  accessibility: [
    'Use CollapsibleTrigger as the interactive control; Base UI connects it to the panel and reports the expanded state.',
    'Keep the trigger label specific enough to describe the hidden content, and do not place another interactive control inside the trigger.',
    'The panel transition respects reduced-motion preferences and keeps closed content out of interaction when Base UI unmounts it.',
  ],
  api: [
    {
      name: 'Collapsible',
      description: 'Root that owns or receives the disclosure open state.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled open state.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial open state in uncontrolled usage.' },
        { name: 'onOpenChange', type: 'Base UI callback', description: 'Runs when the open state changes.' },
      ],
      upstream: baseUiCollapsible,
    },
    {
      name: 'CollapsibleTrigger',
      description: 'Button that toggles the associated panel.',
      props: [
        { name: 'render', type: 'ReactElement | render function', description: 'Preferred Base UI composition API.' },
        { name: 'asChild', type: 'boolean', default: 'false', description: 'Compatibility composition API that renders the child element.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set to false when render or asChild resolves to a non-button element.',
        },
      ],
      upstream: baseUiCollapsible,
    },
    {
      name: 'CollapsiblePanel',
      description: 'Animated region that contains the disclosed content.',
      props: [
        { name: 'innerClassName', type: 'string', description: 'Class name applied to the inner content wrapper.' },
      ],
      upstream: baseUiCollapsible,
    },
    { name: 'CollapsibleContent', description: 'Compatibility alias for CollapsiblePanel.', upstream: baseUiCollapsible },
    {
      name: 'CollapsibleIcon',
      description: 'Chevron icon that rotates when its owning Collapsible is open.',
      upstream: mdnSvg,
    },
  ],
});
