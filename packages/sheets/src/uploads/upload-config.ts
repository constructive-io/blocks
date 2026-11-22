// Host configuration for file uploads (`SheetsConfig.upload`).
//
// Every field is optional. A server that names the files table of each file
// column needs none of them: Sheets reads the upload operation from the
// storage service's own `_meta`, and the bucket a column is bound to from its
// `_meta` file binding. The fields below choose a bucket, supply an owner for
// entity-scoped storage, and bind columns the server leaves open.

/** Per-column upload choices. Each field overrides the matching top-level field. */
export interface SheetsUploadColumnConfig {
	/** Files table (GraphQL type name) to upload into, when the server does not bind the column to one. */
	filesType?: string;
	/** Bucket key to upload into, over the bucket the server binds the column to. */
	bucketKey?: string;
	/** Which default bucket to use when no bucket key is set: the public one (true) or the private one (false). */
	isPublic?: boolean;
	/** Owner id for a files table whose uploads need one. */
	ownerId?: string;
}

/** How long Sheets keeps retrying a cell write while the server confirms a new file. */
export interface SheetsUploadProcessingConfig {
	/** Give up and offer a manual retry after this long. Default 120 000 ms. */
	timeoutMs?: number;
	/** First wait between attempts. Doubles up to `maxDelayMs`. Default 1 000 ms. */
	initialDelayMs?: number;
	/** Longest wait between attempts. Default 8 000 ms. */
	maxDelayMs?: number;
}

export interface SheetsUploadConfig {
	/**
	 * Bucket key for file columns the server binds to no bucket. Omit to use the
	 * default bucket chosen by `isPublic`.
	 */
	bucketKey?: string;
	/** Which default bucket to use when no bucket key is set. Default true (the public default bucket). */
	isPublic?: boolean;
	/** Owner id sent when a files table needs one (entity-scoped storage). */
	ownerId?: string;
	/**
	 * Files table (GraphQL type name) for file columns the server does not bind,
	 * when the storage service has several files tables.
	 */
	filesType?: string;
	/** Per-column choices, keyed by `TableModel.key` or table name, then by column name. */
	columns?: Readonly<Record<string, Readonly<Record<string, SheetsUploadColumnConfig>>>>;
	/** Retry window for a write that waits on the server's file confirmation. */
	processing?: SheetsUploadProcessingConfig;
}

/** The choices that apply to one column, after per-column entries are merged over the top level. */
export interface ResolvedUploadChoices {
	filesType: string | null;
	bucketKey: string | null;
	/** The access the default bucket is chosen by. Ignored by the server when a bucket key is set. */
	isPublic: boolean;
	ownerId: string | null;
}

/** The bucket the server binds a file column to (`MetaField.file`). */
export interface BoundUploadBucket {
	bucketKey: string | null;
	isPublic: boolean | null;
}

/**
 * Choices for one column: the per-column entry (by table key first, then table
 * name), then the bucket the server binds the column to, then the top level.
 */
export function uploadChoicesFor(
	config: SheetsUploadConfig | undefined,
	table: { key: string; name: string },
	columnName: string,
	bound?: BoundUploadBucket | null,
): ResolvedUploadChoices {
	const byTable = config?.columns?.[table.key] ?? config?.columns?.[table.name];
	const column = byTable?.[columnName];
	return {
		filesType: column?.filesType ?? config?.filesType ?? null,
		bucketKey: column?.bucketKey ?? bound?.bucketKey ?? config?.bucketKey ?? null,
		isPublic: column?.isPublic ?? bound?.isPublic ?? config?.isPublic ?? true,
		ownerId: column?.ownerId ?? config?.ownerId ?? null,
	};
}

export interface ProcessingPolicy {
	timeoutMs: number;
	initialDelayMs: number;
	maxDelayMs: number;
}

const DEFAULT_PROCESSING: ProcessingPolicy = { timeoutMs: 120_000, initialDelayMs: 1_000, maxDelayMs: 8_000 };

export function processingPolicyOf(config: SheetsUploadConfig | undefined): ProcessingPolicy {
	const processing = config?.processing;
	return {
		timeoutMs: processing?.timeoutMs ?? DEFAULT_PROCESSING.timeoutMs,
		initialDelayMs: processing?.initialDelayMs ?? DEFAULT_PROCESSING.initialDelayMs,
		maxDelayMs: processing?.maxDelayMs ?? DEFAULT_PROCESSING.maxDelayMs,
	};
}
