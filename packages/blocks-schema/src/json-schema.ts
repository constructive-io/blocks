import { toJsonSchema } from 'json-renderer';

import { uiDocumentSchema, uiNodeSchema } from './zod';

/**
 * JSON Schema for the document envelope, for agents emitting documents as tool
 * output and for registry/editor tooling that validates without importing zod.
 */
export function toDocumentJsonSchema(): Record<string, unknown> {
	return toJsonSchema(uiDocumentSchema);
}

export function toNodeJsonSchema(): Record<string, unknown> {
	return toJsonSchema(uiNodeSchema);
}
