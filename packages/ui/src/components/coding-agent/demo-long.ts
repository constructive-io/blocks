import type { CodingSession, SessionBeat } from './types';

/**
 * A very long thread for stress-testing the transcript and the turn rail: a route-by-route migration of an API layer
 * over 120 turns, each with reasoning, reads, an edit, a test run and a reply. It opens with all of it as history.
 */

const ROUTES = [
	'accounts',
	'audit-events',
	'billing/invoices',
	'billing/portal',
	'checkout',
	'comments',
	'exports',
	'feature-flags',
	'files',
	'health',
	'imports',
	'integrations/github',
	'integrations/slack',
	'invitations',
	'members',
	'notifications',
	'orders',
	'projects',
	'reports',
	'search',
	'sessions',
	'settings',
	'tags',
	'teams',
	'tokens',
	'uploads',
	'usage',
	'users',
	'webhooks/stripe',
	'workspaces'
] as const;

type Route = (typeof ROUTES)[number];

const handlerName = (route: Route) =>
	route
		.split(/[/-]/)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');

function routeFile(route: Route, step: number) {
	const name = handlerName(route);
	return `import { z } from 'zod';

import { route } from '@/lib/typed-route';
import { db } from '@/lib/db';

const Query = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(${50 + step}).default(20) });

/** GET /api/${route}: one page of ${route}, newest first. */
export const GET = route({ query: Query }, async ({ query, session }) => {
  const rows = await db.${name}.findMany({
    where: { teamId: session.teamId },
    take: query.limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    orderBy: { createdAt: 'desc' }
  });
  const next = rows.length > query.limit ? rows.pop()?.id : undefined;
  return { items: rows, next };
});
`;
}

const ASKS: ((route: Route) => string)[] = [
	(route) => `Move \`/api/${route}\` onto the typed route helper.`,
	(route) => `The \`${route}\` handler still parses its query by hand. Use the zod schema like the others.`,
	(route) => `Add pagination to \`/api/${route}\`, same cursor shape as \`/api/teams\`.`,
	(route) => `\`/api/${route}\` returns 500 when \`limit\` is a string. Fix it and cover it with a test.`
];

const REPLIES: ((route: Route, step: number) => string)[] = [
	(route) =>
		`\`/api/${route}\` now goes through \`route()\`: the query is validated before the handler runs, and a bad one gets a **400** with the field that failed instead of a 500.`,
	(_route, step) =>
		`Done. The handler takes \`{ query, session }\` from the helper, so the hand-rolled parsing is gone. ${step % 3 === 0 ? 'One test needed updating because it relied on the old error text.' : 'Existing tests pass unchanged.'}`,
	(route) =>
		`\`/api/${route}\` pages with a cursor now:\n\n- \`limit\` defaults to **20** and is capped.\n- \`next\` is the id to pass as \`cursor\` for the following page, and is absent on the last one.`,
	(route) =>
		`Fixed: \`limit\` is coerced from the query string, so \`?limit=10\` works and \`?limit=ten\` is a **400**. Added a test for both in \`test/api/${route.replace('/', '-')}.test.ts\`.`
];

function turn(index: number): SessionBeat[] {
	const route = ROUTES[index % ROUTES.length];
	const kind = index % ASKS.length;
	const test = `test/api/${route.replace('/', '-')}.test.ts`;
	const passed = 3 + (index % 5);
	return [
		{ kind: 'user', text: ASKS[kind](route) },
		{
			kind: 'reasoning',
			text: `Check how \`${route}\` reads its input today, then follow the pattern the migrated routes use so the error shape stays consistent.`,
			durationMs: 600 + (index % 7) * 150
		},
		{
			kind: 'tools',
			calls: [
				{ tool: 'read', target: `src/app/api/${route}/route.ts` },
				{ tool: 'grep', target: `/api/${route}` },
				{ tool: 'read', target: 'src/lib/typed-route.ts' }
			]
		},
		{ kind: 'edit', path: `src/app/api/${route}/route.ts`, after: routeFile(route, index) },
		{
			kind: 'shell',
			command: `pnpm vitest run ${test}`,
			output: ` ✓ ${test} (${passed} tests) ${12 + (index % 9)}ms\n\n Test Files  1 passed (1)\n      Tests  ${passed} passed (${passed})`,
			exitCode: 0
		},
		{ kind: 'say', text: REPLIES[kind](route, index) }
	];
}

/** How many turns the long thread has. */
export const LONG_THREAD_TURNS = 120;

const script: SessionBeat[] = Array.from({ length: LONG_THREAD_TURNS }, (_, index) => turn(index)).flat();

export const longThreadSession: CodingSession = {
	id: 'session-long',
	title: 'Move the API layer to typed routes',
	projectId: 'acme-web',
	location: 'worktree',
	branch: 'agent/typed-routes',
	model: { modelId: 'sonnet-5', levelId: 'medium' },
	updatedLabel: '3h',
	script,
	played: script.length
};
