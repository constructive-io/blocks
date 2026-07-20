'use client';

import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

import type { BasePrimitiveName } from '@/lib/base-primitives';

type DemoModule = { BlockDemo: ComponentType };

const demo = (load: () => Promise<DemoModule>): ComponentType =>
  dynamic(() => load().then((module) => module.BlockDemo), { loading: () => null });

export const UI_DEMOS = {
  alert: demo(() => import('./demos/ui-alert.demo')),
  'alert-dialog': demo(() => import('./demos/ui-alert-dialog.demo')),
  avatar: demo(() => import('./demos/ui-avatar.demo')),
  badge: demo(() => import('./demos/ui-badge.demo')),
  breadcrumb: demo(() => import('./demos/ui-breadcrumb.demo')),
  button: demo(() => import('./demos/ui-button.demo')),
  card: demo(() => import('./demos/ui-card.demo')),
  checkbox: demo(() => import('./demos/ui-checkbox.demo')),
  collapsible: demo(() => import('./demos/ui-collapsible.demo')),
  dialog: demo(() => import('./demos/ui-dialog.demo')),
  drawer: demo(() => import('./demos/ui-drawer.demo')),
  'dropdown-menu': demo(() => import('./demos/ui-dropdown-menu.demo')),
  input: demo(() => import('./demos/ui-input.demo')),
  label: demo(() => import('./demos/ui-label.demo')),
  pagination: demo(() => import('./demos/ui-pagination.demo')),
  popover: demo(() => import('./demos/ui-popover.demo')),
  progress: demo(() => import('./demos/ui-progress.demo')),
  'radio-group': demo(() => import('./demos/ui-radio-group.demo')),
  resizable: demo(() => import('./demos/ui-resizable.demo')),
  'scroll-area': demo(() => import('./demos/ui-scroll-area.demo')),
  select: demo(() => import('./demos/ui-select.demo')),
  separator: demo(() => import('./demos/ui-separator.demo')),
  sheet: demo(() => import('./demos/ui-sheet.demo')),
  skeleton: demo(() => import('./demos/ui-skeleton.demo')),
  switch: demo(() => import('./demos/ui-switch.demo')),
  table: demo(() => import('./demos/ui-table.demo')),
  tabs: demo(() => import('./demos/ui-tabs.demo')),
  textarea: demo(() => import('./demos/ui-textarea.demo')),
  tooltip: demo(() => import('./demos/ui-tooltip.demo')),
} satisfies Record<BasePrimitiveName, ComponentType>;
