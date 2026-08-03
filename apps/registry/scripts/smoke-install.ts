#!/usr/bin/env -S tsx

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(appDirectory, '..', '..');
const publicDirectory = path.join(appDirectory, 'public');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-registry-smoke-'));

type SmokeCase = {
	name: string;
	assertExactPackages?: boolean;
	assertExactSource?: boolean;
	consumer?: string;
	customAliases?: boolean;
	expected: string[];
	expectedCss?: string[];
	expectedPackages?: string[];
	expectedPackageVersions?: Readonly<Record<string, string>>;
	expectedServerFiles?: string[];
	forbidden?: string[];
	forbiddenPackages?: string[];
	items?: string[];
	nextApp?: boolean;
	strictNullChecks?: boolean;
};

const overlayItems = [
	'alert-dialog',
	'dialog',
	'drawer',
	'dropdown-menu',
	'popover',
	'select',
	'sheet',
	'tooltip',
] as const;

const aiFiles = [
	'agent-loader.tsx',
	'approval-card.tsx',
	'chat-container.tsx',
	'code-block.tsx',
	'context-card.tsx',
	'context-ring.tsx',
	'diff-table.tsx',
	'feedback-bar.tsx',
	'file-upload.tsx',
	'format-duration.ts',
	'image.tsx',
	'index.ts',
	'inline-diff.tsx',
	'markdown.tsx',
	'message.tsx',
	'plan-tracker.tsx',
	'prompt-input.tsx',
	'prompt-suggestion.tsx',
	'reasoning.tsx',
	'recommendation-card.tsx',
	'response-stream.tsx',
	'scroll-button.tsx',
	'source.tsx',
	'steps.tsx',
	'streaming-text.tsx',
	'system-message.tsx',
	'task-row.tsx',
	'text-shimmer.tsx',
	'thinking-trace.tsx',
	'tool.tsx',
	'types.ts',
	'use-throttled-text.ts',
] as const;

const aiCssFragments = [
	'@keyframes ai-shimmer-text',
	'@keyframes ai-pixel-on',
	'@keyframes ai-fade-up',
	'.animate-ai-shimmer-text',
	'.animate-ai-pixel-on',
	'.animate-ai-fade-up',
] as const;

const featurePackIds = [
	'data',
	'auth',
	'users',
	'organizations',
	'storage',
	'billing',
	'notifications',
] as const;

type FeaturePackId = (typeof featurePackIds)[number];

const consoleCoreFiles = [
	'src/blocks/console-runtime/capabilities.ts',
	'src/blocks/console-runtime/endpoints.ts',
	'src/blocks/console-runtime/feature-adapter.ts',
	'src/blocks/console-runtime/index.ts',
	'src/blocks/console-runtime/session.ts',
	'src/blocks/console-runtime/standalone-session.ts',
	'src/blocks/console-runtime/transport.ts',
	'src/feature-packs/capabilities.ts',
	'src/feature-packs/catalog.ts',
	'src/feature-packs/catalog-validation.ts',
	'src/feature-packs/index.ts',
	'src/feature-packs/manifest.ts',
	'src/blocks/console-kit/feature-module.ts',
	'src/blocks/console-kit/console-kit-contracts.ts',
	'src/blocks/console-kit/console-connection-menu.tsx',
	'src/blocks/console-kit/console-kit-runtime.tsx',
	'src/blocks/console-kit/use-latest-callback.ts',
	'src/blocks/console-kit/console-kit-core.tsx',
	'src/blocks/console-kit/console-kit.tsx',
	'src/blocks/console-kit/constructive/constructive-adapter-utils.ts',
	'src/blocks/console-kit/constructive/constructive-capabilities.ts',
	'src/blocks/console-kit/constructive/constructive-console-kit.tsx',
	'src/blocks/console-kit/constructive/constructive-graphql.ts',
	'src/blocks/console-kit/constructive/constructive-meta-utils.ts',
	'src/blocks/console-kit/store/adapter-slice.ts',
	'src/blocks/console-kit/store/context-slice.ts',
	'src/blocks/console-kit/store/endpoint-capability-slice.ts',
	'src/blocks/console-kit/store/navigation-slice.ts',
	'src/blocks/console-kit/store/runtime-slice.ts',
	'src/blocks/console-kit/store/session-slice.ts',
	'src/blocks/console-kit/store/console-kit-store.tsx',
	'src/blocks/console-kit/store/index.ts',
] as const;

const featurePackViewFiles: Record<FeaturePackId, readonly string[]> = {
	data: [
		'src/blocks/feature-packs/data/data-feature-pack.tsx',
	],
	auth: [
		'src/blocks/feature-packs/auth/auth-contracts.ts',
		'src/blocks/feature-packs/auth/auth-entry-panel.tsx',
		'src/blocks/feature-packs/auth/auth-challenge-panel.tsx',
		'src/blocks/feature-packs/auth/auth-account-view.tsx',
		'src/blocks/feature-packs/auth/auth-feature-pack.tsx',
	],
	users: [
		'src/blocks/feature-packs/users/users-feature-pack.tsx',
	],
	organizations: [
		'src/blocks/feature-packs/organizations/organizations-feature-pack.tsx',
	],
	storage: [
		'src/blocks/feature-packs/storage/storage-feature-pack.tsx',
	],
	billing: [
		'src/blocks/feature-packs/billing/billing-feature-pack.tsx',
	],
	notifications: [
		'src/blocks/feature-packs/notifications/notifications-feature-pack.tsx',
	],
};

const consoleModuleFiles: Record<FeaturePackId, readonly string[]> = {
	data: [
		'src/blocks/feature-packs/data/data-console-module.tsx',
	],
	auth: [
		'src/blocks/feature-packs/auth/auth-console-module.tsx',
		'src/blocks/console-kit/constructive/auth-adapter.ts',
	],
	users: [
		'src/blocks/feature-packs/users/users-console-module.tsx',
		'src/blocks/console-kit/constructive/users-adapter.ts',
	],
	organizations: [
		'src/blocks/feature-packs/organizations/organizations-console-module.tsx',
		'src/blocks/feature-packs/organizations/organizations-meta-contract.ts',
		'src/blocks/console-kit/constructive/organizations-adapter.ts',
	],
	storage: [
		'src/blocks/feature-packs/storage/storage-console-module.tsx',
		'src/blocks/feature-packs/storage/storage-console-slice.ts',
		'src/blocks/feature-packs/storage/storage-meta-contract.ts',
		'src/blocks/console-kit/constructive/storage-adapter.ts',
	],
	billing: [
		'src/blocks/feature-packs/billing/billing-console-module.tsx',
		'src/blocks/console-kit/constructive/billing-adapter.ts',
	],
	notifications: [
		'src/blocks/feature-packs/notifications/notifications-console-module.tsx',
		'src/blocks/console-kit/constructive/notifications-adapter.ts',
	],
};

const appKitFiles = {
	'app-kit-core': [
		'src/blocks/app-kit/core/contracts.ts',
		'src/blocks/app-kit/core/navigation.ts',
		'src/blocks/app-kit/core/schema-validation.ts',
		'src/blocks/app-kit/core/scope.ts',
		'src/blocks/app-kit/core/runtime.tsx',
		'src/blocks/app-kit/core/index.ts',
	],
	'app-kit-data': [
		'src/blocks/app-kit/data/types.ts',
		'src/blocks/app-kit/data/states.tsx',
		'src/blocks/app-kit/data/controls.tsx',
		'src/blocks/app-kit/data/collections.tsx',
		'src/blocks/app-kit/data/detail-form.tsx',
		'src/blocks/app-kit/data/relations.tsx',
		'src/blocks/app-kit/data/action-bars.tsx',
		'src/blocks/app-kit/data/index.ts',
	],
	'app-kit-board': [
		'src/blocks/app-kit/board/board.tsx',
		'src/blocks/app-kit/board/connected-board.tsx',
		'src/blocks/app-kit/board/index.ts',
	],
	'app-kit-dashboard': [
		'src/blocks/app-kit/dashboard/widgets.tsx',
		'src/blocks/app-kit/dashboard/layout-store.ts',
		'src/blocks/app-kit/dashboard/dashboard.tsx',
		'src/blocks/app-kit/dashboard/connected-dashboard.tsx',
		'src/blocks/app-kit/dashboard/persisted-dashboard.tsx',
		'src/blocks/app-kit/dashboard/index.ts',
	],
	'app-kit-calendar': [
		'src/blocks/app-kit/calendar/calendar.tsx',
		'src/blocks/app-kit/calendar/connected-calendar.tsx',
		'src/blocks/app-kit/calendar/index.ts',
	],
	'app-kit-workflow': [
		'src/blocks/app-kit/workflow/actions.tsx',
		'src/blocks/app-kit/workflow/connected-actions.tsx',
		'src/blocks/app-kit/workflow/stepper.tsx',
		'src/blocks/app-kit/workflow/index.ts',
	],
	'app-kit-event-studio': [
		'src/blocks/app-kit/event-studio/definitions.ts',
		'src/blocks/app-kit/event-studio/state.ts',
		'src/blocks/app-kit/event-studio/event-studio.tsx',
		'src/blocks/app-kit/event-studio/index.ts',
	],
} as const;

type AppKitRoot = keyof typeof appKitFiles;

const appKitCapabilityRoots = [
	'app-kit-core',
	'app-kit-data',
	'app-kit-board',
	'app-kit-dashboard',
	'app-kit-calendar',
	'app-kit-workflow',
] as const satisfies readonly AppKitRoot[];

function appKitExpectedPackages(root: AppKitRoot): string[] {
	return [
		'@tanstack/react-query',
		...(root === 'app-kit-core' ? [] : ['lucide-react']),
		...(root === 'app-kit-dashboard' || root === 'app-kit-event-studio'
			? ['@tanstack/charts', '@tanstack/charts-scales', '@tanstack/react-charts', 'd3-scale']
			: []),
		...(root === 'app-kit-event-studio' ? ['zod'] : []),
	];
}

function appKitExpectedPackageVersions(root: AppKitRoot): Readonly<Record<string, string>> | undefined {
	return root === 'app-kit-dashboard' || root === 'app-kit-event-studio'
		? {
			'@tanstack/charts': '0.6.4',
			'@tanstack/charts-scales': '0.6.4',
			'@tanstack/react-charts': '0.6.4',
			'd3-scale': '4.0.2',
		}
		: undefined;
}

function forbiddenAppKitFiles(root: AppKitRoot): string[] {
	return Object.entries(appKitFiles)
		.filter(([candidate]) => candidate !== root && candidate !== 'app-kit-core')
		.flatMap(([, files]) => [...files]);
}

const appKitCapabilityCases: SmokeCase[] = appKitCapabilityRoots.flatMap((root) => [
	{
		name: `${root}-default`,
		items: [root],
		expected: [...appKitFiles[root]],
		expectedPackages: appKitExpectedPackages(root),
		expectedPackageVersions: appKitExpectedPackageVersions(root),
		expectedServerFiles: root === 'app-kit-core'
			? appKitFiles['app-kit-core'].filter((file) => !file.endsWith('runtime.tsx'))
			: undefined,
		forbidden: forbiddenAppKitFiles(root),
		forbiddenPackages: ['@constructive-io/sheets', 'zustand'],
		strictNullChecks: true,
	},
	{
		name: `${root}-custom`,
		items: [root],
		customAliases: true,
		expected: [...appKitFiles[root]],
		expectedPackages: appKitExpectedPackages(root),
		expectedPackageVersions: appKitExpectedPackageVersions(root),
		expectedServerFiles: root === 'app-kit-core'
			? appKitFiles['app-kit-core'].filter((file) => !file.endsWith('runtime.tsx'))
			: undefined,
		forbidden: forbiddenAppKitFiles(root),
		forbiddenPackages: ['@constructive-io/sheets', 'zustand'],
		strictNullChecks: true,
	},
]);

const featurePackManifest = (id: FeaturePackId): string =>
	`.constructive/feature-packs/${id}.json`;

const presetManifest = (id: string): string =>
	`.constructive/feature-packs/${id}.json`;

function featurePackClosure(ids: readonly FeaturePackId[]): string[] {
	return ids.flatMap((id) => [...featurePackViewFiles[id], featurePackManifest(id)]);
}

function consoleModuleClosure(ids: readonly FeaturePackId[]): string[] {
	return [
		...consoleCoreFiles,
		...ids.flatMap((id) => [
			...featurePackViewFiles[id],
			...consoleModuleFiles[id],
			featurePackManifest(id),
		]),
	];
}

function forbiddenFeaturePacks(ids: readonly FeaturePackId[]): string[] {
	const selected = new Set(ids);
	return featurePackIds
		.filter((id) => !selected.has(id))
		.map(featurePackManifest);
}

const standaloneFeaturePackCases: SmokeCase[] = featurePackIds.map((id) => ({
	name: `feature-pack-${id}`,
	expectedPackages: id === 'data'
		? ['@constructive-io/data', 'zustand']
		: [],
	forbiddenPackages: [
		...(id === 'data' ? [] : ['zustand']),
		'@constructive-io/sheets',
		...(id === 'data' ? [] : ['@constructive-io/data']),
	],
	expected: featurePackClosure([id]),
	forbidden: [
		...consoleCoreFiles,
		...featurePackIds.flatMap((featureId) => consoleModuleFiles[featureId]),
		...forbiddenFeaturePacks([id]),
		presetManifest('blank'),
		presetManifest('auth-hardened'),
		presetManifest('b2b-storage'),
		presetManifest('full'),
	],
}));

const consoleModuleCases: SmokeCase[] = featurePackIds.map((id) => ({
	name: `console-module-${id}`,
	expectedPackages: [
		'@constructive-io/data',
		'zustand',
	],
	forbiddenPackages: ['@constructive-io/sheets'],
	expected: consoleModuleClosure([id]),
	forbidden: [
		...featurePackIds
			.filter((featureId) => featureId !== id)
			.flatMap((featureId) => consoleModuleFiles[featureId]),
		...forbiddenFeaturePacks([id]),
		presetManifest('blank'),
		presetManifest('auth-hardened'),
		presetManifest('b2b-storage'),
		presetManifest('full'),
	],
}));

const presetCases: SmokeCase[] = [
	{
		id: 'auth-hardened',
		packs: ['data', 'auth', 'users'],
	},
	{
		id: 'b2b-storage',
		packs: ['data', 'auth', 'users', 'organizations', 'storage'],
	},
	{
		id: 'full',
		packs: [...featurePackIds],
	},
].map(({ id, packs }) => ({
	name: `preset-${id}`,
	expectedPackages: ['@constructive-io/data', 'zustand'],
	forbiddenPackages: ['@constructive-io/sheets'],
	expected: [
		...consoleModuleClosure(packs as readonly FeaturePackId[]),
		`src/blocks/presets/${id}-console-kit.tsx`,
		presetManifest(id),
	],
	forbidden: [
		...forbiddenFeaturePacks(packs as readonly FeaturePackId[]),
		presetManifest('blank'),
		...['auth-hardened', 'b2b-storage', 'full']
			.filter((presetId) => presetId !== id)
			.map(presetManifest),
	],
}));

const eventStudioNextConsumer = `'use client';

import * as React from 'react';
import { QueryClient } from '@tanstack/react-query';

import { appSuccess, type AppResourceSource, type AppScope } from '@/blocks/app-kit/core';
import { AppKitProvider } from '@/blocks/app-kit/core/runtime';
import { DEFAULT_APP_COLLECTION_STATE } from '@/blocks/app-kit/data';
import { createDefaultAppDashboardLayout } from '@/blocks/app-kit/dashboard';
import {
  createEventStudioDefinitions,
  EventStudio,
  type EventStudioAdapter,
  type EventStudioResourceSources,
} from '@/blocks/app-kit/event-studio';
import type { EventStudioViewState } from '@/blocks/app-kit/event-studio/state';

const scope: AppScope = {
  endpointId: 'data',
  databaseId: 'registry-smoke',
  sessionPartition: 'anonymous-build-fixture',
  organizationId: 'org-smoke',
  schemaRevision: 'schema-v1',
  securityRevision: 'security-v1',
};

function resourceSource(tableName: string, graphQLTypeName: string): AppResourceSource {
  return {
    schemaName: 'app_public',
    tableName,
    graphQLTypeName,
    listFieldName: tableName.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    detailFieldName: graphQLTypeName[0]!.toLowerCase() + graphQLTypeName.slice(1),
    createMutationName: 'create' + graphQLTypeName,
    updateMutationName: 'update' + graphQLTypeName,
  };
}

const sources: EventStudioResourceSources = {
  programs: resourceSource('programs', 'Program'),
  sessions: resourceSource('sessions', 'Session'),
  people: resourceSource('people', 'Person'),
  venues: resourceSource('venues', 'Venue'),
  sessionPeople: resourceSource('session_people', 'SessionPerson'),
};

const emptyPage = {
  items: [],
  pageInfo: { page: 1, pageSize: 25, totalCount: 0, hasNextPage: false, hasPreviousPage: false },
};
const success = (data: unknown) => appSuccess(data) as never;
const adapter: EventStudioAdapter = {
  listPrograms: async () => success(emptyPage),
  getProgram: async () => success(null),
  searchPrograms: async () => success({ items: [], hasMore: false }),
  createProgram: async () => success(null),
  updateProgram: async () => success(null),
  listSessions: async () => success(emptyPage),
  getSession: async () => success(null),
  createSession: async () => success(null),
  listPeople: async () => success(emptyPage),
  getPerson: async () => success(null),
  createPerson: async () => success(null),
  updatePerson: async () => success(null),
  searchPeople: async () => success({ items: [], hasMore: false }),
  listVenues: async () => success(emptyPage),
  getVenue: async () => success(null),
  createVenue: async () => success(null),
  updateVenue: async () => success(null),
  listSessionPeople: async () => success([]),
  listSessionPersonLinks: async () => success([]),
  loadBoard: async () => success([]),
  loadCalendar: async () => success([]),
  loadSessionCount: async () => success({ value: 0 }),
  loadPublishedCount: async () => success({ value: 0 }),
  loadSessionsByStatus: async () => success({ rows: [] }),
  loadSessionsOverTime: async () => success({ rows: [] }),
  moveSession: async () => success(null),
  updateSession: async () => success(null),
  publishSession: async () => success(null),
  scheduleSession: async () => success(null),
  cancelSession: async () => success(null),
  linkPerson: async () => success(null),
  unlinkPerson: async () => success(null),
};
const definitions = createEventStudioDefinitions(sources, adapter);
const initialState: EventStudioViewState = {
  view: 'dashboard',
  collection: 'sessions',
  collectionState: DEFAULT_APP_COLLECTION_STATE,
  calendarMonth: { year: 2026, month: 8 },
  calendarView: 'month',
};
const initialLayout = createDefaultAppDashboardLayout([
  'session-count',
  'published-count',
  'sessions-by-status',
  'sessions-over-time',
]);

export function EventStudioRegistrySmokeConsumer() {
  const [queryClient] = React.useState(() => new QueryClient());
  const [state, setState] = React.useState(initialState);
  const [layout, setLayout] = React.useState(initialLayout);

  return (
    <AppKitProvider queryClient={queryClient} scope={scope}>
      <EventStudio
        analyticsInput={{ timeZone: 'UTC' }}
        dashboardLayout={layout}
        definitions={definitions}
        onDashboardLayoutChange={setLayout}
        onStateChange={setState}
        state={state}
        timeZone="UTC"
      />
    </AppKitProvider>
  );
}
`;

const cases: SmokeCase[] = [
	{
		name: 'button',
		expected: ['src/components/ui/button.tsx'],
	},
	{
		name: 'resizable',
		expected: ['src/components/ui/resizable.tsx'],
	},
	{
		name: 'overlays-default',
		items: [...overlayItems],
		expected: [
			...overlayItems.map((item) => `src/components/ui/${item}.tsx`),
			'src/components/ui/portal.tsx',
		],
	},
	{
		name: 'overlays-custom',
		customAliases: true,
		items: [...overlayItems],
		expected: [
			...overlayItems.map((item) => `src/design-system/primitives/${item}.tsx`),
			'src/design-system/primitives/portal.tsx',
		],
	},
	{
		name: 'ai',
		assertExactPackages: true,
		assertExactSource: true,
		consumer: `'use client';

import { Message, MessageContent, PromptInput, Tool } from '~/design-system/primitives/ai';

export function AiRegistrySmokeConsumer() {
	return (
		<PromptInput onSubmit={() => undefined}>
			<Message from="assistant">
				<MessageContent>Installed from the Constructive registry.</MessageContent>
			</Message>
			<Tool name="registry-smoke" status="completed" />
		</PromptInput>
	);
}
`,
		customAliases: true,
		expected: [
			...aiFiles.map((file) => `src/design-system/primitives/ai/${file}`),
			'src/design-system/primitives/alert.tsx',
			'src/design-system/primitives/avatar.tsx',
			'src/design-system/primitives/badge.tsx',
			'src/design-system/primitives/button.tsx',
			'src/design-system/primitives/collapsible.tsx',
			'src/design-system/primitives/portal.tsx',
			'src/design-system/primitives/tooltip.tsx',
			'src/shared/slot.tsx',
			'src/shared/utils.ts',
		],
		expectedCss: [...aiCssFragments],
		expectedPackages: [
			'@base-ui/react',
			'class-variance-authority',
			'clsx',
			'lucide-react',
			'sugar-high',
			'tailwind-merge',
		],
		expectedServerFiles: [
			'src/design-system/primitives/ai/format-duration.ts',
			'src/design-system/primitives/ai/index.ts',
			'src/design-system/primitives/ai/types.ts',
		],
		strictNullChecks: true,
	},
	{
		name: 'stack',
		customAliases: true,
		expected: [
			'src/design-system/primitives/stack/index.ts',
			'src/design-system/primitives/stack/deferred-card-content.tsx',
			'src/design-system/primitives/stack/stack-card.tsx',
		],
	},
	{
		name: 'app-shell',
		expected: ['src/components/ui/app-shell.tsx', 'src/components/ui/app-bar.tsx'],
	},
	{
		name: 'org-chart',
		expected: [
			'src/components/ui/org-chart/index.ts',
			'src/components/ui/org-chart/org-chart.tsx',
			'src/components/ui/org-chart/org-chart-context.tsx',
			'src/components/ui/org-chart/org-chart-node.tsx',
			'src/components/ui/org-chart/org-chart-edge.tsx',
			'src/components/ui/org-chart/org-chart-empty.tsx',
			'src/components/ui/org-chart/layout.ts',
			'src/components/ui/org-chart/org-chart-utils.ts',
			'src/components/ui/org-chart/org-chart.types.ts',
		],
	},
	{
		name: 'storage-browser',
		expected: [
			'src/components/ui/storage/index.ts',
			'src/components/ui/storage/types.ts',
			'src/components/ui/storage/utils.ts',
			'src/components/ui/storage/file-type-icon.tsx',
			'src/components/ui/storage/visibility-badge.tsx',
			'src/components/ui/storage/storage-breadcrumb.tsx',
			'src/components/ui/storage/object-toolbar.tsx',
			'src/components/ui/storage/bucket-rail.tsx',
			'src/components/ui/storage/object-table.tsx',
			'src/components/ui/storage/upload-dropzone.tsx',
			'src/components/ui/storage/object-detail-sheet.tsx',
			'src/components/ui/storage/bucket-config-sheet.tsx',
			'src/components/ui/storage/storage-empty-state.tsx',
			'src/components/ui/storage/storage-browser.tsx',
		],
	},
	{
		name: 'sheets',
		expectedPackages: ['@constructive-io/data'],
		forbiddenPackages: ['@constructive-io/sheets'],
		expected: [
			'src/components/ui/sheets/index.ts',
			'src/components/ui/sheets/context/sheets-provider.tsx',
			'src/components/ui/sheets/grid/sheets.tsx',
		],
	},
	{
		name: 'schema-builder',
		customAliases: true,
		expectedPackages: ['@constructive-io/data'],
		forbiddenPackages: ['@constructive-io/sheets'],
		expected: [
			'src/components/schema-builder/index.ts',
			'src/components/schema-builder/components/schema-builder.tsx',
			'src/components/schema-builder/core/context.tsx',
		],
	},
	{
		name: 'command-palette',
		expectedPackages: ['@constructive-io/command-palette'],
		expected: [
			'src/blocks/command-palette/command-palette.tsx',
			'src/blocks/command-palette/kbd-shortcut.tsx',
			'src/blocks/command-palette/multi-step/multi-step-view.tsx',
			'src/blocks/command-palette/multi-step/step-indicator.tsx',
			'src/blocks/command-palette/background/background-task-stack.tsx',
			'src/blocks/command-palette/background/inline-task-bar.tsx',
			'src/blocks/command-palette/background/task-card.tsx',
			'src/blocks/command-palette/background/task-icons.tsx',
			'src/components/ui/badge.tsx',
			'src/components/ui/button.tsx',
			'src/components/ui/command.tsx',
			'src/components/ui/portal.tsx',
			'src/components/ui/separator.tsx',
			'src/lib/utils.ts',
		],
	},
	{
		name: 'console-kit-core',
		expectedPackages: ['@constructive-io/data', 'zustand'],
		forbiddenPackages: ['@constructive-io/sheets'],
		expected: [...consoleCoreFiles],
		forbidden: [
			...featurePackIds.map(featurePackManifest),
			presetManifest('blank'),
			presetManifest('auth-hardened'),
			presetManifest('b2b-storage'),
			presetManifest('full'),
		],
	},
	...appKitCapabilityCases,
	{
		name: 'app-kit-event-studio-next16',
		items: ['app-kit-event-studio'],
		consumer: eventStudioNextConsumer,
		expected: [...appKitFiles['app-kit-event-studio']],
		expectedPackages: appKitExpectedPackages('app-kit-event-studio'),
		expectedPackageVersions: appKitExpectedPackageVersions('app-kit-event-studio'),
		expectedServerFiles: [
			'src/blocks/app-kit/event-studio/definitions.ts',
			'src/blocks/app-kit/event-studio/state.ts',
		],
		forbiddenPackages: ['@constructive-io/sheets', 'zustand'],
		nextApp: true,
		strictNullChecks: true,
	},
	...standaloneFeaturePackCases,
	...consoleModuleCases,
	...presetCases,
	{
		name: 'console-kit-nextjs',
		expectedPackages: [
			'@constructive-io/data',
			'zustand',
		],
		forbiddenPackages: ['@constructive-io/sheets'],
		expected: [
			...consoleModuleClosure(featurePackIds),
			'src/blocks/presets/full-console-kit.tsx',
			presetManifest('full'),
			'src/blocks/console-kit/constructive/index.ts',
		],
		forbidden: [
			presetManifest('blank'),
			presetManifest('auth-hardened'),
			presetManifest('b2b-storage'),
		],
	},
	{
		name: 'billing-usage-overview',
		expected: [
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-usage-overview/billing-usage-overview.tsx',
			'src/blocks/billing/billing-usage-overview/messages.ts',
		],
	},
	{
		name: 'billing-credits-card',
		expected: [
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-credits-card/billing-credits-card.tsx',
			'src/blocks/billing/billing-credits-card/messages.ts',
		],
	},
	{
		name: 'billing-settings-page',
		customAliases: true,
		expected: [
			'src/blocks/billing/billing-settings-page/billing-settings-page.tsx',
			'src/blocks/billing/billing-settings-page/messages.ts',
			'src/blocks/billing/billing-activity-table/billing-activity-table.tsx',
			'src/blocks/billing/billing-activity-table/messages.ts',
			'src/blocks/billing/billing-contracts/billing-contracts.ts',
			'src/blocks/billing/billing-ui/billing-ui.tsx',
			'src/blocks/billing/billing-credits-card/billing-credits-card.tsx',
			'src/blocks/billing/billing-credits-card/messages.ts',
			'src/blocks/billing/billing-entitlements-list/billing-entitlements-list.tsx',
			'src/blocks/billing/billing-entitlements-list/messages.ts',
			'src/blocks/billing/billing-pricing-table/billing-pricing-table.tsx',
			'src/blocks/billing/billing-pricing-table/messages.ts',
			'src/blocks/billing/billing-subscription-card/billing-subscription-card.tsx',
			'src/blocks/billing/billing-subscription-card/messages.ts',
			'src/blocks/billing/billing-usage-history/billing-usage-history.tsx',
			'src/blocks/billing/billing-usage-history/messages.ts',
			'src/blocks/billing/billing-usage-overview/billing-usage-overview.tsx',
			'src/blocks/billing/billing-usage-overview/messages.ts',
			'src/design-system/primitives/alert.tsx',
			'src/design-system/primitives/badge.tsx',
			'src/design-system/primitives/button.tsx',
			'src/design-system/primitives/card.tsx',
			'src/design-system/primitives/field.tsx',
			'src/design-system/primitives/label.tsx',
			'src/design-system/primitives/pagination.tsx',
			'src/design-system/primitives/portal.tsx',
			'src/design-system/primitives/progress.tsx',
			'src/design-system/primitives/select.tsx',
			'src/design-system/primitives/separator.tsx',
			'src/design-system/primitives/sheet.tsx',
			'src/design-system/primitives/skeleton.tsx',
			'src/design-system/primitives/table.tsx',
			'src/design-system/primitives/tabs.tsx',
			'src/design-system/primitives/tooltip.tsx',
			'src/react/use-controllable-state.ts',
			'src/shared/motion/motion-config.ts',
			'src/shared/slot.tsx',
			'src/shared/utils.ts',
		],
	},
];
const requestedCases = process.env.SMOKE_CASE?.split(',').map((value) => value.trim()).filter(Boolean);
const selectedCases = requestedCases
	? cases.filter((testCase) => requestedCases.includes(testCase.name))
	: cases;
if (requestedCases && selectedCases.length !== new Set(requestedCases).size) {
	const knownCases = new Set(cases.map((testCase) => testCase.name));
	const unknownCases = requestedCases.filter((name) => !knownCases.has(name));
	throw new Error(`Unknown SMOKE_CASE: ${unknownCases.join(', ')}`);
}

function write(root: string, relativePath: string, contents: string): void {
	const target = path.join(root, relativePath);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, contents);
}

function prepareConsumer(
	root: string,
	origin: string,
	testCase: SmokeCase,
	packageRegistryOrigin?: string,
): void {
	const packageJson = {
		name: `registry-smoke-${testCase.name}`,
		private: true,
		version: '0.0.0',
		dependencies: {
			...(testCase.nextApp ? { next: '16.2.12' } : {}),
			react: '19.2.0',
			'react-dom': '19.2.0',
		},
		devDependencies: {
			...(testCase.nextApp
				? { '@axe-core/playwright': '4.12.1', '@playwright/test': '1.61.1' }
				: {}),
			'@tailwindcss/postcss': '4.1.18',
			'@types/node': '^24.10.1',
			'@types/react': '^19.2.0',
			'@types/react-dom': '^19.2.0',
			postcss: '^8.5.6',
			tailwindcss: '4.1.18',
			typescript: '^5.9.3',
		},
	};
	write(root, 'package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
	write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9.0\n');
	if (packageRegistryOrigin) {
		write(
			root,
			'.npmrc',
			`@constructive-io:registry=${packageRegistryOrigin}\nauto-install-peers=true\n`,
		);
	}

	const pathAliases = testCase.customAliases
		? { '~/*': ['./src/*'] }
		: { '@/*': ['./src/*'] };
	write(
		root,
		'tsconfig.json',
		`${JSON.stringify(
			{
				compilerOptions: {
					allowSyntheticDefaultImports: true,
					baseUrl: '.',
					esModuleInterop: true,
					isolatedModules: true,
					jsx: 'react-jsx',
					lib: ['ES2022', 'DOM', 'DOM.Iterable'],
					module: 'ESNext',
					moduleResolution: 'Bundler',
					noEmit: true,
					paths: pathAliases,
					resolveJsonModule: true,
					skipLibCheck: true,
					strict: true,
					strictNullChecks: testCase.strictNullChecks ?? false,
					target: 'ES2022',
				},
				include: ['src/**/*.ts', 'src/**/*.tsx'],
			},
			null,
			2,
		)}\n`,
	);
	write(root, 'src/app/globals.css', '@import "tailwindcss";\n');
	if (testCase.consumer) write(root, 'src/registry-smoke-consumer.tsx', testCase.consumer);
	if (testCase.nextApp) {
		write(
			root,
			'src/app/layout.tsx',
			`import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: 'Event Studio registry smoke' };

export default function RootLayout({ children }: { children: ReactNode }) {
	return <html lang="en"><body>{children}</body></html>;
}
`,
		);
		write(
			root,
			'src/app/page.tsx',
			`import { EventStudioRegistrySmokeConsumer } from '../registry-smoke-consumer';

export default function Page() {
	return <EventStudioRegistrySmokeConsumer />;
}
`,
		);
		write(root, 'next-env.d.ts', '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
		write(
			root,
			'playwright.config.ts',
			`export default {
	testDir: './e2e',
	use: { baseURL: process.env.BASE_URL },
};
`,
		);
		write(
			root,
			'e2e/hydration.spec.ts',
			`import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Event Studio hydrates in a production App Router build', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/');
	await expect(page.locator('[data-app-kit-starter="event-studio"]')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Event Studio' })).toBeVisible();
	await expect(page.getByText('Explicit count query')).toBeVisible();
	const dashboardA11y = await new AxeBuilder({ page }).analyze();
	expect(dashboardA11y.violations).toEqual([]);
	await page.getByRole('tab', { name: 'Collections' }).click();
	await expect(page.getByRole('tab', { name: 'Collections' })).toHaveAttribute('aria-selected', 'true');
	const collectionA11y = await new AxeBuilder({ page }).analyze();
	expect(collectionA11y.violations).toEqual([]);
	expect(errors).toEqual([]);
});

test('Event Studio keeps primary navigation usable on mobile with reduced motion', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await page.getByRole('tab', { name: 'Schedule' }).click();
	await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByLabel('Schedule').getByText('UTC', { exact: true })).toBeVisible();
	const hasDocumentOverflow = await page.evaluate(() =>
		document.documentElement.scrollWidth > window.innerWidth
	);
	expect(hasDocumentOverflow).toBe(false);
});
`,
		);
	}

	const aliases = testCase.customAliases
		? {
			components: '~/components',
			utils: '~/shared/utils',
			ui: '~/design-system/primitives',
			lib: '~/shared',
			hooks: '~/react',
		}
		: {
			components: '@/components',
			utils: '@/lib/utils',
			ui: '@/components/ui',
			lib: '@/lib',
			hooks: '@/hooks',
		};
	write(
		root,
		'components.json',
		`${JSON.stringify(
			{
				$schema: 'https://ui.shadcn.com/schema.json',
				style: 'base-nova',
				rsc: true,
				tsx: true,
				tailwind: {
					config: '',
					css: 'src/app/globals.css',
					baseColor: 'neutral',
					cssVariables: true,
					prefix: '',
				},
				aliases,
				registries: { '@constructive': `${origin}/r/{name}.json` },
			},
			null,
			2,
		)}\n`,
	);
}

async function run(
	command: string,
	arguments_: string[],
	cwd: string,
	description: string,
	environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
	const exitCode = await new Promise<number>((resolve, reject) => {
		const child = spawn(command, arguments_, { cwd, env: environment, stdio: 'inherit' });
		child.on('error', reject);
		child.on('exit', (code) => resolve(code ?? 1));
	});
	if (exitCode !== 0) throw new Error(`${description} exited with code ${exitCode}.`);
}

async function startPackageRegistry(): Promise<{
	origin: string;
	close: () => Promise<void>;
}> {
	const artifacts = path.join(repositoryRoot, '.artifacts', 'npm');
	fs.mkdirSync(artifacts, { recursive: true });
	const packageDirectories = ['packages/data', 'packages/command-palette'] as const;
	if (process.env.SMOKE_REUSE_PACKED_ARTIFACTS === '1') {
		for (const packageDirectory of packageDirectories) {
			const manifest = JSON.parse(
				fs.readFileSync(path.join(repositoryRoot, packageDirectory, 'package.json'), 'utf8'),
			) as { name: string; version: string };
			const tarballName = `${manifest.name.slice(1).replace('/', '-')}-${manifest.version}.tgz`;
			if (!fs.existsSync(path.join(artifacts, tarballName))) {
				throw new Error(`Missing verified package artifact ${tarballName}; run pnpm pack:check first.`);
			}
		}
	} else {
		for (const packageDirectory of packageDirectories) {
			const manifest = JSON.parse(
				fs.readFileSync(path.join(repositoryRoot, packageDirectory, 'package.json'), 'utf8'),
			) as { name: string };
			await run(
				'pnpm',
				['--filter', manifest.name, 'build'],
				repositoryRoot,
				`${manifest.name} local registry build`,
			);
			await run(
				'pnpm',
				['--filter', manifest.name, 'pack', '--pack-destination', artifacts],
				repositoryRoot,
				`${manifest.name} local registry pack`,
				{ ...process.env, npm_config_ignore_scripts: 'true' },
			);
		}
	}

	const child = spawn(
		process.execPath,
		['--import', 'tsx', path.join(repositoryRoot, 'scripts', 'serve-local-registry.ts')],
		{
			cwd: repositoryRoot,
			env: {
				...process.env,
				LOCAL_NPM_REGISTRY_PORT: '0',
				LOCAL_NPM_REGISTRY_PACKAGE_DIRECTORIES:
					packageDirectories.join(','),
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);
	child.stderr.pipe(process.stderr);
	const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
	let output = '';
	let ready = false;
	const origin = await new Promise<string>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => {
			if (!ready) reject(new Error(`Local package registry exited before startup with code ${code}.`));
		});
		child.stdout.on('data', (chunk: Buffer) => {
			const text = chunk.toString();
			process.stdout.write(text);
			output += text;
			const match = output.match(/Local package registry listening on (http:\/\/[^\s]+)/);
			if (match?.[1] && !ready) {
				ready = true;
				resolve(match[1]);
			}
		});
	});

	return {
		origin,
		close: async () => {
			if (child.exitCode === null) child.kill('SIGTERM');
			await exited;
		},
	};
}

async function install(root: string, itemNames: readonly string[]): Promise<void> {
	await run(
		'pnpm',
		['exec', 'shadcn', 'add', ...itemNames.map((itemName) => `@constructive/${itemName}`), '--cwd', root, '--yes'],
		appDirectory,
		`pnpm dlx shadcn@latest add ${itemNames.map((itemName) => `@constructive/${itemName}`).join(' ')}`,
	);
}

async function typecheck(root: string, itemName: string): Promise<void> {
	await run('pnpm', ['exec', 'tsc', '--pretty', 'false', '-p', 'tsconfig.json'], root, `${itemName} typecheck`);
}

async function reservePort(): Promise<number> {
	const probe = http.createServer();
	await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
	const address = probe.address();
	if (!address || typeof address === 'string') throw new Error('Unable to reserve a Next.js smoke port.');
	await new Promise<void>((resolve) => probe.close(() => resolve()));
	return address.port;
}

async function waitForHttp(origin: string, exited: Promise<never>): Promise<void> {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const ready = await Promise.race([
			new Promise<boolean>((resolve) => {
				const request = http.get(origin, (response) => {
					response.resume();
					resolve(response.statusCode === 200);
				});
				request.on('error', () => resolve(false));
			}),
			exited,
		]);
		if (ready) return;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`Next.js smoke server did not become ready at ${origin}.`);
}

async function verifyNextApp(root: string, testCase: SmokeCase): Promise<void> {
	await run(
		'pnpm',
		['exec', 'next', 'build'],
		root,
		`${testCase.name} Next.js 16 production build`,
		{ ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
	);
	const port = await reservePort();
	const origin = `http://127.0.0.1:${port}`;
	const child = spawn(
		'pnpm',
		['exec', 'next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
		{
			cwd: root,
			env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	const exited = new Promise<never>((_, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => reject(new Error(`Next.js smoke server exited with code ${code ?? 'unknown'}.`)));
	});

	try {
		await waitForHttp(origin, exited);
		await run(
			'pnpm',
			['exec', 'playwright', 'test', '--reporter=line'],
			root,
			`${testCase.name} production hydration`,
			{ ...process.env, BASE_URL: origin },
		);
	} finally {
		if (child.exitCode === null) child.kill('SIGTERM');
	}
}

async function compileTailwind(root: string, testCase: SmokeCase): Promise<void> {
	const hasSheetsSource = testCase.expected.some((file) => file.includes('/sheets/')) ||
		testCase.name === 'feature-pack-data' ||
		testCase.name === 'console-module-data' ||
		testCase.name.startsWith('preset-') ||
		testCase.name === 'console-kit-nextjs';
	const expected = [
		'.shadow-card-lg',
		'.scrollbar-hide',
		'.animate-shimmer',
		'@keyframes shimmer',
		'@media (prefers-reduced-motion: reduce)',
		...(hasSheetsSource
			? ['.w-\\[52px\\]']
			: []),
		...(testCase.expectedCss ?? []),
	];
	const program = [
		"const fs = require('node:fs')",
		"const postcss = require('postcss')",
		"const tailwind = require('@tailwindcss/postcss')",
		"const css = fs.readFileSync('src/app/globals.css', 'utf8')",
		`const expected = ${JSON.stringify(expected)}`,
		"postcss([tailwind()]).process(css, { from: 'src/app/globals.css' }).then((result) => { for (const fragment of expected) { if (!result.css.includes(fragment)) throw new Error('Compiled Tailwind CSS is missing ' + fragment) } }).catch((error) => { console.error(error); process.exitCode = 1 })",
	].join(';');
	await run('node', ['-e', program], root, `${testCase.name} Tailwind compilation`);
}

function walk(root: string): string[] {
	if (!fs.existsSync(root)) return [];
	return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(root, entry.name);
		return entry.isDirectory() ? walk(target) : [target];
	});
}

function assertInstalled(root: string, testCase: SmokeCase): void {
	const packageJsonPath = path.join(root, 'package.json');
	const packageJsonSource = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonSource) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	if (packageJsonSource.includes('@constructive-io/ui')) {
		throw new Error(`@constructive/${testCase.name} installed @constructive-io/ui.`);
	}
	if (packageJsonSource.includes('@constructive-io/sheets')) {
		throw new Error(`@constructive/${testCase.name} installed @constructive-io/sheets.`);
	}
	if (packageJsonSource.includes('tw-animate-css')) {
		throw new Error(`@constructive/${testCase.name} installed tw-animate-css.`);
	}
	for (const packageName of testCase.expectedPackages ?? []) {
		if (!packageJson.dependencies?.[packageName] && !packageJson.devDependencies?.[packageName]) {
			throw new Error(`@constructive/${testCase.name} did not install ${packageName}.`);
		}
	}
	for (const [packageName, expectedVersion] of Object.entries(testCase.expectedPackageVersions ?? {})) {
		const installedVersion = packageJson.dependencies?.[packageName]
			?? packageJson.devDependencies?.[packageName];
		if (installedVersion !== expectedVersion) {
			throw new Error(
				`@constructive/${testCase.name} expected ${packageName}@${expectedVersion}, received ${installedVersion ?? 'missing'}.`,
			);
		}
	}
	for (const packageName of testCase.forbiddenPackages ?? []) {
		if (packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]) {
			throw new Error(`@constructive/${testCase.name} unexpectedly installed ${packageName}.`);
		}
	}
	if (testCase.assertExactPackages) {
		const actualPackages = new Set(
			Object.keys(packageJson.dependencies ?? {}).filter(
				(packageName) => packageName !== 'react' && packageName !== 'react-dom',
			),
		);
		const expectedPackages = new Set(testCase.expectedPackages ?? []);
		const missing = [...expectedPackages].filter((packageName) => !actualPackages.has(packageName));
		const unexpected = [...actualPackages].filter((packageName) => !expectedPackages.has(packageName));
		if (missing.length > 0 || unexpected.length > 0) {
			throw new Error(
				`@constructive/${testCase.name} dependency closure drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
			);
		}
	}

	for (const relativePath of testCase.expected) {
		if (!fs.existsSync(path.join(root, relativePath))) {
			throw new Error(`@constructive/${testCase.name} did not create ${relativePath}.`);
		}
	}
	for (const relativePath of testCase.expectedServerFiles ?? []) {
		const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
		if (/^\s*['"]use client['"];?/.test(source)) {
			throw new Error(`@constructive/${testCase.name} made pure module ${relativePath} client-only.`);
		}
	}
	for (const relativePath of testCase.forbidden ?? []) {
		if (fs.existsSync(path.join(root, relativePath))) {
			throw new Error(`@constructive/${testCase.name} unexpectedly created ${relativePath}.`);
		}
	}
	if (testCase.assertExactSource) {
		const expectedSource = new Set([
			...testCase.expected.filter((relativePath) => relativePath.startsWith('src/')),
			'src/app/globals.css',
			...(testCase.consumer ? ['src/registry-smoke-consumer.tsx'] : []),
		]);
		const actualSource = new Set(
			walk(path.join(root, 'src')).map((file) => path.relative(root, file)),
		);
		const missing = [...expectedSource].filter((file) => !actualSource.has(file));
		const unexpected = [...actualSource].filter((file) => !expectedSource.has(file));
		if (missing.length > 0 || unexpected.length > 0) {
			throw new Error(
				`@constructive/${testCase.name} source closure drifted. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
			);
		}
	}
	if (fs.existsSync(path.join(root, 'src', '.constructive'))) {
		throw new Error(`@constructive/${testCase.name} installed Constructive metadata under src/.constructive.`);
	}
	const requirementsFiles = walk(path.join(root, '.constructive')).filter((file) =>
		file.endsWith('.requires.json'),
	);
	if (requirementsFiles.length > 0) {
		throw new Error(
			`@constructive/${testCase.name} installed obsolete generated-SDK sidecars: ${requirementsFiles
				.map((file) => path.relative(root, file))
				.join(', ')}.`,
		);
	}

	const inspectedFiles = [
		...walk(path.join(root, 'src')).filter((entry) => /\.[cm]?[jt]sx?$/.test(entry)),
		path.join(root, 'src/app/globals.css'),
	];
	for (const file of inspectedFiles) {
		const source = fs.readFileSync(file, 'utf8');
		if (source.includes('@constructive-io/ui')) {
			throw new Error(`@constructive/${testCase.name} left @constructive-io/ui in ${file}.`);
		}
		if (source.includes('tw-animate-css')) {
			throw new Error(`@constructive/${testCase.name} left tw-animate-css in ${file}.`);
		}
		if (source.includes('registry/constructive')) {
			throw new Error(`@constructive/${testCase.name} left a registry-internal path in ${file}.`);
		}
		if (/['"]@schema-builder\//.test(source)) {
			throw new Error(`@constructive/${testCase.name} left an unshipped @schema-builder alias in ${file}.`);
		}
	}

	const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
	if (!css.includes('--background')) {
		throw new Error(`@constructive/${testCase.name} did not install Constructive theme variables.`);
	}
	for (const fragment of [
		'@layer base {',
		'@layer utilities {',
		'@keyframes shimmer {',
		'.shadow-card-lg {',
		'.scrollbar-hide {',
		'@media (prefers-reduced-motion: reduce) {',
		...(testCase.expectedCss ?? []),
	]) {
		if (!css.includes(fragment)) {
			throw new Error(`@constructive/${testCase.name} installed an incomplete theme missing ${fragment}.`);
		}
	}
	if (/@(?:layer\s+(?:base|utilities)|keyframes\s+[\w-]+)\s*;/.test(css)) {
		throw new Error(`@constructive/${testCase.name} installed an empty theme at-rule.`);
	}
}

const server = http.createServer((request, response) => {
	const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
	const filePath = path.resolve(publicDirectory, `.${requestPath}`);
	if (!filePath.startsWith(`${publicDirectory}${path.sep}`) || !fs.existsSync(filePath)) {
		response.writeHead(404).end('Not found');
		return;
	}
	response.setHeader('content-type', 'application/json');
	fs.createReadStream(filePath).pipe(response);
});

const packageRegistry = selectedCases.some((testCase) =>
	testCase.expectedPackages?.some((packageName) => packageName.startsWith('@constructive-io/')),
)
	? await startPackageRegistry()
	: undefined;
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start registry smoke server.');
const origin = `http://127.0.0.1:${address.port}`;

try {
	for (const testCase of selectedCases) {
		const root = path.join(temporaryRoot, testCase.name);
		const itemNames = testCase.items ?? [testCase.name];
		prepareConsumer(root, origin, testCase, packageRegistry?.origin);
		await install(root, itemNames);
		assertInstalled(root, testCase);
		await typecheck(root, testCase.name);
		await compileTailwind(root, testCase);
		if (testCase.nextApp) await verifyNextApp(root, testCase);
		const installKind = testCase.expectedPackages?.length ? 'package-backed' : 'package-free';
		console.log(`Clean ${installKind} install passed: ${itemNames.map((itemName) => `@constructive/${itemName}`).join(', ')}.`);
	}
} finally {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	await packageRegistry?.close();
	fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
