import type { AssistantScript, QuestionThread } from './types';

export const DEMO_QUESTIONS: QuestionThread[] = [
	{
		id: 'question-change-of-control',
		roomId: 'room-atlas',
		documentId: 'doc-msa-halvorsen',
		askedBy: 'person-dana',
		askedAt: '2026-09-23T16:12:00.000Z',
		title: 'Change of control in the Halvorsen MSA',
		status: 'open',
		assigneeId: 'person-grace',
		messages: [
			{
				id: 'question-change-of-control-1',
				authorId: 'person-dana',
				at: '2026-09-23T16:12:00.000Z',
				body: 'Halvorsen is roughly 14% of revenue. Can they terminate on a change of control, and has the seller approached them about consent?',
			},
		],
		draft: {
			body: 'Clause 18.3 lets Halvorsen terminate within 90 days of a change of control, but only with 6 months’ notice and a pro-rata payment of committed volumes. The seller plans to request consent after signing; the request letter will be added to /03 Legal before the bid deadline.',
			citations: [
				{ documentId: 'doc-msa-halvorsen', page: 14, quote: '18.3 Either party may terminate on a Change of Control by giving not less than six (6) months’ notice…' },
				{ documentId: 'doc-contracts-index', page: 2 },
			],
		},
	},
	{
		id: 'question-revenue-bridge',
		roomId: 'room-atlas',
		documentId: 'doc-management-accounts',
		askedBy: 'person-owen',
		askedAt: '2026-09-19T10:40:00.000Z',
		title: 'Q2 revenue bridge',
		status: 'answered',
		assigneeId: 'person-dev',
		messages: [
			{
				id: 'question-revenue-bridge-1',
				authorId: 'person-owen',
				at: '2026-09-19T10:40:00.000Z',
				body: 'Q2 revenue is up 11% year on year but volumes are flat. Can you split price, mix, and new lanes?',
			},
			{
				id: 'question-revenue-bridge-2',
				authorId: 'person-dev',
				at: '2026-09-21T13:05:00.000Z',
				body: 'We’ve added a bridge: price +6.2%, mix +1.4%, new Baltic lanes +3.6%. See the revenue bridge in /02 Financials.',
			},
		],
	},
	{
		id: 'question-concentration',
		roomId: 'room-atlas',
		documentId: 'doc-cohorts',
		askedBy: 'person-dana',
		askedAt: '2026-09-24T09:05:00.000Z',
		title: 'Top-10 customer concentration',
		status: 'open',
		messages: [
			{
				id: 'question-concentration-1',
				authorId: 'person-dana',
				at: '2026-09-24T09:05:00.000Z',
				body: 'What share of FY25 revenue came from the top 10 customers, and how many are on contracts longer than 2 years?',
			},
		],
		draft: {
			body: 'The top 10 customers made up 46% of FY2025 revenue. Seven of them are on multi-year contracts; the cohort analysis lists terms by customer.',
			citations: [{ documentId: 'doc-cohorts' }, { documentId: 'doc-audited', page: 31 }],
		},
	},
	{
		id: 'question-depot-lease',
		roomId: 'room-atlas',
		documentId: 'doc-lease-rotterdam',
		askedBy: 'person-priya',
		askedAt: '2026-09-12T09:00:00.000Z',
		title: 'Rotterdam lease break date',
		status: 'closed',
		messages: [
			{ id: 'question-depot-lease-1', authorId: 'person-priya', at: '2026-09-12T09:00:00.000Z', body: 'Is the 2028 break option still exercisable after the rent review?' },
			{ id: 'question-depot-lease-2', authorId: 'person-grace', at: '2026-09-12T15:30:00.000Z', body: 'Yes. The rent review side letter leaves clause 7 unchanged.' },
		],
	},
	{
		id: 'question-option-pool',
		roomId: 'room-lumen',
		documentId: 'doc-lumen-pro-forma',
		askedBy: 'person-lena',
		askedAt: '2026-09-10T08:30:00.000Z',
		title: 'Option pool top-up',
		status: 'answered',
		assigneeId: 'person-dev',
		messages: [
			{ id: 'question-option-pool-1', authorId: 'person-lena', at: '2026-09-10T08:30:00.000Z', body: 'Is the 4% pool top-up pre- or post-money?' },
			{ id: 'question-option-pool-2', authorId: 'person-dev', at: '2026-09-10T14:00:00.000Z', body: 'Pre-money, as in the signed term sheet.' },
		],
	},
];

export const DEMO_ASSISTANT: AssistantScript = {
	suggestions: [
		'How did revenue grow in FY2025?',
		'Can Halvorsen terminate on a change of control?',
		'What EBITDA does the valuation model assume?',
		'How concentrated are the top customers?',
	],
	replies: [
		{
			match: ['revenue', 'growth', 'grow', 'sales'],
			text: 'Revenue grew 18% to €142.6M in FY2025, driven by price increases on contract renewals and the new Baltic lanes. Q2 2026 is running 11% ahead of last year on flat volumes.',
			citations: [
				{ documentId: 'doc-audited', page: 12, quote: 'Revenue for the year was €142.6 million (2024: €120.8 million).' },
				{ documentId: 'doc-revenue-bridge', page: 2 },
				{ documentId: 'doc-management-accounts' },
			],
		},
		{
			match: ['halvorsen', 'change of control', 'terminate', 'termination', 'msa'],
			text: 'Yes, but not freely. Clause 18.3 lets Halvorsen terminate within 90 days of a change of control with six months’ notice and a pro-rata payment of committed volumes.',
			citations: [
				{ documentId: 'doc-msa-halvorsen', page: 14, quote: '18.3 Either party may terminate on a Change of Control by giving not less than six (6) months’ notice…' },
				{ documentId: 'doc-contracts-index', page: 2 },
			],
		},
		{
			match: ['ebitda', 'valuation', 'model', 'multiple', 'assume'],
			text: 'The model uses FY2026 run-rate EBITDA of €27.4M, with depot leases restated under IFRS 16, and tests exit multiples from 8.5× to 10×.',
			citations: [
				{ documentId: 'doc-model-assumptions', page: 3 },
				{ documentId: 'doc-valuation-model', quote: 'Run-rate EBITDA FY26: 27.4' },
			],
		},
		{
			match: ['customer', 'customers', 'concentration', 'top', 'cohort'],
			text: 'The top 10 customers made up 46% of FY2025 revenue, and Halvorsen alone about 14%. Seven of the ten are on contracts longer than two years.',
			citations: [{ documentId: 'doc-cohorts' }, { documentId: 'doc-audited', page: 31 }],
		},
		{
			match: ['lease', 'depot', 'rotterdam', 'break'],
			text: 'The Rotterdam depot lease runs to 2033 with a tenant break in March 2028, which survives the 2026 rent review.',
			citations: [{ documentId: 'doc-lease-rotterdam', page: 9 }],
		},
		{
			match: ['employee', 'employees', 'retention', 'management', 'key'],
			text: 'Five key employees have retention bonuses payable 12 months after completion, worth €1.1M in total, and 6-month non-competes.',
			citations: [{ documentId: 'doc-key-employees', page: 2 }],
		},
		{
			match: ['option', 'pool', 'pre-money', 'post-money'],
			text: 'The 4% option pool top-up is pre-money, per the signed term sheet.',
			citations: [{ documentId: 'doc-lumen-term-sheet', page: 2 }, { documentId: 'doc-lumen-pro-forma' }],
		},
	],
	fallback: 'I couldn’t find that in the documents you can open in this room. Try asking the deal team in Q&A.',
};
