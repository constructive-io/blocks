import { definePrimitiveDocs } from '@/lib/primitive-docs';

const vaulDrawer = {
  href: 'https://vaul.emilkowal.ski/api',
  label: 'Vaul Drawer props',
} as const;

export const drawerDocs = definePrimitiveDocs({
  name: 'drawer',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Drawer for a compact task or detail view that benefits from a touch-friendly edge gesture, especially on small screens.',
    'Use Dialog for a centered interruption without drag behavior. Use Sheet for a fixed edge panel, desktop-oriented forms, or nested panel stacks.',
  ],
  usage: {
    demo: 'BasicDrawerDemo',
    description:
      'Compose DrawerTrigger and DrawerContent inside Drawer, then provide a title, description, and explicit close control. DrawerContent supplies the portal, overlay, visual bottom grip, and scoped portal for nested floating overlays.',
  },
  state: {
    title: 'Controlled and uncontrolled visibility',
    description:
      'Use defaultOpen when Drawer can own its initial visibility. Pass open and onOpenChange when application state is authoritative; activeSnapPoint and setActiveSnapPoint control a snap-point drawer separately.',
    demo: 'ControlledDrawerDemo',
  },
  examples: [
    {
      title: 'Edge directions',
      description: 'Set direction on Drawer to enter from the top, right, bottom, or left edge.',
      demo: 'DrawerDirectionsDemo',
    },
    {
      title: 'Snap points',
      description:
        'Pass snapPoints for discrete resting positions, then control activeSnapPoint when the application needs to observe or change the current position.',
      demo: 'SnapPointDrawerDemo',
    },
    {
      title: 'Floating overlays inside a drawer',
      description:
        'Popover, Select, Dropdown Menu, and Tooltip use the drawer’s scoped portal automatically, so they remain interactive above the modal overlay.',
      demo: 'NestedOverlayDrawerDemo',
    },
  ],
  accessibility: [
    'Give every DrawerContent an accessible name with DrawerTitle. Add DrawerDescription when supporting context is useful, and give DrawerTrigger and every icon-only DrawerClose an accessible name.',
    'Keep a visible DrawerClose available because drag gestures cannot be the only way to dismiss content.',
    'Vaul supplies modal focus containment and focus return, but autoFocus defaults to false. Enable autoFocus when keyboard focus should move into the drawer immediately, and avoid it when doing so would open a mobile keyboard unexpectedly.',
    'When dismissible is false, control open from application state and close it with your state setter. Vaul rejects normal dismissal requests, including DrawerClose, while this mode is active.',
    'Keep interactive content within the visible drawer area and make long bodies scrollable so keyboard focus never moves behind clipped content.',
  ],
  api: [
    {
      name: 'Drawer',
      description: 'Vaul root that manages visibility, drag gestures, direction, and snap points.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled visibility.' },
        { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Initial visibility in uncontrolled usage.' },
        {
          name: 'onOpenChange',
          type: '(open: boolean) => void',
          description: 'Runs when visibility changes.',
        },
        {
          name: 'direction',
          type: "'top' | 'right' | 'bottom' | 'left'",
          default: "'bottom'",
          description: 'Selects the edge and drag axis.',
        },
        {
          name: 'dismissible',
          type: 'boolean',
          default: 'true',
          description: 'When false, rejects gestures, Escape, outside interaction, and DrawerClose requests; use controlled open state.',
        },
        {
          name: 'modal',
          type: 'boolean',
          default: 'true',
          description: 'Controls whether the drawer traps focus and blocks interaction with the page.',
        },
        {
          name: 'snapPoints',
          type: 'Array<number | string>',
          description: 'Ordered viewport fractions or CSS distances where the drawer can rest.',
        },
        {
          name: 'activeSnapPoint',
          type: 'number | string | null',
          description: 'Controlled current snap point.',
        },
        {
          name: 'setActiveSnapPoint',
          type: '(point: number | string | null) => void',
          description: 'Runs when the active snap point changes.',
        },
        {
          name: 'fadeFromIndex',
          type: 'number',
          description: 'Snap-point index where the backdrop begins fading in.',
        },
        {
          name: 'closeThreshold',
          type: 'number',
          default: '0.25',
          description: 'Drag distance fraction that dismisses the drawer.',
        },
        {
          name: 'handleOnly',
          type: 'boolean',
          default: 'false',
          description: 'Restricts dragging to Vaul Drawer.Handle. Constructive does not export that part, and DrawerContent’s visual grip is decorative.',
        },
        {
          name: 'autoFocus',
          type: 'boolean',
          default: 'false',
          description: 'Allows Radix to move focus into DrawerContent when it opens.',
        },
      ],
      upstream: vaulDrawer,
    },
    {
      name: 'DrawerPortal',
      description: 'Moves drawer parts into the configured portal container.',
      props: [
        { name: 'container', type: 'HTMLElement | null', description: 'Explicit portal destination.' },
      ],
      upstream: vaulDrawer,
    },
    { name: 'DrawerOverlay', description: 'Animated modal backdrop behind DrawerContent.', upstream: vaulDrawer },
    {
      name: 'DrawerTrigger',
      description: 'Button that opens the drawer and provides the focus-return target.',
      props: [
        { name: 'asChild', type: 'boolean', description: 'Composes trigger behavior onto its single child.' },
      ],
      upstream: vaulDrawer,
    },
    {
      name: 'DrawerClose',
      description: 'Button that closes the drawer.',
      props: [
        { name: 'asChild', type: 'boolean', description: 'Composes close behavior onto its single child.' },
      ],
      upstream: vaulDrawer,
    },
    {
      name: 'DrawerContent',
      description: 'Panel composition that includes DrawerPortal, DrawerOverlay, a decorative bottom grip, and a scoped floating portal.',
      upstream: vaulDrawer,
    },
    { name: 'DrawerHeader', description: 'Responsive layout wrapper for DrawerTitle and DrawerDescription.' },
    { name: 'DrawerFooter', description: 'Action layout pinned to the end of the drawer body.' },
    { name: 'DrawerTitle', description: 'Accessible heading that labels the drawer.', upstream: vaulDrawer },
    {
      name: 'DrawerDescription',
      description: 'Accessible supporting description for the drawer.',
      upstream: vaulDrawer,
    },
  ],
});
