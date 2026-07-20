import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiDialog = {
  href: 'https://base-ui.com/react/components/dialog',
  label: 'Base UI Dialog props',
} as const;

export const sheetDocs = definePrimitiveDocs({
  name: 'sheet',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Sheet for settings, forms, and detail views that enter from an edge while leaving part of the current page visible.',
    'Use Dialog for a centered interruption. Use Drawer when touch drag gestures and snap points are central to the task.',
  ],
  usage: {
    demo: 'BasicSheetDemo',
    description:
      'Compose SheetTrigger and SheetContent inside Sheet, then provide a title, description, body, and reachable close control. SheetContent supplies the portal, modal backdrop, motion, and icon close button.',
  },
  state: {
    title: 'Controlled and uncontrolled visibility',
    description:
      'Use defaultOpen when Sheet can own its initial visibility. Pass open and onOpenChange when application state is authoritative; the callback receives the next boolean value.',
    demo: 'ControlledSheetDemo',
  },
  examples: [
    {
      title: 'Edge placement',
      description: 'Set side on SheetContent to enter from the top, right, bottom, or left edge.',
      demo: 'SheetSidesDemo',
    },
    {
      title: 'Stacked sheets',
      description:
        'Wrap related sheets in SheetStackProvider and nest each subsequent Sheet in the parent’s React tree. The provider tracks layer depth and pushes earlier panels aside.',
      demo: 'StackedSheetDemo',
    },
    {
      title: 'Floating overlays inside a sheet',
      description:
        'Popover, Select, Dropdown Menu, and Tooltip use the sheet’s scoped portal automatically, so they stay interactive and above the modal.',
      demo: 'NestedOverlaySheetDemo',
    },
    {
      title: 'Custom close control and motion',
      description:
        'Set showClose to false only when you provide a reachable SheetClose, and pass transition to adjust the panel motion without replacing dismissal behavior.',
      demo: 'CustomSheetControlsDemo',
    },
  ],
  accessibility: [
    'Give every SheetContent an accessible name with SheetTitle. Add SheetDescription when supporting context is useful, and give each form control a visible Label or another accessible name.',
    'Keep a SheetClose inside the panel when showClose is false; the built-in icon close button already has an accessible name.',
    'Base UI moves focus into the panel, traps focus for the top-level modal sheet, closes on Escape or outside press, and returns focus to the trigger.',
    'Nested sheets keep the parent visible but make the newest sheet the active layer. Keep essential parent actions available again after the nested sheet closes.',
  ],
  api: [
    {
      name: 'SheetStackProvider',
      description: 'Coordinates registration, dimensions, order, and push offsets for nested sheets.',
      props: [
        {
          name: 'stackMode',
          type: "'cascade' | 'collapse'",
          default: "'cascade'",
          description: 'Indents every visible layer or moves lower sheets aside using the top sheet’s measured size.',
        },
      ],
    },
    {
      name: 'useSheetStack',
      description:
        'Returns the nearest stack context, or undefined outside SheetStackProvider. The context exposes sheets, measured sizes, stackMode, registration and size methods, isTopSheet, and getSheetsAbove.',
    },
    {
      name: 'useSheet',
      description:
        'Returns isOpen, sheetId, depth, sheetsAbove, isTopSheet, and close for the current Sheet; it throws when used outside Sheet.',
    },
    {
      name: 'Sheet',
      description: 'Base UI Dialog root adapter that manages one sheet and registers it with an optional stack.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled visibility.' },
        { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Initial visibility in uncontrolled usage.' },
        {
          name: 'onOpenChange',
          type: '(open: boolean) => void',
          description: 'Runs when visibility changes.',
        },
        {
          name: 'sheetId',
          type: 'string',
          description: 'Stable identifier used by SheetStackProvider; generated automatically when omitted.',
        },
        {
          name: 'modal',
          type: "boolean | 'trap-focus'",
          default: 'true',
          description: 'Controls top-level modal behavior; nested sheets override it to false so interacting with a nested layer does not dismiss its parent.',
        },
        {
          name: 'disablePointerDismissal',
          type: 'boolean',
          default: 'false',
          description: 'Prevents outside presses from closing a top-level sheet.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'SheetPortal',
      description: 'Moves sheet parts into the configured portal container and establishes the elevated floating layer.',
      props: [
        { name: 'container', type: 'HTMLElement | null', description: 'Explicit portal destination.' },
        {
          name: 'forceMount',
          type: 'boolean',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; Base UI manages mounting.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'SheetOverlay',
      description: 'Styled Base UI backdrop for custom sheet compositions; SheetContent renders its own animated backdrop.',
      props: [
        {
          name: 'asChild',
          type: 'boolean',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; Base UI uses render for composition.',
        },
        {
          name: 'forceMount',
          type: 'boolean',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; Base UI manages mounting.',
        },
      ],
      upstream: baseUiDialog,
    },
    {
      name: 'SheetTrigger',
      description: 'Button that opens the sheet and provides the default focus-return target.',
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
      name: 'SheetClose',
      description: 'Button that closes the current sheet.',
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
      name: 'SheetContent',
      description: 'Animated panel composition with an optional backdrop, built-in close button, and scoped floating portal.',
      props: [
        {
          name: 'side',
          type: "'top' | 'right' | 'bottom' | 'left'",
          default: "'right'",
          description: 'Selects the panel edge and motion direction.',
        },
        {
          name: 'transition',
          type: 'Motion Transition',
          description: 'Overrides the default panel transition.',
        },
        {
          name: 'overlay',
          type: 'boolean',
          default: 'true',
          description: 'Shows the backdrop for the top-level sheet without changing the root’s modal behavior.',
        },
        {
          name: 'showClose',
          type: 'boolean',
          default: 'true',
          description: 'Shows the accessible icon close button.',
        },
        {
          name: 'initialFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Selects the element focused when the sheet opens.',
        },
        {
          name: 'finalFocus',
          type: 'boolean | RefObject<HTMLElement> | function',
          description: 'Selects the element focused after the sheet closes.',
        },
        {
          name: 'forceMount',
          type: 'boolean',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; Base UI and AnimatePresence manage mounting.',
        },
        {
          name: 'onInteractOutside',
          type: '(event: Event) => void',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; observe dismissal with Sheet onOpenChange.',
        },
        {
          name: 'onPointerDownOutside',
          type: '(event: Event) => void',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; observe dismissal with Sheet onOpenChange.',
        },
        {
          name: 'onEscapeKeyDown',
          type: '(event: KeyboardEvent) => void',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; observe dismissal with Sheet onOpenChange.',
        },
        {
          name: 'onFocusOutside',
          type: '(event: Event) => void',
          deprecated: true,
          description: 'Compatibility prop retained as a no-op; observe dismissal with Sheet onOpenChange.',
        },
      ],
      upstream: baseUiDialog,
    },
    { name: 'SheetHeader', description: 'Layout wrapper for SheetTitle and SheetDescription.' },
    { name: 'SheetFooter', description: 'Responsive action layout at the end of the sheet.' },
    { name: 'SheetTitle', description: 'Accessible heading that labels the sheet.', upstream: baseUiDialog },
    {
      name: 'SheetDescription',
      description: 'Accessible supporting description for the sheet.',
      upstream: baseUiDialog,
    },
    {
      name: 'SHEET_INDENT',
      description: 'The 24-pixel offset applied per sheet above a panel in cascade mode.',
    },
  ],
});
