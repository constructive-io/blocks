// Sidebar navigation tree for the /blocks docs shell.
//
// Pure data (no React, no server-only APIs) so it can be imported from both the
// server layout and the client sidebar. Built from the generated manifest
// (`blocks-manifest.json` via `@/lib/blocks`) + the flows catalog + a small
// hand-authored guide contract (`GUIDES`). The Route / Content stages reuse the
// `GuideMeta` contract and fill in the real guide pages.

import flowsData from '@/flows/flows.json';
import { FLOW_GROUP_LABEL, FLOW_GROUP_ORDER, type FlowGroup } from '@/flows/types';
import {
  blockHref,
  blocks,
  CATEGORY_LABEL,
  uiFamilies,
  uiHref,
  uiItems,
  type BlockCategory,
  type BlockMeta,
} from '@/lib/blocks';

import { GUIDE_GROUP_LABEL, GUIDES, guidesInGroup, type GuideGroupId, type GuideMeta } from './guides-meta';

// The Diátaxis guide contract now lives in `guides-meta.ts`; re-export the names
// the Shell-stage nav contract advertised so existing importers are unaffected.
export { GUIDES, type GuideGroupId, type GuideMeta };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NavItemData {
  /** Stable key + identity (block/ui/flow id, or guide slug). */
  slug: string;
  /** Sidebar display label (block titles are de-prefixed under their category). */
  title: string;
  /** App-relative route (Next prepends basePath; `usePathname()` is basePath-less). */
  href: string;
  /** Recently-added marker → accent dot. Not yet sourced; the generator can fill. */
  isNew?: boolean;
  /** Recently-changed marker → accent dot. Not yet sourced; the generator can fill. */
  isUpdated?: boolean;
}

export interface NavSubgroup {
  id: string;
  /** Quiet 12px domain caption ("Passwords", "Multi-factor auth"). */
  label: string;
  items: NavItemData[];
}

export interface NavGroup {
  id: string;
  /** Quiet 13px header. Omitted for the top (navigational) group. */
  label?: string;
  /** 11px count badge shown next to the label. */
  count?: number;
  /** Flat rows. Empty when the group nests `subgroups` instead. */
  items: NavItemData[];
  /** Domain sub-groups nested under the section header (big categories only). */
  subgroups?: NavSubgroup[];
  /** Draw a hairline above the group — used to cluster the UI families. */
  separated?: boolean;
}

// ---------------------------------------------------------------------------
// Hand-authored guides — the typed contract + data live in `guides-meta.ts`.
// Project the relevant fields onto the nav-item shape per Diátaxis group.
// ---------------------------------------------------------------------------

function guideItems(group: GuideGroupId): NavItemData[] {
  // `isNew` / `isUpdated` are deliberately NOT sourced from the guides (launch ≠
  // new — see guides-meta.ts), so the projection drops them. The fields remain on
  // `NavItemData` and the dot render path stays in `nav-item.tsx` for a future
  // generator-fed signal.
  return guidesInGroup(group).map(({ slug, title, href }) => ({ slug, title, href }));
}

// ---------------------------------------------------------------------------
// Blocks — drop the redundant category prefix from titles under a category header
// ("Auth Sign In Card" → "Sign In Card"). Lib titles are descriptive, not
// prefixed, so they are left untouched.
// ---------------------------------------------------------------------------

const CATEGORY_TITLE_PREFIX: Partial<Record<BlockCategory, string>> = {
  auth: 'Auth',
  org: 'Org',
  shell: 'Shell',
  user: 'User',
};

function blockNavTitle(block: BlockMeta): string {
  const prefix = CATEGORY_TITLE_PREFIX[block.category];
  return prefix && block.title.startsWith(`${prefix} `) ? block.title.slice(prefix.length + 1) : block.title;
}

function blockItems(category: BlockCategory): NavItemData[] {
  return blocks
    .filter((b) => b.category === category)
    .map((b) => ({ slug: b.slug, title: blockNavTitle(b), href: blockHref(b) }));
}

// ---------------------------------------------------------------------------
// Domain sub-groups — big categories nest their items under domain captions
// instead of one flat wall (auth is 49 rows otherwise). Hand-authored here, not
// in the catalog: declared order = render order, and `blockSubgroups` throws at
// module eval on an unknown, duplicate, or unmapped slug — so a newly
// catalogued block fails the build until it is placed in a domain.
// ---------------------------------------------------------------------------

interface SubgroupDef {
  key: string;
  label: string;
  slugs: string[];
}

const BLOCK_SUBGROUPS: Partial<Record<BlockCategory, SubgroupDef[]>> = {
  auth: [
    {
      key: 'sign-in',
      label: 'Sign in & sign up',
      slugs: [
        'auth-sign-in-card',
        'auth-sign-in-page',
        'auth-sign-up-card',
        'auth-sign-up-page',
        'auth-anonymous-sign-in-button',
      ],
    },
    {
      key: 'passwords',
      label: 'Passwords',
      slugs: [
        'auth-forgot-password-card',
        'auth-forgot-password-page',
        'auth-reset-password-card',
        'auth-reset-password-page',
        'auth-change-password-form',
      ],
    },
    {
      key: 'email-verification',
      label: 'Email verification',
      slugs: ['auth-verify-email-page', 'auth-verify-email-banner'],
    },
    {
      key: 'social-sso',
      label: 'Social & SSO',
      slugs: [
        'auth-social-buttons',
        'auth-social-providers-grid',
        'auth-sso-setup-card',
        'auth-sso-sign-in-card',
        'auth-domain-verification-step',
      ],
    },
    {
      key: 'mfa',
      label: 'Multi-factor auth',
      slugs: [
        'auth-mfa-totp-enroll',
        'auth-mfa-totp-challenge',
        'auth-mfa-totp-challenge-page',
        'auth-mfa-totp-disable-confirm',
        'auth-mfa-backup-codes-display',
        'auth-mfa-backup-codes-regenerate',
      ],
    },
    {
      key: 'passkeys',
      label: 'Passkeys',
      slugs: ['auth-passkey-enroll', 'auth-passkey-sign-in', 'auth-passkey-management-list'],
    },
    {
      key: 'magic-link-otp',
      label: 'Magic link & OTP',
      slugs: [
        'auth-magic-link-request-card',
        'auth-magic-link-sent-page',
        'auth-magic-link-callback-page',
        'auth-email-otp-request-card',
        'auth-email-otp-input',
      ],
    },
    {
      key: 'account',
      label: 'Account',
      slugs: [
        'auth-account-settings-page',
        'auth-account-profile-card',
        'auth-account-emails-list',
        'auth-account-phones-list',
        'auth-account-connected-accounts',
        'auth-account-security-card',
        'auth-account-danger-card',
        'auth-account-deletion-confirm-page',
      ],
    },
    {
      key: 'sessions-security',
      label: 'Sessions & security',
      slugs: [
        'auth-account-sessions-list',
        'auth-sign-out-button',
        'auth-step-up-dialog',
        'use-step-up',
        'auth-cross-origin-link',
      ],
    },
    {
      key: 'api-keys',
      label: 'API keys',
      slugs: ['auth-account-api-keys-list', 'auth-api-key-create-dialog', 'auth-api-key-created-modal'],
    },
    {
      key: 'invitations',
      label: 'Invitations',
      slugs: ['auth-invitation-acceptance-card', 'auth-invitation-acceptance-page'],
    },
  ],
  org: [
    {
      key: 'general',
      label: 'General',
      slugs: [
        'org-create-card',
        'org-members-list',
        'org-invite-dialog',
        'org-roles-editor',
        'org-settings-form',
        'org-app-memberships',
      ],
    },
    {
      key: 'scim',
      label: 'SCIM provisioning',
      slugs: ['org-scim-token-generation-card', 'org-scim-connections-list', 'org-scim-setup-guide'],
    },
  ],
};

function blockSubgroups(category: BlockCategory, defs: SubgroupDef[]): { subgroups: NavSubgroup[]; total: number } {
  const items = blockItems(category);
  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const seen = new Set<string>();
  const subgroups = defs.map((def) => ({
    id: `blocks-${category}-${def.key}`,
    label: def.label,
    items: def.slugs.map((slug) => {
      const item = bySlug.get(slug);
      if (!item) throw new Error(`nav: ${category}/${def.key} references unknown block slug "${slug}"`);
      if (seen.has(slug)) throw new Error(`nav: ${category} block slug "${slug}" appears in two sub-groups`);
      seen.add(slug);
      return item;
    }),
  }));
  const missing = items.filter((i) => !seen.has(i.slug));
  if (missing.length)
    throw new Error(`nav: ${category} blocks missing a sub-group: ${missing.map((i) => i.slug).join(', ')}`);
  return { subgroups, total: items.length };
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

interface FlowEntry {
  id: string;
  name: string;
  group: FlowGroup;
}

const flows = (flowsData as { flows: FlowEntry[] }).flows;

/** Per-flow route — mirrors scripts/generate-flows.mjs (`/blocks/flows/<group>/<id>`). */
function flowHref(group: FlowGroup, id: string): string {
  return `/blocks/flows/${group}/${id}`;
}

function flowItems(group: FlowGroup): NavItemData[] {
  return flows
    .filter((f) => f.group === group)
    .map((f) => ({ slug: f.id, title: f.name, href: flowHref(group, f.id) }));
}

// ---------------------------------------------------------------------------
// The ordered sidebar tree — flows/blocks lead; the UI foundation (primitive
// components every block composes) is deliberately LAST, below Flows and Lib.
//   top → Get started → Guides → Concepts → Blocks(auth/org/shell/chat/schema/user)
//       → Flows(by group) → Lib → UI(families, separated)
// ---------------------------------------------------------------------------

const BLOCK_SECTION_ORDER: BlockCategory[] = ['auth', 'org', 'shell', 'chat', 'schema', 'user'];

function buildNavGroups(): NavGroup[] {
  const groups: NavGroup[] = [];

  // Top: navigational, no header / count.
  groups.push({
    id: 'top',
    items: [
      { slug: 'showcase', title: 'Showcase', href: '/' },
      { slug: 'introduction', title: 'Introduction', href: '/blocks' },
    ],
  });

  // Diátaxis guide groups.
  const getStarted = guideItems('get-started');
  if (getStarted.length) groups.push({ id: 'get-started', label: GUIDE_GROUP_LABEL['get-started'], items: getStarted });

  const howto = guideItems('guides');
  if (howto.length) groups.push({ id: 'guides', label: GUIDE_GROUP_LABEL.guides, count: howto.length, items: howto });

  const concepts = guideItems('concepts');
  if (concepts.length)
    groups.push({ id: 'concepts', label: GUIDE_GROUP_LABEL.concepts, count: concepts.length, items: concepts });

  // Blocks — one group per category; big categories nest domain sub-groups.
  for (const category of BLOCK_SECTION_ORDER) {
    const defs = BLOCK_SUBGROUPS[category];
    if (defs) {
      const { subgroups, total } = blockSubgroups(category, defs);
      groups.push({ id: `blocks-${category}`, label: CATEGORY_LABEL[category], count: total, items: [], subgroups });
      continue;
    }
    const items = blockItems(category);
    if (items.length)
      groups.push({ id: `blocks-${category}`, label: CATEGORY_LABEL[category], count: items.length, items });
  }

  // Flows — by flow group.
  for (const group of FLOW_GROUP_ORDER) {
    const items = flowItems(group);
    if (items.length) groups.push({ id: `flows-${group}`, label: FLOW_GROUP_LABEL[group], count: items.length, items });
  }

  // Lib.
  const lib = blockItems('lib');
  if (lib.length) groups.push({ id: 'blocks-lib', label: CATEGORY_LABEL.lib, count: lib.length, items: lib });

  // UI — families, visually clustered with hairline separators. Kept last: the
  // registry leads with flows/blocks; primitives are the supporting foundation.
  for (const family of uiFamilies) {
    const items = uiItems
      .filter((u) => u.family === family.key)
      .map((u) => ({ slug: u.slug, title: u.title, href: uiHref(u) }));
    if (items.length)
      groups.push({ id: `ui-${family.key}`, label: family.label, count: items.length, items, separated: true });
  }

  return groups;
}

export const NAV_GROUPS: NavGroup[] = buildNavGroups();

// ---------------------------------------------------------------------------
// Path helper — trailing-slash normalizer shared by the sidebar + pager.
// ---------------------------------------------------------------------------

/** Strip a single trailing slash (static export can emit `/blocks/x/`). */
export function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
