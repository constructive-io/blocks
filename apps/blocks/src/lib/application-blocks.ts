export type ApplicationBlockApiRow = Readonly<{
  name: string;
  type: string;
  behavior: string;
}>;

export type ApplicationBlockDoc = Readonly<{
  name: 'org-chart' | 'storage-browser' | 'agents-builder';
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
}>;

export const APPLICATION_BLOCKS: readonly ApplicationBlockDoc[] = [
  {
    name: 'org-chart',
    title: 'Org Chart',
    description:
      'An interactive organization chart with automatic hierarchy layout, zoom controls, node actions, and drag-to-reparent behavior.',
    previewDescription:
      'Explore a realistic reporting hierarchy, select people, and drag a non-root card onto a new manager.',
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
      'React Flow owns pan, zoom, hit testing, and accessible viewport controls; the block derives positioned nodes and connectors from flat reporting edges.',
      'Node menus delegate editing and removal to the host, so the chart never assumes a router, form system, or destructive-action policy.',
      'Loading and empty states are built in, while success and error messaging remain injectable through observer callbacks.',
    ],
    accessibility: [
      'Keep every displayName and positionTitle meaningful because the same labels identify node actions and reporting relationships.',
      'Provide non-drag alternatives for reparenting in the surrounding application when the workflow must support keyboard-only hierarchy changes.',
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
];

const APPLICATION_BLOCK_BY_NAME = new Map(
  APPLICATION_BLOCKS.map((block) => [block.name, block] as const),
);

export function getApplicationBlock(name: string): ApplicationBlockDoc | undefined {
  return APPLICATION_BLOCK_BY_NAME.get(name as ApplicationBlockDoc['name']);
}
