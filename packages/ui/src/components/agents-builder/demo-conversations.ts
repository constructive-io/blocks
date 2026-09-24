import type { AskBeatQuestion, ChatRecommendation, ConversationBeat } from './types';

// Scripted chat for the demo analytics workspace: three recommended prompts with
// branching replies, plus the replies to free-form messages.

function reviewFollowUp(count: 2 | 3): ConversationBeat {
	const word = count === 3 ? 'Three' : 'Two';
	const comments = { id: 'github-comments', label: `GitHub Post ${count} review comments`, integrationId: 'github' };
	const issues = { id: 'linear-issues', label: `Linear Create ${count} issues`, integrationId: 'linear' };
	const questions: AskBeatQuestion[] = [
		{
			id: 'how-do-you-want-them-back',
			question: 'How do you want them back?',
			options: [
				{
					id: 'comments',
					label: 'Comment on the PR',
					then: [
						{ kind: 'steps', steps: [comments] },
						{ kind: 'say', text: `Done. ${word} comments, each on its line, and the PR is marked Changes requested.` },
					],
				},
				{
					id: 'issues',
					label: 'Issues in Linear',
					then: [
						{ kind: 'steps', steps: [issues] },
						{ kind: 'say', text: `Done. ${word} issues for Data platform, each linked to its line in the PR.` },
					],
				},
				{
					id: 'both',
					label: 'Both',
					then: [
						{ kind: 'steps', steps: [comments, issues] },
						{
							kind: 'say',
							text: 'Both done: a comment on each line and an issue for each, linked to one another, so resolving one closes the other.',
						},
					],
				},
			],
		},
		{
			id: 'the-merge',
			question: 'And the merge?',
			options: [
				{
					id: 'block',
					label: 'Block until fixed',
					then: [{ kind: 'say', text: 'Merge is blocked by a required check that clears once the comments are resolved.' }],
				},
				{
					id: 'leave',
					label: 'Leave it to the author',
					then: [{ kind: 'say', text: 'Left to the author. The findings are on the PR when they look.' }],
				},
			],
		},
	];
	return {
		kind: 'ask',
		questions,
		onSkip: [{ kind: 'say', text: 'Left as they are: the findings are here whenever you want them filed.' }],
	};
}

const REVIEW_431: ConversationBeat[] = [
	{ kind: 'say', text: '#431 it is. Reading the migration against the live table and its policies.' },
	{
		kind: 'steps',
		steps: [
			{ id: 'github-pr', label: 'GitHub Read pull request #431', integrationId: 'github' },
			{ id: 'postgres-describe', label: 'Postgres Describe table accounts', integrationId: 'postgres' },
		],
	},
	{
		kind: 'say',
		text: 'Two things. It adds billing_region as NOT NULL with a default, which rewrites the 2.4M-row table under a lock: add it nullable, backfill, then set NOT NULL. And the tenant RLS policy does not cover the new column, so a billing role could read other tenants’ regions. The policy rules live in Notion, which is not in this one: add it and I will check the migration against them as well.',
	},
	{
		kind: 'ask',
		questions: [
			{
				id: 'check-against-the-rules',
				question: 'Check against the policy rules too?',
				options: [
					{
						id: 'add-notion',
						label: 'Add Notion and check',
						then: [
							{
								kind: 'steps',
								steps: [{ id: 'notion-rules', label: 'Notion Read rls-policy-rules', integrationId: 'notion' }],
							},
							{
								kind: 'say',
								text: 'One more. The rules say backfills run as the migration role, never as superuser, and this one runs as postgres. Three things in all before it ships.',
							},
							reviewFollowUp(3),
						],
					},
					{
						id: 'pr-only',
						label: 'Just the PR',
						then: [{ kind: 'say', text: 'PR only, then: the two above.' }, reviewFollowUp(2)],
					},
				],
			},
		],
	},
];

const AGENT_CREATED: ConversationBeat[] = [
	{
		kind: 'say',
		text: 'Created. It is in your agents with the three tools already connected. Want a dry run now, so you can read what it writes before anything goes to the channel?',
	},
	{
		kind: 'ask',
		questions: [
			{
				id: 'run-it-once-now',
				question: 'Run it once now?',
				options: [
					{
						id: 'run',
						label: 'Run it now',
						then: [
							{
								kind: 'steps',
								steps: [
									{ id: 'snowflake-query', label: 'Snowflake Run weekly_kpis', integrationId: 'snowflake' },
									{ id: 'slack-dm', label: 'Slack Send draft to you', integrationId: 'slack' },
								],
							},
							{
								kind: 'say',
								text: 'Ran. I sent the post to you rather than to #metrics. Read it and say if the shape is right; on Monday it goes to the channel as it is.',
							},
						],
					},
					{
						id: 'wait',
						label: 'Wait for Monday',
						then: [
							{
								kind: 'say',
								text: 'Okay. The first post lands in your inbox for a look before it goes out; from the Monday after, it goes straight to the channel.',
							},
						],
					},
				],
			},
		],
	},
];

export const DEMO_RECOMMENDATIONS: ChatRecommendation[] = [
	{
		id: 'mrr-dip',
		icon: 'file',
		parts: ["Explain last week's MRR dip", { integrationIds: ['stripe', 'snowflake'] }],
		prompt: "Explain last week's MRR dip using Stripe and Snowflake",
		reply: [
			{
				kind: 'say',
				text: "On it. Pulling last week's subscription events from Stripe and the MRR bridge from Snowflake, and reading them against the week before so the movements stay comparable.",
			},
			{
				kind: 'steps',
				steps: [
					{ id: 'stripe-subscriptions', label: 'Stripe List subscriptions', integrationId: 'stripe' },
					{ id: 'snowflake-query', label: 'Snowflake Query mrr_movements', integrationId: 'snowflake' },
				],
			},
			{
				kind: 'say',
				text: 'Net MRR is down $28.5k (−2.1%) and churn carries all of it: $83.2k across 9 accounts. One gap: 7 of the 9 had open deals, and deal stages live in HubSpot, which is not connected, so I cannot tell a real cancellation from a contract moving to annual. I can go on with what I have, or you connect it and I check every one.',
			},
			{
				kind: 'connect',
				integrationId: 'hubspot',
				onConnected: [
					{
						kind: 'steps',
						steps: [{ id: 'hubspot-deals', label: 'HubSpot Read deal stage history', integrationId: 'hubspot' }],
					},
					{
						kind: 'say',
						text: 'Much clearer. $71.4k of the churn is Halcyon Logistics moving to annual invoicing, with a renewal signed on Sep 18: a billing change, not churn. Without it, net MRR is up $42.9k (+3.1%), in line with the last eight weeks. The real churn is 8 small accounts, mostly on the Team plan.',
					},
					{
						kind: 'ask',
						questions: [
							{
								id: 'where-should-it-go',
								question: 'Where should this go? Notion is not in this one - I can add it for the filing.',
								options: [
									{
										id: 'slack',
										label: 'Post it to #revenue',
										then: [
											{
												kind: 'steps',
												steps: [{ id: 'slack-post', label: 'Slack Post #revenue', integrationId: 'slack' }],
											},
											{
												kind: 'say',
												text: 'Posted, with the bridge and Halcyon flagged as a billing change. The eight churned accounts are in the thread under the post.',
											},
										],
									},
									{
										id: 'here',
										label: 'Keep it here',
										then: [
											{
												kind: 'say',
												text: 'It stays here, then. Ask about any movement and I will open the accounts behind it.',
											},
										],
									},
									{
										id: 'add-notion',
										label: 'Add Notion and file it under Revenue / Weekly',
										then: [
											{
												kind: 'steps',
												steps: [{ id: 'notion-file', label: 'Notion Create Revenue / Weekly', integrationId: 'notion' }],
											},
											{
												kind: 'say',
												text: "Notion is in this one now, for the filing. Filed next to last week's: the bridge up top, every account linked below.",
											},
										],
									},
								],
							},
						],
					},
				],
				skip: {
					label: 'Stripe and Snowflake only',
					then: [
						{
							kind: 'say',
							text: 'Stripe and Snowflake only, then. Churn is $83.2k across 9 accounts, and Halcyon Logistics is $71.4k of it on its own. That looks like a contract change rather than churn, but without HubSpot I cannot confirm it, so treat the −2.1% as a ceiling. Connect HubSpot whenever and I will redo the week with the deals in.',
						},
					],
				},
			},
		],
	},
	{
		id: 'migration-review',
		icon: 'file-search',
		parts: ['Review a migration', { integrationIds: ['github'] }, 'before it ships', { integrationIds: ['postgres'] }],
		prompt: 'Review the accounts migration in GitHub before it ships to Postgres',
		reply: [
			{ kind: 'say', text: 'Opening GitHub. Two open pull requests touch accounts - which one is shipping?' },
			{
				kind: 'ask',
				questions: [
					{
						id: 'which-pr',
						question: 'Which pull request?',
						options: [
							{ id: '431', label: '#431 Add billing_region to accounts · opened yesterday', then: REVIEW_431 },
							{
								id: '427',
								label: '#427 Drop legacy_plan column · last week',
								then: [
									{
										kind: 'say',
										text: '#427 is still a draft, and three dashboards read legacy_plan. Sure that is the one?',
									},
									{
										kind: 'ask',
										questions: [
											{
												id: 'review-it-anyway',
												question: 'Review it anyway?',
												options: [
													{
														id: 'anyway',
														label: 'Yes, review it anyway',
														then: [
															{
																kind: 'steps',
																steps: [{ id: 'github-pr', label: 'GitHub Read pull request #427', integrationId: 'github' }],
															},
															{
																kind: 'say',
																text: 'Done. It would break three dashboards and the churned_accounts model. Nothing to ship until they move off legacy_plan - say when and I will check again.',
															},
														],
													},
													{ id: '431', label: 'No, use #431', then: REVIEW_431 },
												],
											},
										],
									},
								],
							},
						],
					},
				],
				onSkip: [{ kind: 'say', text: 'Taking the newest, then.' }, ...REVIEW_431],
			},
		],
	},
	{
		id: 'weekly-chore',
		icon: 'refresh',
		parts: ['Turn a weekly chore', { integrationIds: ['snowflake', 'slack', 'notion'] }, 'into an agent'],
		prompt: 'Turn the Monday KPI post into an agent: Snowflake to Slack, filed in Notion',
		reply: [
			{
				kind: 'say',
				text: 'That one is every Monday morning: run the weekly_kpis query, paste the deltas into #metrics, file the post under Reports. Checking the three tools are what I think they are before I draft anything.',
			},
			{
				kind: 'steps',
				steps: [
					{ id: 'snowflake-get', label: 'Snowflake Read saved query weekly_kpis', integrationId: 'snowflake' },
					{ id: 'slack-channel', label: 'Slack Get channel #metrics', integrationId: 'slack' },
					{ id: 'notion-reports', label: 'Notion Read Reports / Weekly', integrationId: 'notion' },
				],
			},
			{
				kind: 'say',
				text: 'All there, and the last four posts follow the same shape, so I have written it as steps. Here is the agent. Nothing runs until you say so.',
			},
			{
				kind: 'agent',
				draft: {
					name: 'monday_kpis',
					schedule: 'Mondays at 9:00',
					integrationIds: ['snowflake', 'slack', 'notion'],
					steps: [
						'Run the weekly_kpis query in Snowflake',
						'Post the deltas to #metrics',
						'File the post under Reports / Weekly in Notion',
					],
				},
				options: [
					{ id: 'create', label: 'Create agent', chosenLabel: 'Agent created', then: AGENT_CREATED },
					{
						id: 'later',
						label: 'Not now',
						then: [
							{
								kind: 'say',
								text: 'Kept as a draft in your agents. Open it whenever to change the query, the channel or the hour; it takes the first Monday after you turn it on.',
							},
						],
					},
				],
			},
		],
	},
];

export const DEMO_FALLBACK_REPLY: ConversationBeat[] = [
	{
		kind: 'say',
		text: 'I can take that. Before I start: this workspace has Postgres, Snowflake, dbt, Stripe, Slack, Notion and GitHub connected. Which of them matter here?',
	},
	{
		kind: 'ask',
		questions: [
			{
				id: 'which-apps',
				question: 'Which apps?',
				options: [
					{
						id: 'all',
						label: 'All of them',
						then: [
							{
								kind: 'say',
								text: 'All seven, then. Give me a minute: I will read what is there first and come back with a plan before I change anything.',
							},
						],
					},
					{
						id: 'some',
						label: 'Slack and Notion only',
						then: [{ kind: 'say', text: 'Slack and Notion. I will stay out of the rest; say if that changes.' }],
					},
					{
						id: 'name',
						label: 'Let me say which',
						then: [
							{
								kind: 'say',
								text: 'Go ahead: name the apps, or paste a link to where the work lives, and I will pick it up from there.',
							},
						],
					},
				],
			},
		],
	},
];

export const DEMO_FOLLOW_UP_REPLY: ConversationBeat[] = [
	{
		kind: 'say',
		text: 'Noted, and folded into what is above. Say what else you need on this one, or start a new chat when it is done.',
	},
];
