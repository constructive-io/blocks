import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@constructive-io/ui/table';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import type { AccountBlock } from '@/lib/account-blocks';

import { AccountBlockPreview } from './account-block-preview';

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="max-w-3xl space-y-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
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

function PublicContract({ block }: { block: AccountBlock }) {
  const caption = `Public properties for ${block.exportName}.`;
  return (
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
        {block.api.map((row) => (
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

export function AccountBlockDocsPage({ block }: { block: AccountBlock }) {
  return (
    <article aria-labelledby="account-block-title" className="registry-page">
      <section aria-labelledby="account-block-title" className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Account blocks</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="account-block-title"
          >
            {block.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{block.description}</p>
        </header>

        <AccountBlockPreview />
      </section>

      <DocSection
        description="Copy the block, the phone field, and the code input into your application. The phone field adds react-phone-number-input."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">{`pnpm dlx shadcn@latest add @constructive/${block.name}`}</CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={block.whenToUse} />
      </DocSection>

      <DocSection description={block.usage.description} id="usage" title="Basic usage">
        <CodeBlock label="phone-numbers-settings.tsx" language="tsx">
          {block.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection description={block.state.description} id="state" title={block.state.title}>
        <CodeBlock label="Own the layout" language="tsx">
          {block.usage.composition}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="Pick a state in the preview to inspect it, or use Live to run the whole flow against an in-memory adapter."
        id="behavior"
        title="Behavior"
      >
        <GuidanceList items={block.behavior} />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={block.accessibility} />
      </DocSection>

      <DocSection
        description="AccountPhoneNumbers accepts these properties. The view, the hook, the adapter contract, and the default messages are exported from the same module."
        id="api-reference"
        title="API Reference"
      >
        <PublicContract block={block} />
      </DocSection>
    </article>
  );
}
