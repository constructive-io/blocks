export const BASE_PRIMITIVES = [
  {
    name: 'alert',
    title: 'Alert',
    exportName: 'Alert',
    description: 'A semantic callout for important information and feedback.',
  },
  {
    name: 'alert-dialog',
    title: 'Alert Dialog',
    exportName: 'AlertDialog',
    description: 'A modal confirmation surface for consequential actions.',
  },
  {
    name: 'avatar',
    title: 'Avatar',
    exportName: 'Avatar',
    description: 'An image and fallback treatment for people and entities.',
  },
  {
    name: 'badge',
    title: 'Badge',
    exportName: 'Badge',
    description: 'A compact label for status, category, or metadata.',
  },
  {
    name: 'breadcrumb',
    title: 'Breadcrumb',
    exportName: 'Breadcrumb',
    description: 'A path that helps people understand their current location.',
  },
  {
    name: 'button',
    title: 'Button',
    exportName: 'Button',
    description: 'The primary action primitive with semantic variants and sizes.',
  },
  {
    name: 'card',
    title: 'Card',
    exportName: 'Card',
    description: 'A composed surface for grouping related content and actions.',
  },
  {
    name: 'checkbox',
    title: 'Checkbox',
    exportName: 'Checkbox',
    description: 'A control for selecting one or more independent options.',
  },
  {
    name: 'collapsible',
    title: 'Collapsible',
    exportName: 'Collapsible',
    description: 'A disclosure primitive for showing and hiding supporting content.',
  },
  {
    name: 'dialog',
    title: 'Dialog',
    exportName: 'Dialog',
    description: 'A modal surface for focused tasks and contextual content.',
  },
  {
    name: 'drawer',
    title: 'Drawer',
    exportName: 'Drawer',
    description: 'A touch-friendly panel that enters from the viewport edge.',
  },
  {
    name: 'dropdown-menu',
    title: 'Dropdown Menu',
    exportName: 'DropdownMenu',
    description: 'A menu of contextual actions opened from a trigger.',
  },
  {
    name: 'input',
    title: 'Input',
    exportName: 'Input',
    description: 'A single-line text input with consistent focus and invalid states.',
  },
  {
    name: 'label',
    title: 'Label',
    exportName: 'Label',
    description: 'An accessible label for form controls.',
  },
  {
    name: 'pagination',
    title: 'Pagination',
    exportName: 'Pagination',
    description: 'Navigation for moving through a sequence of pages.',
  },
  {
    name: 'popover',
    title: 'Popover',
    exportName: 'Popover',
    description: 'A floating surface for lightweight contextual interactions.',
  },
  {
    name: 'progress',
    title: 'Progress',
    exportName: 'Progress',
    description: 'A visual indicator for task or process completion.',
  },
  {
    name: 'radio-group',
    title: 'Radio Group',
    exportName: 'RadioGroup',
    description: 'A control for choosing one option from a mutually exclusive set.',
  },
  {
    name: 'resizable',
    title: 'Resizable',
    exportName: 'ResizablePanelGroup',
    description: 'A panel layout with an accessible draggable divider.',
  },
  {
    name: 'scroll-area',
    title: 'Scroll Area',
    exportName: 'ScrollArea',
    description: 'A consistently styled viewport for overflowing content.',
  },
  {
    name: 'select',
    title: 'Select',
    exportName: 'Select',
    description: 'A popup list for choosing one value from a set.',
  },
  {
    name: 'separator',
    title: 'Separator',
    exportName: 'Separator',
    description: 'A semantic divider between related groups of content.',
  },
  {
    name: 'sheet',
    title: 'Sheet',
    exportName: 'Sheet',
    description: 'A modal panel anchored to a side of the viewport.',
  },
  {
    name: 'skeleton',
    title: 'Skeleton',
    exportName: 'Skeleton',
    description: 'A placeholder that preserves layout while content is loading.',
  },
  {
    name: 'switch',
    title: 'Switch',
    exportName: 'Switch',
    description: 'A control for toggling a single setting on or off.',
  },
  {
    name: 'table',
    title: 'Table',
    exportName: 'Table',
    description: 'Semantic table primitives for structured rows and columns.',
  },
  {
    name: 'tabs',
    title: 'Tabs',
    exportName: 'Tabs',
    description: 'A set of layered panels controlled by a tab list.',
  },
  {
    name: 'textarea',
    title: 'Textarea',
    exportName: 'Textarea',
    description: 'A multi-line text input with consistent form states.',
  },
  {
    name: 'tooltip',
    title: 'Tooltip',
    exportName: 'Tooltip',
    description: 'A short, non-interactive hint attached to a trigger.',
  },
] as const;

export type BasePrimitive = (typeof BASE_PRIMITIVES)[number];
export type BasePrimitiveName = BasePrimitive['name'];

const BASE_PRIMITIVE_BY_NAME = new Map<BasePrimitiveName, BasePrimitive>(
  BASE_PRIMITIVES.map((primitive) => [primitive.name, primitive]),
);

export function isBasePrimitiveName(value: string): value is BasePrimitiveName {
  return BASE_PRIMITIVE_BY_NAME.has(value as BasePrimitiveName);
}

export function getBasePrimitive(name: string): BasePrimitive | undefined {
  return isBasePrimitiveName(name) ? BASE_PRIMITIVE_BY_NAME.get(name) : undefined;
}

export function packageImport(primitive: BasePrimitive): string {
  return `import { ${primitive.exportName} } from '@constructive-io/ui/${primitive.name}';`;
}

export function registryInstall(primitive: BasePrimitive): string {
  return `pnpm dlx shadcn@4.13.1 add @constructive/${primitive.name}`;
}
