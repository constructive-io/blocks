import { z } from 'zod';

import { uiDocumentSchema, uiNodeSchema } from './zod';

/**
 * JSON Schema for the document envelope, for agents emitting documents as tool
 * output and for registry/editor tooling that validates without importing zod.
 */
export function toDocumentJsonSchema(): Record<string, unknown> {
	return z.toJSONSchema(uiDocumentSchema, { io: 'input' }) as Record<string, unknown>;
}

export function toNodeJsonSchema(): Record<string, unknown> {
	return z.toJSONSchema(uiNodeSchema, { io: 'input' }) as Record<string, unknown>;
}
