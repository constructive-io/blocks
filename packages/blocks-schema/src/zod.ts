import { z } from 'zod';

import { UI_DOCUMENT_FORMAT_VERSION, UI_DOCUMENT_TYPE } from './envelope';
import type { UIDocument } from './envelope';
import type { UINode } from './node';

export const uiNodeConstraintsSchema = z.object({
	minLength: z.number().int().nonnegative().optional(),
	maxLength: z.number().int().nonnegative().optional(),
	minValue: z.number().optional(),
	maxValue: z.number().optional(),
	pattern: z.string().optional(),
	precision: z.number().int().nonnegative().optional(),
	scale: z.number().int().nonnegative().optional(),
});

export const uiNodePropsSchema = z.looseObject({
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

export const uiBindingSchema = z.record(z.string(), z.string());

export const uiActionSchema = z.object({
	type: z.enum(['flow', 'handler']),
	flowId: z.string().optional(),
	handler: z.string().optional(),
	inputMapping: z.record(z.string(), z.string()).optional(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const uiActionsSchema = z.record(z.string(), uiActionSchema);

export const uiNodeSchema: z.ZodType<UINode> = z.lazy(() =>
	z.object({
		type: z.string().min(1),
		key: z.string().min(1),
		props: uiNodePropsSchema.default({}),
		children: z.array(uiNodeSchema).default([]),
		bindings: uiBindingSchema.optional(),
		actions: uiActionsSchema.optional(),
	}),
);

export const uiRegistrySourceSchema = z.object({
	name: z.string().min(1),
	url: z.string().min(1),
});

export const uiDataSourceSchema = z.looseObject({
	name: z.string().min(1),
	table: z.string().optional(),
	query: z.string().optional(),
	variables: z.record(z.string(), z.unknown()).optional(),
});

export const uiDocumentMetadataSchema = z.looseObject({
	title: z.string().optional(),
	description: z.string().optional(),
});

export const uiDocumentSchema: z.ZodType<UIDocument> = z.object({
	formatVersion: z.literal(UI_DOCUMENT_FORMAT_VERSION),
	type: z.literal(UI_DOCUMENT_TYPE),
	id: z.string().min(1),
	meta: uiDocumentMetadataSchema.optional(),
	registries: z.array(uiRegistrySourceSchema).optional(),
	dataSources: z.array(uiDataSourceSchema).optional(),
	page: uiNodeSchema,
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
