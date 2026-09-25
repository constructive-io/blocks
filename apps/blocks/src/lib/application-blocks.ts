export type ApplicationBlockApiRow = Readonly<{
  name: string;
  type: string;
  behavior: string;
}>;

export type ApplicationBlockDoc = Readonly<{
  name: 'org-chart' | 'storage-browser' | 'agents-builder' | 'billing-account' | 'billing-console';
  /** Docs route when it is not `/blocks/<name>`, e.g. inside a section such as Billing. */
  href?: string;
  /** Section hub the block is listed under instead of its own nav item. */
  section?: 'billing';
  title: string;
  description: string;
  previewDescription: string;
  previewHeight: number;
  whenToUse: readonly string[];
  usage: Readonly<{
    description: string;
    example: string;
  }>;
  state: Readonly<{
    title: string;
    description: string;
  }>;
  composition: readonly string[];
  accessibility: readonly string[];
  api: readonly ApplicationBlockApiRow[];
  /** Leaf components the template is built from, each usable on its own. */
  buildingBlocks?: readonly ApplicationBlockApiRow[];
}>;

export const APPLICATION_BLOCKS: readonly ApplicationBlockDoc[] = [
  {
    name: 'org-chart',
    title: 'Org Chart',
    description:
      'An interactive organization chart on the workspace canvas: automatic top-down layout, pan and zoom, folding teams, a details panel, and drag-to-reassign with a keyboard alternative.',
    previewDescription:
      'Select a person to see their manager and reports, fold a team away, or drag a card onto a new manager and watch the preview wire follow.',
    previewHeight: 740,
    whenToUse: [
      'Use Org Chart when reporting relationships are central to understanding or managing an organization.',
      'Use a table or tree when dense scanning, bulk editing, or keyboard-only hierarchy management is the primary task.',
    ],
    usage: {
      description:
        'Pass either controlled edges or defaultEdges. The component owns viewport and selection behavior while the host owns persistence and application workflows.',
      example: `'use client';

import {
  OrgChart,
  type OrgChartEdge
} from '@/components/ui/org-chart';

const reportingLines: OrgChartEdge[] = [
  {
    id: 'alex',
    parentId: null,
    displayName: 'Alex Morgan',
    positionTitle: 'Chief Executive Officer',
    avatarUrl: null
  },
  {
    id: 'sam',
    parentId: 'alex',
    displayName: 'Sam Rivera',
    positionTitle: 'VP of Product',
    avatarUrl: null
  }
];

type ReportingLineInput = Readonly<{
  personId: string;
  managerId: string;
  positionTitle?: string | null;
}>;

type CompanyOrgChartProps = Readonly<{
  saveReportingLine: (
    reportingLine: ReportingLineInput
  ) => void | Promise<void>;
  openPositionEditor: (personId: string) => void;
  openRemovalConfirmation: (personId: string) => void;
}>;

export function CompanyOrgChart({
  saveReportingLine,
  openPositionEditor,
  openRemovalConfirmation
}: CompanyOrgChartProps) {
  return (
    <OrgChart
      defaultEdges={reportingLines}
      onReparent={(personId, managerId, preserve) =>
        saveReportingLine({
          personId,
          managerId,
          positionTitle: preserve.positionTitle
        })
      }
      onEditNode={(person) => openPositionEditor(person.id)}
      onRemoveNode={(person) => openRemovalConfirmation(person.id)}
    />
  );
}`,
    },
    state: {
      title: 'Hierarchy and interaction state',
      description:
        'Use edges when the host owns the current hierarchy. Use defaultEdges for optimistic local reparenting, and persist each accepted move through onReparent.',
    },
    composition: [
      'The workspace canvas (shared with Agents Builder) owns pan, pinch, wheel, and keyboard zoom; the block lays flat reporting edges out as a tidy top-down tree and draws bezier wires between cards.',
      'Selecting a person highlights their reporting chain and opens a details panel with their manager, direct reports, and actions; folded teams show a stacked card edge and the team size.',
      'Node menus delegate editing and removal to the host, so the chart never assumes a router, form system, or destructive-action policy.',
      'Loading and empty states are built in, while success and error messaging remain injectable through observer callbacks.',
    ],
    accessibility: [
      'Keep every displayName and positionTitle meaningful because the same labels identify node actions and reporting relationships.',
      'The chart is an ARIA tree: Tab into it, move between people with the arrow keys, press Enter for details, and use Change manager to reassign without dragging.',
      'Confirm removal in the host workflow before changing data; the node menu reports intent and does not delete records itself.',
    ],
    api: [
      {
        name: 'edges / defaultEdges',
        type: 'OrgChartEdge[]',
        behavior:
          'Chooses controlled or uncontrolled hierarchy state. Supply exactly one of these properties.',
      },
      {
        name: 'editable',
        type: 'boolean',
        behavior:
          'Enables dragging and node actions. Defaults to true.',
      },
      {
        name: 'isLoading',
        type: 'boolean',
        behavior:
          'Replaces the chart with a bounded loading surface while hierarchy data is pending.',
      },
      {
        name: 'onReparent',
        type: '(childId, newParentId, preserve) => void | Promise<void>',
        behavior:
          'Persists a valid reporting-line change. Uncontrolled mode reverts its optimistic move when the promise rejects.',
      },
      {
        name: 'onAddToChart / onEditNode / onRemoveNode',
        type: 'Callbacks',
        behavior:
          'Delegates creation, editing, and removal workflows without coupling the chart to dialogs or routing.',
      },
      {
        name: 'onReparentSuccess / onReparentError',
        type: 'Observer callbacks',
        behavior:
          'Lets the host present localized feedback for accepted and rejected reporting-line changes.',
      },
      {
        name: 'showDetails / onSelectNode',
        type: 'boolean / (node | null) => void',
        behavior:
          'Shows the built-in details panel for the selected person (default true), and reports selection so a host can render its own panel instead.',
      },
      {
        name: 'defaultCollapsedIds',
        type: 'string[]',
        behavior:
          'People whose teams start folded away, useful for large organizations.',
      },
      {
        name: 'className',
        type: 'string',
        behavior:
          'Adds layout classes to the chart container; use a height utility to replace the default 600-pixel canvas.',
      },
    ],
  },
  {
    name: 'storage-browser',
    title: 'Storage Browser',
    description:
      'A complete controlled storage workspace with bucket navigation, object discovery, upload, configuration, detail, and empty states.',
    previewDescription:
      'Switch buckets, search and sort objects, select rows, and open object details in the composed storage workspace.',
    previewHeight: 720,
    whenToUse: [
      'Use Storage Browser when people need to inspect and manage objects across several application buckets.',
      'Install a focused storage leaf when the surrounding product already owns navigation, tables, or configuration surfaces.',
    ],
    usage: {
      description:
        'Map GraphQL results into the storage domain types and keep selection, search, sort, folders, and actions in the host. The browser performs no fetching or authorization checks.',
      example: `'use client';

import { useMemo, useState } from 'react';

import {
  ObjectDetailSheet,
  StorageBrowser,
  type ObjectSort,
  type StorageBucket,
  type StorageObject
} from '@/components/ui/storage';

type AssetBrowserActions = Readonly<{
  confirmDelete: (objectIds: string[]) => void;
  copyLink: (object: StorageObject) => void;
  createBucket: () => void;
  download: (object: StorageObject) => void;
  rename: (objectId: string, filename?: string) => void;
  upload: () => void;
}>;

function compareObjects(
  left: StorageObject,
  right: StorageObject,
  sort: ObjectSort
) {
  let comparison = 0;
  if (sort.column === 'filename') {
    comparison = (left.filename ?? left.key).localeCompare(
      right.filename ?? right.key
    );
  } else if (sort.column === 'mimeType') {
    comparison = left.mimeType.localeCompare(right.mimeType);
  } else if (sort.column === 'size') {
    comparison = left.size - right.size;
  } else {
    comparison =
      new Date(left.createdAt).getTime() -
      new Date(right.createdAt).getTime();
  }
  return sort.direction === 'asc' ? comparison : -comparison;
}

export function AssetBrowser({
  actions,
  buckets,
  objects
}: Readonly<{
  actions: AssetBrowserActions;
  buckets: StorageBucket[];
  objects: StorageObject[];
}>) {
  const [bucketId, setBucketId] = useState<string | null>(
    buckets[0]?.id ?? null
  );
  const [openedObject, setOpenedObject] = useState<StorageObject | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<ObjectSort>({
    column: 'createdAt',
    direction: 'desc'
  });
  const visibleObjects = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return objects
      .filter((object) => {
        if (object.bucketId !== bucketId) return false;
        if (!search) return true;
        const searchable = [
          object.filename ?? '',
          object.key,
          object.mimeType
        ].join(' ');
        return searchable.toLocaleLowerCase().includes(search);
      })
      .sort((left, right) => compareObjects(left, right, sort));
  }, [bucketId, objects, query, sort]);

  return (
    <>
      <StorageBrowser
        buckets={buckets}
        objects={visibleObjects}
        query={query}
        selectedBucketId={bucketId}
        selectedIds={selectedIds}
        sort={sort}
        onBulkDelete={actions.confirmDelete}
        onClearSelection={() => setSelectedIds([])}
        onCopyLink={actions.copyLink}
        onDelete={(object) => actions.confirmDelete([object.id])}
        onDownload={actions.download}
        onNewBucket={actions.createBucket}
        onOpenObject={setOpenedObject}
        onQueryChange={setQuery}
        onRename={(object) => actions.rename(object.id)}
        onSelectBucket={(nextBucketId) => {
          setBucketId(nextBucketId);
          setSelectedIds([]);
        }}
        onSelectionChange={setSelectedIds}
        onSortChange={setSort}
        onUpload={actions.upload}
      />
      <ObjectDetailSheet
        object={openedObject}
        open={openedObject !== null}
        onCopyLink={actions.copyLink}
        onDelete={(objectId) => {
          actions.confirmDelete([objectId]);
          setOpenedObject(null);
        }}
        onDownload={actions.download}
        onOpenChange={(open) => {
          if (!open) setOpenedObject(null);
        }}
        onRename={actions.rename}
      />
    </>
  );
}`,
    },
    state: {
      title: 'Data and action boundaries',
      description:
        'Every collection, selection, filter, sort, and mutation callback is controlled. Filter and authorize records before passing them to the block, then refresh its props after a mutation succeeds.',
    },
    composition: [
      'The storage-browser registry item installs the shared storage barrel and every leaf: bucket rail, object table, upload dropzone, detail sheet, bucket configuration sheet, and empty states.',
      'StorageBrowser composes the bucket rail, toolbar, breadcrumb, object table, and empty states; render the installed sheets and upload surface beside it when those workflows are available.',
      'The types mirror Constructive storage records, but the UI remains transport-neutral and does not bypass PostgreSQL privileges or RLS.',
    ],
    accessibility: [
      'Preserve object filenames, MIME types, sizes, and dates as text so file state never depends on an icon or color alone.',
      'Keep selection controlled and announce the resulting count; bulk deletion should open a confirmation before calling the mutation.',
      'Treat unavailable storage, denied access, no buckets, and an empty bucket as distinct states because they require different recovery actions.',
    ],
    api: [
      {
        name: 'buckets / selectedBucketId / onSelectBucket',
        type: 'StorageBucket[] / string | null / callback',
        behavior:
          'Supplies the bucket rail and keeps the active bucket controlled by the host.',
      },
      {
        name: 'objects / selectedIds / onSelectionChange',
        type: 'StorageObject[] / string[] / callback',
        behavior:
          'Supplies visible objects and controls row and bulk selection.',
      },
      {
        name: 'sort / onSortChange',
        type: 'ObjectSort / callback',
        behavior:
          'Reports the requested column and direction; the host returns objects in the corresponding order.',
      },
      {
        name: 'query / onQueryChange',
        type: 'string / callback',
        behavior:
          'Controls the search field while filtering or remote querying remains in the host.',
      },
      {
        name: 'segments / onNavigate',
        type: 'StorageBreadcrumbSegment[] / callback',
        behavior:
          'Adds optional folder navigation beneath the active bucket header.',
      },
      {
        name: 'onUpload / onBulkDelete / object callbacks',
        type: 'Callbacks',
        behavior:
          'Delegates upload, delete, open, download, copy-link, rename, and row-delete workflows.',
      },
      {
        name: 'isLoading / emptyState / emptyLabel',
        type: 'boolean / StorageEmptyStateVariant / string',
        behavior:
          'Distinguishes pending results, empty table results, and full-pane storage states.',
      },
      {
        name: 'bulkDeleteProgress',
        type: '{ done: number; total: number; failed: string[] }',
        behavior:
          'Shows deterministic progress and partial failures while a host-owned bulk deletion is running.',
      },
      {
        name: 'className',
        type: 'string',
        behavior:
          'Adds layout classes to the outer storage workspace.',
      },
    ],
  },
  {
    name: 'agents-builder',
    title: 'Agents Builder',
    description:
      'A complete agent workspace template: chat with inline questions and tool traces, an integrations directory with a two-step connect flow, a skills library, and an agent detail view with a live run panel and pannable canvas.',
    previewDescription:
      'Start a recommended chat, answer the agent’s questions, connect a source, triage agent-drafted replies in the Inbox, pause or run schedules, then open Revenue Analyst to watch a run reason, query the warehouse, fan out across sub-agents and skills, and wait for your approval.',
    previewHeight: 820,
    whenToUse: [
      'Use Agents Builder as the starting shell for a product where people chat with agents, connect the apps those agents read from, and inspect what each agent runs.',
      'Install the AI kit primitives on their own when you only need a chat surface or a single agent card inside an existing layout.',
    ],
    usage: {
      description:
        'Pass workspace data and handle side effects through callbacks. The template owns navigation between its views, the connect dialog, and scripted playback; the host owns routing, OAuth, persistence, and model calls.',
      example: `'use client';

import { useRouter } from 'next/navigation';

import {
  AgentsBuilder,
  type AgentsBuilderAction,
  type AgentsBuilderData,
  type Integration
} from '@/components/ui/agents-builder';

type AgentWorkspaceProps = Readonly<{
  data: AgentsBuilderData;
  startOAuth: (integration: Integration) => Promise<void>;
  saveConnection: (
    integrationId: string,
    toolIds: string[]
  ) => Promise<void>;
}>;

export function AgentWorkspace({
  data,
  startOAuth,
  saveConnection
}: AgentWorkspaceProps) {
  const router = useRouter();

  const handleAction = (action: AgentsBuilderAction) => {
    if (action.type === 'navigate') router.push(\`/\${action.target}\`);
    if (action.type === 'open-agent') router.push(\`/agents/\${action.agentId}\`);
  };

  return (
    <div className="h-dvh">
      <AgentsBuilder
        data={data}
        onAuthorizeIntegration={startOAuth}
        onConnectIntegration={(integration, toolIds) =>
          saveConnection(integration.id, toolIds)
        }
        onAction={handleAction}
      />
    </div>
  );
}`,
    },
    state: {
      title: 'Views, connections, and playback',
      description:
        'The active view is uncontrolled by default; pass view and onViewChange to sync it with a router. Connections start from each integration’s connected flag and update only after onConnectIntegration resolves. Chat replies and the agent run play from scripted beats, so map live model and run events onto the same shapes when you connect a runtime.',
    },
    composition: [
      'Built from the AI kit: PromptInput, ChatContainer, ToolTrace, ThinkingStatus, AskCard, ConnectPrompt, AgentDraftCard, and UsageNotice, so each surface can be reused outside the template.',
      'Each view (ChatView, IntegrationsView, SkillsView, AgentView) and the ConnectIntegrationDialog is exported for hosts that want their own shell or router.',
      'Integration marks fall back to tinted monograms; pass real brand marks through each integration’s mark field.',
    ],
    accessibility: [
      'Every icon-only control has a label and a tooltip; the collapsed sidebar keeps labels available through tooltips and aria-label.',
      'The agent canvas is a focusable region: arrow keys pan, plus and minus zoom, and zero resets to 100%.',
      'Clarifying questions use radio semantics with lettered options and a labeled free-text row, and streamed status lines are announced politely.',
      'Scripted playback shortens to near-instant steps when reduced motion is requested.',
    ],
    api: [
      {
        name: 'data',
        type: 'AgentsBuilderData',
        behavior:
          'Workspace name, models, integrations and categories, agents, skills, starter packs, chat recommendations and replies, the agent blueprint, and its run script. AGENTS_BUILDER_DEMO is a complete example.',
      },
      {
        name: 'view / defaultView / onViewChange',
        type: "'chat' | 'integrations' | 'skills' | 'agent'",
        behavior: 'Controls or seeds the active view.',
      },
      {
        name: 'onAuthorizeIntegration',
        type: '(integration) => Promise<void>',
        behavior:
          'Runs the provider consent handoff. Resolve to advance to tool selection; reject to return to sign-in.',
      },
      {
        name: 'onConnectIntegration',
        type: '(integration, toolIds) => void | Promise<void>',
        behavior:
          'Persists a connection with the tools left enabled. Rejecting keeps the dialog open on the tools step.',
      },
      {
        name: 'onAction',
        type: '(action: AgentsBuilderAction) => void',
        behavior:
          'Receives every host-owned control: navigation, search, sharing, skill and agent links, workspace menu items, stop, and follow-ups.',
      },
      {
        name: 'theme / onThemeChange',
        type: "'light' | 'dark' | 'system'",
        behavior: 'Drives the appearance switch in the workspace menu.',
      },
      {
        name: 'defaultSidebarCollapsed / autoplayRun',
        type: 'boolean',
        behavior:
          'Starts with the icon rail, and chooses whether the agent run replays or opens settled.',
      },
    ],
  },
  {
    name: 'billing-account',
    href: '/blocks/billing/account',
    section: 'billing',
    title: 'Billing Account',
    description:
      'The customer side of Constructive billing: an account switcher and six views over one account’s plan, usage by credit pool, credits, invoices, and ledger. Works for Constructive’s own platform billing and for any tenant app billing its customers.',
    previewDescription:
      'Switch scenarios (overdue, suspended, checkout pending, scheduled downgrade, free, read-only member, tenant app), open a meter to see its daily usage and waterfall, preview a downgrade with its conflicts, buy a pack, redeem a gift code (try HACKWEEK-2026 or TEAM-SEATS), and filter the ledger.',
    previewHeight: 820,
    whenToUse: [
      'Use Billing Account as the billing destination for a signed-in person or organization: what plan they are on, what they have used, what is left, and what they paid.',
      'Use the Billing Console template for the operator side (catalog, customers, provider, standing), and billing-kit leaves when one card or table belongs inside an existing page.',
    ],
    usage: {
      description:
        'Map the account’s billing rows into BillingAccountData and hand purchases to your provider through callbacks. The template owns navigation, previews, and optimistic local state; the host owns checkout, the customer portal, and persistence.',
      example: `'use client';

import { useRouter } from 'next/navigation';

import {
  BillingAccount,
  type BillingAccountAction,
  type BillingAccountData,
  type PlanChangeRequest,
  type RedeemResult
} from '@/components/ui/billing-account';

type AccountBillingProps = Readonly<{
  data: BillingAccountData;
  now: string;
  changePlan: (request: PlanChangeRequest) => Promise<{ checkoutUrl?: string }>;
  checkoutPack: (slug: string) => Promise<string>;
  redeem: (code: string) => Promise<RedeemResult>;
  openPortal: () => Promise<string>;
  /** From the \`?code=\` of a promo link, if any. */
  promoCode?: string;
}>;

export function AccountBilling({ data, now, changePlan, checkoutPack, redeem, openPortal, promoCode }: AccountBillingProps) {
  const router = useRouter();

  const handleAction = async (action: BillingAccountAction) => {
    if (action.type === 'open-portal') window.location.assign(await openPortal());
    if (action.type === 'switch-account') router.push(\`/billing/\${action.accountId}\`);
  };

  return (
    <div className="h-dvh">
      <BillingAccount
        data={data}
        now={now}
        onChangePlan={async (request) => {
          const { checkoutUrl } = await changePlan(request);
          if (checkoutUrl) window.location.assign(checkoutUrl);
        }}
        onBuyCredits={async (pack) => window.location.assign(await checkoutPack(pack.slug))}
        onRedeemCode={redeem}
        initialRedeemCode={promoCode}
        onAction={handleAction}
      />
    </div>
  );
}`,
    },
    state: {
      title: 'Views, previews, and optimistic state',
      description:
        'The view is uncontrolled by default; pass view and onViewChange to sync it with a router, and views to hide the ones your data cannot back. After a callback resolves the template shows the result locally (a scheduled change, a pending checkout, a new plan); passing new data resets it to the host’s truth.',
    },
    composition: [
      'Built on workspace-kit (the same shell as Agents Builder: sidebar rail, drawer, view frames, filter pills) and billing-kit, so every card, table, and dialog is reusable on its own.',
      'Overview: BillingStatusBanner (admin hold → suspension → grace → checkout pending → review → scheduled change), CurrentPlanCard, CreditWallet, PoolGrid, LimitList, LedgerTimeline, and FeatureCapList.',
      'Usage: headline StatTiles with a projection to period end, UsageTree (universal → category pools → meters, each with plan marker and credit cost), MeterDetailSheet with daily Sparkline and request windows, LimitList, UsageAlertList, and FeatureCapList.',
      'Plans: IntervalSwitch and PlanComparison; choosing a plan opens PlanChangeDialog, which diffs entitlements, flags limits already exceeded, and offers “now” or “at period end” when the provider can schedule changes.',
      'Gift codes: RedeemCodeDialog opens from the overview, the credits view, the account menu, or a ?code= link (initialRedeemCode). The host answers with the redemption or a typed refusal (not found, paused, expired, used up, already redeemed, not eligible); the dialog lists every grant, and the credits, balances, limits, and ledger update right away.',
      'Credits: CreditWallet, RedeemCodeField, CreditPackGrid, CreditGrantList in draw-down order, and RedemptionList of codes this account redeemed. Invoices: provider-portal panel, InvoiceTable with expandable lines, AdjustmentList. Activity: LedgerTimeline filtered by class.',
      'Provider-neutral: the active BillingProviderDescriptor decides which actions appear (hosted checkout, customer portal, scheduled changes). Stripe ships as STRIPE_PROVIDER; hosts register others the same way.',
    ],
    accessibility: [
      'Status never relies on colour: every badge carries a label, meters expose values through the meter role, and warnings in the sidebar have screen-reader text.',
      'The plan-change preview is a labelled dialog with radio choices for timing and inline error text when the host refuses the change.',
      'The collapsed sidebar keeps labels through tooltips and aria-label; below the sidebar width navigation moves into a drawer.',
      'Entrance motion and bar fills turn off under reduced motion; view swaps never animate the whole page.',
    ],
    api: [
      { name: 'data', type: 'BillingAccountData', behavior: 'Accounts, plans and prices, comparison rows, meters and balances, the subscription, credit grants and packs, ledger, invoices, limits, caps, alerts, and (platform) database standing. BILLING_ACCOUNT_DEMO and billingAccountScenario() are complete examples.' },
      { name: 'view / defaultView / onViewChange', type: "'overview' | 'usage' | 'plans' | 'credits' | 'invoices' | 'activity'", behavior: 'Controls or seeds the active view.' },
      { name: 'views', type: 'BillingAccountView[]', behavior: 'Limits navigation to the views the host can back; defaults to all six.' },
      { name: 'onChangePlan', type: '(request: PlanChangeRequest) => Promise<void>', behavior: 'Receives the plan, price, timing, and whether a hosted checkout is needed. Reject to keep the preview open with the message.' },
      { name: 'onBuyCredits', type: '(pack) => Promise<void>', behavior: 'Starts a pack checkout.' },
      { name: 'onRedeemCode', type: '(code: string) => Promise<RedeemResult>', behavior: 'Redeems a normalised gift code for this account. Resolve with { status: \'redeemed\', redemption } (what it granted, each grant\'s expiry resolved) or { status: \'refused\', reason, message? }. Without it, redeeming is hidden.' },
      { name: 'initialRedeemCode', type: 'string', behavior: 'Opens the redeem dialog prefilled, e.g. from a promo link; a new value reopens it.' },
      { name: 'onAlertsChange', type: '(alerts: UsageAlert[]) => void', behavior: 'Persists usage alert edits.' },
      { name: 'onAction', type: '(action: BillingAccountAction) => void', behavior: 'Portal, invoice, pay, cancel scheduled change, contact sales or support, account switch, and account-menu items.' },
      { name: 'locale / timeZone / now', type: 'string', behavior: 'Formatting; pass now from the server so relative dates render identically on both sides.' },
      { name: 'theme / onThemeChange / defaultSidebarCollapsed', type: "'light' | 'dark' | 'system' / boolean", behavior: 'Drives the appearance switch in the account menu and the initial rail state.' },
    ],
    buildingBlocks: [
      { name: 'BillingStatusBanner / Notice / LifecycleBadge', type: 'status', behavior: 'The one notice an account needs now, and lifecycle labels for active, grace, suspended, checkout pending, ended, and review required.' },
      { name: 'CurrentPlanCard / PriceTag / IntervalSwitch', type: 'plan', behavior: 'Plan, price, period progress, next invoice, and scheduled change.' },
      { name: 'PlanComparison / PlanChangeDialog', type: 'plan', behavior: 'Side-by-side plans and the preview that diffs entitlements and picks timing.' },
      { name: 'UsageTree / PoolGrid / MeterDetailSheet', type: 'usage', behavior: 'The credit waterfall, busiest pools, and one meter in depth.' },
      { name: 'AllowanceBar / UsageFigure / Sparkline / PeriodTrack', type: 'primitives', behavior: 'Bars with soft thresholds and plan markers, figures, daily bars, and the billing period as a thin segmented bar, one segment per day.' },
      { name: 'CreditWallet / CreditGrantList / CreditPackGrid', type: 'credits', behavior: 'Balance composition, grants in spend order, and packs.' },
      { name: 'RedeemCodeDialog / RedeemCodeField / RedemptionList / CodeGrantList', type: 'gift codes', behavior: 'Redeem a code, see exactly what it added (e.g. +25,000 compute credits for 30 days), typed refusals, and redeemed-code history.' },
      { name: 'LimitList / FeatureCapList / UsageAlertList', type: 'entitlements', behavior: 'Counted limits, plan features, and usage alerts.' },
      { name: 'InvoiceTable / AdjustmentList / LedgerTimeline', type: 'history', behavior: 'Invoices with lines, refunds and disputes, and the ledger by day.' },
    ],
  },
  {
    name: 'billing-console',
    href: '/blocks/billing/console',
    section: 'billing',
    title: 'Billing Console',
    description:
      'The operator side of Constructive billing, for the platform or a tenant database: revenue and attention, the catalog (plans and prices, entitlements, meters, packs and codes), customers, the payment provider with readiness and the billing switch, and platform database standing.',
    previewDescription:
      'Switch between the platform console and a tenant setting up billing. Edit the entitlement matrix and save, open a customer and grant credits, run the readiness check, try the locked billing switch, change the credit rate, switch providers, create or bulk-create gift codes and see who redeemed them, and place or lift an admin hold.',
    previewHeight: 820,
    whenToUse: [
      'Use Billing Console where operators manage what a billing module sells and to whom: Constructive’s platform team, or a developer running billing for their own app.',
      'Use Billing Account for the customer side of the same module.',
    ],
    usage: {
      description:
        'Map the billing module’s catalog, customers, provider connection, readiness verdict, and settings into BillingConsoleData, and route every write to your API. Provider credentials are write-only: the console only learns whether each one is set.',
      example: `'use client';

import {
  BillingConsole,
  type BillingConsoleData
} from '@/components/ui/billing-console';

type OperatorBillingProps = Readonly<{
  data: BillingConsoleData;
  api: {
    saveEntitlements: (changes: { planId: string; kind: string; key: string; value: number }[]) => Promise<void>;
    storeProviderSecrets: (providerId: string, values: Record<string, string>) => Promise<void>;
    enqueueReadinessCheck: () => Promise<void>;
    setBillingEnabled: (enabled: boolean) => Promise<void>;
    grantCredits: (customerId: string, meter: string, amount: number, reason: string) => Promise<void>;
  };
}>;

export function OperatorBilling({ data, api }: OperatorBillingProps) {
  return (
    <div className="h-dvh">
      <BillingConsole
        data={data}
        onSaveEntitlements={api.saveEntitlements}
        onConnectProvider={api.storeProviderSecrets}
        onRunReadinessCheck={api.enqueueReadinessCheck}
        onToggleBilling={api.setBillingEnabled}
        onGrantCredits={(request) =>
          api.grantCredits(request.customerId, request.meterSlug, request.amount, request.reason)
        }
      />
    </div>
  );
}`,
    },
    state: {
      title: 'Drafts, gates, and optimistic state',
      description:
        'Entitlement edits stay a local draft with a save bar until onSaveEntitlements resolves. The billing switch refuses to turn on without a passing readiness verdict under 24 hours old, mirroring the database gate; turning it off is always allowed. Toggles, grants, holds, and provider connections show locally after the host resolves and reset with new data.',
    },
    composition: [
      'Same shell as Billing Account and Agents Builder (workspace-kit), with a workspace menu that marks the scope as Platform or Tenant and a footer showing whether billing is live.',
      'Overview: StatTiles for recurring revenue, customers, and revenue at risk; a “Needs attention” list (readiness, overdue customers, reviews, catalog sync, usage-sync failures, suspended databases); revenue bars; customers by plan.',
      'Catalog: PlanPriceTable (immutable prices, sync state, provider ids), EntitlementMatrix (plans × limits, meter allowances, caps, editable with ∞), MeterCatalogTable grouped by pool, and CreditPackTable (flags packs priced below the credit rate).',
      'Gift codes: CreditCodeTable with live, paused, expired, and used-up codes; CreditCodeDialog to create or edit one (generated or typed code, grants on meters such as the compute pool or on limits such as seats, redemption cap, expiry, pause); BulkCodeDialog for single-use batches with copy and CSV download; CreditCodeSheet with every redemption.',
      'Customers: filters and search over CustomerTable; CustomerDetailSheet with balances, credits and GrantCreditsForm, overrides, request windows, the provider operations log, and invoices.',
      'Provider: the active provider card with write-only credential state, ReadinessChecklist with “Check now”, the gated billing switch, the credit rate, usage sync, and ProviderConnectDialog for connecting or switching (one active provider at a time).',
      'Standing (platform only): StandingTable with billing suspensions and admin holds, a reasoned hold dialog, and release.',
    ],
    accessibility: [
      'Tables use real table semantics with scoped headers; switches have descriptive labels such as “Retire the monthly Pro price”.',
      'Matrix cells are labelled inputs (“Databases for Team”) that commit on blur or Enter and cancel on Escape; the unlimited toggle is a pressed-state button.',
      'The readiness checklist announces its running state, and every check keeps its text status.',
      'Credential inputs never echo stored values; errors are tied to fields with aria-describedby.',
    ],
    api: [
      { name: 'data', type: 'BillingConsoleData', behavior: 'Scope, workspace, providers and the active connection, readiness verdict, settings, usage sync, plans, entitlement groups, meters, packs, codes, customers, standing, and a revenue trend. BILLING_CONSOLE_DEMO and BILLING_CONSOLE_TENANT_DEMO are complete examples.' },
      { name: 'view / defaultView / onViewChange / views', type: "'overview' | 'catalog' | 'customers' | 'provider' | 'standing'", behavior: 'Controls or seeds the active view and limits navigation; standing only appears at platform scope.' },
      { name: 'onSaveEntitlements', type: '(changes: EntitlementChange[]) => Promise<void>', behavior: 'Persists the matrix draft; reject to keep it unsaved with the message.' },
      { name: 'onConnectProvider', type: '(providerId, values) => Promise<void>', behavior: 'Stores credentials and makes the provider active.' },
      { name: 'onRunReadinessCheck', type: '() => Promise<BillingHealth | void>', behavior: 'Enqueues the readiness job; resolve with the new verdict to show it.' },
      { name: 'onToggleBilling / onCreditRateChange', type: '(enabled) / (creditsPerCent) => Promise<void>', behavior: 'Flip enable_billing and set credits_per_cent; reject with the gate’s error to show it.' },
      { name: 'onGrantCredits', type: '(request: GrantCreditsRequest) => Promise<void>', behavior: 'Grants credits to one customer with a type, optional expiry, and a ledger reason.' },
      { name: 'onSaveCode / onCreateCodes', type: '(draft, existing?) => Promise<CreditCode | void> / (drafts) => Promise<void>', behavior: 'Create or edit one gift code, or a bulk batch of single-use codes. Without them the code actions are hidden.' },
      { name: 'onHoldDatabase / onReleaseDatabase', type: '(database, note?) => Promise<void>', behavior: 'Platform scope: place an admin hold or lift a suspension.' },
      { name: 'onAction', type: '(action: BillingConsoleAction) => void', behavior: 'Plan, price, meter, pack, and code toggles; new plan, price, and pack; override removal; scheduled-change cancellation; workspace menu.' },
    ],
    buildingBlocks: [
      { name: 'EntitlementMatrix / PlanPriceTable', type: 'catalog', behavior: 'Plans × entitlements with in-place editing, and plans with their immutable prices and provider mirror.' },
      { name: 'MeterCatalogTable / CreditPackTable', type: 'catalog', behavior: 'Meters grouped by pool, and packs checked against the credit rate.' },
      { name: 'CreditCodeTable / CreditCodeDialog / BulkCodeDialog / CreditCodeSheet / CodeItemsEditor', type: 'gift codes', behavior: 'List, create, bulk-create, pause, and inspect gift codes and their redemptions.' },
      { name: 'CustomerTable / CustomerDetailSheet / GrantCreditsForm', type: 'customers', behavior: 'Subscribers, one customer in depth, and credit grants.' },
      { name: 'ProviderConnectDialog / ProviderCredentialForm / ProviderCard / ProviderMark', type: 'provider', behavior: 'Pick or switch providers and store write-only credentials, driven by BillingProviderDescriptor.' },
      { name: 'ReadinessChecklist / SyncBadge / ExternalRef', type: 'provider', behavior: 'Doctor checks with provider copy, catalog sync state, and provider ids with copy and deep links.' },
      { name: 'StandingTable', type: 'platform', behavior: 'Billing suspensions and admin holds with hold and release.' },
    ],
  },
];

const APPLICATION_BLOCK_BY_NAME = new Map(
  APPLICATION_BLOCKS.map((block) => [block.name, block] as const),
);

export function getApplicationBlock(name: string): ApplicationBlockDoc | undefined {
  return APPLICATION_BLOCK_BY_NAME.get(name as ApplicationBlockDoc['name']);
}

/** The docs route for an application block. */
export function applicationBlockHref(block: Pick<ApplicationBlockDoc, 'name' | 'href'>) {
  return block.href ?? `/blocks/${block.name}`;
}

const APPLICATION_BLOCK_BY_HREF = new Map(
  APPLICATION_BLOCKS.map((block) => [applicationBlockHref(block), block] as const),
);

/** The application block documented at a (normalised) path, if any. */
export function getApplicationBlockByPath(path: string): ApplicationBlockDoc | undefined {
  return APPLICATION_BLOCK_BY_HREF.get(path);
}
