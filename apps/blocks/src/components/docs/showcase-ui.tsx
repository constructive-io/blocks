'use client';

import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

import type { BasePrimitiveName } from '@/lib/base-primitives';

type DemoModule = Record<string, ComponentType>;

const DEMO_MODULES = {
  alert: () => import('./demos/ui-alert.demo'),
  'alert-dialog': () => import('./demos/ui-alert-dialog.demo'),
  avatar: () => import('./demos/ui-avatar.demo'),
  badge: () => import('./demos/ui-badge.demo'),
  breadcrumb: () => import('./demos/ui-breadcrumb.demo'),
  button: () => import('./demos/ui-button.demo'),
  card: () => import('./demos/ui-card.demo'),
  checkbox: () => import('./demos/ui-checkbox.demo'),
  collapsible: () => import('./demos/ui-collapsible.demo'),
  dialog: () => import('./demos/ui-dialog.demo'),
  drawer: () => import('./demos/ui-drawer.demo'),
  'dropdown-menu': () => import('./demos/ui-dropdown-menu.demo'),
  input: () => import('./demos/ui-input.demo'),
  label: () => import('./demos/ui-label.demo'),
  pagination: () => import('./demos/ui-pagination.demo'),
  popover: () => import('./demos/ui-popover.demo'),
  progress: () => import('./demos/ui-progress.demo'),
  'radio-group': () => import('./demos/ui-radio-group.demo'),
  resizable: () => import('./demos/ui-resizable.demo'),
  'scroll-area': () => import('./demos/ui-scroll-area.demo'),
  select: () => import('./demos/ui-select.demo'),
  separator: () => import('./demos/ui-separator.demo'),
  sheet: () => import('./demos/ui-sheet.demo'),
  skeleton: () => import('./demos/ui-skeleton.demo'),
  switch: () => import('./demos/ui-switch.demo'),
  table: () => import('./demos/ui-table.demo'),
  tabs: () => import('./demos/ui-tabs.demo'),
  textarea: () => import('./demos/ui-textarea.demo'),
  tooltip: () => import('./demos/ui-tooltip.demo'),
} satisfies Record<BasePrimitiveName, () => Promise<unknown>>;

const demoCache = new Map<string, ComponentType>();

export function getUiDemo(name: BasePrimitiveName, exportName = 'BlockDemo'): ComponentType {
  const key = `${name}:${exportName}`;
  const cached = demoCache.get(key);
  if (cached) return cached;

  const Demo = dynamic(
    async () => {
      const module = (await DEMO_MODULES[name]()) as DemoModule;
      const component = module[exportName];
      if (!component) {
        throw new Error(`Missing ${exportName} in ui-${name}.demo.tsx`);
      }
      return component;
    },
    { loading: () => null },
  );
  demoCache.set(key, Demo);
  return Demo;
}

export const UI_DEMOS = {
  alert: getUiDemo('alert'),
  'alert-dialog': getUiDemo('alert-dialog'),
  avatar: getUiDemo('avatar'),
  badge: getUiDemo('badge'),
  breadcrumb: getUiDemo('breadcrumb'),
  button: getUiDemo('button'),
  card: getUiDemo('card'),
  checkbox: getUiDemo('checkbox'),
  collapsible: getUiDemo('collapsible'),
  dialog: getUiDemo('dialog'),
  drawer: getUiDemo('drawer'),
  'dropdown-menu': getUiDemo('dropdown-menu'),
  input: getUiDemo('input'),
  label: getUiDemo('label'),
  pagination: getUiDemo('pagination'),
  popover: getUiDemo('popover'),
  progress: getUiDemo('progress'),
  'radio-group': getUiDemo('radio-group'),
  resizable: getUiDemo('resizable'),
  'scroll-area': getUiDemo('scroll-area'),
  select: getUiDemo('select'),
  separator: getUiDemo('separator'),
  sheet: getUiDemo('sheet'),
  skeleton: getUiDemo('skeleton'),
  switch: getUiDemo('switch'),
  table: getUiDemo('table'),
  tabs: getUiDemo('tabs'),
  textarea: getUiDemo('textarea'),
  tooltip: getUiDemo('tooltip'),
} satisfies Record<BasePrimitiveName, ComponentType>;
