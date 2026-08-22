/**
 * Runtime validation for Constructive documents. The tree and envelope rules
 * come from `json-renderer`'s schema factories; this module narrows props and
 * actions to the Constructive vocabulary.
 */
import {
	createDocumentSchema,
	createNodeSchema,
	dataSourceSchema,
	documentMetadataSchema,
	nodeBindingsSchema,
	nodeConstraintsSchema,
	nodePropsSchema,
	registrySourceSchema,
} from 'json-renderer';
import { z } from 'zod';

import { UI_DOCUMENT_KIND } from './envelope';
import type { UIDocument } from './envelope';
import type { UINode } from './node';

export const uiNodeConstraintsSchema = nodeConstraintsSchema;

export const uiNodePropsSchema = nodePropsSchema.extend({
	fieldId: z.string().optional(),
	name: z.string().optional(),
	label: z.string().optional(),
	description: z.string().optional(),
	placeholder: z.string().optional(),
	required: z.boolean().optional(),
	hidden: z.boolean().optional(),
	disabled: z.boolean().optional(),
	defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
	constraints: uiNodeConstraintsSchema.optional(),
	className: z.string().optional(),
});

export const uiBindingSchema = nodeBindingsSchema;

export const uiActionSchema = z.object({
	type: z.enum(['flow', 'handler']),
	flowId: z.string().optional(),
	handler: z.string().optional(),
	inputMapping: z.record(z.string(), z.string()).optional(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const uiActionsSchema = z.record(z.string(), uiActionSchema);

export const uiNodeSchema: z.ZodType<UINode> = createNodeSchema<UINode>({
	propsSchema: uiNodePropsSchema,
	actionsSchema: uiActionsSchema,
});

export const uiRegistrySourceSchema = registrySourceSchema;

export const uiDataSourceSchema = dataSourceSchema.extend({
	table: z.string().optional(),
});

export const uiDocumentMetadataSchema = documentMetadataSchema;

export const uiDocumentSchema: z.ZodType<UIDocument> = createDocumentSchema<UIDocument, UINode>({
	kind: UI_DOCUMENT_KIND,
	nodeSchema: uiNodeSchema,
});

/** Throws a `ZodError` describing every problem in the document. */
export function parseDocument(value: unknown): UIDocument {
	return uiDocumentSchema.parse(value);
}

export function safeParseDocument(value: unknown) {
	return uiDocumentSchema.safeParse(value);
}

export function parseNode(value: unknown): UINode {
	return uiNodeSchema.parse(value);
}
