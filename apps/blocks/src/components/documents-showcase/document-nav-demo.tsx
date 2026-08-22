'use client';

import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { Card, CardContent } from '@constructive-io/ui';
import { DocumentRenderer } from 'blocks-renderer';
import type { MetaTable } from 'meta-to-blocks';
import { metaToNavDocument } from 'meta-to-blocks';
import { useMemo, useState } from 'react';

/**
 * The table list is the only input: `metaToNavDocument` lowers a `_meta` payload
 * to a nav document, so a console's sidebar follows the database instead of a
 * hand-maintained route list. `post_categories` is a join table, so it is
 * dropped rather than linked.
 */
const META: MetaTable[] = [
  {
    name: 'posts',
    schemaName: 'app_public',
    description: 'Blog posts',
    relations: {
      manyToMany: [
        {
          fieldName: 'categories',
          rightTable: { name: 'categories' },
          junctionTable: { name: 'post_categories' },
        },
      ],
    },
  },
  { name: 'categories', schemaName: 'app_public' },
  { name: 'post_categories', schemaName: 'app_public' },
  { name: 'users', schemaName: 'app_public' },
  { name: 'audit_log_entries', schemaName: 'app_private' },
  { name: 'feature_flags', schemaName: 'app_private' },
];

// A host passes its own route builder; the docs page keeps the links inert.
const href = (table: MetaTable) => `#${table.schemaName}/${table.name}`;

export function DocumentNavDemo() {
  const [pathname, setPathname] = useState('#app_public/posts');
  const document = useMemo(
    () => metaToNavDocument(META, { label: 'Console', href }),
    [],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          {/* The scope decides which link is current, so highlighting stays declarative. */}
          <DocumentRenderer
            document={document}
            registry={defaultBlockRegistry}
            scope={{ pathname }}
          />
          <div className="mt-6 border-t pt-4">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="nav-demo-pathname"
            >
              scope.pathname
            </label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              id="nav-demo-pathname"
              onChange={(event) => setPathname(event.target.value)}
              value={pathname}
            >
              {META.filter((table) => table.name !== 'post_categories').map(
                (table) => (
                  <option key={table.name} value={href(table)}>
                    {href(table)}
                  </option>
                ),
              )}
            </select>
          </div>
        </CardContent>
      </Card>
      <div>
        <p className="mb-2 text-sm font-medium">Generated document</p>
        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
          {JSON.stringify(document, null, 2)}
        </pre>
      </div>
    </div>
  );
}
