import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { registryAdd } from '@/lib/install-mode';
import type { SourceBlockDoc } from '@/lib/source-blocks';

function SheetsPreview() {
  const rows = [
    ['Atlas migration', 'In progress', 'Ada Lovelace', 'Jul 28'],
    ['Beacon launch', 'Review', 'Grace Hopper', 'Jul 27'],
    ['Compass research', 'Planned', 'Alan Turing', 'Jul 24'],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-card">
      <div className="flex min-h-11 items-center gap-3 border-b border-border/70 px-3">
        <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-sm font-medium">projects</span>
        <span className="ml-auto rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          _meta · app
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs tabular-nums">
          <thead className="bg-muted/35 text-muted-foreground">
            <tr>
              {['Name', 'Status', 'Owner', 'Updated'].map((heading) => (
                <th className="border-b border-r border-border/60 px-3 py-2 font-medium last:border-r-0" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="hover:bg-accent/35" key={row[0]}>
                {row.map((cell, index) => (
                  <td
                    className="border-b border-r border-border/50 px-3 py-2.5 last:border-r-0 last:text-muted-foreground"
                    key={`${row[0]}-${cell}`}
                  >
                    {index === 1 ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-9 items-center border-t border-border/50 px-3 font-mono text-[10px] text-muted-foreground">
        3 rows · writes checked by PostgreSQL privileges and RLS
      </div>
    </div>
  );
}

function SchemaBuilderPreview() {
  const fields = [
    ['id', 'uuid', 'Primary key'],
    ['name', 'text', 'Required'],
    ['status', 'project_status', 'Default: planned'],
    ['owner_id', 'uuid', 'Foreign key'],
  ];

  return (
    <div className="grid min-h-[330px] overflow-hidden rounded-xl border border-border/70 bg-background shadow-card md:grid-cols-[190px_1fr]">
      <aside className="border-b border-border/70 bg-muted/20 p-3 md:border-b-0 md:border-r">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase text-muted-foreground">
          Application tables
        </p>
        {['projects', 'releases', 'members'].map((table, index) => (
          <div
            className={
              index === 0
                ? 'flex min-h-9 items-center rounded-md bg-accent px-2.5 text-xs font-medium text-foreground'
                : 'flex min-h-9 items-center rounded-md px-2.5 text-xs text-muted-foreground'
            }
            key={table}
          >
            {table}
          </div>
        ))}
      </aside>
      <div className="min-w-0">
        <div className="flex min-h-12 items-center gap-2 overflow-x-auto border-b border-border/70 px-3 sm:gap-4 sm:px-4">
          <span className="text-sm font-semibold">projects</span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-primary sm:text-xs">Fields</span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">
            Relationships
          </span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">Indexes</span>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">Security</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Table fields</h3>
              <p className="mt-1 text-xs text-muted-foreground">Typed against the control-plane schema.</p>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">Add field</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/70">
            {fields.map(([name, type, constraint]) => (
              <div
                className="grid grid-cols-[1fr_1fr_1.4fr] gap-2 border-b border-border/60 px-3 py-2.5 text-xs last:border-b-0"
                key={name}
              >
                <span className="font-medium">{name}</span>
                <span className="font-mono text-[11px] text-primary">{type}</span>
                <span className="text-muted-foreground">{constraint}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            adapter · database scope · explicit invalidation
          </p>
        </div>
      </div>
    </div>
  );
}

function SourceBlockPreview({ block }: { block: SourceBlockDoc }) {
  return (
    <div className="registry-block min-w-0">
      <div className="registry-block-bar">
        <span>Preview</span>
        <span className="min-w-0 flex-1" />
        <span className="font-mono text-[10px] font-normal text-muted-foreground">source install</span>
      </div>
      <div className="registry-block-stage registry-block-stage-col bg-muted/20 !p-3 sm:!p-5">
        {block.name === 'sheets' ? <SheetsPreview /> : <SchemaBuilderPreview />}
      </div>
    </div>
  );
}

function PublicContract({ block }: { block: SourceBlockDoc }) {
  const caption = `Host contract for ${block.title}.`;

  return (
    <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Boundary</TableHead>
          <TableHead scope="col">Type</TableHead>
          <TableHead scope="col">Behavior</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {block.contract.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
            <TableCell className="whitespace-normal font-mono text-xs text-muted-foreground">{row.type}</TableCell>
            <TableCell className="min-w-64 whitespace-normal text-pretty text-muted-foreground">{row.behavior}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SourceBlockDocsPage({ block }: { block: SourceBlockDoc }) {
  return (
    <article aria-labelledby="source-block-title" className="registry-page">
      <section aria-labelledby="source-block-title" className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-3xl">
          <p className="registry-eyebrow">Application block</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="source-block-title"
          >
            {block.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {block.description}
          </p>
        </header>
        <SourceBlockPreview block={block} />
      </section>

      <DocSection
        description="The registry copies the complete editable source graph, its local UI dependencies, and the Constructive theme into your application."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">{registryAdd(block.name)}</CodeBlock>
      </DocSection>

      <DocSection description={block.usageDescription} id="usage" title="Host setup">
        <CodeBlock label={`${block.name}-host.tsx`} language="tsx">
          {block.usageExample}
        </CodeBlock>
      </DocSection>

      <DocSection description={block.stateDescription} id="state" title="State and security">
        <p className="max-w-3xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          The browser never becomes an authorization boundary. Keep credentials out of serialized props and let the server enforce every operation.
        </p>
      </DocSection>

      <DocSection
        description="The install is intentionally complete, but responsibility stays explicit at every integration seam."
        id="ownership"
        title="Ownership boundary"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {block.boundaries.map((boundary) => (
            <article className="rounded-xl border border-border/60 bg-card p-4 shadow-card" key={boundary.title}>
              <h3 className="text-sm font-semibold">{boundary.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">{boundary.body}</p>
            </article>
          ))}
        </div>
      </DocSection>

      <DocSection
        description={block.previewDescription}
        id="api-reference"
        title="Host contract"
      >
        <PublicContract block={block} />
      </DocSection>
    </article>
  );
}
