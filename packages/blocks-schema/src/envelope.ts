import type { UINode } from './node';

export const UI_DOCUMENT_FORMAT_VERSION = '1.0';
export const UI_DOCUMENT_TYPE = 'UISchema';

export interface UIDocumentMetadata {
	title?: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * A resolution source for node types: a shadcn-style registry URL template,
 * e.g. `https://constructive-io.github.io/blocks/r/{name}.json`.
 */
export interface UIRegistrySource {
	name: string;
	url: string;
}

/** A named, read-only query a document's blocks can bind against. */
export interface UIDataSource {
	name: string;
	table?: string;
	query?: string;
	variables?: Record<string, unknown>;
	select?: string;
	where?: Record<string, unknown>;
	orderBy?: unknown;
	first?: number;
}

export interface UIDocument {
	formatVersion: typeof UI_DOCUMENT_FORMAT_VERSION;
	type: typeof UI_DOCUMENT_TYPE;
	id: string;
	meta?: UIDocumentMetadata;
	registries?: UIRegistrySource[];
	dataSources?: UIDataSource[];
	page: UINode;
}

/**
 * The name the deployed dashboard form builder uses for the same envelope.
 * Kept as an alias so existing `UISchema` consumers migrate by import swap.
 */
export type UISchema = UIDocument;

export function isUIDocument(value: unknown): value is UIDocument {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return (
		candidate.type === UI_DOCUMENT_TYPE &&
		candidate.formatVersion === UI_DOCUMENT_FORMAT_VERSION &&
		!!candidate.page
	);
}

/** @deprecated Use {@link isUIDocument}. */
export const isUISchema = isUIDocument;

export function createDocument(page: UINode, options: { id?: string; meta?: UIDocumentMetadata } = {}): UIDocument {
	return {
		formatVersion: UI_DOCUMENT_FORMAT_VERSION,
		type: UI_DOCUMENT_TYPE,
		id: options.id ?? 'document',
		...(options.meta ? { meta: options.meta } : {}),
		page,
	};
}
