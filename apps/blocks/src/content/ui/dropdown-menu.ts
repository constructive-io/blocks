import { definePrimitiveDocs } from '@/lib/primitive-docs';

const baseUiMenu = {
  href: 'https://base-ui.com/react/components/menu',
  label: 'Base UI Menu props',
} as const;

const mdnKbd = {
  href: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/kbd',
  label: 'MDN kbd element reference',
} as const;

export const dropdownMenuDocs = definePrimitiveDocs({
  name: 'dropdown-menu',
  stateModel: 'controlled-uncontrolled',
  whenToUse: [
    'Use Dropdown Menu for contextual actions that belong to one trigger and should stay out of the main layout until requested.',
    'Use Select when the result is a form value. Use Popover when the floating surface contains fields, explanatory content, or other controls that are not menu actions.',
  ],
  usage: {
    demo: 'BasicDropdownMenuDemo',
    description:
      'Compose grouped DropdownMenuItem elements inside DropdownMenuContent. Use render for preferred Base UI composition or asChild for compatibility. Set nativeButton to false when a composed trigger is not a button, and set it to true when a composed menu item is a button.',
  },
  state: {
    title: 'Controlled and uncontrolled open state',
    description:
      'DropdownMenu owns visibility by default and accepts defaultOpen for initialization. Pass open and onOpenChange when another part of the application controls whether the menu is visible.',
    demo: 'ControlledDropdownMenuDemo',
  },
  examples: [
    {
      title: 'Checkbox and radio items',
      description: 'Use checkbox items for independent options and a radio group for one choice from a set.',
      demo: 'SelectionDropdownMenuDemo',
    },
    {
      title: 'Submenu',
      description: 'Use a submenu when a single action category has a short second-level list.',
      demo: 'SubmenuDropdownMenuDemo',
    },
  ],
  accessibility: [
    'Give DropdownMenuTrigger a visible or programmatic name that identifies the action set it opens.',
    'Keep items inside DropdownMenuGroup and put DropdownMenuLabel inside that group so Base UI exposes group-label semantics.',
    'Use menu items for actions. Visual keyboard shortcuts supplement the item label and do not replace its accessible name.',
    'Base UI manages arrow-key navigation, typeahead, Escape dismissal, outside interaction, and focus return to the trigger.',
  ],
  api: [
    {
      name: 'DropdownMenu',
      description: 'Root that manages menu visibility.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled open state.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial open state in uncontrolled usage.' },
        { name: 'onOpenChange', type: 'Base UI callback', description: 'Runs when visibility changes.' },
      ],
      upstream: baseUiMenu,
    },
    {
      name: 'DropdownMenuTrigger',
      description: 'Button that opens the root menu.',
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
      upstream: baseUiMenu,
    },
    { name: 'DropdownMenuPortal', description: 'Portals the menu into the nearest overlay host or document body.', upstream: baseUiMenu },
    {
      name: 'DropdownMenuContent',
      description: 'Popup composition with a portal and positioned menu surface.',
      props: [
        { name: 'side', type: "'top' | 'right' | 'bottom' | 'left'", default: "'bottom'", description: 'Preferred side of the trigger.' },
        { name: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: 'Alignment along the trigger edge.' },
        { name: 'sideOffset', type: 'number', default: '4', description: 'Distance from the trigger.' },
        { name: 'onPointerDown', type: 'function', deprecated: true, description: 'Compatibility prop; Base UI does not use it here.' },
        { name: 'onPointerDownOutside', type: 'function', deprecated: true, description: 'Compatibility prop; use root event details instead.' },
        { name: 'onCloseAutoFocus', type: 'function', deprecated: true, description: 'Compatibility prop; Base UI owns focus return.' },
        { name: 'forceMount', type: 'boolean', deprecated: true, description: 'Compatibility prop; Base UI mounts the popup while open.' },
      ],
      upstream: baseUiMenu,
    },
    { name: 'DropdownMenuGroup', description: 'Groups related menu items and provides label context.', upstream: baseUiMenu },
    {
      name: 'DropdownMenuLabel',
      description: 'Semantic Base UI GroupLabel inside DropdownMenuGroup, with a visual compatibility fallback outside a group.',
      props: [{ name: 'inset', type: 'boolean', default: 'false', description: 'Aligns the label with inset item text.' }],
      upstream: baseUiMenu,
    },
    {
      name: 'DropdownMenuItem',
      description: 'Action item inside a menu group.',
      props: [
        { name: 'inset', type: 'boolean', default: 'false', description: 'Adds leading alignment space.' },
        { name: 'variant', type: "'default' | 'destructive'", default: "'default'", description: 'Sets action emphasis.' },
        { name: 'render', type: 'ReactElement | render function', description: 'Preferred Base UI composition API.' },
        { name: 'asChild', type: 'boolean', default: 'false', description: 'Compatibility composition API.' },
        {
          name: 'nativeButton',
          type: 'boolean',
          default: 'false',
          description: 'Set to true when render or asChild resolves to a native button.',
        },
      ],
      upstream: baseUiMenu,
    },
    {
      name: 'DropdownMenuCheckboxItem',
      description: 'Menu item with independently controlled or uncontrolled checked state.',
      props: [
        { name: 'checked', type: 'boolean', description: 'Controlled checked state.' },
        { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial checked state.' },
        { name: 'onCheckedChange', type: 'Base UI callback', description: 'Runs when the item is toggled.' },
      ],
      upstream: baseUiMenu,
    },
    {
      name: 'DropdownMenuRadioGroup',
      description: 'Coordinates a mutually exclusive set of radio items.',
      props: [
        { name: 'value', type: 'any', description: 'Controlled selected value.' },
        { name: 'defaultValue', type: 'any', description: 'Initial selected value.' },
        { name: 'onValueChange', type: 'Base UI callback', description: 'Runs when selection changes.' },
      ],
      upstream: baseUiMenu,
    },
    {
      name: 'DropdownMenuRadioItem',
      description: 'Radio option inside DropdownMenuRadioGroup.',
      props: [{ name: 'value', type: 'any', required: true, description: 'Value selected by this item.' }],
      upstream: baseUiMenu,
    },
    { name: 'DropdownMenuSeparator', description: 'Semantic divider between groups of menu items.', upstream: baseUiMenu },
    {
      name: 'DropdownMenuShortcut',
      description: 'Visual keyboard shortcut rendered as a kbd element.',
      upstream: mdnKbd,
    },
    {
      name: 'DropdownMenuSub',
      description: 'Root for one nested submenu.',
      props: [
        { name: 'open', type: 'boolean', description: 'Controlled submenu visibility.' },
        { name: 'defaultOpen', type: 'boolean', description: 'Initial submenu visibility.' },
        { name: 'onOpenChange', type: 'Base UI callback', description: 'Runs when submenu visibility changes.' },
      ],
      upstream: baseUiMenu,
    },
    { name: 'DropdownMenuSubTrigger', description: 'Item that opens a nested submenu.', upstream: baseUiMenu },
    { name: 'DropdownMenuSubContent', description: 'Positioned popup for nested submenu items.', upstream: baseUiMenu },
  ],
});
