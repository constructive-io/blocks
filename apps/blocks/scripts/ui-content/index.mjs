/**
 * ui-content — source of truth for the `ui` docs category (the
 * `@constructive-io/ui` foundation exposed by the registry).
 *
 * The item LIST is derived from `packages/ui/registry.json` by
 * `generate-manifest.mjs`; these files supply everything the registry can't:
 * prose, usage snippets, props rows, and the showcase/lean tier. Every
 * registry item must have exactly one entry, in the family file it belongs
 * to — the file an item lives in IS its sidebar family.
 *
 * Per-item contract:
 *   '<registry item name>': {
 *     tier: 'showcase' | 'lean',  // showcase = live demo registered in
 *                                 // showcase-ui.tsx; lean = no preview
 *     intro: string,              // 1-2 public sentences above the fold
 *     usage: string,              // tsx fence body: real import from
 *                                 // '@constructive-io/ui/<name>' + minimal JSX
 *     props?: Array<{ name, type, default?, required?, description }>,
 *     parts?: Array<{ name, description }>,  // compound-component part list
 *     purpose?: string,           // overrides the registry description in
 *                                 // frontmatter/cards when it needs polish
 *   }
 *
 * `intro: null` / `usage: null` = not yet authored: the generator skips the
 * page (warn) and the ui-parity test fails — authoring is enforced at the
 * gate, not at generation time.
 *
 * Docs harness only — never consumed by block source or the registry build.
 */

import { ITEMS as core } from './core.mjs';
import { ITEMS as forms } from './forms.mjs';
import { ITEMS as pickers } from './pickers.mjs';
import { ITEMS as overlays } from './overlays.mjs';
import { ITEMS as layout } from './layout.mjs';
import { ITEMS as navigation } from './navigation.mjs';
import { ITEMS as data } from './data.mjs';
import { ITEMS as effects } from './effects.mjs';
import { ITEMS as subsystems } from './subsystems.mjs';
import { ITEMS as storage } from './storage.mjs';
import { ITEMS as bundles } from './bundles.mjs';
import { ITEMS as utilities } from './utilities.mjs';

export const UI_FAMILY_ORDER = [
  'core',
  'forms',
  'pickers',
  'overlays',
  'layout',
  'navigation',
  'data',
  'effects',
  'subsystems',
  'storage',
  'bundles',
  'utilities',
];

export const UI_FAMILY_LABEL = {
  core: 'Core',
  forms: 'Forms',
  pickers: 'Pickers & input',
  overlays: 'Overlays',
  layout: 'Layout',
  navigation: 'Navigation',
  data: 'Data display',
  effects: 'Effects',
  subsystems: 'Subsystems',
  storage: 'Storage',
  bundles: 'Bundles',
  utilities: 'Utilities & theme',
};

const FAMILIES = { core, forms, pickers, overlays, layout, navigation, data, effects, subsystems, storage, bundles, utilities };

/** name -> { family, tier, intro, usage, props?, parts?, purpose? } */
export const UI_CONTENT = {};
for (const [family, items] of Object.entries(FAMILIES)) {
  for (const [name, item] of Object.entries(items)) {
    if (UI_CONTENT[name]) throw new Error(`ui-content: '${name}' declared in both '${UI_CONTENT[name].family}' and '${family}'`);
    UI_CONTENT[name] = { family, ...item };
  }
}
