/**
 * ui-content — Storage family.
 *
 * Per-item docs content for the `ui` category pages. See ./index.mjs for the
 * full contract. `intro: null` / `usage: null` means "not yet authored" — the
 * generator skips the page and the parity test fails until it is filled in.
 *
 * The Storage kit is a set of stateless, presentational components for an
 * S3-like object browser. Every piece is controlled — props + callbacks only —
 * so a host can wire it to any data layer. All showcase demos import from the
 * kit barrel `@constructive-io/ui/storage`.
 */

export const ITEMS = {
  'storage': {
    // Foundation: types, formatters, and stateless leaves the other storage
    // blocks build on. No standalone preview — it ships the shared plumbing.
    tier: 'lean',
    purpose: `Shared foundation for the Storage kit — domain types, pure formatters, and the small stateless leaves the other storage blocks compose.`,
    intro: `Storage is the shared foundation the rest of the kit builds on: the domain types (\`StorageBucket\`, \`StorageObject\`, \`UploadItem\`), pure formatters (\`humanizeBytes\`, \`formatDate\`, \`shortMimeLabel\`), and the stateless leaf components — \`FileTypeIcon\`, \`VisibilityBadge\`, \`ObjectStatusBadge\`, \`StorageBreadcrumb\`, and \`ObjectToolbar\`. Install it once and the object table, dropzone, sheets, and browser all reuse it.`,
    usage: `import {
  FileTypeIcon,
  VisibilityBadge,
  ObjectStatusBadge,
  humanizeBytes,
  type StorageObject,
} from '@constructive-io/ui/storage';

function ObjectSummary({ object }: { object: StorageObject }) {
  return (
    <div className="flex items-center gap-2">
      <FileTypeIcon mimeType={object.mimeType} />
      <span className="font-medium">{object.filename}</span>
      <span className="text-muted-foreground">{humanizeBytes(object.size)}</span>
      <VisibilityBadge visibility={object.isPublic ? 'public' : 'private'} size="sm" />
    </div>
  );
}`,
    parts: [
      { name: 'FileTypeIcon', description: 'A lucide glyph chosen from a file\'s MIME type.' },
      { name: 'VisibilityBadge', description: 'Neutral-by-default badge for a bucket\'s public / private / temp visibility.' },
      { name: 'ObjectStatusBadge', description: 'Lifecycle badge for a stored object (requested / uploaded / processed).' },
      { name: 'StorageBreadcrumb', description: 'Bucket root plus optional folder segments; the last crumb is the current location.' },
      { name: 'ObjectToolbar', description: 'Search + sort + upload that swaps to a selection action bar when rows are selected.' },
      { name: 'humanizeBytes / formatDate / shortMimeLabel', description: 'Pure formatters for sizes, dates, and MIME labels.' },
    ],
  },

  'storage-bucket-rail': {
    tier: 'showcase',
    intro: `Left-hand rail of storage buckets; each row is selectable and shows a visibility badge, with a pinned "New bucket" action at the bottom.`,
    usage: `import { BucketRail } from '@constructive-io/ui/storage';

<BucketRail
  buckets={buckets}
  selectedBucketId={selectedId}
  onSelectBucket={setSelectedId}
  onNewBucket={() => openCreateSheet()}
/>`,
    props: [
      { name: 'buckets', type: 'StorageBucket[]', required: true, description: 'Buckets to list, top to bottom.' },
      { name: 'selectedBucketId', type: 'string | null', default: '—', description: 'Currently selected bucket id; highlights its row.' },
      { name: 'onSelectBucket', type: '(bucketId: string) => void', required: true, description: 'Called when a bucket row is clicked.' },
      { name: 'onNewBucket', type: '() => void', default: '—', description: 'Called by the pinned "New bucket" action.' },
      { name: 'className', type: 'string', default: '—', description: 'Extra classes on the rail container.' },
    ],
  },

  'storage-object-table': {
    tier: 'showcase',
    intro: `A selectable, sortable table of files with a per-row actions menu for download, rename, and delete; sort and selection are controlled.`,
    usage: `import { ObjectTable } from '@constructive-io/ui/storage';

<ObjectTable
  objects={objects}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  sort={sort}
  onSortChange={setSort}
  onOpenObject={openDetail}
  onDelete={confirmDelete}
/>`,
    props: [
      { name: 'objects', type: 'StorageObject[]', required: true, description: 'Rows to render (already sorted/filtered by the host).' },
      { name: 'selectedIds', type: 'string[]', required: true, description: 'Controlled set of selected object ids.' },
      { name: 'onSelectionChange', type: '(ids: string[]) => void', required: true, description: 'Called when the row / header checkboxes change.' },
      { name: 'sort', type: 'ObjectSort', required: true, description: 'Active sort column + direction.' },
      { name: 'onSortChange', type: '(sort: ObjectSort) => void', required: true, description: 'Called when a sortable header is clicked.' },
      { name: 'onOpenObject', type: '(object: StorageObject) => void', default: '—', description: 'Row click outside the checkbox/menu.' },
      { name: 'onDownload / onCopyLink / onRename / onDelete', type: '(object: StorageObject) => void', default: '—', description: 'Per-row actions from the actions menu.' },
      { name: 'isLoading', type: 'boolean', default: 'false', description: 'Render the skeleton instead of rows.' },
      { name: 'emptyLabel', type: 'string', default: `'No files'`, description: 'Message shown when there are no objects.' },
    ],
  },

  'storage-upload-dropzone': {
    tier: 'showcase',
    intro: `Drag-and-drop target with a Browse button and a progress list; chosen files come out through \`onFiles\`, and rows render from \`uploads\`.`,
    usage: `import { UploadDropzone } from '@constructive-io/ui/storage';

<UploadDropzone
  onFiles={(files) => enqueue(files)}
  uploads={uploads}
  onCancel={cancelUpload}
  maxSize={50 * 1024 * 1024}
/>`,
    props: [
      { name: 'onFiles', type: '(files: FileList) => void', required: true, description: 'Chosen files from a drop or the Browse input.' },
      { name: 'uploads', type: 'UploadItem[]', default: '—', description: 'Current uploads listed under the dropzone.' },
      { name: 'onCancel', type: '(id: string) => void', default: '—', description: 'Cancel a queued or in-flight upload.' },
      { name: 'accept', type: 'string', default: '—', description: '`accept` attribute forwarded to the file input.' },
      { name: 'maxSize', type: 'number | null', default: '—', description: 'Max bytes — shown as a hint only (no enforcement).' },
    ],
    parts: [
      { name: 'UploadDropzone', description: 'The drag target + Browse button; renders the progress list when uploads are present.' },
      { name: 'UploadProgressList', description: 'Standalone list of upload rows with progress, status, and per-item cancel.' },
    ],
  },

  'storage-object-detail-sheet': {
    tier: 'showcase',
    intro: `Right-side panel for one object — image thumbnail or file-type glyph, metadata, and inline rename; delete routes through a confirm dialog.`,
    usage: `import { ObjectDetailSheet } from '@constructive-io/ui/storage';

<ObjectDetailSheet
  object={activeObject}
  open={activeObject !== null}
  onOpenChange={(open) => !open && setActiveObject(null)}
  onDownload={download}
  onRename={rename}
  onDelete={remove}
/>`,
    props: [
      { name: 'object', type: 'StorageObject | null', required: true, description: 'The object to show; `null` renders an empty sheet.' },
      { name: 'open', type: 'boolean', required: true, description: 'Controlled open state.' },
      { name: 'onOpenChange', type: '(open: boolean) => void', required: true, description: 'Called when the sheet requests to open/close.' },
      { name: 'onDownload / onCopyLink', type: '(object: StorageObject) => void', default: '—', description: 'Primary download / copy-link actions.' },
      { name: 'onRename', type: '(id: string, newName: string) => void', default: '—', description: 'Commit an inline rename.' },
      { name: 'onDelete', type: '(id: string) => void', default: '—', description: 'Confirmed delete of the object.' },
      { name: 'isPreviewLoading', type: 'boolean', default: 'false', description: 'Show a skeleton while a signed image URL resolves.' },
    ],
  },

  'storage-bucket-config-sheet': {
    tier: 'showcase',
    intro: `Create-or-edit form for a bucket in a right-side Sheet; \`supportedFields\` gates the optional controls to the columns your schema supports.`,
    usage: `import { BucketConfigSheet } from '@constructive-io/ui/storage';

<BucketConfigSheet
  mode="create"
  open={open}
  onOpenChange={setOpen}
  onSubmit={(value) => createBucket(value)}
  supportedFields={{ allowedOrigins: false }}
/>`,
    props: [
      { name: 'mode', type: `'create' | 'edit'`, required: true, description: 'Whether the form creates a new bucket or edits an existing one.' },
      { name: 'initial', type: 'Partial<StorageBucket>', default: '—', description: 'Seed values (e.g. the bucket being edited).' },
      { name: 'open', type: 'boolean', required: true, description: 'Controlled open state.' },
      { name: 'onOpenChange', type: '(open: boolean) => void', required: true, description: 'Called when the sheet requests to open/close.' },
      { name: 'onSubmit', type: '(value: BucketConfigValue) => void', required: true, description: 'Called with the flat form value on submit.' },
      { name: 'onCancel', type: '() => void', default: '—', description: 'Called when the Cancel button is used.' },
      { name: 'supportedFields', type: 'BucketConfigSupportedFields', default: '—', description: 'Gate optional controls to the host schema; omitted ⇒ show all.' },
    ],
  },

  'storage-empty-state': {
    tier: 'showcase',
    intro: `Zero and blocked states for a storage surface — no buckets, not provisioned, empty bucket, or no access — chosen with the \`variant\` prop.`,
    usage: `import { StorageEmptyState } from '@constructive-io/ui/storage';

<StorageEmptyState variant="empty-bucket" onAction={() => openUpload()} />`,
    props: [
      { name: 'variant', type: `'no-buckets' | 'not-provisioned' | 'empty-bucket' | 'no-access'`, required: true, description: 'Which zero/blocked state to render.' },
      { name: 'onAction', type: '() => void', default: '—', description: 'Primary action (create bucket, upload, provision…).' },
      { name: 'onSecondaryAction', type: '() => void', default: '—', description: 'Secondary action — only the `no-access` variant renders one (Refresh).' },
      { name: 'className', type: 'string', default: '—', description: 'Extra classes on the container.' },
    ],
  },

  'storage-browser': {
    tier: 'showcase',
    intro: `Full master/detail composition — a bucket rail plus the object browser; render the detail and config sheets alongside it.`,
    usage: `import { StorageBrowser } from '@constructive-io/ui/storage';

<StorageBrowser
  buckets={buckets}
  selectedBucketId={selectedId}
  onSelectBucket={setSelectedId}
  objects={objects}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  sort={sort}
  onSortChange={setSort}
  query={query}
  onQueryChange={setQuery}
  onOpenObject={openDetail}
  onUpload={openUpload}
/>`,
    props: [
      { name: 'buckets', type: 'StorageBucket[]', required: true, description: 'Buckets for the left rail.' },
      { name: 'selectedBucketId', type: 'string | null', default: '—', description: 'Selected bucket; drives the right pane.' },
      { name: 'onSelectBucket', type: '(bucketId: string) => void', required: true, description: 'Select a bucket.' },
      { name: 'objects', type: 'StorageObject[]', required: true, description: 'Objects in the selected bucket.' },
      { name: 'selectedIds', type: 'string[]', required: true, description: 'Controlled object selection.' },
      { name: 'sort / onSortChange', type: 'ObjectSort · (sort) => void', required: true, description: 'Controlled table sort.' },
      { name: 'query / onQueryChange', type: 'string · (query) => void', required: true, description: 'Controlled search query in the toolbar.' },
      { name: 'segments / onNavigate', type: 'StorageBreadcrumbSegment[] · (path) => void', default: '—', description: 'Optional folder breadcrumb.' },
      { name: 'onBulkDelete', type: '(ids: string[]) => void', default: '—', description: 'Delete the current selection.' },
      { name: 'emptyState', type: 'StorageEmptyStateVariant | null', default: '—', description: 'Show an empty state instead of the table.' },
      { name: 'isLoading', type: 'boolean', default: 'false', description: 'Render the table skeleton.' },
    ],
  },
};
