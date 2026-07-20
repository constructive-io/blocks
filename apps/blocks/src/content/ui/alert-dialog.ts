import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiAlertDialog = {
  href: 'https://base-ui.com/react/components/alert-dialog',
  label: 'Base UI Alert Dialog props',
} as const;

export const alertDialogDocs = definePrimitiveDocs({
  name: 'alert-dialog',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Alert Dialog when someone must acknowledge the consequences of an irreversible or high-impact action before it runs.',
    'Use Dialog for forms and reversible tasks that do not require an explicit decision. Use inline validation when the issue can be resolved without interrupting the current task.',
  ],
  usage: {
    demo: 'BasicAlertDialogDemo',
    description:
      'Compose a trigger, content, title, description, and explicit cancel and action controls. AlertDialogContent supplies the portal and modal overlay for the standard layout.',
  },
  state: {
    title: 'Controlled and uncontrolled visibility',
    description:
      'Use defaultOpen when AlertDialog can own its initial visibility. Pass open and onOpenChange when validation or application state decides when the confirmation closes.',
    demo: 'ControlledAlertDialogDemo',
  },
  examples: [
    {
      title: 'Safe initial focus',
      description:
        'Pass initialFocus to AlertDialogContent when the least destructive control should receive focus first.',
      demo: 'SafeInitialFocusAlertDialogDemo',
    },
    {
      title: 'Composed controls',
      description:
        'Use render on AlertDialogTrigger, AlertDialogCancel, and AlertDialogAction to preserve Base UI behavior on an existing Button.',
      demo: 'ComposedAlertDialogDemo',
    },
  ],
  accessibility: [
    'Every AlertDialogContent needs an AlertDialogTitle and an AlertDialogDescription that state the decision and its consequence without relying on color or iconography.',
    'Give both outcomes specific labels. Keep AlertDialogCancel available, and place initial focus on the least destructive choice when accidental confirmation would be costly.',
    'Base UI traps focus while the alert is open, closes it with Escape, and returns focus to the trigger. Do not make outside interaction the only way to cancel.',
  ],
  api: [
    {
      name: 'AlertDialog',
      description: 'Modal root that manages confirmation visibility and cannot be dismissed by pressing the backdrop.',
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
      ],
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogTrigger',
      description: 'Button that opens the confirmation and provides the focus-return target.',
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
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogPortal',
      description: 'Moves alert content into the configured portal container.',
      props: [
        { name: 'container', type: 'HTMLElement | null', description: 'Explicit portal destination.' },
        {
          name: 'keepMounted',
          type: 'boolean',
          default: 'false',
          description: 'Keeps portal contents mounted when the alert is closed.',
        },
      ],
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogOverlay',
      description: 'Modal backdrop rendered behind the confirmation content.',
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogContent',
      description: 'Popup composition that includes AlertDialogPortal, AlertDialogOverlay, and a scoped floating portal.',
      props: [
        {
          name: 'initialFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Selects the element focused when the alert opens.',
        },
        {
          name: 'finalFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Overrides the element focused after the alert closes.',
        },
      ],
      upstream: baseUiAlertDialog,
    },
    { name: 'AlertDialogHeader', description: 'Layout wrapper for the title and description.' },
    { name: 'AlertDialogFooter', description: 'Responsive layout wrapper for cancel and action controls.' },
    {
      name: 'AlertDialogTitle',
      description: 'Accessible heading that labels the alert dialog.',
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogDescription',
      description: 'Accessible description of the consequence being confirmed.',
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogAction',
      description: 'Primary button-styled close control for the confirmed action.',
      props: [
        { name: 'render', type: 'ReactElement | function', description: 'Composes action behavior onto another element.' },
        { name: 'asChild', type: 'boolean', description: 'Compatibility composition prop; prefer render.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set false when render or asChild produces a non-button element.',
        },
      ],
      upstream: baseUiAlertDialog,
    },
    {
      name: 'AlertDialogCancel',
      description: 'Outline button-styled close control for the safe outcome.',
      props: [
        { name: 'render', type: 'ReactElement | function', description: 'Composes cancel behavior onto another element.' },
        { name: 'asChild', type: 'boolean', description: 'Compatibility composition prop; prefer render.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'true',
          description: 'Set false when render or asChild produces a non-button element.',
        },
      ],
      upstream: baseUiAlertDialog,
    },
  ],
});
