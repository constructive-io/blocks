/**
 * showcase-manifest — the curated landing showcase list (DESIGN.md §4.2).
 *
 * A hand-authored pick of live demos drawn from the DEMOS / UI_DEMOS registries,
 * chosen to be self-contained at tile size and spread across categories
 * (auth / org / ui / storage / user / shell). The GridMotion wall cycles this
 * list to fill its 28 tiles. Each entry's doc href + display label are DERIVED
 * from the block/ui catalog helpers (never hand-typed) so links can't drift
 * from the registry.
 *
 * Landing-only — never imported by block source.
 */

import { blockHref, getBlock, uiHref, uiItems } from '@/lib/blocks';

/**
 * The wall rows — 4 marquee tracks of 6 tiles each, COMPLEX blocks first (auth
 * flows, org management, storage, shell subsystems). Primitive ui components are
 * deliberately absent: the wall sells the full-stack blocks, the docs sell the
 * primitives. Every slug is verified against the demo registries at render (the
 * wall skips unknown keys).
 */
export const SHOWCASE_ROWS: string[][] = [
  [
    'auth-sign-in-card',
    'org-members-list',
    'auth-mfa-totp-enroll',
    'auth-account-api-keys-list',
    'org-settings-form',
    'auth-passkey-sign-in',
  ],
  [
    'auth-sign-up-card',
    'org-roles-editor',
    'auth-account-sessions-list',
    'auth-magic-link-request-card',
    'ui-storage-object-table',
    'auth-mfa-backup-codes-display',
  ],
  [
    'auth-sso-setup-card',
    'auth-account-connected-accounts',
    'org-scim-connections-list',
    'auth-change-password-form',
    'shell-command-palette',
    'auth-email-otp-request-card',
  ],
  [
    'ui-storage-upload-dropzone',
    'auth-invitation-acceptance-card',
    'org-app-memberships',
    'auth-passkey-management-list',
    'shell-account-menu',
    'auth-forgot-password-card',
  ],
];

export interface ShowcaseMeta {
  href: string;
  name: string;
}

/**
 * Resolve a showcase slug to its doc href + display label via the catalog
 * helpers. `ui-*` slugs map through the ui registry (`/blocks/ui/<name>`); every
 * other slug is a block (`/blocks/<category>/<name>`). Returns `null` for an
 * unknown slug so the grid skips it instead of rendering a dead card.
 */
export function showcaseMeta(slug: string): ShowcaseMeta | null {
  if (slug.startsWith('ui-')) {
    const ui = uiItems.find((u) => u.slug === slug);
    return ui ? { href: uiHref(ui), name: ui.title } : null;
  }
  const block = getBlock(slug);
  return block ? { href: blockHref(block), name: block.title } : null;
}
