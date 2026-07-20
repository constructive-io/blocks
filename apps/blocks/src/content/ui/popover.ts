import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiPopover = {
  href: 'https://base-ui.com/react/components/popover',
  label: 'Base UI Popover props',
} as const;

const reactDomCommonProps = {
  href: 'https://react.dev/reference/react-dom/components/common',
  label: 'React DOM common props',
} as const;

export const popoverDocs = definePrimitiveDocs({
  name: 'popover',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Popover for a lightweight contextual surface with explanatory text, fields, or a few related controls.',
    'Use Tooltip for a short non-interactive hint, Dropdown Menu for action-only choices, and Dialog when the task needs modal focus.',
  ],
  usage: {
    demo: 'BasicPopoverDemo',
    description:
      'Place PopoverTrigger and PopoverContent inside Popover. Name the surface with PopoverTitle, add PopoverDescription when useful, and include PopoverClose when the workflow needs an explicit completion action. Set nativeButton to false when render or asChild supplies a non-button trigger or close control.',
  },
  state: {
    title: 'Controlled and uncontrolled open state',
    description:
      'Popover owns visibility by default and accepts defaultOpen for initialization. Pass open and onOpenChange when application state must decide whether a close request succeeds.',
    demo: 'ControlledPopoverDemo',
  },
  examples: [
    {
      title: 'Placement and arrow',
      description: 'Choose a preferred side and enable the arrow when the relationship to the trigger needs emphasis.',
      demo: 'PositionedPopoverDemo',
    },
  ],
  accessibility: [
    'Give PopoverTrigger an accessible name and use PopoverTitle to name the floating surface.',
    'Keep form controls visibly labeled. Include a reachable PopoverClose when completing the interaction does not naturally dismiss the surface.',
    'Base UI connects the title and description, handles Escape and outside dismissal, preserves nested portal relationships, and returns focus to the trigger when appropriate.',
  ],
  api: [
    {
      name: 'Popover',
      description: 'Root that owns or receives the open state.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled open state.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial open state in uncontrolled usage.' },
        { name: 'onOpenChange', type: 'Base UI callback', description: 'Runs for open and close requests with event details.' },
        {
          name: 'modal',
          type: "boolean | 'trap-focus'",
          default: 'false',
          description: 'Limits interaction outside the popover; include PopoverClose when trapping focus.',
        },
      ],
      upstream: baseUiPopover,
    },
    {
      name: 'PopoverTrigger',
      description: 'Button that opens the popover.',
      props: [
        { name: 'render', type: 'ReactElement | render function', description: 'Preferred Base UI composition API.' },
        { name: 'asChild', type: 'boolean', default: 'false', description: 'Compatibility composition API.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set to false when render or asChild resolves to a non-button element.',
        },
      ],
      upstream: baseUiPopover,
    },
    {
      name: 'PopoverContent',
      description: 'Portal, positioner, popup, and optional arrow composition.',
      props: [
        { name: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'bottom'", description: 'Preferred side of the trigger.' },
        { name: 'align', type: "'start' | 'center' | 'end'", default: "'center'", description: 'Alignment along the trigger edge.' },
        { name: 'sideOffset', type: 'number', default: '4', description: 'Distance from the trigger.' },
        { name: 'showArrow', type: 'boolean', default: 'false', description: 'Renders an arrow pointing toward the trigger.' },
        { name: 'onOpenAutoFocus', type: 'function', deprecated: true, description: 'Compatibility prop; Base UI uses its focus contract.' },
        { name: 'onCloseAutoFocus', type: 'function', deprecated: true, description: 'Compatibility prop; Base UI manages focus return.' },
        { name: 'onFocusOutside', type: 'function', deprecated: true, description: 'Compatibility prop; inspect onOpenChange event details.' },
        { name: 'onEscapeKeyDown', type: 'function', deprecated: true, description: 'Compatibility prop; inspect onOpenChange event details.' },
      ],
      upstream: baseUiPopover,
    },
    { name: 'PopoverTitle', description: 'Accessible title for the popup.', upstream: baseUiPopover },
    { name: 'PopoverDescription', description: 'Accessible supporting description for the popup.', upstream: baseUiPopover },
    {
      name: 'PopoverClose',
      description: 'Button that requests the popover to close.',
      props: [
        { name: 'render', type: 'ReactElement | render function', description: 'Preferred Base UI composition API.' },
        { name: 'asChild', type: 'boolean', default: 'false', description: 'Compatibility composition API.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set to false when render or asChild resolves to a non-button element.',
        },
      ],
      upstream: baseUiPopover,
    },
    {
      name: 'PopoverAnchor',
      description: 'Deprecated compatibility placeholder that renders a div and does not change Base UI positioning.',
      props: [{ name: 'children', type: 'ReactNode', deprecated: true, description: 'Compatibility content only; use the trigger as the anchor.' }],
      upstream: reactDomCommonProps,
    },
  ],
});
