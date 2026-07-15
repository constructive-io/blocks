// Storage UI kit — stateless, presentational components for an S3-like
// object browser. Wire to live data in a later phase; these take props +
// callbacks only.

// Types
export type {
	BucketVisibility,
	StorageBucket,
	StorageObject,
	StorageObjectStatus,
	UploadItem,
	UploadStatus,
	ObjectSort,
	ObjectSortColumn,
} from './types';

// Pure helpers
export {
	humanizeBytes,
	formatDate,
	formatDateTime,
	shortMimeLabel,
	objectDisplayName,
	bucketDisplayName,
} from './utils';

// Components
export { FileTypeIcon } from './file-type-icon';
export { VisibilityBadge, ObjectStatusBadge } from './visibility-badge';
export { BucketRail } from './bucket-rail';
export { StorageBreadcrumb, type StorageBreadcrumbSegment } from './storage-breadcrumb';
export { ObjectToolbar } from './object-toolbar';
export { ObjectTable, ObjectTableSkeleton, OBJECT_TABLE_COLUMN_COUNT } from './object-table';
export { ObjectDetailSheet } from './object-detail-sheet';
export { UploadDropzone, UploadProgressList } from './upload-dropzone';
export {
	BucketConfigSheet,
	type BucketConfigMode,
	type BucketConfigValue,
	type BucketConfigSupportedFields,
} from './bucket-config-sheet';
export { StorageEmptyState, type StorageEmptyStateVariant } from './storage-empty-state';
export { StorageBrowser } from './storage-browser';
