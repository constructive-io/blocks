import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import {
  authenticationErrorCodes,
  createRow,
  deleteRow,
  graphQL,
  listRows,
  loadSchema,
  loadSchemaAt,
  rawGraphQL,
  signIn,
  signOut,
  signUp,
  updateRow,
  type LiveSchema,
  type LiveSession,
  type LiveTable
} from './constructive-graphql';
import {
  endpointUrl,
  loadProofContext,
  type ProofCredentials,
  type ProofTenant
} from './proof-context';

const proof = loadProofContext();
const HEALTH_QUERY = 'query ConsoleKitNativeHealth { __typename }';
const OFFICIAL_PROFILES = ['auth-hardened', 'b2b-storage', 'full'] as const;
const BROWSER_PROFILES = [...OFFICIAL_PROFILES, 'storage-routed'] as const;
const FEATURE_LABELS = [
  'Data',
  'Authentication',
  'Users',
  'Organizations',
  'Storage',
  'Billing',
  'Notifications'
] as const;
const PROFILE_FEATURES = {
  'auth-hardened': ['Data', 'Authentication', 'Users'],
  'b2b-storage': ['Data', 'Authentication', 'Users', 'Organizations', 'Storage'],
  full: FEATURE_LABELS,
  'storage-routed': ['Data', 'Authentication', 'Users', 'Organizations', 'Storage']
} as const;

function uniqueCredentials(base: ProofCredentials, purpose: string): ProofCredentials {
  const [local, domain] = base.email.split('@');
  return {
    email: `${local}+${purpose}-${randomUUID()}@${domain}`,
    password: base.password
  };
}

function projectTable(schema: LiveSchema): LiveTable {
  const matches = schema.entries.filter(({ meta }) =>
    meta.query?.all === 'projects' || meta.name.toLowerCase() === 'project'
  );
  expect(matches, '_meta must expose exactly one projects table.').toHaveLength(1);
  return matches[0]!;
}

async function createSession(
  tenant: ProofTenant,
  actor: 'owner' | 'peer',
  purpose: string
): Promise<Readonly<{ credentials: ProofCredentials; session: LiveSession }>> {
  const credentials = uniqueCredentials(proof.credentials(tenant, actor), purpose);
  const session = await signUp(tenant, credentials);
  return { credentials, session };
}

async function expectTokenRejected(url: string, token: string): Promise<void> {
  const payload = await rawGraphQL(url, HEALTH_QUERY, {}, token);
  expect(payload.data == null).toBe(true);
  expect(authenticationErrorCodes(payload)).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)
    ])
  );
}

function proofPageUrl(profile: ProofTenant['profile']): string {
  const url = new URL(proof.routeUrl);
  url.searchParams.set('profile', profile);
  url.hash = '';
  return url.toString();
}

test.describe.configure({ mode: 'serial' });

test('uses the exact native fixture matrix and metadata-discovered public routes', async () => {
  expect(proof.status).toBe('ready');
  expect(proof.manifest.membershipFixtureMode).toBe('auto-approved-and-verified');
  expect(proof.manifest.databaseIds).toHaveLength(4);
  expect(proof.tenants.map((tenant) => tenant.profile)).toEqual([
    'auth-hardened',
    'b2b-storage',
    'full',
    'storage-routed'
  ]);

  for (const tenant of proof.tenants) {
    for (const kind of ['data', 'auth', 'admin'] as const) {
      const url = endpointUrl(tenant, kind);
      const endpoint = tenant.endpoints.find((candidate) => candidate.url === url);
      expect(endpoint, `${tenant.profile} ${kind} route must come from the fixture manifest.`)
        .toBeDefined();
      const payload = await rawGraphQL<{ __typename: string }>(url, HEALTH_QUERY);
      expect(payload.errors).toBeUndefined();
      expect(payload.data?.__typename).toBe('Query');
    }
  }

  expect(() => endpointUrl(proof.tenant('b2b-storage'), 'storage'))
    .toThrow(/does not bind storage/u);
  expect(() => endpointUrl(proof.tenant('full'), 'storage'))
    .toThrow(/does not bind storage/u);
  expect(() => endpointUrl(proof.tenant('full'), 'notifications'))
    .toThrow(/no discovered public notifications endpoint/u);
  expect(endpointUrl(proof.tenant('storage-routed'), 'storage'))
    .toBe(endpointUrl(proof.tenant('storage-routed'), 'admin'));
});

test('renders the exact Console Kit composition for every native tenant profile', async ({ page }) => {
  for (const profile of BROWSER_PROFILES) {
    const tenant = proof.tenant(profile);
    await page.goto(proofPageUrl(profile));

    const root = page.getByTestId('console-kit-proof-root');
    await expect(root).toHaveAttribute('data-profile', profile);
    await expect(root).toHaveAttribute('data-preset', tenant.preset);
    await expect(root).toHaveAttribute('data-database-id', tenant.database.id);
    await expect(root).toHaveAttribute('data-proof-status', 'ready');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();

    const featureNavigation = page.locator('[data-slot="sidebar-container"]');
    await expect(featureNavigation).toBeVisible();
    const installed = new Set<string>(PROFILE_FEATURES[profile]);
    for (const label of FEATURE_LABELS) {
      await expect(featureNavigation.getByRole('link', { name: label, exact: true }))
        .toHaveCount(installed.has(label) ? 1 : 0);
    }
    await expect(featureNavigation.getByRole('link', { name: 'Data', exact: true }))
      .toHaveAttribute('href', '#console-data');
  }
});

test('signs up, opens _meta-discovered data, signs out, and signs back in through Console Kit', async ({ page }) => {
  const tenant = proof.tenant('auth-hardened');
  const credentials = uniqueCredentials(proof.credentials(tenant), 'browser-auth');
  await page.goto(proofPageUrl('auth-hardened'));

  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create an account', exact: true }))
    .toBeVisible();
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Account security', exact: true }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true }))
    .toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Account security', exact: true }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true }))
    .toBeVisible();

  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Data explorer', exact: true }))
    .toBeVisible();
  await expect(page.getByTestId('table-item').filter({ hasText: /projects?/iu }))
    .toBeVisible();

  await page.getByRole('link', { name: 'Authentication', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();

  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account security', exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

for (const profile of OFFICIAL_PROFILES) {
  test(`${profile}: signup, signin, session revocation, and direct-owner CRUD work through public GraphQL`, async () => {
    const tenant = proof.tenant(profile);
    const owner = await createSession(tenant, 'owner', 'crud');
    const peer = await createSession(tenant, 'peer', 'crud');
    const sessions = [owner.session, peer.session];
    let ownerRow: Readonly<Record<string, unknown>> | null = null;

    try {
      const restored = await signIn(tenant, owner.credentials);
      sessions.push(restored);
      expect(restored.userId).toBe(owner.session.userId);

      const ownerSchema = await loadSchema(tenant, owner.session.token);
      const peerSchema = await loadSchema(tenant, peer.session.token);
      const ownerTable = projectTable(ownerSchema);
      const peerTable = projectTable(peerSchema);
      const marker = randomUUID();

      ownerRow = await createRow(
        tenant,
        owner.session.token,
        ownerSchema,
        ownerTable,
        { name: `Owner project ${marker}`, description: 'private', completed: false },
        ['id', 'name', 'description', 'completed', 'ownerId']
      );
      expect(ownerRow.ownerId).toBe(owner.session.userId);

      const ownerRows = await listRows(
        tenant,
        owner.session.token,
        ownerSchema,
        ownerTable,
        ['id', 'name', 'ownerId']
      );
      expect(ownerRows.some((row) => row.id === ownerRow?.id)).toBe(true);

      const peerRows = await listRows(
        tenant,
        peer.session.token,
        peerSchema,
        peerTable,
        ['id', 'name', 'ownerId']
      );
      expect(peerRows.some((row) => row.id === ownerRow?.id)).toBe(false);

      await expect(
        updateRow(
          tenant,
          peer.session.token,
          peerSchema,
          peerTable,
          ownerRow,
          { description: 'peer overwrite' },
          ['id', 'description']
        )
      ).rejects.toThrow();
      await expect(
        deleteRow(tenant, peer.session.token, peerSchema, peerTable, ownerRow)
      ).rejects.toThrow();
      const afterPeerDelete = await listRows(
        tenant,
        owner.session.token,
        ownerSchema,
        ownerTable,
        ['id', 'description']
      );
      expect(afterPeerDelete.some((row) => row.id === ownerRow?.id)).toBe(true);

      ownerRow = await updateRow(
        tenant,
        owner.session.token,
        ownerSchema,
        ownerTable,
        ownerRow,
        { description: 'owner update', completed: true },
        ['id', 'description', 'completed', 'ownerId']
      );
      expect(ownerRow).toMatchObject({ description: 'owner update', completed: true });
      await deleteRow(tenant, owner.session.token, ownerSchema, ownerTable, ownerRow);
      ownerRow = null;

      let anonymousDenied = false;
      try {
        const rows = await listRows(tenant, '', ownerSchema, ownerTable, ['id']);
        anonymousDenied = rows.length === 0;
      } catch {
        anonymousDenied = true;
      }
      expect(anonymousDenied, 'Anonymous callers must not read direct-owner projects.').toBe(true);

      await signOut(tenant, restored.token);
      sessions.splice(sessions.indexOf(restored), 1);
      await expectTokenRejected(endpointUrl(tenant, 'data'), restored.token);
    } finally {
      if (ownerRow) {
        const schema = await loadSchema(tenant, owner.session.token).catch(() => null);
        if (schema) {
          await deleteRow(
            tenant,
            owner.session.token,
            schema,
            projectTable(schema),
            ownerRow
          ).catch(() => undefined);
        }
      }
      await Promise.allSettled(sessions.map((session) => signOut(tenant, session.token)));
    }
  });
}

test('rejects invalid, cross-tenant, and revoked bearer tokens', async () => {
  const first = proof.tenant('auth-hardened');
  const second = proof.tenant('b2b-storage');
  const firstActor = await createSession(first, 'owner', 'bearer');
  const secondActor = await createSession(second, 'owner', 'bearer');

  try {
    await expectTokenRejected(endpointUrl(first, 'data'), 'invalid.console.token');
    await expectTokenRejected(endpointUrl(second, 'data'), firstActor.session.token);
    await signOut(second, secondActor.session.token);
    await expectTokenRejected(endpointUrl(second, 'data'), secondActor.session.token);
  } finally {
    await Promise.allSettled([
      signOut(first, firstActor.session.token),
      signOut(second, secondActor.session.token)
    ]);
  }
});

test('discovers routed Storage tables in _meta and keeps unsupported writes unavailable in Console Kit', async ({ page }) => {
  const tenant = proof.tenant('storage-routed');
  const actor = await createSession(tenant, 'owner', 'storage');
  const storageUrl = endpointUrl(tenant, 'storage');

  try {
    const schema = await loadSchemaAt(storageUrl, actor.session.token);
    const bucketTables = schema.entries.filter(({ meta }) => meta.storage?.isBucketsTable);
    const fileTables = schema.entries.filter(({ meta }) => meta.storage?.isFilesTable);
    expect(bucketTables, 'Storage requires one @storageBuckets table on the bound endpoint.')
      .toHaveLength(1);
    expect(fileTables, 'Storage requires one @storageFiles table on the same endpoint.')
      .toHaveLength(1);

    const introspection = await graphQL<{
      __schema: { queryType: { fields: readonly { name: string }[] } | null };
    }>(
      storageUrl,
      'query ConsoleKitStorageRoots { __schema { queryType { fields { name } } } }',
      {},
      actor.session.token
    );
    const queryNames = introspection.__schema.queryType?.fields.map(({ name }) => name) ?? [];
    for (const { meta } of [...bucketTables, ...fileTables]) {
      expect(meta.query?.all, `${meta.name} must publish a connection root in _meta.`).toBeTruthy();
      expect(queryNames).toContain(meta.query!.all!);
    }

    await page.goto(proofPageUrl('storage-routed'));
    await page.getByLabel('Email address').fill(actor.credentials.email);
    await page.getByLabel('Password').fill(actor.credentials.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Account security', exact: true }))
      .toBeVisible();
    await page.getByRole('link', { name: 'Organizations', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Organizations', exact: true }))
      .toBeVisible();
    await page.getByRole('link', { name: 'Storage', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Storage', exact: true })).toBeVisible();
    await expect(
      page.getByText('No storage buckets', { exact: true })
        .or(page.getByText('Buckets', { exact: true }))
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New bucket', exact: true })).toHaveCount(0);
    await expect(page.getByText('Upload files', { exact: true })).toHaveCount(0);

    await page.getByRole('link', { name: 'Authentication', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  } finally {
    await signOut(tenant, actor.session.token).catch(() => undefined);
  }
});
