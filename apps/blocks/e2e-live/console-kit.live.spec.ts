import { randomUUID } from 'node:crypto';
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page
} from '@playwright/test';

import {
  authenticationErrorCodes,
  createRequest,
  createRow,
  deleteRequest,
  deleteRow,
  graphQL,
  listRows,
  loadSchema,
  rawGraphQL,
  signIn,
  signOut,
  signUp,
  updateRequest,
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

const EXPECTED_TABLES: Readonly<Record<string, readonly string[]>> = {
  crm: ['Activity', 'Contact', 'Deal', 'Note'],
  saas: ['Member', 'Organization', 'Project', 'Task'],
  blog: ['Author', 'AuthorProfile', 'Comment', 'Post', 'PostTag', 'Tag']
};

const BILLING_READ = /* GraphQL */ `
  query ConsoleKitBillingRead {
    plans(first: 500) { nodes { id name description isActive } }
    planSubscriptions(first: 500) {
      nodes { id entityId entityType organizationId planId isActive startsAt endsAt }
    }
    meters(first: 500) { nodes { id slug displayName unit meterType isActive } }
    planPricings(first: 500) {
      nodes { id planId billingInterval price currency isActive }
    }
    planLimits(first: 500) { nodes { id planId limitName maxValue } }
    planMeterLimits(first: 500) { nodes { id planId meterSlug planLimit } }
    planCaps(first: 500) { nodes { id planId capName capValue } }
  }
`;

const EMAIL_VERIFICATION_READ = /* GraphQL */ `
  query ConsoleKitEmailVerificationRead {
    emails(first: 50) {
      nodes { id email isPrimary isVerified }
    }
  }
`;

const RECOVER_AMBIGUOUS_SIGN_UP = /* GraphQL */ `
  mutation ConsoleKitProofRecoverAmbiguousSignUp($input: SignInInput!) {
    signIn(input: $input) {
      result { id userId accessToken accessTokenExpiresAt }
    }
  }
`;

const ORGANIZATION_USER_FIELDS = 'id displayName username type';
const APP_MEMBERSHIP_PROOF_FIELDS = [
  'id',
  'actorId',
  'isOwner',
  'isAdmin',
  'isActive',
  'isApproved',
  'isVerified',
  'isBanned',
  'isDisabled',
  'permissions'
].join(' ');
const ORG_MEMBERSHIP_PROOF_FIELDS = [
  'id',
  'actorId',
  'entityId',
  'isOwner',
  'isAdmin',
  'isActive',
  'isApproved',
  'isBanned',
  'isDisabled',
  'isReadOnly',
  'permissions'
].join(' ');

const CREATE_ORGANIZATION_USER = /* GraphQL */ `
  mutation ConsoleKitProofCreateOrganization($input: CreateUserInput!) {
    createUser(input: $input) { user { id displayName type } }
  }
`;

const DELETE_USER = /* GraphQL */ `
  mutation ConsoleKitProofDeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) { user { id } }
  }
`;

const CREATE_ORGANIZATION_INVITE = /* GraphQL */ `
  mutation ConsoleKitProofCreateOrganizationInvite($input: CreateOrgInviteInput!) {
    createOrgInvite(input: $input) { orgInvite { id } }
  }
`;

const UPDATE_APP_MEMBERSHIP = /* GraphQL */ `
  mutation ConsoleKitProofUpdateAppMembership($input: UpdateAppMembershipInput!) {
    updateAppMembership(input: $input) { appMembership { id } }
  }
`;

const CREATE_ORGANIZATION_MEMBERSHIP = /* GraphQL */ `
  mutation ConsoleKitProofCreateOrganizationMembership($input: CreateOrgMembershipInput!) {
    createOrgMembership(input: $input) { orgMembership { id } }
  }
`;

const UPDATE_ORGANIZATION_MEMBERSHIP = /* GraphQL */ `
  mutation ConsoleKitProofUpdateOrganizationMembership($input: UpdateOrgMembershipInput!) {
    updateOrgMembership(input: $input) { orgMembership { id } }
  }
`;

const DELETE_APP_INVITE = /* GraphQL */ `
  mutation ConsoleKitProofDeleteAppInvite($input: DeleteAppInviteInput!) {
    deleteAppInvite(input: $input) { appInvite { id } }
  }
`;

const DELETE_ORGANIZATION_INVITE = /* GraphQL */ `
  mutation ConsoleKitProofDeleteOrganizationInvite($input: DeleteOrgInviteInput!) {
    deleteOrgInvite(input: $input) { orgInvite { id } }
  }
`;

const DELETE_ORGANIZATION_PERMISSION_DEFAULT = /* GraphQL */ `
  mutation ConsoleKitProofDeleteOrganizationPermissionDefault(
    $input: DeleteOrgPermissionDefaultInput!
  ) {
    deleteOrgPermissionDefault(input: $input) { orgPermissionDefault { id } }
  }
`;

function connectionRows(
  data: Record<string, unknown>,
  field: string
): Record<string, unknown>[] {
  const connection = data[field];
  const nodes = connection && typeof connection === 'object' && !Array.isArray(connection)
    ? (connection as { nodes?: unknown }).nodes
    : null;
  return Array.isArray(nodes)
    ? nodes.filter((row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === 'object' && !Array.isArray(row)
      )
    : [];
}

async function readProofConnection(
  tenant: ProofTenant,
  endpoint: 'auth' | 'admin',
  token: string,
  operationName: string,
  field: string,
  nodeSelection: string
): Promise<Record<string, unknown>[]> {
  const document = /* GraphQL */ `
    query ${operationName}($first: Int!, $after: Cursor) {
      ${field}(first: $first, after: $after) {
        nodes { ${nodeSelection} }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const rows: Record<string, unknown>[] = [];
  const cursors = new Set<string>();
  let after: string | null = null;
  for (;;) {
    const data: Record<string, unknown> = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, endpoint),
      document,
      { first: 100, after },
      token
    );
    rows.push(...connectionRows(data, field));
    const connection: unknown = data[field];
    const pageInfo: unknown = connection && typeof connection === 'object' &&
      !Array.isArray(connection)
      ? (connection as { pageInfo?: unknown }).pageInfo
      : null;
    const page: Record<string, unknown> | null = pageInfo &&
      typeof pageInfo === 'object' && !Array.isArray(pageInfo)
      ? pageInfo as Record<string, unknown>
      : null;
    if (page?.hasNextPage !== true) return rows;
    const endCursor: string | null = typeof page.endCursor === 'string' &&
      page.endCursor.length > 0
      ? page.endCursor
      : null;
    if (!endCursor || cursors.has(endCursor)) {
      throw new Error(`${field} returned an invalid pagination cursor.`);
    }
    cursors.add(endCursor);
    after = endCursor;
  }
}

async function readOrganizationUsers(
  tenant: ProofTenant,
  token: string
): Promise<Record<string, unknown>[]> {
  return readProofConnection(
    tenant,
    'auth',
    token,
    'ConsoleKitProofOrganizationUsersPage',
    'users',
    ORGANIZATION_USER_FIELDS
  );
}

async function readMembershipProof(
  tenant: ProofTenant,
  token: string
): Promise<Record<string, Record<string, unknown>[]>> {
  const [appMemberships, orgMemberships, appInvites, orgInvites] = await Promise.all([
    readProofConnection(
      tenant,
      'admin',
      token,
      'ConsoleKitProofAppMembershipsPage',
      'appMemberships',
      APP_MEMBERSHIP_PROOF_FIELDS
    ),
    readProofConnection(
      tenant,
      'admin',
      token,
      'ConsoleKitProofOrgMembershipsPage',
      'orgMemberships',
      ORG_MEMBERSHIP_PROOF_FIELDS
    ),
    readProofConnection(
      tenant,
      'admin',
      token,
      'ConsoleKitProofAppInvitesPage',
      'appInvites',
      'id email'
    ),
    readProofConnection(
      tenant,
      'admin',
      token,
      'ConsoleKitProofOrgInvitesPage',
      'orgInvites',
      'id entityId email'
    )
  ]);
  return {
    appMemberships,
    orgMemberships,
    appInvites,
    orgInvites
  };
}

function mutationRowId(data: Record<string, unknown>, field: string, row: string): string | null {
  const payload = data[field];
  const value = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)[row]
    : null;
  return value && typeof value === 'object' && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).id === 'string'
    ? (value as Record<string, unknown>).id as string
    : null;
}

async function recoverAmbiguousSignUp(
  tenant: ProofTenant,
  credentials: ProofCredentials
): Promise<LiveSession | null> {
  const payload = await rawGraphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'auth'),
    RECOVER_AMBIGUOUS_SIGN_UP,
    { input: { email: credentials.email, password: credentials.password, rememberMe: false } }
  );
  if (payload.errors?.length || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Ambiguous signup recovery returned GraphQL errors or no data.');
  }
  const mutation = payload.data.signIn;
  if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation)) {
    throw new Error('Ambiguous signup recovery returned a malformed signIn payload.');
  }
  const result = (mutation as Record<string, unknown>).result;
  if (result === null) return null;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Ambiguous signup recovery returned a malformed signIn result.');
  }
  const session = result as Record<string, unknown>;
  if (['id', 'userId', 'accessToken', 'accessTokenExpiresAt'].every(
    (key) => session[key] === null
  )) return null;
  if (
    typeof session.userId !== 'string' ||
    !session.userId ||
    typeof session.accessToken !== 'string' ||
    !session.accessToken
  ) {
    throw new Error('Ambiguous signup recovery returned a partial session.');
  }
  return {
    userId: session.userId,
    token: session.accessToken,
    sessionId: typeof session.id === 'string' ? session.id : null
  };
}

async function readEmailVerificationState(
  tenant: ProofTenant,
  email: string,
  token: string
): Promise<Readonly<{ isPrimary: boolean; isVerified: boolean }> | undefined> {
  const emailData = await graphQL<Record<string, unknown>>(
    endpointUrl(tenant, 'auth'),
    EMAIL_VERIFICATION_READ,
    {},
    token
  );
  const emails = emailData.emails &&
    typeof emailData.emails === 'object' &&
    !Array.isArray(emailData.emails)
    ? (emailData.emails as { nodes?: unknown }).nodes
    : null;
  const record = Array.isArray(emails)
    ? emails.find((candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        (candidate as Record<string, unknown>).email === email
      ) as Record<string, unknown> | undefined
    : undefined;
  return record
    ? { isPrimary: record.isPrimary === true, isVerified: record.isVerified === true }
    : undefined;
}

type MailpitAddress = Readonly<{ Address?: string }>;
type MailpitMessage = Readonly<{
  ID?: string;
  Subject?: string;
  From?: MailpitAddress;
  To?: readonly MailpitAddress[];
}>;

async function waitForVerificationMessage(
  recipient: string
): Promise<MailpitMessage & { ID: string }> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const response = await fetch('http://127.0.0.1:8025/api/v1/messages');
    if (!response.ok) throw new Error(`Mailpit returned HTTP ${response.status}.`);
    const payload = await response.json() as { messages?: readonly MailpitMessage[] };
    const message = payload.messages?.find((candidate) =>
      candidate.Subject?.endsWith(' Email Verification') &&
      candidate.To?.some((address) => address.Address === recipient)
    );
    if (message?.ID) return message as MailpitMessage & { ID: string };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('The verification email did not arrive in Mailpit within 60 seconds.');
}

type VerificationLinkParameters = Readonly<{
  emailId: string;
  token: string;
}>;

async function readVerificationLinkParameters(
  recipient: string
): Promise<VerificationLinkParameters> {
  const message = await waitForVerificationMessage(recipient);
  expect(message.From?.Address).toBe('noreply@test.constructive.io');
  expect(message.Subject).toMatch(/\S+ Email Verification$/u);

  try {
    const response = await fetch(
      `http://127.0.0.1:8025/api/v1/message/${encodeURIComponent(message.ID)}`
    );
    if (!response.ok) throw new Error(`Mailpit message lookup returned HTTP ${response.status}.`);
    const detail = await response.json() as { HTML?: string };
    if (typeof detail.HTML !== 'string') {
      throw new Error('The verification email had no HTML body.');
    }
    const href = detail.HTML.match(/href=["']([^"']*\/verify-email[^"']*)["']/iu)?.[1]
      ?.replaceAll('&amp;', '&')
      .replaceAll('&#38;', '&');
    if (!href) throw new Error('The verification email had no verification link.');
    const link = new URL(href);
    // Delivery and token extraction are valid, but the stock local SMTP link is
    // not a clickable Blocks route: it omits the development port and forces TLS.
    expect(link.protocol).toBe('https:');
    expect(link.hostname).toBe('localhost');
    expect(link.port).toBe('');
    expect(link.pathname).toBe('/verify-email');
    const emailId = link.searchParams.get('email_id') ?? '';
    const token = link.searchParams.get('verification_token') ?? '';
    expect(/^[0-9a-f-]{36}$/iu.test(emailId)).toBe(true);
    expect(Boolean(token)).toBe(true);
    return { emailId, token };
  } finally {
    const deleteResponse = await fetch('http://127.0.0.1:8025/api/v1/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [message.ID] })
    });
    if (!deleteResponse.ok) {
      throw new Error(`Mailpit message deletion returned HTTP ${deleteResponse.status}.`);
    }
    const retained = await fetch(
      `http://127.0.0.1:8025/api/v1/message/${encodeURIComponent(message.ID)}`
    );
    expect(retained.status, 'The token-bearing Mailpit message must not be retained.').toBe(404);
  }
}

async function visitProof(page: Page): Promise<void> {
  const response = await page.goto(proof.routeUrl, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  const root = page.getByTestId('console-kit-proof-root');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-proof-status', proof.status);
}

async function selectTenant(page: Page, tenant: ProofTenant): Promise<void> {
  const root = page.getByTestId('console-kit-proof-root');
  if (await root.getAttribute('data-database-id') === tenant.manifest.databaseId) return;

  // Let the initial client boundary settle before opening the Base UI portal;
  // a tenant switch intentionally remounts the entire Console Kit instance.
  await expect(page.getByText('_meta 2026-07', { exact: true })).toBeVisible();
  const selector = page.getByRole('combobox', { name: 'Tenant database' });
  await selector.click();
  await page.getByRole('option', {
    name: `${tenant.preset} · ${tenant.blueprint}/${tenant.dataset}`,
    exact: true
  }).click();
  await expect(root).toHaveAttribute('data-database-id', tenant.manifest.databaseId);
}

async function expectSignIn(page: Page): Promise<void> {
  const title = page.locator('[data-slot="card-title"]').filter({ hasText: 'Sign in' });
  await expect(title).toHaveCount(1);
  await expect(title).toHaveText('Sign in');
}

async function signInThroughUi(
  page: Page,
  tenant: ProofTenant,
  credentials: ProofCredentials
): Promise<void> {
  await selectTenant(page, tenant);
  await expectSignIn(page);
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Account security' })).toBeVisible();
}

async function signUpThroughUi(
  page: Page,
  tenant: ProofTenant,
  credentials: ProofCredentials
): Promise<void> {
  await selectTenant(page, tenant);
  await expectSignIn(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Account security' })).toBeVisible();
}

async function openFeature(page: Page, name: string): Promise<void> {
  const link = page.locator('a[data-sidebar="menu-button"]').filter({ hasText: name });
  await expect(link).toHaveCount(1);
  await expect(link).not.toHaveAttribute('aria-disabled', 'true');
  await link.click();
}

async function signOutThroughUi(page: Page): Promise<void> {
  await openFeature(page, 'Authentication');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectSignIn(page);
}

async function expectDataExplorer(page: Page, tenant: ProofTenant): Promise<void> {
  await expect(page.getByText('_meta 2026-07', { exact: true })).toBeVisible();
  await openFeature(page, 'Data');
  await expect(page.getByRole('heading', { level: 1, name: 'Data explorer' })).toBeVisible();

  const expected = EXPECTED_TABLES[tenant.blueprint];
  if (!expected) throw new Error(`No UI table contract is registered for ${tenant.blueprint}.`);
  expect(tenant.manifest.tableAllowlist).toHaveLength(expected.length);
  const tableItems = page.getByTestId('table-item');
  await expect(tableItems).toHaveCount(expected.length);
  for (const tableName of expected) {
    await expect(
      tableItems.filter({ has: page.getByText(tableName, { exact: true }) })
    ).toHaveCount(1);
  }
  await expect(page.getByRole('region', { name: `${expected[0]} table` })).toBeVisible();
}

async function selectDataTable(page: Page, name: string): Promise<Locator> {
  await page.getByTestId('table-item')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click();
  const region = page.getByRole('region', { name: `${name} table` });
  await expect(region).toBeVisible();
  return region;
}

async function editDraftCell(
  grid: Locator,
  rowIndex: number,
  columnName: string,
  value: string
): Promise<void> {
  const columnKeys = await grid.locator('[role="columnheader"][data-col-key]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-col-key'))
  );
  const columnIndex = columnKeys.indexOf(columnName);
  if (columnIndex < 0) throw new Error(`The live grid did not render ${columnName}.`);

  const cell = grid.locator(`#sheets-cell-${rowIndex}-${columnIndex}`);
  await cell.dblclick();
  const editor = cell.locator('[data-slot="inline-cell-editor"]');
  await expect(editor).toBeVisible();
  await editor.fill(value);
  await editor.press('Enter');
}

async function pollRows(
  read: () => Promise<readonly Readonly<Record<string, unknown>>[]>,
  predicate: (rows: readonly Readonly<Record<string, unknown>>[]) => boolean
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const deadline = Date.now() + 20_000;
  let rows: readonly Readonly<Record<string, unknown>>[] = [];
  while (Date.now() < deadline) {
    rows = await read();
    if (predicate(rows)) return rows;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return rows;
}

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    const response = await page.goto(proof.routeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000
    });
    expect(response?.status()).toBe(200);
    const root = page.getByTestId('console-kit-proof-root');
    await expect(root).toHaveAttribute('data-proof-status', proof.status, { timeout: 60_000 });
    await expect(page.getByText('_meta 2026-07', { exact: true }))
      .toBeVisible({ timeout: 60_000 });
  } finally {
    await context.close();
  }
});

test('switches the tenant-scoped shell, signs in to every preset, and discovers only manifest tables', async ({ page }) => {
  await visitProof(page);
  const [first, second, third] = proof.tenants;
  if (!first || !second || !third) throw new Error('The proof matrix requires three tenants.');

  await signInThroughUi(page, first, proof.credentials(first));
  await expectDataExplorer(page, first);
  await expect(page).toHaveURL(/#console-data$/u);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Data explorer' })).toBeVisible();
  await openFeature(page, 'Storage');
  await expect(page.getByRole('heading', { level: 1, name: 'Storage is unavailable' })).toBeVisible();
  await expect(page).toHaveURL(/#console-storage$/u);
  await expectDataExplorer(page, first);

  await selectTenant(page, second);
  await expectSignIn(page);
  await signInThroughUi(page, second, proof.credentials(second));
  await expectDataExplorer(page, second);
  await openFeature(page, 'Storage');
  await expect(page.getByRole('heading', { level: 1, name: 'Storage is unavailable' })).toBeVisible();
  await signOutThroughUi(page);

  await selectTenant(page, first);
  await expect(page.getByText('_meta 2026-07', { exact: true })).toBeVisible();
  await signOutThroughUi(page);

  await signInThroughUi(page, third, proof.credentials(third));
  await expectDataExplorer(page, third);
  await openFeature(page, 'Billing');
  await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toBeVisible();
  await expect(page.getByText('No subscription', { exact: true })).toBeVisible();
  await expect(page.getByText('No usage available', { exact: true })).toBeVisible();
  await expect(page.getByText('No credit balances', { exact: true })).toBeVisible();
  await expect(page.getByText('No entitlements configured', { exact: true })).toBeVisible();
  await expect(page.getByText('Subscription could not be loaded', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Usage could not be loaded', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Plans', exact: true }).click();
  await expect(page.getByText('No plans available', { exact: true })).toBeVisible();
  await expect(page.getByText('Plans could not be loaded', { exact: true })).toHaveCount(0);
  await signOutThroughUi(page);
});

test('completes standalone auth and restores the database-scoped session after reload', async ({ page }) => {
  const tenant = proof.tenant('auth:hardened');
  const credentials = {
    email: `console-kit-ui-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };

  await visitProof(page);
  await signUpThroughUi(page, tenant, credentials);
  await expect(page.getByText(credentials.email, { exact: true }).first()).toBeVisible();

  await signOutThroughUi(page);
  await signInThroughUi(page, tenant, credentials);
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|server rendered html/iu.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (/hydrat|server rendered html/iu.test(error.message)) {
      hydrationErrors.push(error.message);
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('console-kit-proof-root')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Account security' })).toBeVisible();
  await expect(page.getByText(credentials.email, { exact: true }).first()).toBeVisible();
  expect(hydrationErrors).toEqual([]);
  await signOutThroughUi(page);
});

test('signs up, sends, and consumes fresh email verification through Console Kit', async ({
  browser,
  page
}) => {
  const tenant = proof.tenant('auth:hardened');
  const verificationCredentials = {
    email: `console-kit-verify-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };
  let verificationCheckSession: LiveSession | null = null;
  let invalidVerificationContext: BrowserContext | null = null;
  let verificationContext: BrowserContext | null = null;

  try {
    await visitProof(page);
    await signUpThroughUi(page, tenant, verificationCredentials);
    await expect(page.getByText('Unverified', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send verification email', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Verification email sent.');

    const verification = await readVerificationLinkParameters(verificationCredentials.email);
    await signOutThroughUi(page);

    invalidVerificationContext = await browser.newContext({ serviceWorkers: 'block' });
    const invalidVerificationPage = await invalidVerificationContext.newPage();
    await visitProof(invalidVerificationPage);
    await invalidVerificationPage.evaluate(({ databaseId, emailId, token }) => {
      const fragment = new URLSearchParams({
        verification_database_id: databaseId,
        email_id: emailId,
        verification_token: token
      });
      window.location.hash = fragment.toString();
    }, {
      databaseId: tenant.manifest.databaseId,
      emailId: verification.emailId,
      token: `${verification.token}-wrong`
    });
    await expect(invalidVerificationPage.getByText(
      'This email address could not be verified with that credential.',
      { exact: true }
    )).toBeVisible();
    expect(await invalidVerificationPage.evaluate(() =>
      !window.location.hash.includes('verification_token')
    )).toBe(true);
    await invalidVerificationContext.close();
    invalidVerificationContext = null;

    verificationCheckSession = await signIn(tenant, verificationCredentials);
    const rejectedState = await readEmailVerificationState(
      tenant,
      verificationCredentials.email,
      verificationCheckSession.token
    );
    expect(rejectedState).toEqual({ isPrimary: true, isVerified: false });
    await signOut(tenant, verificationCheckSession.token);
    verificationCheckSession = null;

    verificationContext = await browser.newContext({ serviceWorkers: 'block' });
    const verificationPage = await verificationContext.newPage();
    await visitProof(verificationPage);
    await verificationPage.evaluate(({ databaseId, emailId, token }) => {
      const fragment = new URLSearchParams({
        verification_database_id: databaseId,
        email_id: emailId,
        verification_token: token
      });
      window.location.hash = fragment.toString();
    }, {
      databaseId: tenant.manifest.databaseId,
      emailId: verification.emailId,
      token: verification.token
    });
    await expect(verificationPage.getByTestId('console-kit-proof-root')).toHaveAttribute(
      'data-database-id',
      tenant.manifest.databaseId
    );
    await expectSignIn(verificationPage);
    await expect(verificationPage.getByText(
      'Your email address has been verified. You can sign in now.',
      { exact: true }
    )).toBeVisible();
    expect(await verificationPage.evaluate(() =>
      !window.location.hash.includes('verification_token')
    )).toBe(true);

    await signInThroughUi(verificationPage, tenant, verificationCredentials);
    await expect(verificationPage.getByText('Verified', { exact: true })).toBeVisible();

    await signOutThroughUi(verificationPage);
    verificationCheckSession = await signIn(tenant, verificationCredentials);
    const verifiedEmail = await readEmailVerificationState(
      tenant,
      verificationCredentials.email,
      verificationCheckSession.token
    );
    expect(verifiedEmail).toEqual({ isPrimary: true, isVerified: true });
  } finally {
    await Promise.allSettled([
      verificationCheckSession
        ? signOut(tenant, verificationCheckSession.token)
        : Promise.resolve(),
      invalidVerificationContext?.close() ?? Promise.resolve(),
      verificationContext?.close() ?? Promise.resolve()
    ]);
  }
});

test('reads the complete full-preset billing contract through the billing endpoint', async () => {
  const tenant = proof.tenant('full');
  const session = await signIn(tenant, proof.credentials(tenant));
  try {
    const data = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'billing'),
      BILLING_READ,
      {},
      session.token
    );
    let stockFixtureRows = 0;
    for (const field of [
      'plans',
      'planSubscriptions',
      'meters',
      'planPricings',
      'planLimits',
      'planMeterLimits',
      'planCaps'
    ]) {
      const connection = data[field];
      const nodes = connection && typeof connection === 'object' && !Array.isArray(connection)
        ? (connection as Record<string, unknown>).nodes
        : null;
      expect(Array.isArray(nodes), `${field} must return a GraphQL connection`).toBe(true);
      if (Array.isArray(nodes)) stockFixtureRows += nodes.length;
    }
    expect(
      stockFixtureRows,
      'The stock full-preset seed intentionally has no billing fixture rows.'
    ).toBe(0);
  } finally {
    await signOut(tenant, session.token);
  }
});

test('loads authoritative memberships and fails closed around organization RLS', async ({ browser, page }) => {
  const tenant = proof.tenant('full');
  const appInviteEmail = `console-kit-app-invite-${randomUUID()}@example.test`;
  const organizationInviteEmail = `console-kit-org-invite-${randomUUID()}@example.test`;
  const unauthorizedInviteEmail = `console-kit-denied-org-invite-${randomUUID()}@example.test`;
  const organizationName = `Console Kit Proof ${randomUUID().slice(0, 8)}`;
  const unauthorizedOrganizationName = `Console Kit Denied ${randomUUID().slice(0, 8)}`;
  const ordinaryCredentials = {
    email: `console-kit-ordinary-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };
  const cleanupSession = await signIn(tenant, proof.credentials(tenant));
  let organizationId: string | null = null;
  let ordinarySession: LiveSession | null = null;
  const ordinaryUserIds = new Set<string>();
  const ordinarySignupBaselineActorIds = new Set<string>();
  let ordinarySignupAttempted = false;
  let ordinaryContext: BrowserContext | null = null;
  let ownerUiSignedIn = false;
  let ordinaryUiSignedIn = false;
  let scenarioFailure: unknown;

  try {
    const seededMemberships = await readMembershipProof(tenant, cleanupSession.token);
    const seededAppMembershipRows = seededMemberships.appMemberships.filter(
      (membership) => membership.actorId === cleanupSession.userId
    );
    expect(seededAppMembershipRows).toHaveLength(1);
    const [seededAppMembership] = seededAppMembershipRows;
    expect(seededAppMembership).toMatchObject({
      actorId: cleanupSession.userId,
      isOwner: true,
      isAdmin: true,
      isActive: true,
      isApproved: true,
      isVerified: true,
      isBanned: false,
      isDisabled: false
    });
    expect(seededAppMembership?.permissions).toMatch(/^1+$/u);
    const seededUsers = await readOrganizationUsers(tenant, cleanupSession.token);
    const seededUser = seededUsers.find((user) => user.id === cleanupSession.userId);
    expect(seededUser).toBeDefined();
    const seededUserLabel = typeof seededUser?.displayName === 'string' && seededUser.displayName
      ? seededUser.displayName
      : typeof seededUser?.username === 'string' && seededUser.username
        ? seededUser.username
        : cleanupSession.userId;

    await visitProof(page);
    await signInThroughUi(page, tenant, proof.credentials(tenant));
    ownerUiSignedIn = true;

    await openFeature(page, 'Users');
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
    const seededAppMemberRow = page.getByRole('row')
      .filter({ hasText: seededUserLabel })
      .filter({ hasText: 'Owner' })
      .filter({ hasText: 'active' });
    await expect(seededAppMemberRow).toHaveCount(1);
    await expect(seededAppMemberRow).toBeVisible();
    await page.getByRole('button', { name: 'Invite member' }).click();
    const appInviteDialog = page.getByRole('dialog', { name: 'Invite an app member' });
    await expect(appInviteDialog.getByRole('combobox', { name: 'Role' })).toHaveCount(0);
    await appInviteDialog.getByRole('textbox', { name: 'Email address' }).fill(appInviteEmail);
    await appInviteDialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(appInviteDialog).toBeHidden();
    await page.getByRole('tab', { name: /Invitations/u }).click();
    await expect(page.getByText(appInviteEmail, { exact: true })).toBeVisible();
    const appInviteRow = page.getByRole('row').filter({ hasText: appInviteEmail });
    await appInviteRow.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText(appInviteEmail, { exact: true })).toHaveCount(0);

    await openFeature(page, 'Organizations');
    await expect(page.getByRole('heading', { level: 1, name: 'Organizations' })).toBeVisible();
    await expect(page.getByText('No organizations yet', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New organization' }).click();
    const createOrganizationDialog = page.getByRole('dialog', {
      name: 'Create an organization'
    });
    await createOrganizationDialog.getByRole('textbox', { name: 'Organization name' })
      .fill(organizationName);
    await createOrganizationDialog.getByRole('button', { name: 'Create organization' }).click();
    await expect(createOrganizationDialog).toBeHidden();
    await expect(page.getByText(organizationName, { exact: true }).first()).toBeVisible();

    const organizationRows = await pollRows(
      () => readOrganizationUsers(tenant, cleanupSession.token),
      (rows) => rows.some((row) => row.displayName === organizationName && row.type === 2)
    );
    const createdOrganization = organizationRows.find(
      (row) => row.displayName === organizationName && row.type === 2
    );
    organizationId = typeof createdOrganization?.id === 'string'
      ? createdOrganization.id
      : null;
    expect(organizationId).toBeTruthy();

    const ownerMembershipRows = await pollRows(async () => {
      const memberships = await readMembershipProof(tenant, cleanupSession.token);
      return memberships.orgMemberships;
    }, (rows) => rows.some((row) =>
      row.actorId === cleanupSession.userId && row.entityId === organizationId
    ));
    const matchingOwnerMemberships = ownerMembershipRows.filter((row) =>
      row.actorId === cleanupSession.userId && row.entityId === organizationId
    );
    expect(matchingOwnerMemberships).toHaveLength(1);
    const [ownerMembership] = matchingOwnerMemberships;
    expect(ownerMembership).toMatchObject({
      actorId: cleanupSession.userId,
      entityId: organizationId,
      isOwner: true,
      isAdmin: true,
      isActive: true,
      isApproved: true,
      isBanned: false,
      isDisabled: false,
      isReadOnly: false
    });
    expect(ownerMembership?.permissions).toMatch(/^1+$/u);
    const organizationPermissionDefaults = await readProofConnection(
      tenant,
      'admin',
      cleanupSession.token,
      'ConsoleKitProofOrganizationPermissionDefaults',
      'orgPermissionDefaults',
      'id entityId'
    );
    const fixturePermissionDefaults = organizationPermissionDefaults.filter(
      (permissionDefault) => permissionDefault.entityId === organizationId
    );
    expect(fixturePermissionDefaults).toHaveLength(1);
    const permissionDefaultId = fixturePermissionDefaults[0]?.id;
    expect(typeof permissionDefaultId).toBe('string');
    const deletedPermissionDefault = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'admin'),
      DELETE_ORGANIZATION_PERMISSION_DEFAULT,
      { input: { id: permissionDefaultId } },
      cleanupSession.token
    );
    expect(mutationRowId(
      deletedPermissionDefault,
      'deleteOrgPermissionDefault',
      'orgPermissionDefault'
    )).toBe(permissionDefaultId);
    const permissionDefaultsAfterDelete = await readProofConnection(
      tenant,
      'admin',
      cleanupSession.token,
      'ConsoleKitProofOrganizationPermissionDefaultsAfterDelete',
      'orgPermissionDefaults',
      'id entityId'
    );
    expect(permissionDefaultsAfterDelete.some(
      (permissionDefault) => permissionDefault.entityId === organizationId
    )).toBe(false);
    const organizationOwnerRow = page.getByRole('row')
      .filter({ hasText: seededUserLabel })
      .filter({ hasText: 'Owner' })
      .filter({ hasText: 'active' });
    await expect(organizationOwnerRow).toHaveCount(1);
    await expect(organizationOwnerRow).toBeVisible();

    await page.getByRole('button', { name: 'Invite member' }).click();
    const organizationInviteDialog = page.getByRole('dialog', {
      name: 'Invite an organization member'
    });
    await expect(organizationInviteDialog.getByRole('combobox', { name: 'Role' }))
      .toHaveCount(0);
    await organizationInviteDialog.getByRole('textbox', { name: 'Email address' })
      .fill(organizationInviteEmail);
    await organizationInviteDialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(organizationInviteDialog).toBeHidden();
    await page.getByRole('tab', { name: /Invitations/u }).click();
    await expect(page.getByText(organizationInviteEmail, { exact: true })).toBeVisible();
    const organizationInviteRow = page.getByRole('row').filter({
      hasText: organizationInviteEmail
    });
    await organizationInviteRow.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText(organizationInviteEmail, { exact: true })).toHaveCount(0);

    const beforeOrdinarySignup = await readMembershipProof(tenant, cleanupSession.token);
    for (const membership of beforeOrdinarySignup.appMemberships) {
      if (typeof membership.actorId === 'string') {
        ordinarySignupBaselineActorIds.add(membership.actorId);
      }
    }
    ordinarySignupAttempted = true;
    ordinarySession = await signUp(tenant, ordinaryCredentials);
    ordinaryUserIds.add(ordinarySession.userId);
    const newOrdinaryMemberships = await readMembershipProof(tenant, cleanupSession.token);
    const newOrdinaryAppMembershipRows = newOrdinaryMemberships.appMemberships.filter(
      (membership) => membership.actorId === ordinarySession?.userId
    );
    expect(newOrdinaryAppMembershipRows).toHaveLength(1);
    expect(newOrdinaryAppMembershipRows[0]).toMatchObject({
      actorId: ordinarySession.userId,
      isOwner: false,
      isAdmin: false,
      isActive: false,
      isApproved: false,
      isVerified: false,
      isBanned: false,
      isDisabled: false
    });
    expect(newOrdinaryAppMembershipRows[0]?.permissions).toMatch(/^0+$/u);
    const ordinaryMembershipId = newOrdinaryAppMembershipRows[0]?.id;
    expect(typeof ordinaryMembershipId).toBe('string');
    const activatedMembership = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'admin'),
      UPDATE_APP_MEMBERSHIP,
      {
        input: {
          id: ordinaryMembershipId,
          appMembershipPatch: { isApproved: true, isVerified: true }
        }
      },
      cleanupSession.token
    );
    expect(mutationRowId(activatedMembership, 'updateAppMembership', 'appMembership'))
      .toBe(ordinaryMembershipId);
    const ordinaryAppMembershipRows = await pollRows(async () => {
      const memberships = await readMembershipProof(tenant, ordinarySession!.token);
      return memberships.appMemberships;
    }, (rows) => rows.some((membership) =>
      membership.actorId === ordinarySession?.userId && membership.isActive === true
    ));
    const activeOrdinaryAppMemberships = ordinaryAppMembershipRows.filter(
      (membership) => membership.actorId === ordinarySession?.userId
    );
    expect(activeOrdinaryAppMemberships).toHaveLength(1);
    expect(activeOrdinaryAppMemberships[0]).toMatchObject({
      actorId: ordinarySession.userId,
      isOwner: false,
      isAdmin: false,
      isActive: true,
      isApproved: true,
      isVerified: true,
      isBanned: false,
      isDisabled: false
    });
    expect(activeOrdinaryAppMemberships[0]?.permissions).toMatch(/^0+$/u);
    const createdOrdinaryOrgMembership = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'admin'),
      CREATE_ORGANIZATION_MEMBERSHIP,
      {
        input: {
          orgMembership: {
            actorId: ordinarySession.userId,
            entityId: organizationId
          }
        }
      },
      cleanupSession.token
    );
    const ordinaryOrgMembershipId = mutationRowId(
      createdOrdinaryOrgMembership,
      'createOrgMembership',
      'orgMembership'
    );
    expect(typeof ordinaryOrgMembershipId).toBe('string');
    const approvedOrdinaryOrgMembership = await graphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'admin'),
      UPDATE_ORGANIZATION_MEMBERSHIP,
      {
        input: {
          id: ordinaryOrgMembershipId,
          orgMembershipPatch: { isApproved: true }
        }
      },
      cleanupSession.token
    );
    expect(mutationRowId(
      approvedOrdinaryOrgMembership,
      'updateOrgMembership',
      'orgMembership'
    )).toBe(ordinaryOrgMembershipId);
    const ordinaryOrgMembershipRows = await pollRows(async () => {
      const memberships = await readMembershipProof(tenant, ordinarySession!.token);
      return memberships.orgMemberships;
    }, (rows) => rows.some((membership) =>
      membership.id === ordinaryOrgMembershipId &&
      membership.actorId === ordinarySession?.userId &&
      membership.entityId === organizationId &&
      membership.isActive === true
    ));
    const activeOrdinaryOrgMemberships = ordinaryOrgMembershipRows.filter(
      (membership) => membership.id === ordinaryOrgMembershipId
    );
    expect(activeOrdinaryOrgMemberships).toHaveLength(1);
    expect(activeOrdinaryOrgMemberships[0]).toMatchObject({
      actorId: ordinarySession.userId,
      entityId: organizationId,
      isOwner: false,
      isAdmin: false,
      isActive: true,
      isApproved: true,
      isBanned: false,
      isDisabled: false,
      isReadOnly: false
    });
    expect(activeOrdinaryOrgMemberships[0]?.permissions).toMatch(/^0+$/u);
    const ordinaryVisibleOrgMembers = await readProofConnection(
      tenant,
      'admin',
      ordinarySession.token,
      'ConsoleKitProofOrdinaryVisibleOrgMembers',
      'orgMembers',
      'id actorId entityId'
    );
    expect(ordinaryVisibleOrgMembers.filter((member) =>
      member.actorId === ordinarySession?.userId && member.entityId === organizationId
    )).toHaveLength(1);
    const deniedOrganization = await rawGraphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'auth'),
      CREATE_ORGANIZATION_USER,
      {
        input: {
          user: { displayName: unauthorizedOrganizationName, type: 2 }
        }
      },
      ordinarySession.token
    );
    expect(deniedOrganization.errors?.length ?? 0).toBeGreaterThan(0);
    expect(
      deniedOrganization.data && typeof deniedOrganization.data === 'object'
        ? deniedOrganization.data.createUser
        : null
    ).toBeFalsy();
    const usersAfterDeniedOrganization = await readOrganizationUsers(
      tenant,
      cleanupSession.token
    );
    expect(usersAfterDeniedOrganization.some((user) =>
      user.type === 2 && user.displayName === unauthorizedOrganizationName
    )).toBe(false);

    const deniedInvite = await rawGraphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'admin'),
      CREATE_ORGANIZATION_INVITE,
      {
        input: {
          orgInvite: { entityId: organizationId, email: unauthorizedInviteEmail }
        }
      },
      ordinarySession.token
    );
    expect(deniedInvite.errors?.length ?? 0).toBeGreaterThan(0);
    expect(
      deniedInvite.data && typeof deniedInvite.data === 'object'
        ? deniedInvite.data.createOrgInvite
        : null
    ).toBeFalsy();
    const membershipsAfterDeniedInvite = await readMembershipProof(
      tenant,
      cleanupSession.token
    );
    expect(membershipsAfterDeniedInvite.orgInvites.some((invite) =>
      invite.email === unauthorizedInviteEmail
    )).toBe(false);

    ordinaryContext = await browser.newContext({ serviceWorkers: 'block' });
    const ordinaryPage = await ordinaryContext.newPage();
    await visitProof(ordinaryPage);
    await signInThroughUi(ordinaryPage, tenant, ordinaryCredentials);
    ordinaryUiSignedIn = true;
    await openFeature(ordinaryPage, 'Users');
    await expect(ordinaryPage.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
    await expect(ordinaryPage.getByRole('button', { name: 'Invite member', exact: true }))
      .toHaveCount(0);
    await openFeature(ordinaryPage, 'Organizations');
    await expect(ordinaryPage.getByRole('heading', { level: 1, name: 'Organizations' }))
      .toBeVisible();
    await expect(ordinaryPage.getByText(organizationName, { exact: true }).first()).toBeVisible();
    await expect(ordinaryPage.getByRole('button', { name: 'New organization', exact: true }))
      .toHaveCount(0);
    await expect(ordinaryPage.getByRole('button', { name: 'Invite member', exact: true }))
      .toHaveCount(0);
    await signOutThroughUi(ordinaryPage);
    ordinaryUiSignedIn = false;
    await ordinaryContext.close();
    ordinaryContext = null;

    await signOutThroughUi(page);
    ownerUiSignedIn = false;
  } catch (cause) {
    scenarioFailure = cause;
  }

  const cleanupFailures: unknown[] = [];
  const cleanup = async (label: string, action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      cleanupFailures.push(new Error(
        `${label}: ${cause instanceof Error ? cause.message : String(cause)}`
      ));
    }
  };
  if (ordinaryContext) {
    if (ordinaryUiSignedIn) {
      await cleanup('sign out the ordinary browser session', async () => {
        await signOutThroughUi((ordinaryContext as BrowserContext).pages()[0]!);
      });
    }
    await cleanup('close the ordinary browser context', async () => {
      await ordinaryContext?.close();
      ordinaryContext = null;
    });
  }
  if (ownerUiSignedIn) {
    await cleanup('sign out the owner browser session', async () => {
      await signOutThroughUi(page);
      ownerUiSignedIn = false;
    });
  }
  if (ordinarySession) {
    await cleanup('revoke the ordinary direct session', async () => {
      await signOut(tenant, ordinarySession!.token);
    });
  } else if (ordinarySignupAttempted) {
    await cleanup('settle an ambiguously committed ordinary signup', async () => {
      const commitHorizon = Date.now() + 30_000;
      const failureHorizon = commitHorizon + 15_000;
      let stableAbsenceSince: number | null = null;
      let lastFailure: unknown;
      for (;;) {
        let membershipReadSucceeded = false;
        let recoveryReadSucceeded = false;
        try {
          const memberships = await readMembershipProof(tenant, cleanupSession.token);
          membershipReadSucceeded = true;
          for (const membership of memberships.appMemberships) {
            if (
              typeof membership.actorId === 'string' &&
              !ordinarySignupBaselineActorIds.has(membership.actorId)
            ) {
              ordinaryUserIds.add(membership.actorId);
            }
          }
        } catch (cause) {
          lastFailure = cause;
        }

        let recovered: LiveSession | null = null;
        try {
          recovered = await recoverAmbiguousSignUp(tenant, ordinaryCredentials);
          recoveryReadSucceeded = true;
        } catch (cause) {
          lastFailure = cause;
        }
        if (recovered) {
          ordinarySession = recovered;
          ordinaryUserIds.add(recovered.userId);
          await signOut(tenant, recovered.token);
          return;
        }
        if (ordinaryUserIds.size > 0) return;

        const now = Date.now();
        if (membershipReadSucceeded && recoveryReadSucceeded && now >= commitHorizon) {
          stableAbsenceSince ??= now;
          if (now - stableAbsenceSince >= 2_000) return;
        } else {
          stableAbsenceSince = null;
        }
        if (now >= failureHorizon) {
          throw lastFailure instanceof Error
            ? lastFailure
            : new Error('The ambiguous signup outcome could not be settled.');
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });
  }

  const fixtureOrganizationIds = new Set<string>();
  if (organizationId) fixtureOrganizationIds.add(organizationId);
  await cleanup('discover created organization identities', async () => {
    const users = await readOrganizationUsers(tenant, cleanupSession.token);
    for (const user of users) {
      if (
        user.type === 2 &&
        (user.displayName === organizationName || user.displayName === unauthorizedOrganizationName) &&
        typeof user.id === 'string'
      ) {
        fixtureOrganizationIds.add(user.id);
      }
    }
  });

  await cleanup('remove retained invitation fixtures', async () => {
    const memberships = await readMembershipProof(tenant, cleanupSession.token);
    const appEmails = new Set([appInviteEmail]);
    const organizationEmails = new Set([organizationInviteEmail, unauthorizedInviteEmail]);
    for (const invite of memberships.appInvites) {
      if (!appEmails.has(String(invite.email)) || typeof invite.id !== 'string') continue;
      const deleted = await graphQL<Record<string, unknown>>(
        endpointUrl(tenant, 'admin'),
        DELETE_APP_INVITE,
        { input: { id: invite.id } },
        cleanupSession.token
      );
      expect(mutationRowId(deleted, 'deleteAppInvite', 'appInvite')).toBe(invite.id);
    }
    for (const invite of memberships.orgInvites) {
      if (!organizationEmails.has(String(invite.email)) || typeof invite.id !== 'string') continue;
      const deleted = await graphQL<Record<string, unknown>>(
        endpointUrl(tenant, 'admin'),
        DELETE_ORGANIZATION_INVITE,
        { input: { id: invite.id } },
        cleanupSession.token
      );
      expect(mutationRowId(deleted, 'deleteOrgInvite', 'orgInvite')).toBe(invite.id);
    }
  });

  if (ordinarySession) ordinaryUserIds.add(ordinarySession.userId);
  if (ordinaryUserIds.size > 0) {
    await cleanup('remove the ordinary proof identity', async () => {
      for (const userId of ordinaryUserIds) {
        const deleted = await graphQL<Record<string, unknown>>(
          endpointUrl(tenant, 'auth'),
          DELETE_USER,
          { input: { id: userId } },
          cleanupSession.token
        );
        expect(mutationRowId(deleted, 'deleteUser', 'user')).toBe(userId);
      }
    });
  }
  await cleanup('remove created organization identities', async () => {
    for (const id of fixtureOrganizationIds) {
      const deleted = await graphQL<Record<string, unknown>>(
        endpointUrl(tenant, 'auth'),
        DELETE_USER,
        { input: { id } },
        cleanupSession.token
      );
      expect(mutationRowId(deleted, 'deleteUser', 'user')).toBe(id);
    }
  });

  await cleanup('verify membership fixture cleanup', async () => {
    const [users, memberships] = await Promise.all([
      readOrganizationUsers(tenant, cleanupSession.token),
      readMembershipProof(tenant, cleanupSession.token)
    ]);
    expect(users.some((user) =>
      fixtureOrganizationIds.has(String(user.id)) ||
      user.displayName === organizationName ||
      user.displayName === unauthorizedOrganizationName ||
      ordinaryUserIds.has(String(user.id))
    )).toBe(false);
    expect(memberships.appInvites.some((invite) => invite.email === appInviteEmail)).toBe(false);
    expect(memberships.orgInvites.some((invite) =>
      invite.email === organizationInviteEmail || invite.email === unauthorizedInviteEmail
    )).toBe(false);
    expect(memberships.orgMemberships.some((membership) =>
      fixtureOrganizationIds.has(String(membership.entityId))
    )).toBe(false);
    expect(memberships.appMemberships.some((membership) =>
      ordinaryUserIds.has(String(membership.actorId))
    )).toBe(false);
  });
  await cleanup('revoke the cleanup session', async () => {
    await signOut(tenant, cleanupSession.token);
  });

  const failures = [
    ...(scenarioFailure === undefined ? [] : [scenarioFailure]),
    ...cleanupFailures
  ];
  if (failures.length > 0) {
    throw new AggregateError(failures, 'The membership proof or its cleanup failed.');
  }
});

test('rejects invalid, cross-tenant, and revoked bearer tokens at HTTP-200 GraphQL boundaries', async () => {
  const first = proof.tenant('auth:hardened');
  const second = proof.tenant('b2b:storage');
  const firstSession = await signIn(first, proof.credentials(first));
  const secondSession = await signIn(second, proof.credentials(second));
  const health = 'query ConsoleKitBearerProof { __typename }';

  try {
    const invalid = await rawGraphQL(endpointUrl(first, 'data'), health, {}, 'invalid.console.token');
    expect(invalid.data == null).toBe(true);
    expect(authenticationErrorCodes(invalid)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
    );

    const crossed = await rawGraphQL(endpointUrl(second, 'data'), health, {}, firstSession.token);
    expect(crossed.data == null).toBe(true);
    expect(authenticationErrorCodes(crossed)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
    );

    await signOut(second, secondSession.token);
    const revoked = await rawGraphQL(endpointUrl(second, 'data'), health, {}, secondSession.token);
    expect(revoked.data == null).toBe(true);
    expect(authenticationErrorCodes(revoked)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
    );
  } finally {
    await Promise.allSettled([
      signOut(first, firstSession.token),
      signOut(second, secondSession.token)
    ]);
  }
});

test('binds sign-in and sign-up sessions to their original strict-auth fingerprint', async () => {
  const tenant = proof.tenant('auth:hardened');
  const signedIn = await signIn(tenant, proof.credentials(tenant));
  const signedUp = await signUp(tenant, {
    email: `console-kit-strict-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  });
  const endpoint = endpointUrl(tenant, 'data');
  const health = 'query ConsoleKitStrictAuthProof { __typename }';

  try {
    for (const session of [signedIn, signedUp]) {
      const original = await rawGraphQL<{ __typename: string }>(
        endpoint,
        health,
        {},
        session.token
      );
      expect(original.errors).toBeUndefined();
      expect(original.data?.__typename).toBe('Query');

      const wrongUserAgent = await rawGraphQL(
        endpoint,
        health,
        {},
        session.token,
        { userAgent: 'constructive-console-kit-live-proof-mismatch' }
      );
      expect(wrongUserAgent.data == null).toBe(true);
      expect(authenticationErrorCodes(wrongUserAgent)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
      );

      const wrongOrigin = await rawGraphQL(
        endpoint,
        health,
        {},
        session.token,
        { origin: 'http://127.0.0.1:3999' }
      );
      expect(wrongOrigin.data == null).toBe(true);
      expect(authenticationErrorCodes(wrongOrigin)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
      );

      const restored = await rawGraphQL<{ __typename: string }>(
        endpoint,
        health,
        {},
        session.token
      );
      expect(restored.errors).toBeUndefined();
      expect(restored.data?.__typename).toBe('Query');
    }
  } finally {
    await Promise.allSettled([
      signOut(tenant, signedIn.token),
      signOut(tenant, signedUp.token)
    ]);
  }
});

test('enforces direct-owner RLS across create, read, update, and delete', async () => {
  const tenant = proof.tenant('auth:hardened');
  const owner = await signIn(tenant, proof.credentials(tenant));
  const strangerCredentials = {
    email: `console-kit-rls-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };
  const stranger = await signUp(tenant, strangerCredentials);
  const ownerSchema = await loadSchema(tenant, owner.token);
  const strangerSchema = await loadSchema(tenant, stranger.token);
  const ownerTable = ownerSchema.table('Contact');
  const strangerTable = strangerSchema.table('Contact');
  const marker = randomUUID();
  let ownerRow: Readonly<Record<string, unknown>> | null = null;
  let strangerRow: Readonly<Record<string, unknown>> | null = null;

  try {
    ownerRow = await createRow(
      tenant,
      owner.token,
      ownerSchema,
      ownerTable,
      { firstName: `Owner-${marker}`, lastName: 'Original', ownerId: owner.userId },
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    strangerRow = await createRow(
      tenant,
      stranger.token,
      strangerSchema,
      strangerTable,
      { firstName: `Stranger-${marker}`, lastName: 'Original', ownerId: stranger.userId },
      ['id', 'firstName', 'lastName', 'ownerId']
    );

    const blockedCreate = createRequest(
      strangerSchema,
      strangerTable,
      { firstName: `Impersonated-${marker}`, lastName: 'Blocked', ownerId: owner.userId },
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    const blockedCreatePayload = await rawGraphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'data'),
      blockedCreate.document,
      blockedCreate.variables,
      stranger.token
    );
    const blockedCreateMutation = blockedCreatePayload.data?.[blockedCreate.mutation];
    const blockedCreateRow = blockedCreateMutation && typeof blockedCreateMutation === 'object' && !Array.isArray(blockedCreateMutation)
      ? (blockedCreateMutation as Record<string, unknown>)[blockedCreate.singular]
      : null;
    expect(Boolean(blockedCreatePayload.errors?.length) || blockedCreateRow == null).toBe(true);

    const ownerRows = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerTable,
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    const strangerRows = await listRows(
      tenant,
      stranger.token,
      strangerSchema,
      strangerTable,
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    expect(ownerRows.some((row) => row.id === ownerRow?.id)).toBe(true);
    expect(ownerRows.some((row) => row.id === strangerRow?.id)).toBe(false);
    expect(strangerRows.some((row) => row.id === strangerRow?.id)).toBe(true);
    expect(strangerRows.some((row) => row.id === ownerRow?.id)).toBe(false);
    expect(strangerRows.some((row) => row.firstName === `Impersonated-${marker}`)).toBe(false);

    const blocked = updateRequest(
      strangerSchema,
      strangerTable,
      ownerRow,
      { lastName: 'Cross-tenant-write' },
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    const blockedPayload = await rawGraphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'data'),
      blocked.document,
      blocked.variables,
      stranger.token
    );
    const blockedMutation = blockedPayload.data?.[blocked.mutation];
    const blockedRow = blockedMutation && typeof blockedMutation === 'object' && !Array.isArray(blockedMutation)
      ? (blockedMutation as Record<string, unknown>)[blocked.singular]
      : null;
    expect(Boolean(blockedPayload.errors?.length) || blockedRow == null).toBe(true);

    const blockedDelete = deleteRequest(strangerSchema, strangerTable, ownerRow);
    await rawGraphQL(
      endpointUrl(tenant, 'data'),
      blockedDelete.document,
      blockedDelete.variables,
      stranger.token
    );
    const ownerRowsAfterBlockedWrites = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerTable,
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    const unchangedOwnerRow = ownerRowsAfterBlockedWrites.find((row) => row.id === ownerRow?.id);
    expect(unchangedOwnerRow?.lastName).toBe('Original');

    const updated = await updateRow(
      tenant,
      owner.token,
      ownerSchema,
      ownerTable,
      ownerRow,
      { lastName: 'Updated' },
      ['id', 'firstName', 'lastName', 'ownerId']
    );
    expect(updated.lastName).toBe('Updated');
  } finally {
    if (ownerRow) await deleteRow(tenant, owner.token, ownerSchema, ownerTable, ownerRow);
    if (strangerRow) await deleteRow(tenant, stranger.token, strangerSchema, strangerTable, strangerRow);
    await Promise.allSettled([
      signOut(tenant, owner.token),
      signOut(tenant, stranger.token)
    ]);
  }
});

test('persists b2b SaaS project CRUD and isolates projects between signed-up app users', async () => {
  const tenant = proof.tenant('b2b:storage');
  const owner = await signIn(tenant, proof.credentials(tenant));
  const strangerCredentials = {
    email: `console-kit-b2b-rls-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };
  const marker = randomUUID();
  let stranger: LiveSession | null = null;
  let ownerSchema: LiveSchema | null = null;
  let strangerSchema: LiveSchema | null = null;
  let ownerProjectTable: LiveTable | null = null;
  let strangerProjectTable: LiveTable | null = null;
  let ownerProject: Readonly<Record<string, unknown>> | null = null;
  let strangerProject: Readonly<Record<string, unknown>> | null = null;

  try {
    stranger = await signUp(tenant, strangerCredentials);
    ownerSchema = await loadSchema(tenant, owner.token);
    strangerSchema = await loadSchema(tenant, stranger.token);
    const organizationTable = ownerSchema.table('Organization');
    ownerProjectTable = ownerSchema.table('Project');
    strangerProjectTable = strangerSchema.table('Project');
    const organizations = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      organizationTable,
      ['id']
    );
    const organizationId = organizations[0]?.id;
    if (typeof organizationId !== 'string') {
      throw new Error('The SaaS fixture has no organization for the project CRUD proof.');
    }

    ownerProject = await createRow(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      {
        name: `Owner project ${marker}`,
        description: 'Original owner description',
        organizationId
      },
      ['id', 'name', 'description', 'organizationId', 'ownerId']
    );
    strangerProject = await createRow(
      tenant,
      stranger.token,
      strangerSchema,
      strangerProjectTable,
      {
        name: `Stranger project ${marker}`,
        description: 'Original stranger description',
        organizationId
      },
      ['id', 'name', 'description', 'organizationId', 'ownerId']
    );
    expect(ownerProject.ownerId).toBe(owner.userId);
    expect(strangerProject.ownerId).toBe(stranger.userId);

    let ownerRows = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      ['id', 'name', 'description', 'organizationId', 'ownerId']
    );
    const strangerRows = await listRows(
      tenant,
      stranger.token,
      strangerSchema,
      strangerProjectTable,
      ['id', 'name', 'description', 'organizationId', 'ownerId']
    );
    expect(ownerRows.some((row) => row.id === ownerProject?.id)).toBe(true);
    expect(ownerRows.some((row) => row.id === strangerProject?.id)).toBe(false);
    expect(strangerRows.some((row) => row.id === strangerProject?.id)).toBe(true);
    expect(strangerRows.some((row) => row.id === ownerProject?.id)).toBe(false);

    ownerProject = await updateRow(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      ownerProject,
      { description: 'Persisted owner update' },
      ['id', 'name', 'description', 'organizationId', 'ownerId']
    );
    ownerRows = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      ['id', 'description', 'ownerId']
    );
    expect(ownerRows.find((row) => row.id === ownerProject?.id)?.description)
      .toBe('Persisted owner update');

    const blockedUpdate = updateRequest(
      strangerSchema,
      strangerProjectTable,
      ownerProject,
      { description: 'Cross-owner update' },
      ['id', 'description', 'ownerId']
    );
    const blockedUpdatePayload = await rawGraphQL<Record<string, unknown>>(
      endpointUrl(tenant, 'data'),
      blockedUpdate.document,
      blockedUpdate.variables,
      stranger.token
    );
    const blockedUpdateMutation = blockedUpdatePayload.data?.[blockedUpdate.mutation];
    const blockedUpdateRow = blockedUpdateMutation &&
      typeof blockedUpdateMutation === 'object' &&
      !Array.isArray(blockedUpdateMutation)
      ? (blockedUpdateMutation as Record<string, unknown>)[blockedUpdate.singular]
      : null;
    expect(Boolean(blockedUpdatePayload.errors?.length) || blockedUpdateRow == null).toBe(true);

    const blockedDelete = deleteRequest(strangerSchema, strangerProjectTable, ownerProject);
    await rawGraphQL(
      endpointUrl(tenant, 'data'),
      blockedDelete.document,
      blockedDelete.variables,
      stranger.token
    );
    ownerRows = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      ['id', 'description', 'ownerId']
    );
    expect(ownerRows.find((row) => row.id === ownerProject?.id)?.description)
      .toBe('Persisted owner update');

    await deleteRow(tenant, owner.token, ownerSchema, ownerProjectTable, ownerProject);
    const ownerRowsAfterDelete = await listRows(
      tenant,
      owner.token,
      ownerSchema,
      ownerProjectTable,
      ['id']
    );
    expect(ownerRowsAfterDelete.some((row) => row.id === ownerProject?.id)).toBe(false);
    ownerProject = null;
  } finally {
    if (ownerProject && ownerSchema && ownerProjectTable) {
      await deleteRow(
        tenant,
        owner.token,
        ownerSchema,
        ownerProjectTable,
        ownerProject
      ).catch(() => undefined);
    }
    if (strangerProject && stranger && strangerSchema && strangerProjectTable) {
      await deleteRow(
        tenant,
        stranger.token,
        strangerSchema,
        strangerProjectTable,
        strangerProject
      ).catch(() => undefined);
    }
    await Promise.allSettled([
      signOut(tenant, owner.token),
      ...(stranger ? [signOut(tenant, stranger.token)] : [])
    ]);
  }
});

test('round-trips a composite post_tags primary key through _meta-derived mutations', async () => {
  const tenant = proof.tenant('full');
  const session = await signIn(tenant, proof.credentials(tenant));
  const schema = await loadSchema(tenant, session.token);
  const postTable = schema.table('Post');
  const tagTable = schema.table('Tag');
  const postTagTable = schema.table('PostTag');
  let composite: Readonly<Record<string, unknown>> | null = null;

  try {
    const [posts, tags, postTags] = await Promise.all([
      listRows(tenant, session.token, schema, postTable, ['id']),
      listRows(tenant, session.token, schema, tagTable, ['id']),
      listRows(tenant, session.token, schema, postTagTable, ['postId', 'tagId'])
    ]);
    const existing = new Set(postTags.map((row) => `${String(row.postId)}:${String(row.tagId)}`));
    const candidate = posts.flatMap((post) => tags.map((tag) => ({
      postId: post.id,
      tagId: tag.id
    }))).find((pair) =>
      typeof pair.postId === 'string' &&
      typeof pair.tagId === 'string' &&
      !existing.has(`${pair.postId}:${pair.tagId}`)
    );
    if (!candidate || typeof candidate.postId !== 'string' || typeof candidate.tagId !== 'string') {
      throw new Error('The blog fixture has no unused post/tag pair for the composite-key proof.');
    }

    composite = await createRow(
      tenant,
      session.token,
      schema,
      postTagTable,
      candidate,
      ['postId', 'tagId']
    );
    let rows = await listRows(
      tenant,
      session.token,
      schema,
      postTagTable,
      ['postId', 'tagId']
    );
    expect(rows.some((row) =>
      row.postId === composite?.postId && row.tagId === composite?.tagId
    )).toBe(true);

    await deleteRow(tenant, session.token, schema, postTagTable, composite);
    rows = await listRows(
      tenant,
      session.token,
      schema,
      postTagTable,
      ['postId', 'tagId']
    );
    expect(rows.some((row) =>
      row.postId === composite?.postId && row.tagId === composite?.tagId
    )).toBe(false);
    composite = null;
  } finally {
    if (composite) {
      await deleteRow(tenant, session.token, schema, postTagTable, composite).catch(() => undefined);
    }
    await signOut(tenant, session.token).catch(() => undefined);
  }
});

test('persists UI CRUD and deletes a composite-key post_tags row through Sheets', async ({ page }) => {
  const tenant = proof.tenant('full');
  const credentials = proof.credentials(tenant);
  const apiSession = await signIn(tenant, credentials);
  const schema = await loadSchema(tenant, apiSession.token);
  const tagTable = schema.table('Tag');
  const postTable = schema.table('Post');
  const postTagTable = schema.table('PostTag');
  const marker = randomUUID();
  const originalName = `Console proof ${marker}`;
  const updatedName = `Updated proof ${marker}`;
  const slug = `console-proof-${marker}`;
  let createdTag: Readonly<Record<string, unknown>> | null = null;
  let composite: Readonly<Record<string, unknown>> | null = null;

  const readTags = () => listRows(
    tenant,
    apiSession.token,
    schema,
    tagTable,
    ['id', 'name', 'slug']
  );
  try {
    await visitProof(page);
    await signInThroughUi(page, tenant, credentials);
    await expectDataExplorer(page, tenant);
    const tagGrid = await selectDataTable(page, 'Tag');
    await page.getByRole('button', { name: 'Add row', exact: true }).click();
    const draftSave = tagGrid.locator('[data-slot="draft-action-cell"]');
    await expect(draftSave).toHaveCount(1);
    const actionCellId = await draftSave.locator('xpath=ancestor::div[starts-with(@id, "sheets-cell-")][1]').getAttribute('id');
    const rowIndex = Number(actionCellId?.split('-')[2]);
    expect(Number.isInteger(rowIndex)).toBe(true);
    await editDraftCell(tagGrid, rowIndex, 'name', originalName);
    await editDraftCell(tagGrid, rowIndex, 'slug', slug);
    await draftSave.click();

    let tags = await pollRows(readTags, (rows) => rows.some((row) => row.slug === slug));
    createdTag = tags.find((row) => row.slug === slug) ?? null;
    expect(createdTag).toBeTruthy();

    const createdCell = tagGrid.getByRole('gridcell', { name: originalName, exact: true });
    const createdCellId = await createdCell.locator('xpath=ancestor::div[starts-with(@id, "sheets-cell-")][1]').getAttribute('id');
    const createdRowIndex = Number(createdCellId?.split('-')[2]);
    const createdColumnIndex = Number(createdCellId?.split('-')[3]);
    const createdWrapper = tagGrid.locator(`#sheets-cell-${createdRowIndex}-${createdColumnIndex}`);
    await createdWrapper.dblclick();
    const editor = createdWrapper.locator('[data-slot="inline-cell-editor"]');
    await editor.fill(updatedName);
    await editor.press('Enter');
    tags = await pollRows(readTags, (rows) => rows.some(
      (row) => row.slug === slug && row.name === updatedName
    ));
    expect(tags.some((row) => row.slug === slug && row.name === updatedName)).toBe(true);

    await page.getByRole('checkbox', { name: `Select row ${createdRowIndex}` }).click();
    await page.getByRole('button', { name: 'Delete (1)', exact: true }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete rows?' });
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    tags = await pollRows(readTags, (rows) => !rows.some((row) => row.slug === slug));
    expect(tags.some((row) => row.slug === slug)).toBe(false);
    createdTag = null;

    const [posts, availableTags, existingPostTags] = await Promise.all([
      listRows(tenant, apiSession.token, schema, postTable, ['id']),
      readTags(),
      listRows(tenant, apiSession.token, schema, postTagTable, ['postId', 'tagId'])
    ]);
    const existingPairs = new Set(existingPostTags.map((row) => `${String(row.postId)}:${String(row.tagId)}`));
    const candidate = posts.flatMap((post) => availableTags.map((tag) => ({
      postId: post.id,
      tagId: tag.id
    }))).find((pair) =>
      typeof pair.postId === 'string' &&
      typeof pair.tagId === 'string' &&
      !existingPairs.has(`${pair.postId}:${pair.tagId}`)
    );
    if (!candidate || typeof candidate.postId !== 'string' || typeof candidate.tagId !== 'string') {
      throw new Error('The blog fixture has no unused post/tag pair for the composite-key proof.');
    }

    composite = await createRow(
      tenant,
      apiSession.token,
      schema,
      postTagTable,
      candidate,
      ['postId', 'tagId']
    );
    await selectDataTable(page, 'PostTag');
    await expect(page.getByRole('button', { name: 'Add row', exact: true })).toBeEnabled();
    await expect(
      page.locator('[data-part-id="sheets-controls"] [role="status"]').filter({ hasText: 'Read-only' })
    ).toHaveCount(0);

    const postTags = await listRows(
      tenant,
      apiSession.token,
      schema,
      postTagTable,
      ['postId', 'tagId']
    );
    const compositeIndex = postTags.findIndex((row) =>
      row.postId === composite?.postId && row.tagId === composite?.tagId
    );
    expect(compositeIndex).toBeGreaterThanOrEqual(0);
    await page.getByRole('checkbox', { name: `Select row ${compositeIndex}` }).click();
    await page.getByRole('button', { name: 'Delete (1)', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'Delete rows?' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    const afterDelete = await pollRows(
      () => listRows(tenant, apiSession.token, schema, postTagTable, ['postId', 'tagId']),
      (rows) => !rows.some((row) =>
        row.postId === composite?.postId && row.tagId === composite?.tagId
      )
    );
    expect(afterDelete.some((row) =>
      row.postId === composite?.postId && row.tagId === composite?.tagId
    )).toBe(false);
    composite = null;

    await signOutThroughUi(page);
  } finally {
    if (createdTag) {
      await deleteRow(tenant, apiSession.token, schema, tagTable, createdTag).catch(() => undefined);
    }
    if (composite) {
      await deleteRow(tenant, apiSession.token, schema, postTagTable, composite).catch(() => undefined);
    }
    await signOut(tenant, apiSession.token).catch(() => undefined);
  }
});

test('keeps the live shell usable at the 390px review viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visitProof(page);
  await expect(page.getByRole('combobox', { name: 'Tenant database' })).toBeVisible();
  await expectSignIn(page);
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  const mobileNavigation = page.getByRole('dialog');
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole('link', { name: 'Authentication', exact: true }).click();
  await expect(mobileNavigation).toBeHidden();
});
