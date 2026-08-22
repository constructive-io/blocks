/**
 * The document envelope: a versioned container around one node tree, plus the
 * resolution sources and named data the tree binds against.
 */
import type { AnyDocumentNode } from './node';

export const DOCUMENT_FORMAT_VERSION = '1.0';

export interface DocumentMetadata {
	title?: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * A resolution source for node types: a registry name and a URL template, e.g.
 * `https://example.com/r/{name}.json`.
 */
export interface RegistrySource {
	name: string;
	url: string;
}

/** A named, read-only query a document's nodes can bind against. */
export interface DocumentDataSource {
	name: string;
	query?: string;
	variables?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * The generic envelope. `TNode` is the node tree, `TKind` the envelope's `type`
 * discriminator, and `TVersion` its format version — a concrete format pins
 * those as literal types (see `blocks-schema`'s `UIDocument`).
 */
export interface DocumentEnvelope<
	TNode extends AnyDocumentNode = AnyDocumentNode,
	TKind extends string = string,
	TVersion extends string = string,
> {
	formatVersion: TVersion;
	type: TKind;
	id: string;
	meta?: DocumentMetadata;
	registries?: RegistrySource[];
	dataSources?: DocumentDataSource[];
	page: TNode;
}

/** Any envelope, whatever its kind and vocabulary. */
export type AnyDocumentEnvelope = DocumentEnvelope<AnyDocumentNode, string, string>;

export interface EnvelopeKind<TKind extends string = string, TVersion extends string = string> {
	/** The envelope's `type` discriminator, e.g. `UISchema`. */
	documentType: TKind;
	formatVersion: TVersion;
}

/**
 * Structural check against one envelope kind. Deliberately shallow: a full
 * check is `parseDocument` (zod), this is the cheap discriminator a router or a
 * content-kind switch needs.
 */
export function isDocumentEnvelope<TKind extends string, TVersion extends string>(
	value: unknown,
	kind: EnvelopeKind<TKind, TVersion>,
): value is DocumentEnvelope<AnyDocumentNode, TKind, TVersion> {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return (
		candidate.type === kind.documentType && candidate.formatVersion === kind.formatVersion && !!candidate.page
	);
}

export function createEnvelope<TNode extends AnyDocumentNode, TKind extends string, TVersion extends string>(
	kind: EnvelopeKind<TKind, TVersion>,
	page: TNode,
	options: {
		id?: string;
		meta?: DocumentMetadata;
		registries?: RegistrySource[];
		dataSources?: DocumentDataSource[];
	} = {},
): DocumentEnvelope<TNode, TKind, TVersion> {
	return {
		formatVersion: kind.formatVersion,
		type: kind.documentType,
		id: options.id ?? 'document',
		...(options.meta ? { meta: options.meta } : {}),
		...(options.registries ? { registries: options.registries } : {}),
		...(options.dataSources ? { dataSources: options.dataSources } : {}),
		page,
	};
}
