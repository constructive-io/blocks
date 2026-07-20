import { getUiDemo } from '@/components/docs/showcase-ui';
import { getBasePrimitive, type BasePrimitiveName } from '@/lib/base-primitives';

export const HOME_SHOWCASE_ORDER = [
  'button',
  'input',
  'select',
  'checkbox',
  'switch',
  'radio-group',
  'dialog',
  'popover',
  'dropdown-menu',
  'alert-dialog',
  'drawer',
  'sheet',
  'card',
  'alert',
  'badge',
  'tabs',
  'collapsible',
  'tooltip',
  'avatar',
  'breadcrumb',
  'pagination',
  'progress',
  'skeleton',
  'separator',
  'resizable',
  'scroll-area',
  'table',
  'label',
  'textarea',
] as const satisfies readonly BasePrimitiveName[];

export const HOME_SHOWCASE_DEMOS = {
  alert: getUiDemo('alert', 'BasicAlertDemo'),
  'alert-dialog': getUiDemo('alert-dialog', 'BasicAlertDialogDemo'),
  avatar: getUiDemo('avatar', 'AvatarSizesDemo'),
  badge: getUiDemo('badge', 'BadgeVariantsDemo'),
  breadcrumb: getUiDemo('breadcrumb', 'BasicBreadcrumbDemo'),
  button: getUiDemo('button', 'BasicButtonDemo'),
  card: getUiDemo('card', 'BasicCardDemo'),
  checkbox: getUiDemo('checkbox', 'CheckboxGroupDemo'),
  collapsible: getUiDemo('collapsible', 'BasicCollapsibleDemo'),
  dialog: getUiDemo('dialog', 'BasicDialogDemo'),
  drawer: getUiDemo('drawer', 'BasicDrawerDemo'),
  'dropdown-menu': getUiDemo('dropdown-menu', 'BasicDropdownMenuDemo'),
  input: getUiDemo('input', 'ControlledInputDemo'),
  label: getUiDemo('label', 'RequiredLabelDemo'),
  pagination: getUiDemo('pagination', 'BasicPaginationDemo'),
  popover: getUiDemo('popover', 'BasicPopoverDemo'),
  progress: getUiDemo('progress', 'BlockDemo'),
  'radio-group': getUiDemo('radio-group', 'BasicRadioGroupDemo'),
  resizable: getUiDemo('resizable', 'BasicResizableDemo'),
  'scroll-area': getUiDemo('scroll-area', 'BasicScrollAreaDemo'),
  select: getUiDemo('select', 'BasicSelectDemo'),
  separator: getUiDemo('separator', 'BasicSeparatorDemo'),
  sheet: getUiDemo('sheet', 'BasicSheetDemo'),
  skeleton: getUiDemo('skeleton', 'BlockDemo'),
  switch: getUiDemo('switch', 'SwitchSettingsDemo'),
  table: getUiDemo('table', 'WideTableDemo'),
  tabs: getUiDemo('tabs', 'BasicTabsDemo'),
  textarea: getUiDemo('textarea', 'ControlledTextareaDemo'),
  tooltip: getUiDemo('tooltip', 'PositionedTooltipDemo'),
} satisfies Record<BasePrimitiveName, ReturnType<typeof getUiDemo>>;

export const HOME_SHOWCASE_PRIMITIVES = HOME_SHOWCASE_ORDER.map((name) => {
  const primitive = getBasePrimitive(name);
  if (!primitive) throw new Error(`Missing base primitive metadata for ${name}`);
  return primitive;
});
