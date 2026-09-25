export type ApplicationDocId =
  | 'org-chart'
  | 'storage-browser'
  | 'agents-builder'
  | 'billing-account'
  | 'billing-console'
  | 'sheets'
  | 'schema-builder'
  | 'console-kit'
  | 'documents';

export type ApplicationDocLink = Readonly<{
  id: ApplicationDocId;
  title: string;
  /** Defaults to `/blocks/<id>`. */
  href?: string;
}>;

export const APPLICATION_DOC_SEQUENCE: readonly ApplicationDocLink[] = [
  { id: 'org-chart', title: 'Org Chart' },
  { id: 'storage-browser', title: 'Storage Browser', href: '/blocks/storage/browser' },
  { id: 'agents-builder', title: 'Agents Builder' },
  { id: 'billing-account', title: 'Billing Account', href: '/blocks/billing/account' },
  { id: 'billing-console', title: 'Billing Console', href: '/blocks/billing/console' },
  { id: 'sheets', title: 'Sheets' },
  { id: 'schema-builder', title: 'Schema Builder' },
  { id: 'console-kit', title: 'Console Kit' },
  { id: 'documents', title: 'JSON documents' },
];

export function getApplicationDocNeighbors(currentId: ApplicationDocId) {
  const currentIndex = APPLICATION_DOC_SEQUENCE.findIndex(
    ({ id }) => id === currentId,
  );

  if (currentIndex === -1) {
    throw new Error(`Unknown application documentation route: ${currentId}`);
  }

  return {
    previous:
      currentIndex > 0
        ? APPLICATION_DOC_SEQUENCE[currentIndex - 1]
        : undefined,
    next:
      currentIndex < APPLICATION_DOC_SEQUENCE.length - 1
        ? APPLICATION_DOC_SEQUENCE[currentIndex + 1]
        : undefined,
  };
}
