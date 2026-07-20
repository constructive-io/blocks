import type { BasePrimitiveName } from '@/lib/base-primitives';
import type { PrimitiveDocs } from '@/lib/primitive-docs';

import { alertDialogDocs } from './alert-dialog';
import { alertDocs } from './alert';
import { avatarDocs } from './avatar';
import { badgeDocs } from './badge';
import { breadcrumbDocs } from './breadcrumb';
import { buttonDocs } from './button';
import { cardDocs } from './card';
import { checkboxDocs } from './checkbox';
import { collapsibleDocs } from './collapsible';
import { dialogDocs } from './dialog';
import { drawerDocs } from './drawer';
import { dropdownMenuDocs } from './dropdown-menu';
import { inputDocs } from './input';
import { labelDocs } from './label';
import { paginationDocs } from './pagination';
import { popoverDocs } from './popover';
import { progressDocs } from './progress';
import { radioGroupDocs } from './radio-group';
import { resizableDocs } from './resizable';
import { scrollAreaDocs } from './scroll-area';
import { selectDocs } from './select';
import { separatorDocs } from './separator';
import { sheetDocs } from './sheet';
import { skeletonDocs } from './skeleton';
import { switchDocs } from './switch';
import { tableDocs } from './table';
import { tabsDocs } from './tabs';
import { textareaDocs } from './textarea';
import { tooltipDocs } from './tooltip';

export const PRIMITIVE_DOCS = {
  alert: alertDocs,
  'alert-dialog': alertDialogDocs,
  avatar: avatarDocs,
  badge: badgeDocs,
  breadcrumb: breadcrumbDocs,
  button: buttonDocs,
  card: cardDocs,
  checkbox: checkboxDocs,
  collapsible: collapsibleDocs,
  dialog: dialogDocs,
  drawer: drawerDocs,
  'dropdown-menu': dropdownMenuDocs,
  input: inputDocs,
  label: labelDocs,
  pagination: paginationDocs,
  popover: popoverDocs,
  progress: progressDocs,
  'radio-group': radioGroupDocs,
  resizable: resizableDocs,
  'scroll-area': scrollAreaDocs,
  select: selectDocs,
  separator: separatorDocs,
  sheet: sheetDocs,
  skeleton: skeletonDocs,
  switch: switchDocs,
  table: tableDocs,
  tabs: tabsDocs,
  textarea: textareaDocs,
  tooltip: tooltipDocs,
} satisfies Record<BasePrimitiveName, PrimitiveDocs>;

export function getPrimitiveDocs(name: BasePrimitiveName): PrimitiveDocs {
  return PRIMITIVE_DOCS[name];
}
