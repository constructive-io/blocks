/**
 * Docs catalog of Constructive theme tokens.
 * Values live in packages/ui (theme.ts → globals.css). This file only
 * describes what the default theme exposes for documentation.
 */

export type ColorToken = {
  name: string;
  /** CSS custom property without the leading `--` */
  cssVar: string;
  /** Tailwind utility background class when available */
  bgClass?: string;
  /** Tailwind utility text class when available */
  textClass?: string;
  description: string;
};

export type TokenGroup = {
  id: string;
  title: string;
  description: string;
  tokens: ColorToken[];
};

export const COLOR_TOKEN_GROUPS: TokenGroup[] = [
  {
    id: 'surfaces',
    title: 'Surfaces',
    description: 'Page canvas, raised panels, and floating layers.',
    tokens: [
      {
        name: 'background',
        cssVar: 'background',
        bgClass: 'bg-background',
        textClass: 'text-background',
        description: 'App canvas / body background',
      },
      {
        name: 'foreground',
        cssVar: 'foreground',
        bgClass: 'bg-foreground',
        textClass: 'text-foreground',
        description: 'Default body text',
      },
      {
        name: 'card',
        cssVar: 'card',
        bgClass: 'bg-card',
        textClass: 'text-card',
        description: 'Card and panel surfaces',
      },
      {
        name: 'card-foreground',
        cssVar: 'card-foreground',
        bgClass: 'bg-card-foreground',
        textClass: 'text-card-foreground',
        description: 'Text on card surfaces',
      },
      {
        name: 'popover',
        cssVar: 'popover',
        bgClass: 'bg-popover',
        textClass: 'text-popover',
        description: 'Popover, menu, and select surfaces',
      },
      {
        name: 'popover-foreground',
        cssVar: 'popover-foreground',
        bgClass: 'bg-popover-foreground',
        textClass: 'text-popover-foreground',
        description: 'Text on popover surfaces',
      },
    ],
  },
  {
    id: 'brand',
    title: 'Brand & interactive',
    description: 'Primary actions, secondary fills, and quiet emphasis.',
    tokens: [
      {
        name: 'primary',
        cssVar: 'primary',
        bgClass: 'bg-primary',
        textClass: 'text-primary',
        description: 'Brand accent and primary actions',
      },
      {
        name: 'primary-foreground',
        cssVar: 'primary-foreground',
        bgClass: 'bg-primary-foreground',
        textClass: 'text-primary-foreground',
        description: 'Text/icons on primary',
      },
      {
        name: 'secondary',
        cssVar: 'secondary',
        bgClass: 'bg-secondary',
        textClass: 'text-secondary',
        description: 'Secondary buttons and fills',
      },
      {
        name: 'secondary-foreground',
        cssVar: 'secondary-foreground',
        bgClass: 'bg-secondary-foreground',
        textClass: 'text-secondary-foreground',
        description: 'Text on secondary',
      },
      {
        name: 'muted',
        cssVar: 'muted',
        bgClass: 'bg-muted',
        textClass: 'text-muted',
        description: 'Subtle backgrounds and wells',
      },
      {
        name: 'muted-foreground',
        cssVar: 'muted-foreground',
        bgClass: 'bg-muted-foreground',
        textClass: 'text-muted-foreground',
        description: 'Secondary and helper text',
      },
      {
        name: 'accent',
        cssVar: 'accent',
        bgClass: 'bg-accent',
        textClass: 'text-accent',
        description: 'Hover, selected, and soft highlight',
      },
      {
        name: 'accent-foreground',
        cssVar: 'accent-foreground',
        bgClass: 'bg-accent-foreground',
        textClass: 'text-accent-foreground',
        description: 'Text on accent',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    description: 'Semantic status colors for errors, success, and warnings.',
    tokens: [
      {
        name: 'destructive',
        cssVar: 'destructive',
        bgClass: 'bg-destructive',
        textClass: 'text-destructive',
        description: 'Destructive actions and error states',
      },
      {
        name: 'destructive-foreground',
        cssVar: 'destructive-foreground',
        bgClass: 'bg-destructive-foreground',
        textClass: 'text-destructive-foreground',
        description: 'Text on destructive',
      },
      {
        name: 'info',
        cssVar: 'info',
        bgClass: 'bg-info',
        textClass: 'text-info',
        description: 'Informational status',
      },
      {
        name: 'info-foreground',
        cssVar: 'info-foreground',
        bgClass: 'bg-info-foreground',
        textClass: 'text-info-foreground',
        description: 'Text for info emphasis',
      },
      {
        name: 'success',
        cssVar: 'success',
        bgClass: 'bg-success',
        textClass: 'text-success',
        description: 'Success and positive status',
      },
      {
        name: 'success-foreground',
        cssVar: 'success-foreground',
        bgClass: 'bg-success-foreground',
        textClass: 'text-success-foreground',
        description: 'Text for success emphasis',
      },
      {
        name: 'warning',
        cssVar: 'warning',
        bgClass: 'bg-warning',
        textClass: 'text-warning',
        description: 'Warning and caution status',
      },
      {
        name: 'warning-foreground',
        cssVar: 'warning-foreground',
        bgClass: 'bg-warning-foreground',
        textClass: 'text-warning-foreground',
        description: 'Text for warning emphasis',
      },
    ],
  },
  {
    id: 'chrome',
    title: 'Borders, inputs & focus',
    description: 'Structural lines, field chrome, and focus rings.',
    tokens: [
      {
        name: 'border',
        cssVar: 'border',
        bgClass: 'bg-border',
        textClass: 'text-border',
        description: 'Default borders (often used at 60% opacity)',
      },
      {
        name: 'input',
        cssVar: 'input',
        bgClass: 'bg-input',
        textClass: 'text-input',
        description: 'Input borders and field edges',
      },
      {
        name: 'ring',
        cssVar: 'ring',
        bgClass: 'bg-ring',
        textClass: 'text-ring',
        description: 'Focus ring color',
      },
    ],
  },
  {
    id: 'charts',
    title: 'Charts',
    description: 'Series colors for data visualization.',
    tokens: [
      { name: 'chart-1', cssVar: 'chart-1', bgClass: 'bg-chart-1', description: 'Chart series 1' },
      { name: 'chart-2', cssVar: 'chart-2', bgClass: 'bg-chart-2', description: 'Chart series 2' },
      { name: 'chart-3', cssVar: 'chart-3', bgClass: 'bg-chart-3', description: 'Chart series 3' },
      { name: 'chart-4', cssVar: 'chart-4', bgClass: 'bg-chart-4', description: 'Chart series 4' },
      { name: 'chart-5', cssVar: 'chart-5', bgClass: 'bg-chart-5', description: 'Chart series 5' },
    ],
  },
  {
    id: 'sidebar',
    title: 'Sidebar',
    description: 'Navigation shell tokens used by layout chrome.',
    tokens: [
      {
        name: 'sidebar',
        cssVar: 'sidebar',
        bgClass: 'bg-sidebar',
        textClass: 'text-sidebar',
        description: 'Sidebar background',
      },
      {
        name: 'sidebar-foreground',
        cssVar: 'sidebar-foreground',
        bgClass: 'bg-sidebar-foreground',
        textClass: 'text-sidebar-foreground',
        description: 'Sidebar text',
      },
      {
        name: 'sidebar-primary',
        cssVar: 'sidebar-primary',
        bgClass: 'bg-sidebar-primary',
        textClass: 'text-sidebar-primary',
        description: 'Sidebar brand / active accent',
      },
      {
        name: 'sidebar-primary-foreground',
        cssVar: 'sidebar-primary-foreground',
        bgClass: 'bg-sidebar-primary-foreground',
        textClass: 'text-sidebar-primary-foreground',
        description: 'Text on sidebar primary',
      },
      {
        name: 'sidebar-accent',
        cssVar: 'sidebar-accent',
        bgClass: 'bg-sidebar-accent',
        textClass: 'text-sidebar-accent',
        description: 'Sidebar hover / active fill',
      },
      {
        name: 'sidebar-accent-foreground',
        cssVar: 'sidebar-accent-foreground',
        bgClass: 'bg-sidebar-accent-foreground',
        textClass: 'text-sidebar-accent-foreground',
        description: 'Text on sidebar accent',
      },
      {
        name: 'sidebar-border',
        cssVar: 'sidebar-border',
        bgClass: 'bg-sidebar-border',
        textClass: 'text-sidebar-border',
        description: 'Sidebar borders',
      },
      {
        name: 'sidebar-ring',
        cssVar: 'sidebar-ring',
        bgClass: 'bg-sidebar-ring',
        textClass: 'text-sidebar-ring',
        description: 'Sidebar focus ring',
      },
    ],
  },
];

export const RADIUS_TOKENS = [
  { name: 'radius-xs', cssVar: 'radius-xs', className: 'rounded-xs', note: 'calc(var(--radius) - 6px)' },
  { name: 'radius-sm', cssVar: 'radius-sm', className: 'rounded-sm', note: 'calc(var(--radius) - 4px)' },
  { name: 'radius-md', cssVar: 'radius-md', className: 'rounded-md', note: 'var(--radius) · 0.5rem' },
  { name: 'radius-lg', cssVar: 'radius-lg', className: 'rounded-lg', note: 'calc(var(--radius) + 2px)' },
  { name: 'radius-xl', cssVar: 'radius-xl', className: 'rounded-xl', note: 'calc(var(--radius) + 6px)' },
  { name: 'radius-2xl', cssVar: 'radius-2xl', className: 'rounded-2xl', note: 'calc(var(--radius) + 10px)' },
] as const;

export const SHADOW_TOKENS = [
  { name: 'shadow-2xs', className: 'shadow-2xs' },
  { name: 'shadow-xs', className: 'shadow-xs' },
  { name: 'shadow-sm', className: 'shadow-sm' },
  { name: 'shadow', className: 'shadow' },
  { name: 'shadow-md', className: 'shadow-md' },
  { name: 'shadow-lg', className: 'shadow-lg' },
  { name: 'shadow-xl', className: 'shadow-xl' },
  { name: 'shadow-2xl', className: 'shadow-2xl' },
] as const;

/** Card elevation utilities from the package theme */
export const CARD_SHADOW_UTILITIES = [
  {
    name: 'shadow-card',
    className: 'shadow-card',
    description: 'Default elevated card edge (uses --shadow-border)',
  },
  {
    name: 'shadow-card-lg',
    className: 'shadow-card-lg',
    description: 'Hover / emphasized card edge (uses --shadow-border-hover)',
  },
] as const;

export const FONT_TOKENS = [
  {
    name: 'font-sans',
    cssVar: 'font-sans',
    className: 'font-sans',
    sample: 'The quick brown fox jumps over the lazy dog',
    description: 'Body UI font (Open Sans / Geist Sans when loaded)',
  },
  {
    name: 'font-mono',
    cssVar: 'font-mono',
    className: 'font-mono',
    sample: 'const token = "primary"',
    description: 'Code and tabular data',
  },
  {
    name: 'font-serif',
    cssVar: 'font-serif',
    className: 'font-serif',
    sample: 'Editorial serif for long-form accents',
    description: 'Optional serif stack (Georgia)',
  },
] as const;

export const Z_INDEX_TOKENS = [
  { name: 'z-layer-floating', value: '1000', description: 'Floating UI above page content' },
  { name: 'z-layer-modal-backdrop', value: '2000', description: 'Modal / dialog backdrops' },
  { name: 'z-layer-modal-content', value: '2001', description: 'Modal / dialog content' },
  { name: 'z-layer-floating-elevated', value: '3000', description: 'Elevated floating layers' },
  { name: 'z-layer-toast', value: '4000', description: 'Toasts and transient notices' },
  { name: 'z-layer-portal-root', value: '9999', description: 'Portal root stacking context' },
] as const;

export const THEME_INSTALL_CSS = `/* app/globals.css */
@import '@constructive-io/ui/globals.css';`;

export const THEME_OVERRIDE_EXAMPLE = `/* Override after the package import */
@import '@constructive-io/ui/globals.css';

:root {
  --primary: oklch(0.55 0.18 250);
  --radius: 0.625rem;
}

.dark {
  --primary: oklch(0.72 0.14 250);
}`;

export const THEME_REGISTRY_INSTALL = `// components.json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}

// Then install the theme (or any component — theme ships as a dependency)
pnpm dlx shadcn@4.13.1 add @constructive/constructive-theme`;
