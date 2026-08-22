import { createEnvelope, isDocumentEnvelope } from 'json-renderer';
import type {
	DocumentDataSource,
	DocumentEnvelope,
	DocumentMetadata,
	EnvelopeKind,
	RegistrySource,
} from 'json-renderer';

import type { UINode } from './node';

export const UI_DOCUMENT_FORMAT_VERSION = '1.0';
export const UI_DOCUMENT_TYPE = 'UISchema';

/** The envelope kind this package specializes out of the generic core. */
export const UI_DOCUMENT_KIND: EnvelopeKind<typeof UI_DOCUMENT_TYPE, typeof UI_DOCUMENT_FORMAT_VERSION> = {
	documentType: UI_DOCUMENT_TYPE,
	formatVersion: UI_DOCUMENT_FORMAT_VERSION,
};

export interface UIDocumentMetadata extends DocumentMetadata {
	title?: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * A resolution source for node types: a shadcn-style registry URL template,
 * e.g. `https://constructive-io.github.io/blocks/r/{name}.json`.
 */
export type UIRegistrySource = RegistrySource;

/** A named, read-only query a document's blocks can bind against. */
export interface UIDataSource extends DocumentDataSource {
	name: string;
	table?: string;
	query?: string;
	variables?: Record<string, unknown>;
	select?: string;
	where?: Record<string, unknown>;
	orderBy?: unknown;
	first?: number;
}

/**
 * The Constructive UI document: the generic `DocumentEnvelope` pinned to this
 * package's node vocabulary, envelope discriminator, and format version.
 */
export interface UIDocument
	extends DocumentEnvelope<UINode, typeof UI_DOCUMENT_TYPE, typeof UI_DOCUMENT_FORMAT_VERSION> {
	meta?: UIDocumentMetadata;
	registries?: UIRegistrySource[];
	dataSources?: UIDataSource[];
}

/**
 * The name the deployed dashboard form builder uses for the same envelope.
 * Kept as an alias so existing `UISchema` consumers migrate by import swap.
 */
export type UISchema = UIDocument;

export function isUIDocument(value: unknown): value is UIDocument {
	return isDocumentEnvelope(value, UI_DOCUMENT_KIND);
}

/** @deprecated Use {@link isUIDocument}. */
export const isUISchema = isUIDocument;

export function createDocument(page: UINode, options: { id?: string; meta?: UIDocumentMetadata } = {}): UIDocument {
	return createEnvelope(UI_DOCUMENT_KIND, page, options) as UIDocument;
}
