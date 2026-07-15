// Hand-authored Diátaxis guides — the typed contract shared by the sidebar
// (`nav.ts`), the prev/next chain (`registry.ts`), and the guide pages
// themselves (`app/blocks/(guides)/**`).
//
// Relocated out of `nav.ts` so the guide METADATA has one home that the Route
// and Content stages can extend without touching the nav builder. `nav.ts`
// re-exports `GuideGroupId` / `GuideMeta` / `GUIDES` for back-compat, so the
// Shell-stage nav contract is unchanged.

export type GuideGroupId = 'get-started' | 'guides' | 'concepts';

export interface GuideMeta {
  slug: string;
  title: string;
  href: string;
  group: GuideGroupId;
  /** One-line subhead — used by the guide page header (optional). */
  description?: string;
  /** Sort key within the group (falls back to declaration order). */
  order?: number;
  isNew?: boolean;
  isUpdated?: boolean;
}

export const GUIDE_GROUP_LABEL: Record<GuideGroupId, string> = {
  'get-started': 'Get started',
  guides: 'Guides',
  concepts: 'Concepts',
};

// `description` mirrors each authored page's header subhead, so the contract is
// the single source — pages read `meta.description` first and fall back to a
// local copy only if the contract ever lacks one.
//
// `isNew` / `isUpdated` are intentionally left UNSET. Launch ≠ new: a fresh
// site shipping all guidance at once would dot the entire rail, which reads as
// noise, not signal. The fields stay in this contract (and the dot render path
// in `nav-item.tsx`) so a future generator can flag genuinely recent additions —
// until then the rail stays near-monochrome.
export const GUIDES: GuideMeta[] = [
  // Tutorial (acquisition + action)
  {
    group: 'get-started',
    slug: 'getting-started',
    title: 'Getting started',
    href: '/blocks/getting-started',
    order: 1,
    description:
      'Configure the @constructive registry namespace, provide the host runtime contract, and install your first block.',
  },
  // How-to (application + action)
  {
    group: 'guides',
    slug: 'theming',
    title: 'Theme to your brand',
    href: '/blocks/guides/theming',
    order: 1,
    description: 'Retune the OKLCH design tokens so every block matches your brand — without editing block source.',
  },
  {
    group: 'guides',
    slug: 'adapter',
    title: 'Wire a GraphQL adapter',
    href: '/blocks/guides/adapter',
    order: 2,
    description: "Implement the host runtime contract so blocks reach your application's generated SDK.",
  },
  {
    group: 'guides',
    slug: 'auth',
    title: 'Use with your auth',
    href: '/blocks/guides/auth',
    order: 3,
    description:
      "Wire the auth blocks to your app's session and routing — redirect on success, persist the token, branch on MFA.",
  },
  {
    group: 'guides',
    slug: 'customize-a-flow',
    title: 'Customize a flow',
    href: '/blocks/guides/customize-a-flow',
    order: 4,
    description: "Install a flow's capability bundle, then adapt the blocks it gives you to your app.",
  },
  {
    group: 'guides',
    slug: 'single-component',
    title: 'Install one UI component',
    href: '/blocks/guides/single-component',
    order: 5,
    description: 'Add a single @constructive UI primitive — like Button — without a data block or the full kit.',
  },
  // Explanation (acquisition + cognition)
  {
    group: 'concepts',
    slug: 'why-blocks',
    title: 'Why blocks',
    href: '/blocks/concepts/why-blocks',
    order: 1,
    description:
      'Most registries ship a component’s shape and leave the data path to you. A block ships both — the markup and its binding to your generated SDK.',
  },
  {
    group: 'concepts',
    slug: 'architecture',
    title: 'Architecture & the registry',
    href: '/blocks/concepts/architecture',
    order: 2,
    description:
      'One source of truth, shipped verbatim through a shadcn registry, documented by a generator that reads the same source. Source, distribution, and docs are one chain.',
  },
  {
    group: 'concepts',
    slug: 'design-and-motion',
    title: 'Design & motion',
    href: '/blocks/concepts/design-and-motion',
    order: 3,
    description:
      'The system is calm on purpose: elevation from shadow, one accent, a compressed scale, and motion that carries information rather than decoration.',
  },
  {
    group: 'concepts',
    slug: 'runtime-contract',
    title: 'The runtime contract',
    href: '/blocks/concepts/runtime-contract',
    order: 4,
    description:
      'A block ships its hook call, not its wiring. The host provides one runtime once, and every block — yours or shipped — resolves against it.',
  },
];

/** All guides in a group, sorted by `order` then declaration order. */
export function guidesInGroup(group: GuideGroupId): GuideMeta[] {
  return GUIDES.filter((g) => g.group === group)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
