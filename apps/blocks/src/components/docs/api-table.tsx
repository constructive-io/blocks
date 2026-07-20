import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import type { PrimitiveApiPart } from '@/lib/primitive-docs';

function ApiPart({ part }: { part: PrimitiveApiPart }) {
  return (
    <section className="min-w-0 py-5">
      <div className="px-4 sm:px-5">
        <code className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
          {part.name}
        </code>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
          {part.description}
        </p>
      </div>
      {part.props?.length ? (
        <Table containerClassName="mt-4 border-y border-border/60">
          <TableHeader>
            <TableRow>
              <TableHead>Prop</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {part.props.map((prop) => (
              <TableRow key={prop.name}>
                <TableCell className="align-top font-mono text-xs">
                  {prop.name}
                  {prop.required ? <span aria-label="required"> *</span> : null}
                  {prop.deprecated ? (
                    <span className="ml-2 font-sans text-[11px] text-destructive">deprecated</span>
                  ) : null}
                </TableCell>
                <TableCell className="align-top font-mono text-xs text-muted-foreground">
                  {prop.type}
                </TableCell>
                <TableCell className="align-top font-mono text-xs text-muted-foreground">
                  {prop.default ?? '—'}
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal align-top text-sm text-muted-foreground">
                  {prop.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {part.upstream ? (
        <p className="mt-3 px-4 text-sm text-muted-foreground sm:px-5">
          Also accepts{' '}
          <a
            href={part.upstream.href}
            className="font-medium text-foreground underline underline-offset-4"
            rel="noreferrer"
            target="_blank"
          >
            {part.upstream.label}
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}

export function ApiTable({ parts }: { parts: readonly PrimitiveApiPart[] }) {
  return (
    <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {parts.map((part) => (
        <ApiPart key={part.name} part={part} />
      ))}
    </div>
  );
}
