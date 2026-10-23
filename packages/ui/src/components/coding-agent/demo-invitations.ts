import type { Worktree } from './harness';
import type { CodingSession, SessionBeat } from './types';

const BRANCH = 'agent/team-invitations';

/**
 * A long, realistic session: team invitations built end to end over three turns. The first two turns are history
 * (a dozen edits, a failing test fixed on the spot, a browser check); the third plays live and stops on a question.
 */

export const INVITE_BASE_FILES: Record<string, string> = {
	'src/db/schema.ts': `import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const memberships = pgTable(
  'memberships',
  {
    teamId: uuid('team_id').references(() => teams.id).notNull(),
    userId: uuid('user_id').notNull(),
    role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull()
  },
  (table) => [index('memberships_team_idx').on(table.teamId)]
);
`,
	'src/lib/db.ts': `import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '../db/schema';

export const db = drizzle(process.env.DATABASE_URL!, { schema });
`,
	'src/lib/email.ts': `type Email = { to: string; subject: string; html: string };

/** Sends through the transactional provider; resolves once the provider accepts it. */
export async function sendEmail(email: Email) {
  const response = await fetch('https://email.internal/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(email)
  });
  if (!response.ok) throw new Error(\`Email rejected: \${response.status}\`);
}
`,
	'src/app/settings/team/page.tsx': `import { getSession } from '../../../auth/session';
import { listMembers } from '../../../lib/members';

export default async function TeamSettings() {
  const session = await getSession();
  const members = await listMembers(session.teamId);
  return (
    <section>
      <h1>Team</h1>
      <ul>
        {members.map((member) => (
          <li key={member.userId}>{member.email} · {member.role}</li>
        ))}
      </ul>
    </section>
  );
}
`,
	'src/lib/members.ts': `import { eq } from 'drizzle-orm';

import { memberships } from '../db/schema';
import { db } from './db';

export function listMembers(teamId: string) {
  return db.query.memberships.findMany({ where: eq(memberships.teamId, teamId) });
}
`
};

const SCHEMA_WITH_INVITES = `${INVITE_BASE_FILES['src/db/schema.ts']}
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').references(() => teams.id).notNull(),
    email: text('email').notNull(),
    role: text('role', { enum: ['admin', 'member'] }).notNull(),
    /** SHA-256 of the token in the link; the token itself is never stored. */
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: uuid('invited_by').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    revokedAt: timestamp('revoked_at')
  },
  (table) => [index('invitations_team_email_idx').on(table.teamId, table.email)]
);
`;

const INVITATIONS_V1 = `import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { invitations, memberships } from '../db/schema';
import { db } from './db';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class InviteError extends Error {
  constructor(readonly code: 'duplicate' | 'expired' | 'revoked' | 'used' | 'not-found') {
    super(code);
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates an invite and returns the one-time token for the link. One pending invite per email per team. */
export async function createInvite(input: { teamId: string; email: string; role: 'admin' | 'member'; invitedBy: string }) {
  const email = input.email.trim().toLowerCase();
  const pending = await db.query.invitations.findFirst({
    where: and(eq(invitations.teamId, input.teamId), eq(invitations.email, input.email), isNull(invitations.acceptedAt), isNull(invitations.revokedAt))
  });
  if (pending) throw new InviteError('duplicate');

  const token = randomBytes(32).toString('base64url');
  await db.insert(invitations).values({
    ...input,
    email,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TTL_MS)
  });
  return token;
}

export async function revokeInvite(id: string, teamId: string) {
  await db.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.id, id), eq(invitations.teamId, teamId)));
}

/** Accepts an invite for the signed-in user and adds them to the team. */
export async function acceptInvite(token: string, userId: string) {
  const invite = await db.query.invitations.findFirst({ where: eq(invitations.tokenHash, hash(token)) });
  if (!invite) throw new InviteError('not-found');
  if (invite.revokedAt) throw new InviteError('revoked');
  if (invite.acceptedAt) throw new InviteError('used');
  if (invite.expiresAt.getTime() < Date.now()) throw new InviteError('expired');

  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({ teamId: invite.teamId, userId, role: invite.role });
    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
  });
  return invite.teamId;
}
`;

const INVITATIONS_V2 = INVITATIONS_V1.replace('eq(invitations.email, input.email)', 'eq(invitations.email, email)');

const INVITATIONS_V3 = INVITATIONS_V2.replace(
	`  const token = randomBytes(32).toString('base64url');`,
	`  // Twenty invites an hour per team keeps a compromised admin account from mailing the whole internet.
  const recent = await db.$count(invitations, and(eq(invitations.teamId, input.teamId), gt(invitations.createdAt, new Date(Date.now() - HOUR_MS))));
  if (recent >= INVITES_PER_HOUR) throw new InviteError('rate-limited');

  const token = randomBytes(32).toString('base64url');`
)
	.replace(`import { and, eq, isNull } from 'drizzle-orm';`, `import { and, eq, gt, isNull } from 'drizzle-orm';`)
	.replace(`const TTL_MS = 7 * 24 * 60 * 60 * 1000;`, `const TTL_MS = 7 * 24 * 60 * 60 * 1000;\nconst HOUR_MS = 60 * 60 * 1000;\nconst INVITES_PER_HOUR = 20;`)
	.replace(`'duplicate' | 'expired' | 'revoked' | 'used' | 'not-found'`, `'duplicate' | 'expired' | 'revoked' | 'used' | 'not-found' | 'rate-limited'`)
	.replace(
		`export async function revokeInvite`,
		`export function listPendingInvites(teamId: string) {
  return db.query.invitations.findMany({
    where: and(eq(invitations.teamId, teamId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date())),
    orderBy: (table, { desc }) => [desc(table.expiresAt)]
  });
}

export async function revokeInvite`
	);

const INVITATIONS_V4 = INVITATIONS_V3.replace(`import { db } from './db';`, `import { recordAudit } from './audit';\nimport { db } from './db';`)
	.replace(
		`    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
  });`,
		`    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
    await recordAudit(tx, { teamId: invite.teamId, actorId: userId, action: 'invite.accepted', targetId: invite.id });
  });`
	)
	.replace(
		`export async function revokeInvite(id: string, teamId: string) {
  await db.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.id, id), eq(invitations.teamId, teamId)));
}`,
		`export async function revokeInvite(id: string, teamId: string, actorId: string) {
  await db.transaction(async (tx) => {
    await tx.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.id, id), eq(invitations.teamId, teamId)));
    await recordAudit(tx, { teamId, actorId, action: 'invite.revoked', targetId: id });
  });
}`
	);

const SCHEMA_WITH_AUDIT = `${SCHEMA_WITH_INVITES}
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').references(() => teams.id).notNull(),
    actorId: uuid('actor_id').notNull(),
    action: text('action').notNull(),
    targetId: uuid('target_id'),
    at: timestamp('at').defaultNow().notNull()
  },
  (table) => [index('audit_events_team_at_idx').on(table.teamId, table.at)]
);
`;

const AUDIT_TS = `import { auditEvents } from '../db/schema';
import type { db } from './db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditAction = 'invite.accepted' | 'invite.revoked';

/** Writes inside the caller's transaction, so an event exists exactly when the change it describes does. */
export async function recordAudit(tx: Tx, event: { teamId: string; actorId: string; action: AuditAction; targetId?: string }) {
  await tx.insert(auditEvents).values(event);
}
`;

const ROUTE_TS = `import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '../../../auth/session';
import { createInvite, InviteError, revokeInvite } from '../../../lib/invitations';
import { sendInviteEmail } from '../../../emails/invite';

const Create = z.object({ email: z.string().email().max(254), role: z.enum(['admin', 'member']) });

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = Create.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });

  try {
    const token = await createInvite({ ...body.data, teamId: session.teamId, invitedBy: session.userId });
    await sendInviteEmail({ to: body.data.email, token, teamName: session.teamName });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError && error.code === 'duplicate') {
      return NextResponse.json({ error: 'That person already has a pending invite' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || session.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await revokeInvite(id, session.teamId);
  return new NextResponse(null, { status: 204 });
}
`;

const EMAIL_TSX = `import { sendEmail } from '../lib/email';

const APP_URL = 'https://app.acme.dev';

export function sendInviteEmail({ to, token, teamName }: { to: string; token: string; teamName: string }) {
  const link = \`\${APP_URL}/invite/\${token}\`;
  return sendEmail({
    to,
    subject: \`You're invited to \${teamName} on Acme\`,
    html: \`<p>You've been invited to join <strong>\${teamName}</strong>.</p><p><a href="\${link}">Accept the invite</a> within 7 days.</p>\`
  });
}
`;

const ACCEPT_PAGE = `import { redirect } from 'next/navigation';

import { getSession } from '../../../auth/session';
import { acceptInvite, InviteError } from '../../../lib/invitations';

const MESSAGES = {
  expired: 'This invite has expired. Ask a team admin to send a new one.',
  revoked: 'This invite was withdrawn.',
  used: 'This invite has already been used.',
  'not-found': 'We couldn’t find that invite.'
} as const;

export default async function AcceptInvite({ params }: { params: { token: string } }) {
  const session = await getSession();
  if (!session) redirect(\`/login?next=/invite/\${params.token}\`);

  try {
    await acceptInvite(params.token, session.userId);
  } catch (error) {
    if (error instanceof InviteError && error.code in MESSAGES) return <p>{MESSAGES[error.code as keyof typeof MESSAGES]}</p>;
    throw error;
  }
  redirect('/dashboard?joined=1');
}
`;

const INVITE_TESTS = `import { beforeEach, describe, expect, it, vi } from 'vitest';

import { acceptInvite, createInvite, InviteError, revokeInvite } from '../src/lib/invitations';
import { pendingInvites, resetDb, seedTeam } from './helpers/db';

const ADMIN = 'u_admin';
let teamId: string;

beforeEach(async () => {
  await resetDb();
  teamId = await seedTeam({ owner: ADMIN });
});

describe('invitations', () => {
  it('lowercases the email and returns a token', async () => {
    const token = await createInvite({ teamId, email: 'Dana@Example.com', role: 'member', invitedBy: ADMIN });
    expect(token).toMatch(/^[\\w-]{43}$/);
  });

  it('refuses a second pending invite for the same email', async () => {
    await createInvite({ teamId, email: 'dana@example.com', role: 'member', invitedBy: ADMIN });
    await expect(createInvite({ teamId, email: 'DANA@example.com', role: 'admin', invitedBy: ADMIN })).rejects.toThrow(InviteError);
  });

  it('adds the member and marks the invite used', async () => {
    const token = await createInvite({ teamId, email: 'dana@example.com', role: 'member', invitedBy: ADMIN });
    await expect(acceptInvite(token, 'u_dana')).resolves.toBe(teamId);
    await expect(acceptInvite(token, 'u_dana')).rejects.toMatchObject({ code: 'used' });
  });

  it('rejects an expired invite', async () => {
    const token = await createInvite({ teamId, email: 'dana@example.com', role: 'member', invitedBy: ADMIN });
    vi.useFakeTimers({ now: Date.now() + 8 * 24 * 60 * 60 * 1000 });
    await expect(acceptInvite(token, 'u_dana')).rejects.toMatchObject({ code: 'expired' });
    vi.useRealTimers();
  });

  it('rejects a revoked invite', async () => {
    const token = await createInvite({ teamId, email: 'dana@example.com', role: 'member', invitedBy: ADMIN });
    const [invite] = await pendingInvites(teamId);
    await revokeInvite(invite.id, teamId);
    await expect(acceptInvite(token, 'u_dana')).rejects.toMatchObject({ code: 'revoked' });
  });

  it('rejects an unknown token', async () => {
    await expect(acceptInvite('nope', 'u_dana')).rejects.toMatchObject({ code: 'not-found' });
  });
});
`;

const TEAM_PAGE_V2 = `import { getSession } from '../../../auth/session';
import { listPendingInvites } from '../../../lib/invitations';
import { listMembers } from '../../../lib/members';
import { InviteForm, RevokeButton } from './invite-controls';

export default async function TeamSettings() {
  const session = await getSession();
  const [members, pending] = await Promise.all([listMembers(session.teamId), listPendingInvites(session.teamId)]);
  return (
    <section>
      <h1>Team</h1>
      {session.role !== 'member' ? <InviteForm /> : null}
      <ul>
        {members.map((member) => (
          <li key={member.userId}>{member.email} · {member.role}</li>
        ))}
      </ul>
      {pending.length > 0 ? (
        <>
          <h2>Pending invites</h2>
          <ul>
            {pending.map((invite) => (
              <li key={invite.id}>
                {invite.email} · expires {invite.expiresAt.toLocaleDateString()}
                {session.role !== 'member' ? <RevokeButton id={invite.id} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
`;

const FAILING_RUN = ` RUN  v3.2.4 ~/code/acme-web

 ✓ test/invitations.test.ts > invitations > lowercases the email and returns a token 9ms
 × test/invitations.test.ts > invitations > refuses a second pending invite for the same email 6ms
   → promise resolved "'q8Zr…'" instead of rejecting
 ✓ test/invitations.test.ts > invitations > adds the member and marks the invite used 11ms
 ✓ test/invitations.test.ts > invitations > rejects an expired invite 7ms
 ✓ test/invitations.test.ts > invitations > rejects a revoked invite 8ms
 ✓ test/invitations.test.ts > invitations > rejects an unknown token 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/invitations.test.ts > invitations > refuses a second pending invite for the same email
AssertionError: promise resolved "'q8Zr…'" instead of rejecting
 ❯ test/invitations.test.ts:22:94

 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
   Duration  1.18s`;

const PASSING_RUN = ` RUN  v3.2.4 ~/code/acme-web

 ✓ test/invitations.test.ts (6 tests) 41ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  0.94s`;

const PLAN = (statuses: ('done' | 'in_progress' | 'pending')[]) => {
	const labels = [
		'Read the team, membership and email code',
		'Add an invitations table with hashed tokens',
		'Create, revoke and accept invites in one module',
		'API route, invite email and accept page',
		'Tests for duplicates, expiry, revocation and reuse',
		'Run the tests and check the team page'
	];
	return labels.map((label, index) => ({ label, status: statuses[index] }));
};

const turnOne: SessionBeat[] = [
	{
		kind: 'user',
		text: 'We need team invitations. Admins on /settings/team should be able to invite people by email; the invitee gets a link, signs in or signs up, and lands in the team.\n\nInvites should expire after a week, be revocable, and an email should only ever have one pending invite per team. Please add tests.'
	},
	{
		kind: 'reasoning',
		text: 'Four pieces: storage, the invite lifecycle, delivery, and the accept flow. The token in the email link is a bearer credential, so only its hash should be stored and the comparison should go through the hash. "One pending invite per email per team" needs a normalised email, otherwise Dana@ and dana@ slip past each other. Accepting has to add the membership and mark the invite used atomically, or a double-click could add someone twice. Expiry, revocation and reuse each need their own error so the accept page can say what happened.',
		durationMs: 2800
	},
	{ kind: 'plan', steps: PLAN(['in_progress', 'pending', 'pending', 'pending', 'pending', 'pending']) },
	{
		kind: 'tools',
		calls: [
			{ tool: 'read', target: 'src/db/schema.ts' },
			{ tool: 'read', target: 'src/lib/db.ts' },
			{ tool: 'read', target: 'src/lib/members.ts' },
			{ tool: 'read', target: 'src/app/settings/team/page.tsx' },
			{ tool: 'grep', target: 'sendEmail(' },
			{ tool: 'read', target: 'src/lib/email.ts' },
			{ tool: 'glob', target: 'src/app/api/**/route.ts' },
			{ tool: 'read', target: 'src/auth/session.ts' }
		]
	},
	{
		kind: 'say',
		text: 'Here’s what the codebase already gives us:\n\n- **Drizzle on Postgres** in `src/db/schema.ts`, with `teams` and `memberships` (roles `owner`, `admin`, `member`).\n- **`sendEmail`** in `src/lib/email.ts`, used by password reset, so invites can go through the same provider.\n- **`getSession`** returns `teamId`, `userId` and `role`, which is enough to gate invites to owners and admins.\n\nI’ll store only a SHA-256 of each invite token, normalise emails to lowercase, and accept inside a transaction.'
	},
	{ kind: 'plan', steps: PLAN(['done', 'in_progress', 'pending', 'pending', 'pending', 'pending']) },
	{ kind: 'edit', path: 'src/db/schema.ts', after: SCHEMA_WITH_INVITES },
	{ kind: 'plan', steps: PLAN(['done', 'done', 'in_progress', 'pending', 'pending', 'pending']) },
	{ kind: 'edit', path: 'src/lib/invitations.ts', after: INVITATIONS_V1 },
	{ kind: 'plan', steps: PLAN(['done', 'done', 'done', 'in_progress', 'pending', 'pending']) },
	{ kind: 'edit', path: 'src/app/api/invitations/route.ts', after: ROUTE_TS },
	{ kind: 'edit', path: 'src/emails/invite.tsx', after: EMAIL_TSX },
	{ kind: 'edit', path: 'src/app/invite/[token]/page.tsx', after: ACCEPT_PAGE },
	{ kind: 'plan', steps: PLAN(['done', 'done', 'done', 'done', 'in_progress', 'pending']) },
	{ kind: 'edit', path: 'test/invitations.test.ts', after: INVITE_TESTS },
	{ kind: 'plan', steps: PLAN(['done', 'done', 'done', 'done', 'done', 'in_progress']) },
	{ kind: 'permission', title: 'Run a command', command: 'pnpm vitest run test/invitations.test.ts' },
	{ kind: 'shell', command: 'pnpm vitest run test/invitations.test.ts', output: FAILING_RUN, exitCode: 1 },
	{
		kind: 'reasoning',
		text: 'The duplicate check let `DANA@example.com` through after `dana@example.com` was invited. `email` is lowercased for the insert, but the lookup for a pending invite still compares `input.email`, the raw value. So the stored row never matches a differently-cased second request.',
		durationMs: 1700
	},
	{
		kind: 'say',
		text: 'One failure, and it’s a real bug: the pending-invite lookup compared the **raw** email while the insert stored the lowercased one, so `DANA@example.com` could get a second invite. Using the normalised email in both places.'
	},
	{ kind: 'edit', path: 'src/lib/invitations.ts', after: INVITATIONS_V2 },
	{ kind: 'shell', command: 'pnpm vitest run test/invitations.test.ts', output: PASSING_RUN, exitCode: 0 },
	{ kind: 'shell', command: 'pnpm tsc --noEmit', output: '', exitCode: 0 },
	{ kind: 'browse', url: 'http://localhost:3000/settings/team', title: 'Team settings · Acme' },
	{ kind: 'plan', steps: PLAN(['done', 'done', 'done', 'done', 'done', 'done']) },
	{
		kind: 'say',
		text: 'Team invitations are in. Admins and owners can invite from **Team settings**; the invitee gets a one-time link that expires after **7 days**.\n\n- `src/lib/invitations.ts` creates, revokes and accepts invites. Tokens are stored only as SHA-256 hashes, emails are lowercased, and accepting adds the membership and marks the invite used in one transaction.\n- `POST /api/invitations` validates with zod and returns **409** for a duplicate pending invite; `DELETE` revokes.\n- `/invite/[token]` sends signed-out people through `/login?next=…` and explains expired, revoked or used links.\n\nAll 6 tests pass and the project typechecks. The first run caught a differently-cased email slipping past the one-pending-invite rule, which is fixed.'
	}
];

const turnTwo: SessionBeat[] = [
	{ kind: 'user', text: 'Nice. Rate-limit invite creation to 20 an hour per team, and show pending invites with a revoke button on the team page.' },
	{
		kind: 'reasoning',
		text: 'Counting the team’s invites from the last hour in the same query path is enough here, no new store needed. The page needs pending invites only: not accepted, not revoked, not expired.',
		durationMs: 1300
	},
	{
		kind: 'tools',
		calls: [
			{ tool: 'read', target: 'src/lib/invitations.ts' },
			{ tool: 'read', target: 'src/app/settings/team/page.tsx' },
			{ tool: 'grep', target: "'use client'" }
		]
	},
	{ kind: 'edit', path: 'src/lib/invitations.ts', after: INVITATIONS_V3 },
	{ kind: 'edit', path: 'src/app/settings/team/page.tsx', after: TEAM_PAGE_V2 },
	{ kind: 'shell', command: 'pnpm vitest run test/invitations.test.ts', output: PASSING_RUN, exitCode: 0 },
	{ kind: 'browse', url: 'http://localhost:3000/settings/team', title: 'Team settings · Acme' },
	{
		kind: 'say',
		text: 'Done. Creating more than **20 invites in an hour** for one team now fails with `rate-limited`, and the team page lists pending invites with their expiry date and a **Revoke** button for admins.'
	}
];

const turnThree: SessionBeat[] = [
	{ kind: 'user', text: 'Last thing: record an audit event whenever an invite is accepted or revoked.', delay: 1200 },
	{
		kind: 'reasoning',
		text: 'Look for an existing audit log before adding one. If there isn’t one, the event should be written in the same transaction as the change so the log can’t disagree with the data.',
		durationMs: 1600
	},
	{
		kind: 'tools',
		calls: [
			{ tool: 'grep', target: 'audit' },
			{ tool: 'grep', target: 'track(' },
			{ tool: 'read', target: 'src/db/schema.ts' }
		]
	},
	// CI on the pull request finishes while the agent works, and a teammate approves.
	{ kind: 'check', worktreeId: BRANCH, check: { id: 'e2e', status: 'passed', summary: undefined }, delay: 900 },
	{ kind: 'pr', worktreeId: BRANCH, pr: { review: 'approved', merge: 'behind', unresolved: 0 } },
	{
		kind: 'question',
		questions: [
			{
				id: 'sink',
				question: 'There’s no audit log yet. Where should these events go?',
				options: [
					{ id: 'table', label: 'A new audit_events table, written in the same transaction' },
					{ id: 'analytics', label: 'The product analytics stream (not guaranteed, but no migration)' }
				]
			}
		]
	},
	{ kind: 'edit', path: 'src/db/schema.ts', after: SCHEMA_WITH_AUDIT },
	{ kind: 'edit', path: 'src/lib/audit.ts', after: AUDIT_TS },
	{ kind: 'edit', path: 'src/lib/invitations.ts', after: INVITATIONS_V4 },
	{ kind: 'shell', command: 'pnpm drizzle-kit generate', output: '[✓] Your SQL migration file ➜ drizzle/0007_audit_events.sql 🚀', exitCode: 0 },
	{ kind: 'shell', command: 'pnpm vitest run test/invitations.test.ts', output: PASSING_RUN, exitCode: 0 },
	{
		kind: 'say',
		text: 'Accepting and revoking an invite now writes an `audit_events` row **in the same transaction** as the change, so the log can never disagree with the data. The migration is `drizzle/0007_audit_events.sql`; revoking now takes the acting user’s id, so `DELETE /api/invitations` passes `session.userId`.'
	}
];

/** The session's worktree as it opens: five commits ahead of main, a pull request with CI green but for E2E, still running. */
const INVITES_WORKTREE: Worktree = {
	id: BRANCH,
	branch: BRANCH,
	base: 'main',
	kind: 'worktree',
	path: '~/code/acme-web/.worktrees/team-invitations',
	ahead: 5,
	behind: 2,
	pr: {
		number: 1287,
		title: 'feat(team): invitations with expiring one-time links',
		url: 'https://github.com/acme/web/pull/1287',
		state: 'open',
		review: 'pending',
		merge: 'blocked',
		unresolved: 2,
		checks: [
			{ id: 'typecheck', name: 'Typecheck', status: 'passed', required: true },
			{ id: 'lint', name: 'Lint', status: 'passed', required: true },
			{ id: 'unit', name: 'Unit tests', status: 'passed', required: true },
			{ id: 'e2e', name: 'E2E', status: 'running', required: true, summary: '31 of 44 specs' },
			{ id: 'migrations', name: 'Migrations', status: 'passed' },
			{ id: 'coverage', name: 'Coverage', status: 'passed' },
			{ id: 'bundle', name: 'Bundle size', status: 'passed' },
			{ id: 'preview', name: 'Preview deploy', status: 'passed' },
			{ id: 'audit', name: 'Dependency audit', status: 'skipped' }
		]
	}
};

export const invitationsSession: CodingSession = {
	id: 'session-invites',
	title: 'Team invitations end to end',
	projectId: 'acme-web',
	location: 'worktree',
	branch: BRANCH,
	worktrees: [INVITES_WORKTREE],
	model: { modelId: 'opus-5', levelId: 'high' },
	updatedLabel: 'now',
	script: [...turnOne, ...turnTwo, ...turnThree],
	played: turnOne.length + turnTwo.length
};
