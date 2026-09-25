import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { DocSectionNav } from '@/components/docs/doc-section-nav';
import { GuidanceList, SectionHubCards, SectionHubHeader } from '@/components/docs/section-hub';
import { applicationBlockHref, getApplicationBlock } from '@/lib/application-blocks';
import { getFeaturePackDoc } from '@/lib/feature-packs';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Storage';
const DESCRIPTION =
  'One storage workspace in two shapes: the Storage Browser you install and wire yourself, and the storage feature pack that renders the same browser for Console Kit.';

const browser = getApplicationBlock('storage-browser')!;
const pack = getFeaturePackDoc('storage')!;

const ENTRIES = [
  {
    href: applicationBlockHref(browser),
    eyebrow: 'Workspace',
    title: browser.title,
    description: 'Buckets in the sidebar, a file list with search, sort, selection, and drag-and-drop upload, plus detail, bucket, and upload sheets. You own the data and every action.',
    install: browser.name,
  },
  {
    href: '/blocks/features/storage',
    eyebrow: 'Console Kit',
    title: `${pack.title} feature pack`,
    description: 'The Storage Browser behind a policy-aware pack contract: folders, uploads, downloads, and deletes as host actions, with a Console Kit module that finds buckets through _meta.',
    install: pack.registryName,
  },
] as const;

const LEAVES = [
  'storage-bucket-rail',
  'storage-object-table',
  'storage-upload-dropzone',
  'storage-object-detail-sheet',
  'storage-bucket-config-sheet',
  'storage-empty-state',
] as const;

export default function StorageDocsPage() {
  return (
    <article aria-labelledby="storage-title" className="registry-page">
      <SectionHubHeader id="storage-title" title={TITLE} description={DESCRIPTION} />

      <DocSectionNav section="storage" current="/blocks/storage" />

      <SectionHubCards label="Storage workspaces" entries={ENTRIES} />

      <DocSection
        description="Both render the same workspace; the difference is who maps the data and enforces the actions."
        id="which-one"
        title="Which one to install"
      >
        <GuidanceList
          items={[
            'Storage Browser: your app already has a storage client. Map buckets and objects into the storage types and handle each callback yourself.',
            'Feature pack: you want the browser behind a resource, a policy, and named actions, so Console Kit (or any host) can switch actions on and off per endpoint.',
            'A single leaf: your product already owns the layout and needs one piece, such as the file table or the upload drop zone.',
          ]}
        />
      </DocSection>

      <DocSection
        description="Each piece installs on its own and shares the storage types and helpers."
        id="building-blocks"
        title="Building blocks"
      >
        <div className="flex flex-col gap-3">
          {LEAVES.map((leaf) => (
            <CodeBlock key={leaf} label={leaf}>
              {registryAdd(leaf)}
            </CodeBlock>
          ))}
        </div>
      </DocSection>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/storage') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/storage'),
    images: [OG_IMAGE],
  },
};
