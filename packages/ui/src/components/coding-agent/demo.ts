import type { AiModel } from '../ai/model-selector';
import { INVITE_BASE_FILES, invitationsSession } from './demo-invitations';
import { longThreadSession } from './demo-long';
import { SECURITY_BASE_FILES, securitySession } from './demo-security';
import type { CodingAgentData, CodingProject, CodingSession, SessionBeat } from './types';

const REASONING = [
	{ id: 'low', label: 'Low', description: 'Fastest replies; light reasoning.' },
	{ id: 'medium', label: 'Medium', description: 'Balanced reasoning for most tasks.' },
	{ id: 'high', label: 'High', description: 'Deliberate reasoning for hard problems; slower.' },
	{ id: 'max', label: 'Max', description: 'Largest thinking budget; billed as output.' }
];

export const CODING_AGENT_MODELS: AiModel[] = [
	{
		id: 'opus-5',
		name: 'Opus 5',
		provider: 'Anthropic',
		levels: REASONING,
		defaultLevel: 'high',
		pricing: { input: 15, output: 75, cachedInput: 1.5 },
		contextWindow: 200_000,
		tags: ['new']
	},
	{
		id: 'sonnet-5',
		name: 'Sonnet 5',
		provider: 'Anthropic',
		levels: REASONING,
		defaultLevel: 'medium',
		pricing: { input: 3, output: 15, cachedInput: 0.3 },
		contextWindow: 1_000_000
	},
	{
		id: 'haiku-4-5',
		name: 'Haiku 4.5',
		provider: 'Anthropic',
		description: 'Quick edits and lookups.',
		pricing: { input: 1, output: 5, cachedInput: 0.1 },
		contextWindow: 200_000
	},
	{
		id: 'local-coder',
		name: 'Local coder 32B',
		provider: 'Local',
		description: 'Runs on this machine. Nothing leaves it.',
		contextWindow: 128_000,
		tags: ['free']
	}
];

const REDIRECT_BEFORE = `import { getSession } from './session';

/**
 * Sends a freshly signed-in user back to the page they came from.
 */
export async function redirectAfterLogin(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.redirect(new URL('/login', request.url));

  const next = new URL(request.url).searchParams.get('next');
  return Response.redirect(next ?? '/');
}
`;

const REDIRECT_AFTER = `import { getSession } from './session';

/** Paths a user may land on after signing in. Anything else falls back to the dashboard. */
const SAFE_PREFIXES = ['/dashboard', '/settings', '/projects'];

/**
 * Sends a freshly signed-in user back to the page they came from, as long as
 * that page is on this site. Absolute and protocol-relative URLs are dropped.
 */
export async function redirectAfterLogin(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.redirect(new URL('/login', request.url));

  const origin = new URL(request.url).origin;
  const next = new URL(request.url).searchParams.get('next') ?? '/dashboard';
  const target = new URL(next, origin);

  const sameSite = target.origin === origin;
  const allowed = SAFE_PREFIXES.some((prefix) => target.pathname.startsWith(prefix));
  return Response.redirect(sameSite && allowed ? target : new URL('/dashboard', origin));
}
`;

const REDIRECT_TEST = `import { describe, expect, it, vi } from 'vitest';

import { redirectAfterLogin } from '../src/auth/redirect';

vi.mock('../src/auth/session', () => ({ getSession: async () => ({ userId: 'u_1' }) }));

const login = (next: string) => redirectAfterLogin(new Request(\`https://app.acme.dev/login?next=\${encodeURIComponent(next)}\`));

describe('redirectAfterLogin', () => {
  it('keeps same-site paths', async () => {
    expect((await login('/settings/billing')).headers.get('location')).toBe('https://app.acme.dev/settings/billing');
  });

  it('drops other origins', async () => {
    expect((await login('https://evil.example/phish')).headers.get('location')).toBe('https://app.acme.dev/dashboard');
  });

  it('drops protocol-relative URLs', async () => {
    expect((await login('//evil.example')).headers.get('location')).toBe('https://app.acme.dev/dashboard');
  });
});
`;

const SESSION_TS = `import { cookies } from './cookies';

export type Session = { userId: string; expiresAt: number };

export async function getSession(request: Request): Promise<Session | null> {
  const token = cookies(request).get('acme_session');
  if (!token) return null;
  const session = await verify(token);
  return session && session.expiresAt > Date.now() ? session : null;
}

async function verify(token: string): Promise<Session | null> {
  const [payload] = token.split('.');
  try {
    return JSON.parse(atob(payload)) as Session;
  } catch {
    return null;
  }
}
`;

const RATE_LIMIT_AFTER = `/**
 * Fixed-window limiter keyed by client IP. Good enough for a single region;
 * swap the Map for a shared store before running more than one instance.
 */
const WINDOW_MS = 60_000;
const LIMIT = 30;

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: LIMIT - 1 };
  }

  entry.count += 1;
  return { ok: entry.count <= LIMIT, remaining: Math.max(0, LIMIT - entry.count), retryAfter: entry.resetAt - now };
}
`;

const MIDDLEWARE_BEFORE = `import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
`;

const MIDDLEWARE_AFTER = `import { NextResponse, type NextRequest } from 'next/server';

import { rateLimit } from './lib/rate-limit';

export function middleware(request: NextRequest) {
  const result = rateLimit(request);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((result.retryAfter ?? 0) / 1000)) } }
    );
  }
  const response = NextResponse.next();
  response.headers.set('x-ratelimit-remaining', String(result.remaining));
  return response;
}

export const config = { matcher: ['/api/:path*'] };
`;

const DATES_TS = `import { format, parseISO, differenceInCalendarDays } from 'date-fns';

export const formatDay = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

export const daysUntil = (iso: string) => differenceInCalendarDays(parseISO(iso), new Date());
`;

const CHECKOUT_SPEC = `import { expect, test } from '@playwright/test';

test('checkout completes with a saved card', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Saved card ending 4242').check();
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
});
`;

const ACME_WEB: CodingProject = {
	id: 'acme-web',
	name: 'acme-web',
	path: '~/code/acme-web',
	branch: 'main',
	files: {
		'package.json': `{\n  "name": "acme-web",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "test": "vitest run",\n    "e2e": "playwright test"\n  }\n}\n`,
		'README.md': '# acme-web\n\nThe Acme customer app. `pnpm dev` starts it on http://localhost:3000.\n',
		'tsconfig.json': '{\n  "compilerOptions": { "strict": true, "target": "ES2022", "moduleResolution": "bundler" }\n}\n',
		'src/auth/redirect.ts': REDIRECT_BEFORE,
		'src/auth/session.ts': SESSION_TS,
		'src/auth/cookies.ts': `export function cookies(request: Request) {\n  const header = request.headers.get('cookie') ?? '';\n  const pairs = header.split(';').map((part) => part.trim().split('='));\n  return new Map(pairs.map(([key, value]) => [key, decodeURIComponent(value ?? '')]));\n}\n`,
		'src/app/login/page.tsx': `export default function LoginPage() {\n  return <LoginForm />;\n}\n`,
		'src/app/dashboard/page.tsx': `export default function Dashboard() {\n  return <h1>Dashboard</h1>;\n}\n`,
		'src/app/api/orders/route.ts': `export async function GET() {\n  return Response.json({ orders: [] });\n}\n`,
		'src/middleware.ts': MIDDLEWARE_BEFORE,
		'src/lib/dates.ts': DATES_TS,
		'src/lib/money.ts': `export const formatMoney = (cents: number, currency = 'USD') =>\n  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);\n`,
		'e2e/checkout.spec.ts': CHECKOUT_SPEC,
		...INVITE_BASE_FILES,
		...SECURITY_BASE_FILES,
		'test/session.test.ts': `import { expect, it } from 'vitest';\n\nit('rejects a missing cookie', async () => {\n  expect(true).toBe(true);\n});\n`
	}
};

const ACME_API: CodingProject = {
	id: 'acme-api',
	name: 'acme-api',
	path: '~/code/acme-api',
	branch: 'main',
	files: {
		'package.json': '{\n  "name": "acme-api",\n  "private": true\n}\n',
		'src/server.ts': `import { serve } from './http';\n\nserve({ port: 4000 });\n`,
		'src/http.ts': `export function serve({ port }: { port: number }) {\n  console.log(\`listening on \${port}\`);\n}\n`
	}
};

const redirectSession: CodingSession = {
	id: 'session-redirect',
	title: 'Fix open redirect after login',
	projectId: 'acme-web',
	model: { modelId: 'opus-5', levelId: 'high' },
	updatedLabel: 'now',
	script: [
		{
			kind: 'user',
			text: 'The `next` param on /login lets anyone bounce a user to another site after they sign in. Lock it down to our own pages and add tests.',
			delay: 500
		},
		{
			kind: 'reasoning',
			text: 'The redirect reads `next` straight from the query string and hands it to `Response.redirect`. Anything absolute, or protocol-relative like `//evil.example`, leaves the site. I should resolve it against our own origin, check the origin still matches, and keep an allow-list of landing paths so a typo can’t land on an API route. Then cover the three cases with tests.',
			durationMs: 2200
		},
		{
			kind: 'plan',
			steps: [
				{ label: 'Read the login redirect and session helpers', status: 'in_progress' },
				{ label: 'Resolve the next param against our origin and allow-list paths', status: 'pending' },
				{ label: 'Add tests for same-site, cross-site and protocol-relative targets', status: 'pending' },
				{ label: 'Run the auth tests', status: 'pending' },
				{ label: 'Check the login page in the browser', status: 'pending' }
			]
		},
		{
			kind: 'tools',
			calls: [
				{ tool: 'read', target: 'src/auth/redirect.ts' },
				{ tool: 'read', target: 'src/auth/session.ts' },
				{ tool: 'grep', target: 'redirectAfterLogin' },
				{ tool: 'glob', target: 'test/**/*.test.ts' }
			]
		},
		{
			kind: 'say',
			text: 'Found it: `redirectAfterLogin` passes `next` to `Response.redirect` untouched, so `?next=https://evil.example` signs someone in and then sends them away. I’ll resolve the target against our origin and only follow it when it stays on the site and lands on a known page.'
		},
		{
			kind: 'plan',
			steps: [
				{ label: 'Read the login redirect and session helpers', status: 'done' },
				{ label: 'Resolve the next param against our origin and allow-list paths', status: 'in_progress' },
				{ label: 'Add tests for same-site, cross-site and protocol-relative targets', status: 'pending' },
				{ label: 'Run the auth tests', status: 'pending' },
				{ label: 'Check the login page in the browser', status: 'pending' }
			]
		},
		{ kind: 'edit', path: 'src/auth/redirect.ts', after: REDIRECT_AFTER },
		{ kind: 'edit', path: 'test/redirect.test.ts', after: REDIRECT_TEST },
		{
			kind: 'plan',
			steps: [
				{ label: 'Read the login redirect and session helpers', status: 'done' },
				{ label: 'Resolve the next param against our origin and allow-list paths', status: 'done' },
				{ label: 'Add tests for same-site, cross-site and protocol-relative targets', status: 'done' },
				{ label: 'Run the auth tests', status: 'in_progress' },
				{ label: 'Check the login page in the browser', status: 'pending' }
			]
		},
		{ kind: 'permission', title: 'Run a command', command: 'pnpm vitest run test/redirect.test.ts' },
		{
			kind: 'shell',
			command: 'pnpm vitest run test/redirect.test.ts',
			output: ' ✓ test/redirect.test.ts (3 tests) 14ms\n   ✓ redirectAfterLogin > keeps same-site paths\n   ✓ redirectAfterLogin > drops other origins\n   ✓ redirectAfterLogin > drops protocol-relative URLs\n\n Test Files  1 passed (1)\n      Tests  3 passed (3)\n   Duration  412ms',
			exitCode: 0
		},
		{ kind: 'browse', url: 'http://localhost:3000/login?next=//evil.example', title: 'Sign in · Acme' },
		{
			kind: 'plan',
			steps: [
				{ label: 'Read the login redirect and session helpers', status: 'done' },
				{ label: 'Resolve the next param against our origin and allow-list paths', status: 'done' },
				{ label: 'Add tests for same-site, cross-site and protocol-relative targets', status: 'done' },
				{ label: 'Run the auth tests', status: 'done' },
				{ label: 'Check the login page in the browser', status: 'done' }
			]
		},
		{
			kind: 'say',
			text: 'Done. `next` is now resolved against our own origin and only followed when it stays on the site and starts with `/dashboard`, `/settings` or `/projects`; everything else lands on the dashboard. The three new tests pass, and the login page with `?next=//evil.example` now signs in to the dashboard. The diff is in **Files changed** on the right.'
		}
	]
};

const rateLimitSession: CodingSession = {
	id: 'session-rate-limit',
	title: 'Add rate limiting to API routes',
	projectId: 'acme-web',
	location: 'worktree',
	branch: 'agent/rate-limit',
	model: { modelId: 'sonnet-5', levelId: 'medium' },
	updatedLabel: '1m',
	played: 3,
	script: [
		{ kind: 'user', text: 'Add a simple per-IP rate limit to everything under /api. 30 requests a minute is fine for now.' },
		{
			kind: 'reasoning',
			text: 'Middleware already matches `/api/:path*`, so the limiter belongs there. A fixed window in memory is enough for one region; I’ll say so in a comment.',
			durationMs: 1400
		},
		{
			kind: 'tools',
			calls: [
				{ tool: 'read', target: 'src/middleware.ts' },
				{ tool: 'list', target: 'src/app/api' }
			]
		},
		{ kind: 'edit', path: 'src/lib/rate-limit.ts', after: RATE_LIMIT_AFTER, delay: 2600 },
		{ kind: 'edit', path: 'src/middleware.ts', after: MIDDLEWARE_AFTER },
		{
			kind: 'shell',
			command: 'pnpm tsc --noEmit',
			output: '',
			exitCode: 0
		},
		{
			kind: 'say',
			text: 'Added `src/lib/rate-limit.ts` (30 requests a minute per IP, fixed window) and wired it into the existing API middleware. Over the limit, routes answer `429` with a `retry-after` header, and every response carries `x-ratelimit-remaining`. It keeps counts in memory, so swap in a shared store before scaling past one instance.'
		}
	]
};

const temporalSession: CodingSession = {
	id: 'session-temporal',
	title: 'Move date helpers off date-fns',
	projectId: 'acme-web',
	model: { modelId: 'sonnet-5', levelId: 'low' },
	updatedLabel: '4m',
	played: 3,
	script: [
		{ kind: 'user', text: 'Can we drop date-fns? We only use it in a couple of helpers.' },
		{
			kind: 'tools',
			calls: [
				{ tool: 'grep', target: "from 'date-fns'" },
				{ tool: 'read', target: 'src/lib/dates.ts' }
			]
		},
		{
			kind: 'say',
			text: 'Only `src/lib/dates.ts` imports it, for `formatDay` and `daysUntil`. Both are easy to rebuild on the platform.'
		},
		{
			kind: 'question',
			delay: 1800,
			questions: [
				{
					id: 'runtime',
					question: 'Which API should the helpers use?',
					options: [
						{ id: 'intl', label: 'Intl.DateTimeFormat and plain Date (works everywhere today)' },
						{ id: 'temporal', label: 'Temporal, with the polyfill until browsers ship it' }
					]
				}
			]
		},
		{
			kind: 'edit',
			path: 'src/lib/dates.ts',
			after: `const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });\n\nexport const formatDay = (iso: string) => dayFormat.format(new Date(iso));\n\nconst DAY_MS = 86_400_000;\nconst startOfDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());\n\nexport const daysUntil = (iso: string) => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY_MS);\n`
		},
		{ kind: 'shell', command: 'pnpm remove date-fns', output: 'Packages: -1\n-\nDone in 812ms', exitCode: 0 },
		{ kind: 'say', text: 'Rewrote both helpers on `Intl.DateTimeFormat` and removed `date-fns`. Same output for every call site.' }
	]
};

const checkoutSession: CodingSession = {
	id: 'session-checkout',
	title: 'Flaky checkout e2e test',
	projectId: 'acme-web',
	model: { modelId: 'haiku-4-5' },
	updatedLabel: '12m',
	played: 4,
	script: [
		{ kind: 'user', text: 'e2e/checkout.spec.ts fails about one run in five on CI. Find out why.' },
		{ kind: 'tools', calls: [{ tool: 'read', target: 'e2e/checkout.spec.ts' }] },
		{
			kind: 'shell',
			command: 'pnpm playwright test e2e/checkout.spec.ts --repeat-each 10',
			output: '  8 passed\n  2 failed\n    checkout.spec.ts:7  Timed out 5000ms waiting for getByText("Order confirmed")',
			exitCode: 1
		},
		{
			kind: 'error',
			title: 'The run stopped',
			text: 'The model provider returned an overloaded error while reading the trace. Nothing was changed.'
		},
		{
			kind: 'say',
			text: 'The payment call sometimes takes longer than the five-second default. The test should wait for the confirmation request to finish instead of a fixed timeout; I can make that change if you want.'
		}
	]
};

const healthSession: CodingSession = {
	id: 'session-health',
	title: 'Add a health check endpoint',
	projectId: 'acme-api',
	model: { modelId: 'haiku-4-5' },
	updatedLabel: '2h',
	played: 4,
	script: [
		{ kind: 'user', text: 'Add GET /health that returns ok and the git sha.' },
		{ kind: 'tools', calls: [{ tool: 'read', target: 'src/http.ts' }] },
		{
			kind: 'edit',
			path: 'src/health.ts',
			after: `export function health() {\n  return { ok: true, sha: process.env.GIT_SHA ?? 'dev' };\n}\n`
		},
		{ kind: 'say', text: 'Added `src/health.ts`; it reports `ok` and the `GIT_SHA` the deploy sets, or `dev` locally.' }
	]
};

function followUp(text: string): SessionBeat[] {
	const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
	return [
		{ kind: 'reasoning', text: `They asked: “${short}”. Check what it touches before answering.`, durationMs: 1200 },
		{ kind: 'tools', calls: [{ tool: 'grep', target: short.split(' ').slice(0, 2).join(' ') || 'TODO' }, { tool: 'read', target: 'README.md' }] },
		{
			kind: 'say',
			text: 'I looked through the files this would touch and nothing else depends on them, so it’s a contained change. Want me to go ahead, or keep it as a note on the diff for now?'
		}
	];
}

function newSessionScript(text: string): SessionBeat[] {
	return [
		{ kind: 'reasoning', text: 'Start by mapping the project, then make the smallest change that does it.', durationMs: 1500 },
		{
			kind: 'tools',
			calls: [
				{ tool: 'glob', target: 'src/**/*.ts' },
				{ tool: 'read', target: 'package.json' },
				{ tool: 'read', target: 'README.md' }
			]
		},
		{
			kind: 'plan',
			steps: [
				{ label: 'Map the project', status: 'done' },
				{ label: 'Make the change', status: 'in_progress' },
				{ label: 'Run the tests', status: 'pending' }
			]
		},
		{
			kind: 'edit',
			path: 'README.md',
			after: `# acme-web\n\nThe Acme customer app. \`pnpm dev\` starts it on http://localhost:3000.\n\n## Notes\n\n- ${text.replace(/\n/g, ' ')}\n`
		},
		{ kind: 'shell', command: 'pnpm test', output: ' Test Files  4 passed (4)\n      Tests  11 passed (11)', exitCode: 0 },
		{
			kind: 'plan',
			steps: [
				{ label: 'Map the project', status: 'done' },
				{ label: 'Make the change', status: 'done' },
				{ label: 'Run the tests', status: 'done' }
			]
		},
		{ kind: 'say', text: 'Made a first pass and noted it in the README so it’s easy to review. Tests pass; the diff is under **Files changed**.' }
	];
}

/** A small product codebase with sessions in every state: running live, running in the background, waiting on an answer, failed, and finished. */
export const CODING_AGENT_DEMO: CodingAgentData = {
	brand: 'Constructive',
	projects: [ACME_WEB, ACME_API],
	sessions: [invitationsSession, securitySession, redirectSession, rateLimitSession, temporalSession, checkoutSession, healthSession, longThreadSession],
	openSessionIds: ['session-invites', 'session-security', 'session-redirect', 'session-rate-limit', 'session-temporal', 'session-checkout'],
	models: CODING_AGENT_MODELS,
	defaultModel: { modelId: 'opus-5', levelId: 'high' },
	commands: [
		{ name: 'new', description: 'Start a new session' },
		{ name: 'review', description: 'Review the changes in this session' },
		{ name: 'test', description: 'Run the test suite' },
		{ name: 'compact', description: 'Summarise the conversation to free up context' },
		{ name: 'undo', description: 'Revert the last turn’s changes' },
		{ name: 'model', description: 'Switch model' },
		{ name: 'export', description: 'Export this session as Markdown' }
	],
	contextWindow: 200_000,
	usagePercent: 62,
	followUp,
	newSessionScript
};
