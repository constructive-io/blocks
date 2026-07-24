import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@constructive-io/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import { ConsoleKitShowcasePreview } from '@/components/console-kit-showcase/console-kit-showcase-preview';
import { CodeBlock } from '@/components/docs/code-block';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const INSTALL_MATRIX = [
  {
    surface: 'console-kit-nextjs',
    installs: 'Core + all seven modules + shell graph',
    evidence: 'Any tenant with routable endpoints for the modules you open',
    degrades: 'Unavailable modules stay navigable with diagnostics'
  },
  {
    surface: 'console-kit-core',
    installs: 'Shell, store, runtime, no feature modules',
    evidence: 'Host-supplied featureModules list',
    degrades: 'Empty main until modules are composed'
  },
  {
    surface: 'console-module-*',
    installs: 'Console integration + matching feature-pack view',
    evidence: 'Module-required endpoints, capabilities, and _meta',
    degrades: 'Setup badge + endpoint-specific unavailable panel'
  },
  {
    surface: 'feature-pack-*',
    installs: 'Standalone provider-neutral view only',
    evidence: 'Host-supplied resource/actions props',
    degrades: 'Loading, empty, error, ready resource states only'
  },
  {
    surface: 'preset-auth-hardened',
    installs: 'Data, Auth, Users',
    evidence: 'data + auth endpoints; users after sign-in',
    degrades: 'Signed-out users/data show Sign in'
  },
  {
    surface: 'preset-b2b-storage',
    installs: 'Data, Auth, Users, Organizations, Storage',
    evidence: 'auth + data + admin/org contracts; storage route when public',
    degrades: 'Stock storage often unavailable without a public route'
  },
  {
    surface: 'preset-full',
    installs: 'All seven modules',
    evidence: 'Per-module public contracts',
    degrades: 'Billing/notifications/storage degrade independently'
  }
] as const;

const TITLE = 'Console Kit for Next.js';
const DESCRIPTION =
  'A full-page, route-neutral Constructive application console composed from an installable core and feature modules.';

const CONSOLE_EXAMPLE = `'use client';

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

type TenantEndpoint = Readonly<{
  apiId: string | null;
  url: string | null;
  routable: boolean;
}>;

type TenantManifest = Readonly<{
  database: Readonly<{ id: string; name: string }>;
  endpoints: Readonly<Record<
    'data' | 'auth' | 'admin' | 'billing' | 'storage' | 'notifications',
    TenantEndpoint
  >>;
}>;

function routed(endpoint: TenantEndpoint) {
  return endpoint.routable && endpoint.apiId && endpoint.url
    ? { id: endpoint.apiId, url: endpoint.url }
    : undefined;
}

export function ApplicationConsole({ tenant }: Readonly<{ tenant: TenantManifest }>) {
  const database: ConstructiveTenantDatabase = {
    id: tenant.database.id,
    name: tenant.database.name,
    endpoints: {
      data: routed(tenant.endpoints.data),
      auth: routed(tenant.endpoints.auth),
      admin: routed(tenant.endpoints.admin),
      billing: routed(tenant.endpoints.billing),
      storage: routed(tenant.endpoints.storage),
      notifications: routed(tenant.endpoints.notifications)
    }
  };

  return <ConstructiveConsoleKit database={database} />;
}`;

const LOWER_LEVEL_EXAMPLE = `'use client';

import {
  ConstructiveConsoleKitCore,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/console-kit-core';
import { authConsoleModule } from '@/blocks/feature-packs/auth/auth-console-module';
import { dataConsoleModule } from '@/blocks/feature-packs/data/data-console-module';

const featureModules = [dataConsoleModule, authConsoleModule] as const;

export function SelectedPackConsole({
  database
}: Readonly<{ database: ConstructiveTenantDatabase }>) {
  return (
    <ConstructiveConsoleKitCore
      database={database}
      featureModules={featureModules}
    />
  );
}`;

const ENDPOINT_RESOLVER_EXAMPLE = `resolveEndpoint: ({ databaseId, kind }) => ({
  id: \`\${databaseId}:\${kind}\`,
  url: endpointDirectory.graphqlUrl(databaseId, kind)
})`;

const STORE_EXAMPLE = `'use client';

import * as React from 'react';

import {
  ConsoleKit,
  createConsoleKitStore,
  type ConsoleKitConfig,
  type ConsoleKitFeatureModule
} from '@/blocks/console-kit/console-kit-core';
import { dataConsoleModule } from '@/blocks/feature-packs/data/data-console-module';
import { storageConsoleModule } from '@/blocks/feature-packs/storage/storage-console-module';

const featureModules: readonly ConsoleKitFeatureModule[] = [
  dataConsoleModule,
  storageConsoleModule
];

export function ObservableConsole({
  config
}: Readonly<{ config: ConsoleKitConfig }>) {
  const [store] = React.useState(() => createConsoleKitStore(
    'data',
    { databaseId: config.databaseId, organizationId: null },
    featureModules.flatMap((module) =>
      module.storeSlice ? [module.storeSlice] : []
    )
  ));

  return (
    <ConsoleKit
      config={config}
      featureModules={featureModules}
      store={store}
    />
  );
}`;

const NATIVE_PROOF_EXAMPLE = `# Start the untouched Constructive DB runtime.
cd /absolute/path/to/constructive-db/functions
fun up --local --db consolekitblocks

# From the Blocks repository in another terminal, provision, test, and clean up.
pnpm fixture:console-kit run \\
  --constructive-db /absolute/path/to/constructive-db \\
  --database consolekitblocks \\
  -- pnpm --filter blocks test:e2e:live`;

const CSRF_PROVIDER_EXAMPLE = `import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';
import type { ConsoleCsrfTokenProvider } from '@/blocks/console-runtime';

const csrfTokenProvider: ConsoleCsrfTokenProvider = async ({ databaseId, operation }) => {
  const response = await fetch('/api/constructive/auth/csrf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ databaseId, operation })
  });
  if (!response.ok) throw new Error('CSRF bootstrap failed.');
  const payload = await response.json() as { csrfToken: string };
  return payload.csrfToken;
};

export function HardenedTenantConsole({
  database
}: Readonly<{ database: ConstructiveTenantDatabase }>) {
  return (
    <ConstructiveConsoleKit
      database={database}
      csrfTokenProvider={csrfTokenProvider}
    />
  );
}`;

const EMAIL_VERIFICATION_EXAMPLE = `'use client';

import {
  ConstructiveConsoleKit,
  type ConstructiveTenantDatabase
} from '@/blocks/console-kit/constructive';

export function VerificationConsole({
  database
}: Readonly<{ database: ConstructiveTenantDatabase }>) {
  // Console Kit captures a supported callback from the current URL into its
  // closure-owned credential vault and scrubs the credential before rendering.
  return <ConstructiveConsoleKit database={database} />;
}`;

export default function ConsoleKitPage() {
  return (
    <article className="registry-page">
      <header className="mb-10 max-w-3xl">
        <p className="registry-eyebrow">Application kit</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          Console Kit for Next.js
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Pass the secret-free tenant descriptor returned by
          provisioning; the first-party wrapper handles standalone auth,
          capability discovery, endpoint-scoped requests, and pack adapters.
        </p>
      </header>

      <div className="flex flex-col gap-12 lg:gap-14">
        <section aria-labelledby="console-showcase-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-showcase-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Product states
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Console Kit is a tenant-user console. Switch presets and signed-out,
              discovering, partial, ready, incompatible, and unavailable states
              without a live fixture. Missing public routes are expected degraded
              states, not silent backend failures.
            </p>
          </div>
          <ConsoleKitShowcasePreview />
        </section>

        <section aria-labelledby="console-install-matrix-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-install-matrix-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Choose an install surface
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              One matrix covers the umbrella, core, Console modules, standalone
              packs, and official presets. Installed code never grants authority;
              each surface only becomes interactive when public evidence supports it.
            </p>
          </div>
          <Table
            containerClassName="[scrollbar-gutter:stable]"
            containerProps={{
              tabIndex: 0,
              'aria-label': 'Console Kit install matrix'
            }}
          >
            <TableCaption className="sr-only">
              Install surfaces, what they install, expected public evidence, and
              degradation behavior.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Surface</TableHead>
                <TableHead scope="col">Installs</TableHead>
                <TableHead scope="col">Public evidence</TableHead>
                <TableHead scope="col">When evidence is absent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INSTALL_MATRIX.map((row) => (
                <TableRow key={row.surface}>
                  <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                    {row.surface}
                  </TableCell>
                  <TableCell className="min-w-44 whitespace-normal text-pretty text-sm text-muted-foreground">
                    {row.installs}
                  </TableCell>
                  <TableCell className="min-w-48 whitespace-normal text-pretty text-sm text-muted-foreground">
                    {row.evidence}
                  </TableCell>
                  <TableCell className="min-w-48 whitespace-normal text-pretty text-sm text-muted-foreground">
                    {row.degrades}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section aria-labelledby="console-install-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-install-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Install the full console
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              One registry item installs the Console Kit, all seven feature
              modules, the runtime and catalog contracts, the single modular
              Zustand store, and the shadcn Base UI app shell dependency graph.
            </p>
          </div>
          <CodeBlock label="shadcn CLI">
            {registryAdd('console-kit-nextjs')}
          </CodeBlock>

          <div className="mt-8 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Install an official preset
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Each preset registry item installs the core and the exact feature
              modules mapped to its Constructive DB preset. Runtime navigation
              still follows the contracts discovered from the active tenant,
              so installed code never grants a capability by itself.
            </p>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {[
              {
                title: 'Auth hardened',
                registryName: 'preset-auth-hardened',
                modules: 'Data, Auth, Users'
              },
              {
                title: 'B2B with Storage',
                registryName: 'preset-b2b-storage',
                modules: 'Data, Auth, Users, Organizations, Storage'
              },
              {
                title: 'Full',
                registryName: 'preset-full',
                modules: 'All seven feature modules'
              }
            ].map((preset) => (
              <div
                key={preset.registryName}
                className="min-w-0 rounded-xl border border-border/60 bg-card p-4"
              >
                <h4 className="text-sm font-medium text-foreground">
                  {preset.title}
                </h4>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {preset.modules}
                </p>
                <CodeBlock className="mt-3" label="shadcn CLI">
                  {registryAdd(preset.registryName)}
                </CodeBlock>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Compose feature modules independently
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Install the leaf-independent core and only the Console Kit modules
              your product needs. Every console module installs its standalone,
              provider-neutral feature-pack view transitively, then adds
              discovery, navigation, its Constructive adapter when available,
              and any pack-owned store slice. Install a feature-pack item alone
              when the host supplies the view props without Console Kit.
            </p>
          </div>
          <CodeBlock className="mt-3" label="Core and Console Kit modules">
            {[
              'console-kit-core',
              'console-module-data',
              'console-module-auth',
              'console-module-users',
              'console-module-organizations',
              'console-module-storage',
              'console-module-billing',
              'console-module-notifications'
            ].map(registryAdd).join('\n')}
          </CodeBlock>
          <CodeBlock
            className="mt-4"
            label="Selected-pack Constructive composition"
            language="tsx"
          >
            {LOWER_LEVEL_EXAMPLE}
          </CodeBlock>
        </section>

        <section aria-labelledby="console-host-contract-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-host-contract-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Start from the tenant endpoint contract
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              The host supplies a database ID and its routable public GraphQL
              endpoints; Console Kit does not need a preset name or a
              control-plane receipt at runtime. Keep credentials on the user
              side of the sign-in form, because the secret-free descriptor is
              safe to pass from a server component to the client. A host-owned
              session must carry the same database ID, which prevents identity
              state from crossing between tenants.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {[
              {
                title: 'Endpoints',
                badge: 'six semantic kinds',
                body: 'Pass only routable data, auth, admin, billing, storage, and notifications endpoints; no sibling endpoint is inferred.'
              },
              {
                title: 'Session',
                badge: 'standalone default',
                body: 'The first-party wrapper scopes in-memory and browser session state to the database, then resolves a fresh token per request.'
              },
              {
                title: 'Capabilities',
                badge: 'discovered at runtime',
                body: 'Installed modules become available only when endpoint metadata, GraphQL operations, and the active identity support them.'
              }
            ].map((boundary) => (
              <div
                key={boundary.title}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {boundary.title}
                  </h3>
                  <Badge variant="outline">{boundary.badge}</Badge>
                </div>
                <p className="mt-2 text-pretty text-xs leading-5 text-muted-foreground">
                  {boundary.body}
                </p>
              </div>
            ))}
          </div>

          <CodeBlock
            className="mt-4"
            label="app/console/application-console.tsx"
            language="tsx"
          >
            {CONSOLE_EXAMPLE}
          </CodeBlock>

          <div className="mt-4 max-w-3xl">
            <p className="text-pretty text-sm leading-7 text-muted-foreground">
              Use the lower-level Console Kit endpoint resolver for embedded or
              non-Constructive providers. Endpoint fallback stays opt-in, so an
              admin operation cannot silently cross onto the data endpoint.
            </p>
            <CodeBlock className="mt-3" label="Dynamic endpoint resolution">
              {ENDPOINT_RESOLVER_EXAMPLE}
            </CodeBlock>
          </div>

          <div className="mt-6 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Bootstrap CSRF for hardened auth
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              When a tenant enables{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                require_csrf_for_auth
              </code>
              , pass an async token provider. Its host endpoint creates a
              short-lived anonymous session with a cryptographically random
              secret through a trusted backend connection and returns that
              secret once; Console Kit sends it only as the auth mutation&apos;s{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                csrfToken
              </code>
              . Constructive consumes the anonymous session after successful
              authentication, so the provider must mint a fresh token for each
              attempt and must never cache it in browser storage.
            </p>
            <CodeBlock
              className="mt-3"
              label="Hardened auth token provider"
              language="tsx"
            >
              {CSRF_PROVIDER_EXAMPLE}
            </CodeBlock>
          </div>

          <div className="mt-6 max-w-3xl">
            <h3 className="text-sm font-medium text-foreground">
              Complete email verification in the host route
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Unverified signed-in accounts can send a fresh verification
              email from Account security. Your verification route reads the{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                email_id
              </code>{' '}
              and{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                verification_token
              </code>{' '}
              values from a URL fragment and passes them to Console Kit; the auth
              adapter calls{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                verifyEmail
              </code>{' '}
              using the freshly delivered credential, including from a fresh signed-out
              browser. After sign-in, Console Kit reloads the account so the
              verified state is authoritative. Treat the token as a credential:
              route these values through the URL&apos;s{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                #
              </code>{' '}
              fragment so they stay out of the HTTP request, then scrub that
              fragment before mounting Console Kit.
            </p>
            <CodeBlock
              className="mt-3"
              label="app/verify-email/verification-console.tsx"
              language="tsx"
            >
              {EMAIL_VERIFICATION_EXAMPLE}
            </CodeBlock>
          </div>
        </section>

        <section aria-labelledby="console-store-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-store-heading"
              className="text-lg font-semibold tracking-tight"
            >
              One store, modular slices
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Each Console Kit instance creates one Zustand vanilla store and
              composes the core navigation, tenant, session, endpoint,
              discovery, runtime, and adapter slices with slices contributed by
              installed feature modules. The store is scoped to the mounted
              console, so server renders and multiple consoles cannot leak
              identity or navigation state across instances. If the host owns
              the store, it must compose the same module slices; Console Kit
              verifies that composition and resets its scoped state when the
              tenant or identity changes.
            </p>
          </div>
          <CodeBlock label="Optional host-owned store" language="tsx">
            {STORE_EXAMPLE}
          </CodeBlock>
        </section>

        <section aria-labelledby="console-meta-heading">
          <div className="mb-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="console-meta-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Metadata is a compatibility gate
              </h2>
              <Badge variant="info">_meta 2026-07</Badge>
            </div>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              The runtime checks every configured, reachable endpoint with
              standard GraphQL introspection and Constructive&apos;s versioned{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                _meta
              </code>{' '}
              contract. This release accepts contract version{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                2026-07
              </code>{' '}
              only; each feature module selects its evidence from the endpoint
              map, and incompatible metadata stops that feature instead of
              guessing at tables, relations, or mutation shapes.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Preflight',
                  body: 'Resolve each explicit semantic endpoint and read a fresh token from the active database-scoped session.'
                },
                {
                  title: 'Discover',
                  body: 'Load _meta plus GraphQL root operations, types, and input objects independently for every reachable endpoint.'
                },
                {
                  title: 'Expose',
                  body: 'Show a module only when its schema contract is exposed, then let PostgreSQL privileges and RLS decide each operation.'
                }
              ].map((step, index) => (
                <li key={step.title} className="min-w-0">
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1.5 text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="console-native-proof-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-native-proof-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Prove compatibility against native tenants
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Start the untouched Constructive DB services with{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
                fun up
              </code>
              , then let the Blocks fixture call the native provisioning
              procedure for the three official presets and one supported
              storage-routed tenant. The generated secret-free manifest feeds
              the integration route, while the live suite exercises auth,
              identity-scoped CRUD, cross-tenant rejection, capability
              discovery, and RLS through public GraphQL endpoints. Cleanup uses
              only the exact tenant database IDs recorded by that run.
            </p>
          </div>
          <CodeBlock label="Native Console Kit proof">
            {NATIVE_PROOF_EXAMPLE}
          </CodeBlock>
        </section>

        <section aria-labelledby="console-shell-heading">
          <div className="mb-4 max-w-3xl">
            <h2
              id="console-shell-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Route-neutral app shell
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-7 text-muted-foreground">
              Console Kit composes the Constructive App Shell, App Bar, and the
              shadcn Base UI Sidebar. The shell renders typed navigation,
              breadcrumbs, brand, account actions, search, and action slots, but
              links remain plain anchors until your host supplies a Next.js or
              other framework renderer.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <CodeBlock label="Install the shell without Console Kit">
              {registryAdd('app-shell')}
            </CodeBlock>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">
                Compose only what you need
              </h3>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                Use the shell directly for a custom application, install a
                focused pack for one workflow, or start with Console Kit when
                you want the complete discovery and navigation layer.
              </p>
              <Link
                href="/blocks/features"
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse feature packs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/console-kit') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/console-kit'),
    images: [OG_IMAGE]
  }
};
