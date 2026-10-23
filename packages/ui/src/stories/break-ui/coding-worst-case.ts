/**
 * Worst-case Coding Agent workspace, shaped exactly like `CODING_AGENT_DEMO`. Branch names, paths, commands and
 * titles are the lengths real repositories produce: a ticket-numbered branch, a monorepo path five folders deep, a
 * pasted URL with no break opportunity, a command that ran out of memory, a CJK title, an RTL project.
 */
import { CODING_AGENT_DEMO, type CodingAgentData, type CodingProject, type CodingSession, type SessionBeat } from '../../components/coding-agent';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const LONG_BRANCH = 'feature/JIRA-48213-migrate-billing-adjustment-line-items-to-usage-based-pricing';
const DEEP_PATH = 'packages/billing-service/src/modules/subscriptions/adjustments/line-items/customer_subscription_billing_adjustment_line_items.repository.ts';
const SPACED_FILE = 'docs/Q3 Board Deck — FINAL (revised) v12 [approved by legal].md';
const LONG_COMMAND =
	'pnpm --filter @northwind-industries-holdings/customer-portal-billing-service exec vitest run --reporter=verbose --coverage --coverage.reporter=text src/modules/subscriptions/adjustments/line-items/customer_subscription_billing_adjustment_line_items.repository.test.ts';
const LONG_URL = `http://localhost:3000/settings/billing/adjustments?tab=line-items&filter=unresolved&owner=${emails.long}&redirect=${encodeURIComponent(identifiers.url)}`;

/** A 140-column line, which formatters allow in many codebases. */
const WIDE_LINE = `export const ${identifiers.snakeIdentifier}_query = sql\`select * from ${identifiers.snakeIdentifier} where customer_id = $1 and adjustment_reason <> 'migration' order by created_at desc\`;`;

const repeatLines = (count: number, make: (index: number) => string) => manyRows(count, make).join('\n');

const BIG_FILE_BEFORE = repeatLines(420, (index) => (index % 37 === 0 ? WIDE_LINE : `export const value${index} = compute(${index}, '${identifiers.uuid}');`));
const BIG_FILE_AFTER = repeatLines(436, (index) =>
	index % 37 === 0 ? WIDE_LINE.replace('desc', 'asc') : index % 11 === 0 ? `export const value${index} = await computeAsync(${index});` : `export const value${index} = compute(${index}, '${identifiers.uuid}');`
);

const OOM_OUTPUT = [
	...manyRows(260, (index) => ` ✓ src/modules/subscriptions/adjustments/case-${String(index).padStart(3, '0')}.test.ts (12 tests) ${10 + (index % 90)}ms`),
	'',
	'<--- Last few GCs --->',
	'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
	` 1: 0x1009b4c84 node::Abort() [/Users/${names.longHyphenated.toLowerCase().replace(/\s/g, '')}/.nvm/versions/node/v24.11.0/bin/node]`
].join('\n');

const worstFiles: Record<string, string> = {
	'package.json': '{\n  "name": "@northwind-industries-holdings/customer-portal"\n}\n',
	[DEEP_PATH]: BIG_FILE_BEFORE,
	[SPACED_FILE]: `# ${identifiers.fileName}\n\n${labels.longDescription}\n`,
	'src/i18n/de.json': `{ "settings": "${labels.german}" }\n`,
	'src/i18n/fr.json': `{ "privacy": "${labels.french}" }\n`,
	'src/markup.html': `<p>${labels.markup}</p>\n`,
	...Object.fromEntries(manyRows(40, (index) => [`src/components/generated/Component${index}WithAVeryDescriptiveButStillRealisticName.tsx`, `export function C${index}() { return null; }\n`]))
};

export const worstProjects: CodingProject[] = [
	{
		id: 'portal',
		name: 'northwind-industries-holdings-customer-portal-monorepo',
		path: '~/Developer/clients/northwind-industries-holdings/customer-portal-monorepo',
		branch: LONG_BRANCH,
		files: worstFiles
	},
	{ id: 'j', name: 'j', path: '~/j', branch: 'main', files: { 'a.ts': 'export {};\n' } },
	{ id: 'cjk', name: '王秀英的发票系统', path: '~/代码/发票系统', branch: '主分支', files: { 'src/发票.ts': 'export const 发票 = [];\n' } },
	{ id: 'rtl', name: 'لوحة-تحكم-الفواتير', path: '~/مشاريع/لوحة-تحكم-الفواتير', branch: 'main', files: { 'src/index.ts': 'export {};\n' } }
];

const worstScript: SessionBeat[] = [
	{
		kind: 'user',
		text: `${emails.long} reported that ${LONG_URL} 500s after the migration.\n\nSteps:\n1. Sign in as ${names.longSuffix}\n2. Open the link\n3. ${labels.markup}\n\nCan you fix ${DEEP_PATH} and run the tests?`
	},
	{ kind: 'reasoning', text: `${labels.longDescription} ${labels.longDescription}`, durationMs: 400 },
	{
		kind: 'plan',
		steps: [
			{ label: `Read ${DEEP_PATH} and the ${identifiers.snakeIdentifier} migration`, status: 'done' },
			{ label: labels.longDescription, status: 'in_progress' },
			{ label: 'J', status: 'pending' }
		]
	},
	{
		kind: 'tools',
		calls: [
			...manyRows(38, (index) => ({ tool: 'read' as const, target: `${DEEP_PATH.replace('.ts', '')}.part-${index}.ts` })),
			{ tool: 'grep', target: identifiers.snakeIdentifier },
			{ tool: 'webfetch', target: LONG_URL }
		]
	},
	{
		kind: 'say',
		text: `The ${'`'}${identifiers.snakeIdentifier}${'`'} query sorts descending, so ${'`'}${DEEP_PATH}${'`'} returns the newest adjustment first. See ${identifiers.url} and ${LONG_URL}.\n\n${'```'}ts\n${WIDE_LINE}\n${'```'}\n\n${labels.markup}`
	},
	{ kind: 'edit', path: DEEP_PATH, after: BIG_FILE_AFTER },
	{ kind: 'edit', path: SPACED_FILE, after: `# ${identifiers.fileName}\n\nUpdated.\n` },
	{ kind: 'edit', path: 'src/i18n/de.json', after: `{ "settings": "${labels.german}", "privacy": "Datenschutz- und Sicherheitseinstellungen" }\n` },
	{ kind: 'permission', title: 'Run a command', command: LONG_COMMAND },
	{ kind: 'shell', command: LONG_COMMAND, output: OOM_OUTPUT, exitCode: 137 },
	{ kind: 'browse', url: LONG_URL, title: labels.french },
	{
		kind: 'question',
		questions: [
			{
				id: 'memory',
				question: `The test run was killed for using too much memory (exit 137). ${labels.longDescription}`,
				options: [
					{ id: 'raise', label: 'Raise NODE_OPTIONS=--max-old-space-size=8192 for this package only and rerun the full suite' },
					{ id: 'shard', label: labels.german },
					{ id: 'j', label: 'J' }
				]
			}
		]
	},
	{ kind: 'notice', text: `${labels.status}. ${labels.longDescription}` },
	{ kind: 'error', title: labels.french, text: `${labels.longDescription} ${identifiers.url}` }
];

const titled = (id: string, title: string, projectId: string, extra: Partial<CodingSession> = {}): CodingSession => ({
	id,
	title,
	projectId,
	script: [{ kind: 'user', text: title }, { kind: 'say', text: 'Done.' }],
	played: 2,
	updatedLabel: '3w',
	...extra
});

export const worstSessions: CodingSession[] = [
	{
		id: 'worst',
		title: `Fix ${identifiers.snakeIdentifier} ordering after the usage-based pricing migration broke the EMEA invoices`,
		projectId: 'portal',
		location: 'worktree',
		branch: LONG_BRANCH,
		model: { modelId: 'long-model', levelId: 'max' },
		updatedLabel: '11mo',
		script: worstScript,
		played: 8
	},
	titled('cjk', '修复发票导出时的时区问题并补充测试用例', 'cjk'),
	titled('rtl', 'إصلاح خطأ في تصدير الفواتير', 'rtl'),
	titled('one', 'J', 'j'),
	titled('emoji', `${names.zwjEmoji} asked: why does checkout 500?`, 'portal'),
	titled('running', `${labels.german} ${labels.french}`, 'portal', { played: 0, script: [{ kind: 'user', text: 'Go' }, { kind: 'say', text: labels.longDescription, delay: 60_000 }] }),
	...manyRows(8, (index) => titled(`extra-${index}`, `${identifiers.cameraFile} follow-up ${index + 1}`, 'portal'))
];

export const worstCodingAgent: CodingAgentData = {
	...CODING_AGENT_DEMO,
	brand: 'Northwind Industries Holdings Engineering Workspace',
	projects: worstProjects,
	sessions: worstSessions,
	openSessionIds: worstSessions.map((session) => session.id),
	models: [
		...CODING_AGENT_DEMO.models,
		{
			id: 'long-model',
			name: 'Claude Opus 5.5 (1M context, extended thinking)',
			provider: 'Anthropic',
			levels: [{ id: 'max', label: 'Maximum reasoning budget (billed as output)' }],
			defaultLevel: 'max',
			contextWindow: 1_000_000
		}
	],
	commands: [
		...CODING_AGENT_DEMO.commands,
		{ name: 'migrate-billing-adjustment-line-items', description: labels.longDescription }
	],
	contextWindow: 16_000,
	usagePercent: 97
};

/** One of everything: one project with one file, one session that changed one file, so every count reads 1. */
export const oneCodingAgent: CodingAgentData = {
	...CODING_AGENT_DEMO,
	projects: [{ id: 'j', name: 'j', path: '~/j', branch: 'main', files: { 'a.ts': 'export const a = 1;\n' } }],
	sessions: [
		{
			id: 'one',
			title: 'J',
			projectId: 'j',
			script: [
				{ kind: 'user', text: 'J' },
				{ kind: 'tools', calls: [{ tool: 'read', target: 'a.ts' }] },
				{ kind: 'edit', path: 'a.ts', after: 'export const a = 2;\n' },
				{ kind: 'say', text: 'J' }
			],
			played: 4
		}
	],
	openSessionIds: ['one'],
	models: [CODING_AGENT_DEMO.models[2]],
	defaultModel: { modelId: CODING_AGENT_DEMO.models[2].id },
	commands: [CODING_AGENT_DEMO.commands[0]]
};

/** Nothing yet: a project with no files and no sessions. */
export const emptyCodingAgent: CodingAgentData = {
	...CODING_AGENT_DEMO,
	projects: [{ id: 'empty', name: 'new-project', path: '~/new-project', branch: 'main', files: {} }],
	sessions: [],
	openSessionIds: [],
	commands: []
};

/** 40 open tabs, 1,000 sessions across projects, and a 1,000-file checkout. */
export const hugeCodingAgent: CodingAgentData = (() => {
	const files = Object.fromEntries(
		manyRows(1000, (index) => [`src/modules/module-${Math.floor(index / 25)}/feature-${index % 25}/file-${index}.ts`, `export const value${index} = ${index};\n`])
	);
	const project: CodingProject = { ...worstProjects[0], files };
	const sessions = manyRows(1000, (index) =>
		titled(`huge-${index}`, `Session ${index + 1}: ${index % 3 === 0 ? identifiers.snakeIdentifier : 'tidy the release notes'}`, 'portal', {
			script: [
				{ kind: 'user', text: 'Go' },
				...manyRows(60, (step): SessionBeat => (step % 2 ? { kind: 'say', text: `Step ${step} done.` } : { kind: 'tools', calls: [{ tool: 'read', target: `src/modules/module-${step}/feature-1/file-${step}.ts` }] }))
			],
			played: 61
		})
	);
	return { ...CODING_AGENT_DEMO, projects: [project], sessions, openSessionIds: sessions.slice(0, 40).map((session) => session.id) };
})();
