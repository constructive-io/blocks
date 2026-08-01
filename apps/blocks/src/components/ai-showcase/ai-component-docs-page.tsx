import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import { AiComponentPreview } from '@/components/ai-showcase/ai-component-preview';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import {
  type AiComponentDoc,
  type AiComponentName,
  getAiComponentNeighbors,
} from '@/lib/ai-components';
import { REGISTRY_COMPONENTS_JSON, registryAdd } from '@/lib/install-mode';

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex max-w-3xl flex-col gap-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
      {items.map((item) => (
        <li
          className="relative pl-5 before:absolute before:left-0 before:text-foreground before:content-['•']"
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function AiComponentDocsPage({ component }: { component: AiComponentDoc }) {
  const { previous, next } = getAiComponentNeighbors(component.name);
  const caption = `API for ${component.title}.`;

  return (
    <article aria-labelledby="ai-component-title" className="registry-page">
      <section className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">
            <Link href="/blocks/ai" className="hover:text-foreground">
              AI
            </Link>
          </p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="ai-component-title"
          >
            {component.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {component.description}
          </p>
        </header>

        <AiComponentPreview name={component.name as AiComponentName} />
      </section>

      <DocSection
        description="Every AI component page installs the same aggregate @constructive/ai entry. Examples use the default @/components/ui alias; use your configured ui alias if it differs."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="components.json">{REGISTRY_COMPONENTS_JSON}</CodeBlock>
        <div className="mt-3">
          <CodeBlock label="Install aggregate">{registryAdd('ai')}</CodeBlock>
        </div>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={component.whenToUse} />
      </DocSection>

      <DocSection id="usage" title="Usage">
        <CodeBlock label="example.tsx" language="tsx">
          {component.importExample}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="Primary props for this surface. The installed source types are the full contract."
        id="api"
        title="API"
      >
        <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Prop</TableHead>
              <TableHead scope="col">Type</TableHead>
              <TableHead scope="col">Behavior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {component.api.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
                <TableCell className="whitespace-normal font-mono text-xs text-muted-foreground">
                  {row.type}
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal text-pretty text-muted-foreground">
                  {row.behavior}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>

      <nav
        aria-label="AI component pagination"
        className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6"
      >
        {previous ? (
          <Link
            className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href={`/blocks/ai/${previous.name}`}
          >
            <span className="block text-xs">Previous</span>
            <span className="font-medium text-foreground">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            className="inline-flex min-h-10 flex-col items-end justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href={`/blocks/ai/${next.name}`}
          >
            <span className="block text-xs">Next</span>
            <span className="font-medium text-foreground">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
