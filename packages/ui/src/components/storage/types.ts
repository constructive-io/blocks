/**
 * Domain types for the Storage UI kit.
 *
 * These mirror the real Storage GraphQL schema so wiring a data layer
 * (Phase 2) is a matter of mapping query results onto these shapes — no
 * component prop changes required.
 */

export type BucketVisibility = 'public' | 'private' | 'temp';

export interface StorageBucket {
	id: string;
	key: string;
	visibility: BucketVisibility;
	isPublic: boolean;
	allowCustomKeys: boolean;
	allowedMimeTypes?: string[];
	maxFileSize?: number | null;
	allowedOrigins?: string[];
	description?: string | null;
	provisioned?: boolean;
	objectCount?: number | null;
	createdAt?: string;
}

export type StorageObjectStatus = 'requested' | 'uploaded' | 'processed';

export interface StorageObject {
	id: string;
	bucketId: string;
	key: string;
	filename: string | null;
	mimeType: string;
	size: number;
	isPublic: boolean;
	status?: StorageObjectStatus;
	createdAt: string;
	updatedAt?: string;
	downloadUrl?: string | null;
}

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
	id: string;
	filename: string;
	size: number;
	progress: number;
	status: UploadStatus;
	error?: string;
}

export type ObjectSortColumn = 'filename' | 'size' | 'createdAt' | 'mimeType';

export type ObjectSort = {
	column: ObjectSortColumn;
	direction: 'asc' | 'desc';
};
