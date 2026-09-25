'use client';

import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { DocumentRenderer } from 'blocks-renderer';
import type { JSONSchema } from 'json-schema-to-blocks';
import { schemaToDocument } from 'json-schema-to-blocks';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

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
    slug: {
      type: 'string',
      title: 'Slug',
      pattern: '^[a-z0-9-]+$',
      description: 'Lowercase letters, numbers, and dashes.',
    },
    summary: { type: 'string', title: 'Summary', maxLength: 400 },
    status: {
      type: 'string',
      title: 'Status',
      enum: ['draft', 'in_review', 'published', 'archived'],
      'x-ui': {
        props: {
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'In review', value: 'in_review' },
            { label: 'Published', value: 'published' },
            { label: 'Archived', value: 'archived' },
          ],
        },
      },
    },
    audience: { type: 'string', title: 'Audience', enum: ['everyone', 'members', 'staff'], default: 'everyone' },
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

const SCHEMA_SOURCE = JSON.stringify(POST_SCHEMA, null, 2);

type Pane = 'schema' | 'document' | 'values';

const PANES: readonly { value: Pane; label: string }[] = [
  { value: 'schema', label: 'JSON Schema' },
  { value: 'document', label: 'Document' },
  { value: 'values', label: 'Submitted' },
];

/**
 * The live example: the rendered form beside the data behind it. The schema
 * is the input, the document is what the renderer walks, and submitted values
 * are what the host's `onSubmit` receives after document validation.
 */
export function DocumentFormDemo({ className }: { className?: string }) {
  const document = useMemo(() => schemaToDocument(POST_SCHEMA), []);
  const documentSource = useMemo(() => JSON.stringify(document, null, 2), [document]);
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);
  const [pane, setPane] = useState<Pane>('schema');

  const sources: Record<Pane, string> = {
    schema: SCHEMA_SOURCE,
    document: documentSource,
    values: submitted
      ? JSON.stringify(submitted, null, 2)
      : 'Submit the form to see the values the host receives.\nValidation comes from the document’s constraints, not from this page.',
  };

  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-xl border border-border bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        className,
      )}
    >
      <div className="min-w-0 p-5 sm:p-6">
        <DocumentRenderer
          document={document}
          onSubmit={(values) => {
            setSubmitted(values);
            setPane('values');
          }}
          registry={defaultBlockRegistry}
        />
      </div>

      <Tabs
        className="min-w-0 gap-0 border-t border-border bg-muted/30 lg:border-t-0 lg:border-l"
        onValueChange={(value) => setPane(value as Pane)}
        value={pane}
      >
        <div className="flex h-11 items-center border-b border-border px-3">
          <TabsList className="h-auto bg-transparent p-0">
            {PANES.map(({ value, label }) => (
              <TabsTrigger className="h-7 px-2.5 text-[13px]" key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {PANES.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <pre
              className={cn(
                'max-h-[36rem] overflow-auto p-4 font-mono text-xs leading-5',
                value === 'values' && !submitted ? 'whitespace-pre-wrap text-muted-foreground' : 'text-foreground/85',
              )}
            >
              {sources[value]}
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
