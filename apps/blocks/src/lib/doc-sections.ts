/**
 * Docs sections that group a feature pack with the application blocks it is
 * built from under one sidebar entry and a tab row, e.g. Billing (two
 * templates and the pack) and Storage (the browser and the pack).
 */
export type DocSectionId = 'billing' | 'storage';

export type DocSection = Readonly<{
  id: DocSectionId;
  title: string;
  /** Overview page and the sidebar entry's target. */
  hub: string;
  /** Feature pack documented in this section; its sidebar entry points at the hub. */
  packId: string;
  links: readonly Readonly<{ href: string; label: string }>[];
  /** One line for llms.txt and the Setup catalog. */
  summary: string;
}>;

export const DOC_SECTIONS: Readonly<Record<DocSectionId, DocSection>> = {
  billing: {
    id: 'billing',
    title: 'Billing',
    hub: '/blocks/billing',
    packId: 'billing',
    links: [
      { href: '/blocks/billing', label: 'Overview' },
      { href: '/blocks/billing/account', label: 'Billing Account' },
      { href: '/blocks/billing/console', label: 'Billing Console' },
      { href: '/blocks/features/billing', label: 'Feature pack' },
    ],
    summary: 'Billing workspaces for platform and tenant billing: the Billing Account and Billing Console templates, gift codes, and the billing feature pack.',
  },
  storage: {
    id: 'storage',
    title: 'Storage',
    hub: '/blocks/storage',
    packId: 'storage',
    links: [
      { href: '/blocks/storage', label: 'Overview' },
      { href: '/blocks/storage/browser', label: 'Storage Browser' },
      { href: '/blocks/features/storage', label: 'Feature pack' },
    ],
    summary: 'Object storage: the Storage Browser workspace, its leaves (bucket rail, file table, uploads, detail and bucket sheets), and the storage feature pack that renders it for Console Kit.',
  },
};

export const DOC_SECTION_LIST: readonly DocSection[] = Object.values(DOC_SECTIONS);

/** The section a feature pack belongs to, if any. */
export function docSectionForPack(packId: string): DocSection | undefined {
  return DOC_SECTION_LIST.find((section) => section.packId === packId);
}

/** Whether a path is one of the section's pages, for the sidebar's active state. */
export function isDocSectionPath(section: DocSection, path: string) {
  return path === section.hub || path.startsWith(`${section.hub}/`) || path === `/blocks/features/${section.packId}`;
}
