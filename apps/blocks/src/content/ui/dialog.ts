import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiDialog = {
  href: 'https://base-ui.com/react/components/dialog',
  label: 'Base UI Dialog props',
} as const;

export const dialogDocs = definePrimitiveDocs({
  name: 'dialog',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Dialog for a focused task or supporting information that temporarily interrupts the current page.',
    'Use Alert Dialog when the interruption requires an explicit decision about a destructive action. Use Sheet when the task benefits from entering from an edge and preserving more page context.',
  ],
  usage: {
    demo: 'BasicDialogDemo',
    description:
      'Compose DialogTrigger and DialogContent inside Dialog, then add a title, description, body, and reachable close control. DialogContent is the standard popup composition and includes the portal, backdrop, viewport, and icon close button.',
  },
  state: {
    title: 'Controlled and uncontrolled visibility',
    description:
      'Use defaultOpen when Dialog can own its initial visibility. Pass open and onOpenChange when application state is authoritative or closing must update related state.',
    demo: 'ControlledDialogDemo',
  },
  examples: [
    {
      title: 'Scrollable content',
      description:
        'Place a long body in DialogPanel so the header and footer stay visible while the panel scrolls within the popup.',
      demo: 'ScrollableDialogDemo',
    },
    {
      title: 'Floating overlays inside a dialog',
      description:
        'Popover, Select, Dropdown Menu, and Tooltip use the dialog’s scoped portal automatically, so their content stays interactive and above the modal.',
      demo: 'NestedOverlayDialogDemo',
    },
    {
      title: 'Custom popup controls',
      description:
        'Use DialogPopup directly when you need to hide the icon close button, disable the mobile edge treatment, or choose the bare footer variant.',
      demo: 'CustomDialogChromeDemo',
    },
  ],
  accessibility: [
    'Every modal DialogContent needs an accessible name; use DialogTitle even when the heading is visually hidden. Add DialogDescription when a short explanation helps someone decide how to proceed.',
    'Keep a DialogClose control inside modal content so touch screen reader users can leave the popup; the built-in icon close button already has an accessible name.',
    'Base UI moves focus into the popup, traps focus for modal dialogs, closes on Escape, and returns focus to the trigger. Use initialFocus or finalFocus only when the default focus target is not appropriate.',
    'Set modal to false only when interaction with the surrounding page must remain available; use trap-focus when focus containment is required without scroll locking or pointer blocking.',
  ],
  api: [
    {
      name: 'Dialog',
      description: 'Root component that manages popup visibility and modal behavior.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled visibility.' },
        { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Initial visibility in uncontrolled usage.' },
        {
          name: 'onOpenChange',
          type: '(open: boolean, details: ChangeEventDetails) => void',
          description: 'Runs when visibility changes and includes the interaction reason.',
        },
        {
          name: 'onOpenChangeComplete',
          type: '(open: boolean) => void',
          description: 'Runs after an opening or closing transition finishes.',
        },
        {
          name: 'modal',
          type: "boolean | 'trap-focus'",
          default: 'true',
          description: 'Controls focus trapping, scroll locking, and outside pointer interaction.',
        },
        {
          name: 'disablePointerDismissal',
          type: 'boolean',
          default: 'false',
          description: 'Prevents outside presses from closing the dialog.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'DialogTrigger',
      description: 'Button that opens the dialog and provides the default focus-return target.',
      props: [
        { name: 'render', type: 'ReactElement | function', description: 'Composes trigger behavior onto another element.' },
        { name: 'asChild', type: 'boolean', description: 'Compatibility composition prop; prefer render.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set false when render or asChild produces a non-button element.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'DialogPortal',
      description: 'Moves dialog parts into the configured portal container and establishes the elevated floating layer.',
      props: [
        { name: 'container', type: 'HTMLElement | null', description: 'Explicit portal destination.' },
        {
          name: 'keepMounted',
          type: 'boolean',
          default: 'false',
          description: 'Keeps portal contents mounted when the dialog is closed.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'DialogClose',
      description: 'Button that closes the dialog.',
      props: [
        { name: 'render', type: 'ReactElement | function', description: 'Composes close behavior onto another element.' },
        { name: 'asChild', type: 'boolean', description: 'Compatibility composition prop; prefer render.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set false when render or asChild produces a non-button element.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'DialogBackdrop',
      description: 'Styled overlay rendered beneath the popup.',
      props: [
        {
          name: 'forceRender',
          type: 'boolean',
          default: 'false',
          description: 'Renders the backdrop even when this dialog is nested in another dialog.',
        },
      ],
      upstream: baseUiDialog,
    },
    { name: 'DialogOverlay', description: 'Compatibility alias for DialogBackdrop.', upstream: baseUiDialog },
    {
      name: 'DialogPopup',
      description: 'Popup composition that includes DialogPortal, DialogBackdrop, DialogViewport, and a scoped floating portal.',
      props: [
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'true',
          description: 'Shows the accessible icon close button.',
        },
        {
          name: 'bottomStickOnMobile',
          type: 'boolean',
          default: 'true',
          description: 'Places the popup against the bottom edge on small screens.',
        },
        {
          name: 'initialFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Selects the element focused when the dialog opens.',
        },
        {
          name: 'finalFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Selects the element focused after the dialog closes.',
        },
      ],
      upstream: baseUiDialog,
    },
    { name: 'DialogContent', description: 'Compatibility alias for DialogPopup.', upstream: baseUiDialog },
    { name: 'DialogHeader', description: 'Layout wrapper for DialogTitle and DialogDescription.' },
    {
      name: 'DialogFooter',
      description: 'Responsive action layout at the bottom of the popup.',
      props: [
        {
          name: 'variant',
          type: "'default' | 'bare'",
          default: "'default'",
          description: 'Chooses a bordered muted footer or an unadorned footer.',
        },
      ],
    },
    { name: 'DialogTitle', description: 'Accessible heading that labels the dialog.', upstream: baseUiDialog },
    {
      name: 'DialogDescription',
      description: 'Accessible supporting description for the dialog.',
      upstream: baseUiDialog,
    },
    {
      name: 'DialogPanel',
      description: 'Scrollable body wrapper sized to keep the header and footer visible.',
    },
    {
      name: 'DialogViewport',
      description: 'Full-screen positioning layer that centers the popup and applies the mobile row layout.',
      upstream: baseUiDialog,
    },
  ],
});
