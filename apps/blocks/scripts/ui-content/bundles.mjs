/**
 * ui-content — Bundles family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 */

export const ITEMS = {
  'form-kit': {
    tier: 'lean',
    intro: `Form Kit is a convenience bundle that brings in every form-related component at once — input, textarea, checkbox, checkbox group, radio group, switch, select, progress, and the form controls (\`form\`, \`form-control\`, \`input-group\`, \`field\`, \`label\`). Reach for it to scaffold a form-heavy surface without adding each component one by one; once installed, import each from its own subpath.`,
    usage: `// Form Kit installs the full form component set. Import each from its subpath:
import { Input } from '@constructive-io/ui/input';
import { Select } from '@constructive-io/ui/select';`,
    parts: [
      { name: 'Inputs', description: '\`input\`, \`textarea\`, \`select\`, \`checkbox\`, \`checkbox-group\`, \`radio-group\`, \`switch\`.' },
      { name: 'Form controls', description: '\`form\`, \`form-control\`, \`input-group\`, \`field\`, \`label\`.' },
      { name: 'Feedback', description: '\`progress\`.' },
    ],
  },
  'overlay-kit': {
    tier: 'lean',
    intro: `Overlay Kit bundles every floating and overlay component — dialog, sheet, drawer, popover, tooltip, dropdown menu, alert dialog, and command. Install it when a screen leans on overlays so you get the whole family (all wired through the same portal layer) in one step; import each from its own subpath afterward.`,
    usage: `// Overlay Kit installs the full overlay component set. Import each from its subpath:
import { Dialog } from '@constructive-io/ui/dialog';
import { Popover } from '@constructive-io/ui/popover';`,
    parts: [
      { name: 'Modals', description: '\`dialog\`, \`alert-dialog\`, \`sheet\`, \`drawer\`.' },
      { name: 'Floating', description: '\`popover\`, \`tooltip\`, \`dropdown-menu\`.' },
      { name: 'Command', description: '\`command\` palette.' },
    ],
  },
  'layout-kit': {
    tier: 'lean',
    intro: `Layout Kit bundles the structural and navigation components — tabs, sidebar, collapsible, resizable panels, scroll area, breadcrumb, pagination, and separator. Use it to lay out an app shell in one install instead of adding each piece individually; import each from its own subpath afterward.`,
    usage: `// Layout Kit installs the full layout component set. Import each from its subpath:
import { Tabs } from '@constructive-io/ui/tabs';
import { ResizablePanelGroup } from '@constructive-io/ui/resizable';`,
    parts: [
      { name: 'Navigation', description: '\`tabs\`, \`sidebar\`, \`breadcrumb\`, \`pagination\`.' },
      { name: 'Structure', description: '\`resizable\`, \`scroll-area\`, \`collapsible\`, \`separator\`.' },
    ],
  },
};
