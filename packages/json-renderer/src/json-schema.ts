/**
 * JSON Schema export of the format, for agents emitting documents as tool output
 * and for editors/registries that validate without importing zod.
 */
import { z } from 'zod';

import { documentEnvelopeSchema, documentNodeSchema } from './zod';

export function toJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
	return z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
}

export function toEnvelopeJsonSchema(): Record<string, unknown> {
	return toJsonSchema(documentEnvelopeSchema);
}

export function toNodeJsonSchema(): Record<string, unknown> {
	return toJsonSchema(documentNodeSchema);
}
