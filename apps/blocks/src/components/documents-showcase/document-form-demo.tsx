'use client';

import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { Card, CardContent } from '@constructive-io/ui';
import { DocumentRenderer } from 'blocks-renderer';
import type { JSONSchema } from 'json-schema-to-blocks';
import { schemaToDocument } from 'json-schema-to-blocks';
import { useMemo, useState } from 'react';

/**
 * The JSON Schema is the only input: `json-schema-to-blocks` lowers it to a
 * document and the default registry renders it, so this page hand-writes no UI
 * for any of the fields below.
 */
const POST_SCHEMA: JSONSchema = {
  $id: 'post',
  type: 'object',
  title: 'Publish a post',
  required: ['title', 'status'],
  properties: {
    title: { type: 'string', title: 'Title', maxLength: 120 },
    slug: { type: 'string', title: 'Slug', pattern: '^[a-z0-9-]+$' },
    summary: { type: 'string', title: 'Summary', maxLength: 400 },
    status: {
      type: 'string',
      title: 'Status',
      enum: ['draft', 'in_review', 'published', 'archived'],
    },
    reading_time: {
      type: 'integer',
      title: 'Reading time (minutes)',
      minimum: 1,
      maximum: 120,
    },
    publish_at: { type: 'string', title: 'Publish at', format: 'date-time' },
    featured: { type: 'boolean', title: 'Featured' },
  },
};

export function DocumentFormDemo() {
  const document = useMemo(
    () => schemaToDocument(POST_SCHEMA),
    [],
  );
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <DocumentRenderer
            document={document}
            registry={defaultBlockRegistry}
            onSubmit={setSubmitted}
          />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium">Generated document</p>
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
            {JSON.stringify(document, null, 2)}
          </pre>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Submitted values</p>
          <pre className="max-h-60 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
            {submitted
              ? JSON.stringify(submitted, null, 2)
              : 'Submit the form. Validation comes from the document constraints, not from this page.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
