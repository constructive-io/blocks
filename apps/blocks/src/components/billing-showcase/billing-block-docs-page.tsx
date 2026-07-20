import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import type { BillingBlock } from '@/lib/billing-blocks';
import { withBase } from '@/lib/site';

import { BillingShowcasePreview } from './billing-showcase-preview';

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

type ContractRow = {
  name: string;
  type: string;
  behavior: string;
};

function controlledContractRows(block: BillingBlock): ContractRow[] {
  switch (block.name) {
    case 'billing-pricing-table':
      return [
        {
          name: 'interval / defaultInterval / onIntervalChange',
          type: 'string / callback',
          behavior:
            'Uses either a controlled interval or an initial interval and reports selection changes.'
        },
        {
          name: 'entitlementPreviewLimit',
          type: 'number',
          behavior: 'Caps each plan’s compact entitlement preview.'
        }
      ];
    case 'billing-usage-history':
      return [
        {
          name: 'meterOptions / periodOptions / meterSlug / period',
          type: 'BillingFilterOption[] / string',
          behavior:
            'Supplies controlled meter and period filters; a filter is hidden without its options and callback.'
        },
        {
          name: 'onMeterChange / onPeriodChange / onPageChange',
          type: 'Async-capable callbacks',
          behavior: 'Reports filter and page changes while the supplied values remain controlled.'
        }
      ];
    case 'billing-activity-table':
      return [
        {
          name: 'meterOptions / entryTypeOptions / meterSlug / entryType',
          type: 'BillingFilterOption[] / string',
          behavior:
            'Supplies controlled meter and entry-type filters; a filter is hidden without its options and callback.'
        },
        {
          name: 'onMeterChange / onEntryTypeChange / onPageChange',
          type: 'Async-capable callbacks',
          behavior: 'Reports filter and page changes while the supplied values remain controlled.'
        }
      ];
    case 'billing-settings-page':
      return [
        {
          name: 'controls',
          type: 'BillingSettingsControls',
          behavior: 'Forwards controlled pricing, history, and activity values to their leaf blocks.'
        },
        {
          name: 'section / defaultSection / onSectionChange',
          type: 'BillingSettingsSection / callback',
          behavior:
            'Uses either a controlled section or an initial section and reports section changes.'
        },
        {
          name: 'showHeader',
          type: 'boolean',
          behavior:
            'Defaults to true; set false when the surrounding document already supplies the page heading.'
        }
      ];
    default:
      return [];
  }
}

function actionContractRows(block: BillingBlock): ContractRow[] {
  switch (block.name) {
    case 'billing-pricing-table':
      return [
        {
          name: 'onSelectPlan / onContactSales',
          type: 'Async-capable callbacks',
          behavior:
            'Runs the matching plan action and hides its control when the callback is omitted.'
        }
      ];
    case 'billing-subscription-card':
      return [
        {
          name: 'onManageSubscription / onChangePlan / onResolvePayment',
          type: 'Async-capable callbacks',
          behavior:
            'Runs the matching subscription action and hides its control when the callback is omitted.'
        }
      ];
    case 'billing-usage-overview':
      return [
        {
          name: 'onViewHistory / onBuyCredits',
          type: 'Async-capable callbacks',
          behavior:
            'Runs the matching meter action and hides its control when the callback is omitted.'
        }
      ];
    case 'billing-settings-page':
      return [
        {
          name: 'actions',
          type: 'BillingSettingsActions',
          behavior: 'Supplies the optional actions forwarded to each composed block.'
        }
      ];
    default:
      return [];
  }
}

function PublicContract({ block }: { block: BillingBlock }) {
  const resourceProp = block.name === 'billing-settings-page' ? 'resources' : 'resource';
  const caption = `Public properties for ${block.title}.`;
  const rows = [
    {
      name: resourceProp,
      type: block.resource,
      behavior:
        block.name === 'billing-settings-page'
          ? 'Supplies each composed block independently so one error does not replace the full page.'
          : 'Supplies loading, empty, error, or ready content.'
    },
    {
      name: 'account',
      type: 'BillingAccountRef',
      behavior: 'Identifies a personal or organization billing context.'
    },
    {
      name: 'formatOptions',
      type: 'BillingFormatOptions',
      behavior: 'Controls locale, time zone, and date formatting.'
    },
    ...actionContractRows(block),
    {
      name: 'messages',
      type: 'Message overrides',
      behavior:
        block.name === 'billing-settings-page'
          ? 'Overrides the page heading, description, section labels, and section-change errors.'
          : 'Overrides user-facing copy without changing resource semantics.'
    },
    {
      name: 'onError / onMessage',
      type: 'Observer callbacks',
      behavior: 'Reports local failures and component message events.'
    },
    {
      name: 'className',
      type: 'string',
      behavior: 'Adds layout classes to the outer block surface.'
    },
    ...controlledContractRows(block)
  ];

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
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs font-medium">
              {row.name}
            </TableCell>
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
  );
}

function NeighborLink({
  block,
  direction
}: {
  block?: BillingBlock;
  direction: 'Previous' | 'Next';
}) {
  if (!block) return <span />;

  return (
    <Link
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      href={`/blocks/billing/${block.name}`}
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{block.title}</span>
    </Link>
  );
}

export function BillingBlockDocsPage({
  block,
  next,
  previous
}: {
  block: BillingBlock;
  next?: BillingBlock;
  previous?: BillingBlock;
}) {
  return (
    <article aria-labelledby="billing-block-title" className="registry-page">
      <section
        aria-labelledby="billing-block-title"
        className="scroll-mt-20"
        id="overview"
      >
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Billing blocks</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="billing-block-title"
          >
            {block.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {block.description}
          </p>
        </header>

        <BillingShowcasePreview
          name={block.name}
          previewPath={withBase(`/blocks/billing/${block.name}/preview/`)}
        />
      </section>

      <DocSection
        description="Use the registry to copy the block and its source dependencies into your application."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">
          {`pnpm dlx shadcn@4.13.1 add @constructive/${block.name}`}
        </CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={block.whenToUse} />
      </DocSection>

      <DocSection
        description={block.usage.description}
        id="usage"
        title="Basic usage"
      >
        <CodeBlock label="Basic usage" language="tsx">
          {block.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection
        description={block.state.description}
        id="state"
        title={block.state.title}
      >
        {block.actions.length > 0 ? (
          <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            Action callbacks may return promises. While a callback is pending,
            its control prevents repeat submission and shows any rejected action
            beside the place where it started.
          </p>
        ) : (
          <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            This block has no action callbacks. Pass a new resource value to
            update its content.
          </p>
        )}
      </DocSection>

      <DocSection
        description="Use the live source preview to inspect the same block across common account, resource, and layout states."
        id="examples"
        title="Examples"
      >
        <GuidanceList
          items={[
            'Switch Account to compare the personal and organization variants without changing the component structure.',
            'Switch Resource state to inspect ready, loading, empty, error, estimated, stale, and partial states when available.',
            'Use the preview-size controls to verify the block at desktop, tablet, and mobile widths before copying it into your application.'
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={block.accessibility} />
      </DocSection>

      <DocSection
        description="The block’s public properties are listed here. Shared data types and formatting helpers come from billing-contracts."
        id="api-reference"
        title="API Reference"
      >
        <PublicContract block={block} />
      </DocSection>

      <nav
        aria-label="Billing block pagination"
        className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6"
      >
        <NeighborLink block={previous} direction="Previous" />
        <div className="text-right">
          <NeighborLink block={next} direction="Next" />
        </div>
      </nav>
    </article>
  );
}
