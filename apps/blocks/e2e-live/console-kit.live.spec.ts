import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  authenticationErrorCodes,
  createRequest,
  createRow,
  deleteRequest,
  deleteRow,
  listRows,
  loadSchema,
  rawGraphQL,
  signIn,
  signOut,
  signUp,
  updateRequest,
  updateRow
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
  await signOutThroughUi(page);

  await selectTenant(page, first);
  await expect(page.getByText('_meta 2026-07', { exact: true })).toBeVisible();
  await signOutThroughUi(page);

  await signInThroughUi(page, third, proof.credentials(third));
  await expectDataExplorer(page, third);
  await signOutThroughUi(page);
});

test('completes standalone auth and restores the database-scoped session after reload', async ({ page }) => {
  const tenant = proof.tenant('auth:hardened');
  const credentials = {
    email: `console-kit-ui-${randomUUID()}@example.test`,
    password: `ConsoleKit-${randomUUID()}-Aa1!`
  };

  await visitProof(page);
  await selectTenant(page, tenant);
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Account security' })).toBeVisible();
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

test('loads membership views and creates roleless app and organization invitations', async ({ page }) => {
  const tenant = proof.tenant('full');
  const appInviteEmail = `console-kit-app-invite-${randomUUID()}@example.test`;
  const organizationInviteEmail = `console-kit-org-invite-${randomUUID()}@example.test`;

  await visitProof(page);
  await signInThroughUi(page, tenant, proof.credentials(tenant));

  await openFeature(page, 'Users');
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  await page.getByRole('button', { name: 'Invite member' }).click();
  const appInviteDialog = page.getByRole('dialog', { name: 'Invite an app member' });
  await expect(appInviteDialog.getByRole('combobox', { name: 'Role' })).toContainText('No role');
  await appInviteDialog.getByRole('textbox', { name: 'Email address' }).fill(appInviteEmail);
  await appInviteDialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(appInviteDialog).toBeHidden();
  await page.getByRole('tab', { name: /Invitations/u }).click();
  await expect(page.getByText(appInviteEmail, { exact: true })).toBeVisible();

  await openFeature(page, 'Organizations');
  await expect(page.getByRole('heading', { level: 1, name: 'Organizations' })).toBeVisible();
  await page.getByRole('button', { name: 'Invite member' }).click();
  const organizationInviteDialog = page.getByRole('dialog', {
    name: 'Invite an organization member'
  });
  await expect(organizationInviteDialog.getByRole('combobox', { name: 'Role' }))
    .toContainText('No role');
  await organizationInviteDialog.getByRole('textbox', { name: 'Email address' })
    .fill(organizationInviteEmail);
  await organizationInviteDialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(organizationInviteDialog).toBeHidden();
  await page.getByRole('tab', { name: /Invitations/u }).click();
  await expect(page.getByText(organizationInviteEmail, { exact: true })).toBeVisible();

  await signOutThroughUi(page);
});

test('rejects invalid, cross-tenant, and revoked bearer tokens at HTTP-200 GraphQL boundaries', async () => {
  const first = proof.tenant('auth:hardened');
  const second = proof.tenant('b2b:storage');
  const firstSession = await signIn(first, proof.credentials(first));
  const secondSession = await signIn(second, proof.credentials(second));
  const health = 'query ConsoleKitBearerProof { __typename }';

  try {
    const invalid = await rawGraphQL(endpointUrl(first, 'data'), health, {}, 'invalid.console.token');
    expect(authenticationErrorCodes(invalid)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
    );

    const crossed = await rawGraphQL(endpointUrl(second, 'data'), health, {}, firstSession.token);
    expect(authenticationErrorCodes(crossed)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:UNAUTHENTICATED|BAD_TOKEN_DEFINITION)$/u)])
    );

    await signOut(second, secondSession.token);
    const revoked = await rawGraphQL(endpointUrl(second, 'data'), health, {}, secondSession.token);
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
