/**
 * Runtime validation for the generic envelope. Concrete formats build their own
 * schemas from these factories, so a vocabulary narrows props, actions, or node
 * types without restating the tree rules.
 */
import { z } from 'zod';

import { DOCUMENT_FORMAT_VERSION } from './envelope';
import type { AnyDocumentEnvelope, EnvelopeKind } from './envelope';
import type { AnyDocumentNode } from './node';

export const nodeConstraintsSchema = z.object({
	minLength: z.number().int().nonnegative().optional(),
	maxLength: z.number().int().nonnegative().optional(),
	minValue: z.number().optional(),
	maxValue: z.number().optional(),
	pattern: z.string().optional(),
	precision: z.number().int().nonnegative().optional(),
	scale: z.number().int().nonnegative().optional(),
});

/** Props are open by default: a vocabulary extends this with what it knows. */
export const nodePropsSchema = z.looseObject({});

export const nodeBindingsSchema = z.record(z.string(), z.string());

export const nodeActionSchema = z.object({
	type: z.string().min(1),
	flowId: z.string().optional(),
	handler: z.string().optional(),
	inputMapping: z.record(z.string(), z.string()).optional(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const nodeActionsSchema = z.record(z.string(), nodeActionSchema);

export const registrySourceSchema = z.object({
	name: z.string().min(1),
	url: z.string().min(1),
});

export const dataSourceSchema = z.looseObject({
	name: z.string().min(1),
	query: z.string().optional(),
	variables: z.record(z.string(), z.unknown()).optional(),
});

export const documentMetadataSchema = z.looseObject({
	title: z.string().optional(),
	description: z.string().optional(),
});

export interface NodeSchemaOptions {
	/** Narrow the node vocabulary; unknown strings stay valid by default. */
	typeSchema?: z.ZodType<string>;
	propsSchema?: z.ZodType<Record<string, unknown>>;
	actionsSchema?: z.ZodType<Record<string, unknown>>;
}

/**
 * Build the recursive node schema. Unknown node types pass by default: a
 * registry may satisfy types this package has never heard of, and rejecting them
 * here would make the format closed.
 */
export function createNodeSchema<TNode extends AnyDocumentNode = AnyDocumentNode>(
	options: NodeSchemaOptions = {},
): z.ZodType<TNode> {
	const schema: z.ZodType<TNode> = z.lazy(() =>
		z.object({
			type: options.typeSchema ?? z.string().min(1),
			key: z.string().min(1),
			props: (options.propsSchema ?? nodePropsSchema).default({}),
			children: z.array(schema).default([]),
			bindings: nodeBindingsSchema.optional(),
			actions: (options.actionsSchema ?? nodeActionsSchema).optional(),
		}),
	) as unknown as z.ZodType<TNode>;
	return schema;
}

export const documentNodeSchema: z.ZodType<AnyDocumentNode> = createNodeSchema();

export interface DocumentSchemaOptions<TNode extends AnyDocumentNode = AnyDocumentNode> extends NodeSchemaOptions {
	/** Pin the envelope discriminator and version, e.g. `UISchema` / `1.0`. */
	kind?: Partial<EnvelopeKind>;
	nodeSchema?: z.ZodType<TNode>;
}

/** Build the envelope schema around a node schema. */
export function createDocumentSchema<
	TDocument extends AnyDocumentEnvelope = AnyDocumentEnvelope,
	TNode extends AnyDocumentNode = AnyDocumentNode,
>(options: DocumentSchemaOptions<TNode> = {}): z.ZodType<TDocument> {
	const nodeSchema = options.nodeSchema ?? (createNodeSchema<TNode>(options) as z.ZodType<TNode>);
	return z.object({
		formatVersion: options.kind?.formatVersion
			? z.literal(options.kind.formatVersion)
			: z.string().min(1),
		type: options.kind?.documentType ? z.literal(options.kind.documentType) : z.string().min(1),
		id: z.string().min(1),
		meta: documentMetadataSchema.optional(),
		registries: z.array(registrySourceSchema).optional(),
		dataSources: z.array(dataSourceSchema).optional(),
		page: nodeSchema,
	}) as unknown as z.ZodType<TDocument>;
}

export const documentEnvelopeSchema: z.ZodType<AnyDocumentEnvelope> = createDocumentSchema();

/** Throws a `ZodError` describing every problem in the document. */
export function parseEnvelope(value: unknown): AnyDocumentEnvelope {
	return documentEnvelopeSchema.parse(value);
}

export function safeParseEnvelope(value: unknown) {
	return documentEnvelopeSchema.safeParse(value);
}

export function parseNode(value: unknown): AnyDocumentNode {
	return documentNodeSchema.parse(value);
}

/** The version this package's generic envelope schema accepts by default. */
export const SCHEMA_FORMAT_VERSION = DOCUMENT_FORMAT_VERSION;
