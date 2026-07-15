'use client';

/**
 * UI_DEMOS — live previews for the `ui` docs category (the
 * `@constructive-io/ui` foundation), merged into the DEMOS map in
 * `showcase.tsx`.
 *
 * Demo contract (one file per component, mirroring the block demos):
 *   - `./demos/ui-<name>.demo.tsx`, `'use client'`, exports `function BlockDemo()`
 *   - imports the component from `@constructive-io/ui/<name>` (never from
 *     packages/ui source paths) and the kit from `./showcase-kit`
 *   - wraps everything in `<Demo>`; `<Segmented>` only when a variant/state
 *     toggle genuinely helps — prefer one rich composition over toggles
 *   - self-contained local state; no backend, no docs mock adapter
 *   - keyed here by slug `'ui-<name>'` — must match the showcase-tier list in
 *     `scripts/ui-content/` (the ui-parity test enforces both directions)
 *
 * Docs harness only — never imported by block source.
 */

import { type ComponentType } from 'react';

import dynamic from 'next/dynamic';

type DemoModule = { BlockDemo: ComponentType };

// Literal import paths let Next split each foundation demo into its own chunk.
const demo = (load: () => Promise<DemoModule>): ComponentType =>
  dynamic(() => load().then((module) => module.BlockDemo), { loading: () => null });

export const UI_DEMOS: Record<string, ComponentType> = {
  'ui-button': demo(() => import('./demos/ui-button.demo')),
  'ui-badge': demo(() => import('./demos/ui-badge.demo')),
  'ui-label': demo(() => import('./demos/ui-label.demo')),
  'ui-skeleton': demo(() => import('./demos/ui-skeleton.demo')),
  'ui-card': demo(() => import('./demos/ui-card.demo')),
  'ui-separator': demo(() => import('./demos/ui-separator.demo')),
  'ui-alert': demo(() => import('./demos/ui-alert.demo')),
  'ui-unlink-button': demo(() => import('./demos/ui-unlink-button.demo')),
  'ui-input': demo(() => import('./demos/ui-input.demo')),
  'ui-textarea': demo(() => import('./demos/ui-textarea.demo')),
  'ui-checkbox': demo(() => import('./demos/ui-checkbox.demo')),
  'ui-checkbox-group': demo(() => import('./demos/ui-checkbox-group.demo')),
  'ui-radio-group': demo(() => import('./demos/ui-radio-group.demo')),
  'ui-switch': demo(() => import('./demos/ui-switch.demo')),
  'ui-progress': demo(() => import('./demos/ui-progress.demo')),
  'ui-select': demo(() => import('./demos/ui-select.demo')),
  'ui-form-control': demo(() => import('./demos/ui-form-control.demo')),
  'ui-input-group': demo(() => import('./demos/ui-input-group.demo')),
  'ui-field': demo(() => import('./demos/ui-field.demo')),
  'ui-autocomplete': demo(() => import('./demos/ui-autocomplete.demo')),
  'ui-combobox': demo(() => import('./demos/ui-combobox.demo')),
  'ui-multi-select': demo(() => import('./demos/ui-multi-select.demo')),
  'ui-tags': demo(() => import('./demos/ui-tags.demo')),
  'ui-tooltip': demo(() => import('./demos/ui-tooltip.demo')),
  'ui-popover': demo(() => import('./demos/ui-popover.demo')),
  'ui-dialog': demo(() => import('./demos/ui-dialog.demo')),
  'ui-alert-dialog': demo(() => import('./demos/ui-alert-dialog.demo')),
  'ui-dropdown-menu': demo(() => import('./demos/ui-dropdown-menu.demo')),
  'ui-sheet': demo(() => import('./demos/ui-sheet.demo')),
  'ui-drawer': demo(() => import('./demos/ui-drawer.demo')),
  'ui-command': demo(() => import('./demos/ui-command.demo')),
  'ui-scroll-area': demo(() => import('./demos/ui-scroll-area.demo')),
  'ui-tabs': demo(() => import('./demos/ui-tabs.demo')),
  'ui-collapsible': demo(() => import('./demos/ui-collapsible.demo')),
  'ui-resizable': demo(() => import('./demos/ui-resizable.demo')),
  'ui-pagination': demo(() => import('./demos/ui-pagination.demo')),
  'ui-breadcrumb': demo(() => import('./demos/ui-breadcrumb.demo')),
  'ui-stepper': demo(() => import('./demos/ui-stepper.demo')),
  'ui-sidebar': demo(() => import('./demos/ui-sidebar.demo')),
  'ui-dock': demo(() => import('./demos/ui-dock.demo')),
  'ui-page-header': demo(() => import('./demos/ui-page-header.demo')),
  'ui-avatar': demo(() => import('./demos/ui-avatar.demo')),
  'ui-table': demo(() => import('./demos/ui-table.demo')),
  'ui-flickering-grid': demo(() => import('./demos/ui-flickering-grid.demo')),
  'ui-motion-grid': demo(() => import('./demos/ui-motion-grid.demo')),
  'ui-progressive-blur': demo(() => import('./demos/ui-progressive-blur.demo')),
  'ui-progressive-blur-scroll-container': demo(() => import('./demos/ui-progressive-blur-scroll-container.demo')),
  'ui-responsive-diagram': demo(() => import('./demos/ui-responsive-diagram.demo')),
  'ui-sonner': demo(() => import('./demos/ui-sonner.demo')),
  'ui-toast': demo(() => import('./demos/ui-toast.demo')),
  'ui-storage-bucket-rail': demo(() => import('./demos/ui-storage-bucket-rail.demo')),
  'ui-storage-object-table': demo(() => import('./demos/ui-storage-object-table.demo')),
  'ui-storage-upload-dropzone': demo(() => import('./demos/ui-storage-upload-dropzone.demo')),
  'ui-storage-object-detail-sheet': demo(() => import('./demos/ui-storage-object-detail-sheet.demo')),
  'ui-storage-bucket-config-sheet': demo(() => import('./demos/ui-storage-bucket-config-sheet.demo')),
  'ui-storage-empty-state': demo(() => import('./demos/ui-storage-empty-state.demo')),
  'ui-storage-browser': demo(() => import('./demos/ui-storage-browser.demo')),
};
