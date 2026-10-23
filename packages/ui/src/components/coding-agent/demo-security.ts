import type { CICheck, Worktree } from './harness';
import type { CodingSession, SessionBeat } from './types';

/**
 * The multi-agent showcase: a lead agent plans a security pass, a scout maps the code, three workers fix things in
 * parallel in their own worktrees (talking to each other and to a shared task board), one hits a failing test and
 * recovers, and a reviewer checks the combined result before the lead reports back.
 */

export const SECURITY_BASE_FILES: Record<string, string> = {
	'src/auth/reset.ts': `import { randomBytes } from 'node:crypto';

import { db } from '../lib/db';

export async function createResetToken(userId: string) {
  const token = randomBytes(16).toString('hex');
  await db.passwordResets.insert({ userId, token, createdAt: new Date() });
  return token;
}

export async function consumeResetToken(token: string) {
  const row = await db.passwordResets.findFirst({ where: { token } });
  return row?.userId ?? null;
}
`
};

const COOKIES_AFTER = `export function cookies(request: Request) {
  const header = request.headers.get('cookie') ?? '';
  const pairs = header.split(';').map((part) => part.trim().split('='));
  return new Map(pairs.map(([key, value]) => [key, decodeURIComponent(value ?? '')]));
}

/** Session cookie flags: unreadable from scripts, HTTPS only, and not sent on cross-site POSTs. */
export const SESSION_COOKIE = {
  name: '__Host-acme_session',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7
} as const;

export function serializeSession(value: string) {
  const { name, maxAge } = SESSION_COOKIE;
  return \`\${name}=\${encodeURIComponent(value)}; Path=/; Max-Age=\${maxAge}; HttpOnly; Secure; SameSite=Lax\`;
}
`;

const MIDDLEWARE_CSRF = `import { NextResponse, type NextRequest } from 'next/server';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Rejects state-changing API requests that don't come from our own pages. */
export function middleware(request: NextRequest) {
  if (UNSAFE.has(request.method)) {
    const origin = request.headers.get('origin');
    const expected = request.nextUrl.origin;
    if (!origin || origin !== expected) {
      return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
`;

const RESET_V1 = `import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { db } from '../lib/db';

const TTL_MS = 30 * 60 * 1000;
const hash = (token: string) => createHash('sha256').update(token).digest();

/** A 256-bit token for the email link; only its hash is stored. */
export async function createResetToken(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await db.passwordResets.insert({ userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS) });
  return token;
}

export async function consumeResetToken(token: string) {
  const row = await db.passwordResets.findFirst({ where: { tokenHash: hash(token) } });
  if (!row || row.expiresAt < new Date()) return null;
  return row.userId;
}
`;

const RESET_V2 = RESET_V1.replace(
	`  if (!row || row.expiresAt < new Date()) return null;
  return row.userId;`,
	`  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  // One use only: a link that leaked from an inbox can't be replayed.
  await db.passwordResets.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;`
);

/** The reviewer's fix-up in the session cookie worktree: a malformed cookie shouldn't throw. */
const COOKIES_SAFE = COOKIES_AFTER.replace(
	`  return new Map(pairs.map(([key, value]) => [key, decodeURIComponent(value ?? '')]));
}`,
	`  return new Map(pairs.map(([key, value]) => [key, safeDecode(value ?? '')]));
}

/** A malformed cookie value shouldn't take the request down with a URIError. */
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}`
);

/** The reviewer's fix-up in the reset worktree: lookups go by hash, so the constant-time compare was never used. */
const RESET_V3 = RESET_V2.replace(`import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';`, `import { createHash, randomBytes } from 'node:crypto';`);

const LEAD_BRANCH = 'security/launch-pass';
const COOKIE_BRANCH = 'agent/session-cookie';
const CSRF_BRANCH = 'agent/csrf-origin';
const RESET_BRANCH = 'agent/reset-tokens';

/** The CI every fix branch runs, all waiting to start. */
const QUEUED_CHECKS: CICheck[] = [
	{ id: 'typecheck', name: 'Typecheck', status: 'queued', required: true },
	{ id: 'lint', name: 'Lint', status: 'queued', required: true },
	{ id: 'unit', name: 'Unit tests', status: 'queued', required: true },
	{ id: 'e2e', name: 'E2E', status: 'queued', required: true },
	{ id: 'codeql', name: 'CodeQL', status: 'queued' }
];

const check = (worktreeId: string, id: string, status: CICheck['status'], extra: Partial<CICheck> = {}): SessionBeat => ({
	kind: 'check',
	worktreeId,
	check: { id, status, ...extra }
});

/** The lead's own branch, which the fix branches merge into before it goes to main. */
const LEAD_WORKTREE: Worktree = {
	id: LEAD_BRANCH,
	branch: LEAD_BRANCH,
	base: 'main',
	kind: 'checkout',
	path: '~/code/acme-web',
	ahead: 1,
	pr: {
		number: 1300,
		title: 'Security pass on auth before launch',
		url: 'https://github.com/acme/web/pull/1300',
		state: 'draft',
		review: 'pending',
		merge: 'blocked',
		checks: [
			{ id: 'typecheck', name: 'Typecheck', status: 'passed', required: true },
			{ id: 'lint', name: 'Lint', status: 'passed', required: true },
			{ id: 'unit', name: 'Unit tests', status: 'passed', required: true },
			{ id: 'e2e', name: 'E2E', status: 'skipped', required: true }
		]
	}
};

const RESET_TEST_FAIL = ` ✓ test/reset.test.ts > reset tokens > issues a 43-character token 4ms
 ✓ test/reset.test.ts > reset tokens > expires after 30 minutes 3ms
 × test/reset.test.ts > reset tokens > can only be used once 6ms
   → expected 'u_42' to be null

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)`;

const RESET_TEST_PASS = ` ✓ test/reset.test.ts (3 tests) 12ms

 Test Files  1 passed (1)
      Tests  3 passed (3)`;

const TASKS = {
	map: { id: 'map', title: 'Map auth entry points and session issuance' },
	cookies: { id: 'cookies', title: 'Harden the session cookie', dependsOn: ['map'] },
	csrf: { id: 'csrf', title: 'Block cross-site writes to /api', dependsOn: ['map'] },
	reset: { id: 'reset', title: 'Make reset tokens single-use and short-lived', dependsOn: ['map'] },
	review: { id: 'review', title: 'Review the three branches together', dependsOn: ['cookies', 'csrf', 'reset'] }
};

const scout: SessionBeat = {
	kind: 'spawn',
	agent: { id: 'scout', name: 'Scout', kind: 'Explore', role: 'worker', phase: 'Investigate', task: 'Map every auth entry point and how sessions are issued, read-only.' },
	script: [
		{ kind: 'task', task: { ...TASKS.map, status: 'in_progress', ownerRunId: 'scout' } },
		{
			kind: 'tools',
			calls: [
				{ tool: 'glob', target: 'src/**/route.ts' },
				{ tool: 'grep', target: 'acme_session' },
				{ tool: 'read', target: 'src/auth/session.ts' },
				{ tool: 'read', target: 'src/auth/cookies.ts' },
				{ tool: 'read', target: 'src/middleware.ts' },
				{ tool: 'read', target: 'src/auth/reset.ts' }
			]
		},
		{
			kind: 'say',
			text: 'Three gaps: the session cookie is set without `HttpOnly`/`Secure`/`SameSite`; `/api` accepts cross-site POSTs (no origin check); reset tokens are 128-bit, stored in plain text, never expire and can be reused.'
		},
		{ kind: 'task', task: { ...TASKS.map, status: 'done', ownerRunId: 'scout' } }
	]
};

const sessionsWorker: SessionBeat = {
	kind: 'spawn',
	agent: {
		id: 'sessions',
		name: 'Sessions',
		kind: 'Implementer',
		role: 'worker',
		phase: 'Fix',
		task: 'Set HttpOnly, Secure and SameSite on the session cookie and move it to a __Host- name.',
		workspace: { kind: 'worktree', branch: 'agent/session-cookie' }
	},
	script: [
		{ kind: 'task', task: { ...TASKS.cookies, status: 'in_progress', ownerRunId: 'sessions' } },
		{ kind: 'tools', calls: [{ tool: 'read', target: 'src/auth/cookies.ts' }, { tool: 'grep', target: 'Set-Cookie' }] },
		{ kind: 'edit', path: 'src/auth/cookies.ts', after: COOKIES_AFTER, delay: 2200 },
		{
			kind: 'message',
			to: ['csrf'],
			text: 'Heads up: I’m keeping `SameSite=Lax`, not `Strict`. `Strict` drops the cookie on the OAuth callback redirect and logs people out. Your origin check covers the POST case.',
			delay: 1800
		},
		{ kind: 'shell', command: 'pnpm vitest run test/session.test.ts', output: ' ✓ test/session.test.ts (4 tests) 9ms\n\n Test Files  1 passed (1)', exitCode: 0 },
		{ kind: 'worktree', worktree: { id: COOKIE_BRANCH, ahead: 1 } },
		{
			kind: 'pr',
			worktreeId: COOKIE_BRANCH,
			pr: {
				number: 1301,
				title: 'fix(auth): harden the session cookie',
				url: 'https://github.com/acme/web/pull/1301',
				state: 'open',
				review: 'pending',
				merge: 'checking',
				checks: QUEUED_CHECKS
			}
		},
		check(COOKIE_BRANCH, 'typecheck', 'running'),
		{ kind: 'task', task: { ...TASKS.cookies, status: 'done', ownerRunId: 'sessions' } },
		{ kind: 'say', text: 'Session cookie is now `__Host-acme_session` with `HttpOnly; Secure; SameSite=Lax`, so scripts can’t read it and cross-site POSTs don’t carry it.' }
	]
};

const csrfWorker: SessionBeat = {
	kind: 'spawn',
	agent: {
		id: 'csrf',
		name: 'CSRF',
		kind: 'Implementer',
		role: 'worker',
		phase: 'Fix',
		task: 'Reject state-changing /api requests whose Origin isn’t our own.',
		workspace: { kind: 'worktree', branch: 'agent/csrf-origin' }
	},
	script: [
		{ kind: 'task', task: { ...TASKS.csrf, status: 'in_progress', ownerRunId: 'csrf' } },
		{ kind: 'tools', calls: [{ tool: 'read', target: 'src/middleware.ts' }, { tool: 'glob', target: 'src/app/api/**/route.ts' }] },
		{ kind: 'reasoning', text: 'An Origin check in middleware covers every route under /api at once. Same-origin fetches from our pages always send Origin on unsafe methods, so legitimate traffic passes.', durationMs: 1500 },
		{ kind: 'edit', path: 'src/middleware.ts', after: MIDDLEWARE_CSRF },
		{ kind: 'permission', title: 'Run a command', command: 'pnpm vitest run test/middleware.test.ts', delay: 2600 },
		{ kind: 'shell', command: 'pnpm vitest run test/middleware.test.ts', output: ' ✓ test/middleware.test.ts (5 tests) 14ms\n\n Test Files  1 passed (1)', exitCode: 0 },
		{ kind: 'message', to: ['sessions'], text: 'Agreed on Lax. The Origin check rejects cross-site writes before they reach a route, so Strict buys nothing here.' },
		{ kind: 'worktree', worktree: { id: CSRF_BRANCH, ahead: 1, behind: 1 } },
		{
			kind: 'pr',
			worktreeId: CSRF_BRANCH,
			pr: {
				number: 1302,
				title: 'fix(api): block cross-site writes to /api',
				url: 'https://github.com/acme/web/pull/1302',
				state: 'open',
				review: 'pending',
				merge: 'checking',
				checks: QUEUED_CHECKS
			}
		},
		check(CSRF_BRANCH, 'typecheck', 'running'),
		{ kind: 'task', task: { ...TASKS.csrf, status: 'done', ownerRunId: 'csrf' } },
		{ kind: 'say', text: 'Every POST, PUT, PATCH and DELETE under `/api` now needs an `Origin` matching the app; anything else gets **403**. Five middleware tests cover same-site, cross-site, missing Origin and safe methods.' }
	]
};

const resetWorker: SessionBeat = {
	kind: 'spawn',
	agent: {
		id: 'reset',
		name: 'Reset',
		kind: 'Implementer',
		role: 'worker',
		phase: 'Fix',
		task: 'Make password reset tokens 256-bit, hashed at rest, single-use and valid for 30 minutes.',
		workspace: { kind: 'worktree', branch: 'agent/reset-tokens' }
	},
	script: [
		{ kind: 'task', task: { ...TASKS.reset, status: 'in_progress', ownerRunId: 'reset' } },
		{ kind: 'tools', calls: [{ tool: 'read', target: 'src/auth/reset.ts' }, { tool: 'grep', target: 'consumeResetToken' }] },
		{ kind: 'edit', path: 'src/auth/reset.ts', after: RESET_V1, delay: 1800 },
		{ kind: 'shell', command: 'pnpm vitest run test/reset.test.ts', output: RESET_TEST_FAIL, exitCode: 1 },
		{ kind: 'reasoning', text: 'The token still works a second time: consuming it never marks it used. Record `usedAt` and refuse a used token.', durationMs: 1200 },
		{ kind: 'edit', path: 'src/auth/reset.ts', after: RESET_V2 },
		{ kind: 'shell', command: 'pnpm vitest run test/reset.test.ts', output: RESET_TEST_PASS, exitCode: 0 },
		// Committed but not pushed for review yet, so this branch has no pull request.
		{ kind: 'worktree', worktree: { id: RESET_BRANCH, ahead: 2 } },
		{ kind: 'task', task: { ...TASKS.reset, status: 'done', ownerRunId: 'reset' } },
		{ kind: 'say', text: 'Reset tokens are now 256-bit, stored only as SHA-256 hashes, expire after **30 minutes**, and work once. The first test run caught tokens being reusable, which is fixed.' }
	]
};

const reviewer: SessionBeat = {
	kind: 'spawn',
	agent: {
		id: 'reviewer',
		name: 'Reviewer',
		kind: 'Review',
		role: 'worker',
		phase: 'Review',
		task: 'Review the three branches together: conflicts, missed routes, and anything the tests don’t cover.',
		capabilities: { steer: true, stop: true }
	},
	script: [
		{ kind: 'task', task: { ...TASKS.review, status: 'in_progress', ownerRunId: 'reviewer' } },
		{
			kind: 'tools',
			calls: [
				{ tool: 'read', target: 'src/auth/cookies.ts' },
				{ tool: 'read', target: 'src/middleware.ts' },
				{ tool: 'read', target: 'src/auth/reset.ts' },
				{ tool: 'grep', target: 'fetch(' }
			]
		},
		check(COOKIE_BRANCH, 'typecheck', 'passed'),
		check(COOKIE_BRANCH, 'lint', 'passed'),
		check(CSRF_BRANCH, 'typecheck', 'passed'),
		check(COOKIE_BRANCH, 'unit', 'running'),
		check(CSRF_BRANCH, 'lint', 'passed'),
		check(CSRF_BRANCH, 'unit', 'running'),
		// One reviewer, two worktrees: small fix-ups land on the branches they belong to.
		{ kind: 'edit', path: 'src/auth/cookies.ts', after: COOKIES_SAFE, worktree: COOKIE_BRANCH },
		{ kind: 'edit', path: 'src/auth/reset.ts', after: RESET_V3, worktree: RESET_BRANCH },
		check(COOKIE_BRANCH, 'unit', 'passed'),
		check(COOKIE_BRANCH, 'e2e', 'running', { summary: '12 of 44 specs' }),
		check(CSRF_BRANCH, 'unit', 'passed'),
		check(CSRF_BRANCH, 'e2e', 'running', { summary: '9 of 44 specs' }),
		check(COOKIE_BRANCH, 'codeql', 'passed'),
		check(CSRF_BRANCH, 'e2e', 'failed', { summary: 'webhooks.spec.ts › Stripe webhook returns 200 (got 403)' }),
		check(CSRF_BRANCH, 'codeql', 'passed'),
		{
			kind: 'pr',
			worktreeId: CSRF_BRANCH,
			pr: { review: 'changes-requested', merge: 'blocked', unresolved: 1 }
		},
		check(COOKIE_BRANCH, 'e2e', 'passed'),
		{
			kind: 'pr',
			worktreeId: COOKIE_BRANCH,
			pr: { review: 'approved', merge: 'clean' }
		},
		{ kind: 'message', to: ['root'], text: 'One follow-up: `src/app/api/webhooks/stripe/route.ts` receives server-to-server POSTs with no Origin, so the new check would block Stripe. It needs an exemption that verifies the Stripe signature instead.', protocol: 'result' },
		{ kind: 'task', task: { ...TASKS.review, status: 'done', ownerRunId: 'reviewer' } },
		{
			kind: 'say',
			text: 'The three branches merge cleanly and don’t overlap. I pushed two small fix-ups: a malformed cookie no longer throws (`agent/session-cookie`), and an unused `timingSafeEqual` import is gone (`agent/reset-tokens`). One real issue: the Stripe webhook is blocked by the Origin check, and E2E on #1302 confirms it.'
		}
	]
};

const script: SessionBeat[] = [
	{
		kind: 'user',
		text: 'Before launch, do a security pass on auth: session handling, CSRF on the API, and password reset. Split it up and run the fixes in parallel; every fix needs tests, and have someone review the lot.'
	},
	{
		kind: 'reasoning',
		text: 'Mapping first, read-only, so the workers start from the same picture. The three fixes touch different files (cookies, middleware, reset), so they can run in parallel in separate worktrees without stepping on each other. A reviewer then looks at all three together, because the cookie and CSRF changes interact.',
		durationMs: 2200
	},
	{ kind: 'task', task: { ...TASKS.map, status: 'pending' } },
	{ kind: 'task', task: { ...TASKS.cookies, status: 'blocked' } },
	{ kind: 'task', task: { ...TASKS.csrf, status: 'blocked' } },
	{ kind: 'task', task: { ...TASKS.reset, status: 'blocked' } },
	{ kind: 'task', task: { ...TASKS.review, status: 'blocked' } },
	{ kind: 'phase', name: 'Investigate', status: 'running' },
	scout,
	{ kind: 'await', agents: ['scout'] },
	{ kind: 'phase', name: 'Investigate', status: 'done' },
	{ kind: 'phase', name: 'Fix in parallel', status: 'running' },
	sessionsWorker,
	csrfWorker,
	resetWorker,
	{ kind: 'await', agents: ['sessions', 'csrf', 'reset'] },
	{ kind: 'phase', name: 'Fix in parallel', status: 'done' },
	{ kind: 'route', to: 'reviewer', reason: 'The cookie and CSRF changes interact, so one agent reviews all three together.' },
	{ kind: 'phase', name: 'Review', status: 'running' },
	reviewer,
	{ kind: 'await', agents: ['reviewer'] },
	{ kind: 'phase', name: 'Review', status: 'done' },
	{
		kind: 'say',
		text: 'The security pass is done, in three branches off `security/launch-pass`:\n\n- **Session cookie** (#1301, `agent/session-cookie`): `__Host-` name with `HttpOnly; Secure; SameSite=Lax`. CI is green and the reviewer approved.\n- **CSRF** (#1302, `agent/csrf-origin`): state-changing `/api` requests need a matching `Origin`, otherwise **403**. E2E fails on the Stripe webhook.\n- **Password reset** (`agent/reset-tokens`): 256-bit, hashed, single-use, 30-minute tokens. Committed, no pull request yet.\n\nThe failing E2E is the reviewer’s finding: Stripe’s server-to-server POSTs carry no Origin. I’d exempt that route and verify the Stripe signature instead. Want me to?'
	}
];

export const securitySession: CodingSession = {
	id: 'session-security',
	title: 'Security pass on auth before launch',
	projectId: 'acme-web',
	agentName: 'Lead',
	branch: LEAD_BRANCH,
	worktrees: [LEAD_WORKTREE],
	model: { modelId: 'opus-5', levelId: 'max' },
	updatedLabel: 'now',
	script,
	// Opens with the scout's map done and the three workers about to start.
	played: 11
};
