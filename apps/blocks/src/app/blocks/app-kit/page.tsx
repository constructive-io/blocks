import type { Metadata } from 'next';

import { Badge } from '@constructive-io/ui/badge';

import { ApplicationDocPagination } from '@/components/docs/application-doc-pagination';
import { CodeBlock } from '@/components/docs/code-block';
import { APP_KIT_CATALOG } from '@/lib/app-kit-catalog';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Constructive App Kit';
const DESCRIPTION =
  'A source-installed application-composition layer for building arbitrary Constructive-native apps from typed resources, queries, actions, and domain-neutral views.';

const ROOT_INSTALLS = APP_KIT_CATALOG
  .filter(({ name }) => name !== 'app-kit-event-studio')
  .map(({ name }) => registryAdd(name))
  .join('\n');

const CORE_ENTRYPOINTS = `// Server-safe definitions and build-time validation
import {
  defineAction,
  defineQuery,
  defineResource,
  validateAppResource,
  type AppScope,
} from '@/blocks/app-kit/core'

// Client-only TanStack Query runtime
import {
  AppKitProvider,
  useAppAction,
  useAppQuery,
} from '@/blocks/app-kit/core/runtime'`;

const SCOPE_EXAMPLE = `const scope: AppScope = {
  endpointId: 'data',
  databaseId,
  sessionPartition: authenticatedSession.id,
  organizationId,
  schemaRevision,
  securityRevision,
}

// Tokens, cookies, headers, and CSRF values stay in the injected transport.
// They never belong in AppScope, definitions, URLs, stores, or query keys.`;

const VIEW_CONTRACTS = [
  ['Records', 'AppDataTable · AppDataList · AppDataCards · AppRecordDetail · AppRecordForm', 'ConnectedAppDataTable · ConnectedAppDataList · ConnectedAppDataCards · ConnectedAppRecordDetail · ConnectedAppRecordForm'],
  ['Relations', 'AppRelationPicker · AppRelationPanel', 'ConnectedAppRelationPicker · ConnectedAppRelationPanel'],
  ['Board', 'AppBoard', 'ConnectedAppBoard'],
  ['Dashboard', 'AppDashboard', 'ConnectedAppDashboard · PersistedAppDashboard'],
  ['Calendar', 'AppCalendar', 'ConnectedAppCalendar'],
  ['Actions', 'AppActionButton · AppActionMenu · AppActionDialog · AppBulkActionBar', 'ConnectedAppActionButton · ConnectedAppActionMenu · ConnectedAppActionDialog · ConnectedAppBulkActionBar'],
] as const;

const SELECTIONS = [
  {
    shape: 'Records and collections',
    geometry: 'Table, list, cards, detail, forms, relations',
    root: 'app-kit-data',
  },
  {
    shape: 'Categorical state',
    geometry: 'Board columns with a semantic move action',
    root: 'app-kit-board',
  },
  {
    shape: 'Analytical results',
    geometry: 'KPI, bar, line, and breakdown widgets',
    root: 'app-kit-dashboard',
  },
  {
    shape: 'Time-bounded records',
    geometry: 'Localized month and agenda views',
    root: 'app-kit-calendar',
  },
  {
    shape: 'Application commands',
    geometry: 'Buttons, menus, dialogs, bulk actions, and steppers',
    root: 'app-kit-workflow',
  },
] as const;

export default function AppKitPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application composition</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold sm:text-[1.75rem]">
          Constructive App Kit
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Console Kit, Sheets, Stack navigation, and platform feature
          packs remain optional capabilities that you add when the application
          needs them.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <section aria-labelledby="app-kit-model">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-model" className="text-lg font-semibold">
              One resource model, independently installed views
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Server-safe definitions describe identity, final GraphQL fields,
              loaders, forms, relations, and available actions. Client entrypoints
              bind them to TanStack Query and controlled views; credentials stay in
              host closures and never enter definitions, URLs, stores, or cache keys.
            </p>
          </div>

          <ol className="grid gap-2 md:grid-cols-3">
            {[
              ['01', 'Validate', 'Reconcile _meta database facts with final executable GraphQL introspection during generation or build.'],
              ['02', 'Bind', 'Partition loaders and mutations with endpoint, database, session, organization, and schema revision scope.'],
              ['03', 'Compose', 'Choose controlled view geometry from the data shape and workflow, then let the host own routing and shareable state.'],
            ].map(([step, title, body]) => (
              <li key={step} className="rounded-xl border border-border/60 bg-card p-4">
                <span className="font-mono text-xs text-primary">{step}</span>
                <h3 className="mt-2 text-sm font-medium text-foreground">{title}</h3>
                <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="app-kit-contract-reference">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-contract-reference" className="text-lg font-semibold">
              Public contract reference
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Definitions and validation stay importable from a server module. The
              runtime has its own client entrypoint, so a generator can validate a
              resource without pulling React or a provider into server code.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock label="Entrypoints">{CORE_ENTRYPOINTS}</CodeBlock>
            <CodeBlock label="Secret-free application scope">{SCOPE_EXAMPLE}</CodeBlock>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Family</th>
                  <th scope="col" className="px-4 py-3 font-medium">Controlled component</th>
                  <th scope="col" className="px-4 py-3 font-medium">Connected wrapper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {VIEW_CONTRACTS.map(([family, controlled, connected]) => (
                  <tr key={family}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">{family}</th>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">{controlled}</td>
                    <td className="px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">{connected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Resource definition</h3>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                <code className="font-mono text-foreground">defineResource()</code>{' '}
                binds database and final GraphQL names, ordered identity fields,
                display fields, relations, list/detail queries, operation-specific
                forms, and semantic actions.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Query definition</h3>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                <code className="font-mono text-foreground">defineQuery()</code>{' '}
                receives typed input, the active scope, and an AbortSignal. It may
                return a record, collection page, relation search page, range, total,
                or purpose-built analytical payload.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">Action definition</h3>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                <code className="font-mono text-foreground">defineAction()</code>{' '}
                owns transformed validation, input-aware presentation policy,
                confirmation, abortable execution, targeted invalidation, and
                optional optimistic apply, settle, and rollback behavior.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="app-kit-roots">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-roots" className="text-lg font-semibold">
              Install only the roots the application uses
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              This catalog is projected from the same versioned{' '}
              <code className="font-mono text-foreground">meta.constructive</code>{' '}
              contract validated during registry compilation and pinned by the
              Constructive Blocks skill.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {APP_KIT_CATALOG.map((item) => (
              <li key={item.name} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                      @constructive/{item.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{item.metadata.kind}</Badge>
                    <Badge variant="secondary">{item.metadata.boundary}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-pretty text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-3 border-t border-border/60 pt-3 font-mono text-[11px] leading-5 text-foreground">
                  {item.metadata.capabilities.join(' · ')}
                </p>
              </li>
            ))}
          </ul>

          <CodeBlock className="mt-4" label="Install roots independently">
            {ROOT_INSTALLS}
          </CodeBlock>
        </section>

        <section aria-labelledby="app-kit-selection">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-selection" className="text-lg font-semibold">
              Select by shape, geometry, and workflow
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Department names do not determine composition. Start from what the
              query returns, how people need to inspect it, and which server action
              changes it.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Data shape</th>
                  <th scope="col" className="px-4 py-3 font-medium">Presentation geometry</th>
                  <th scope="col" className="px-4 py-3 font-medium">Root</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {SELECTIONS.map((selection) => (
                  <tr key={selection.root}>
                    <td className="px-4 py-3 text-foreground">{selection.shape}</td>
                    <td className="px-4 py-3 text-muted-foreground">{selection.geometry}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{selection.root}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="app-kit-schema-contract">
          <div className="mb-4 max-w-3xl">
            <h2 id="app-kit-schema-contract" className="text-lg font-semibold">
              Schema and form compatibility
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              <code className="font-mono text-foreground">validateAppResource()</code>{' '}
              compares the declared PostgreSQL names and facts with final GraphQL
              type, field, relation, identity, nullability, list shape, enum, and
              operation evidence. Its result reports separate read, create, update,
              and delete capabilities plus field-level issues; it never grants an
              operation or introspects at runtime.
            </p>
          </div>
          <ul className="grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
            <li className="rounded-xl border border-border/60 bg-card p-4">
              String, integer, float, boolean, date, datetime, enum, and scalar-array
              fields have generated presentation. JSON and unknown custom scalars
              remain read-only until a renderer is supplied.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Resource forms declare ordered create and update fields separately.
              Required presentation may tighten a nullable field for one workflow,
              but it cannot weaken database or executable-schema requirements.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Missing or ambiguous identity disables writes. Composite identity
              keeps its declared field order, and relation pickers link existing
              records through server search rather than nested creation.
            </li>
          </ul>
        </section>

        <section aria-labelledby="event-studio-starter">
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="event-studio-starter" className="text-lg font-semibold">Event Studio starter</h2>
              <Badge>Page-scale recipe</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-pretty text-sm leading-7 text-muted-foreground">
              Event Studio composes org-scoped programs, sessions, people, venues,
              and the explicit session_people relation into analytical widgets, a
              semantic session board, month and agenda schedules, searchable
              collections, details, forms, relations, and publish or schedule
              actions. The paired skill recipe provisions through the supported B2B
              blueprint path, so the starter contains no raw SQL.
            </p>
            <p className="mt-2 max-w-3xl text-pretty text-xs leading-5 text-muted-foreground">
              It is an opt-in proof application and integration fixture. No App
              Kit capability root depends on it, and ordinary application
              composition should select the smaller roots above.
            </p>
            <CodeBlock className="mt-4" label="Install the complete starter">
              {registryAdd('app-kit-event-studio')}
            </CodeBlock>
          </div>
        </section>

        <section aria-labelledby="app-kit-boundaries">
          <h2 id="app-kit-boundaries" className="text-lg font-semibold">Runtime boundaries</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Remote state belongs to TanStack Query. AppScope changes create a new
              cache partition, cancellation uses AbortSignal, and actions invalidate
              explicit cross-view targets.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              URL or controlled props own shareable view, filter, and selection
              state. Local reducers own transient interaction; App Kit adds no global
              Zustand store.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              Runtime introspection is out of scope. Agents validate generated
              contracts against _meta and the final inflected GraphQL schema before
              the application ships.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-4">
              V1 has no subscriptions or interval polling. Action invalidation,
              manual refresh, and focus or reconnect refetching provide freshness.
            </li>
          </ul>
        </section>
      </div>

      <ApplicationDocPagination current="app-kit" />
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/app-kit') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/app-kit'),
    images: [OG_IMAGE],
  },
};
