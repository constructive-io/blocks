import type { InheritancePolicy, Membership, OrgUnit, Person, Role, Room } from './types';

/** The demo clock: every relative date and expiry is measured from it. */
export const DATA_ROOMS_CLOCK = '2026-09-24T15:00:00.000Z';

export const DEMO_UNITS: OrgUnit[] = [
	{ id: 'unit-northwind', parentId: null, name: 'Northwind Holdings', kind: 'Organization' },
	{ id: 'unit-fund-2', parentId: 'unit-northwind', name: 'Fund II', kind: 'Fund' },
	{ id: 'unit-portfolio', parentId: 'unit-northwind', name: 'Portfolio Ops', kind: 'Team' },
];

export const DEMO_PEOPLE: Person[] = [
	{ id: 'person-maya', name: 'Maya Okafor', email: 'maya@northwind.co', title: 'Partner, Fund II' },
	{ id: 'person-elliot', name: 'Elliot Brandt', email: 'elliot@northwind.co', title: 'Managing Partner' },
	{ id: 'person-sofia', name: 'Sofia Reyes', email: 'sofia@northwind.co', title: 'Chief Operating Officer' },
	{ id: 'person-grace', name: 'Grace Liu', email: 'grace@northwind.co', title: 'General Counsel' },
	{ id: 'person-dev', name: 'Dev Patel', email: 'dev@northwind.co', title: 'Associate, Fund II' },
	{ id: 'person-hana', name: 'Hana Kim', email: 'hana@northwind.co', title: 'Analyst, Fund II' },
	{ id: 'person-nina', name: 'Nina Park', email: 'nina@northwind.co', title: 'Analyst, Fund II' },
	{ id: 'person-tom', name: 'Tom Alvarez', email: 'tom@northwind.co', title: 'Head of Portfolio Ops' },
	{ id: 'person-rui', name: 'Rui Santos', email: 'rui.santos@atlasfreight.eu', title: 'CFO', company: 'Atlas Freight', guest: true },
	{ id: 'person-priya', name: 'Priya Nair', email: 'pnair@halemercer.law', title: 'Counsel', company: 'Hale & Mercer LLP', guest: true },
	{ id: 'person-dana', name: 'Dana Chen', email: 'dana.chen@kestrel.partners', title: 'Partner', company: 'Kestrel Partners', guest: true },
	{ id: 'person-owen', name: 'Owen Hart', email: 'owen.hart@kestrel.partners', title: 'Associate', company: 'Kestrel Partners', guest: true },
	{ id: 'person-marco', name: 'Marco Bellini', email: 'marco@brightline.capital', title: 'Director', company: 'Brightline Capital', guest: true },
	{ id: 'person-kai', name: 'Kai Moreno', email: 'kai@arden-advisory.com', title: 'Valuation lead', company: 'Arden Advisory', guest: true },
	{ id: 'person-lena', name: 'Lena Fischer', email: 'lena@kestrelcapital.vc', title: 'Principal', company: 'Kestrel Capital', guest: true },
	{ id: 'person-james', name: 'James Whitfield', email: 'j.whitfield@boardmail.org', title: 'Independent director', company: 'Northwind board', guest: true },
];

export const DEMO_ROLES: Role[] = [
	{
		id: 'role-viewer',
		name: 'Viewer',
		description: 'Reads and downloads documents, and asks the assistant.',
		permissions: ['view', 'download', 'ask_assistant'],
		isDefault: true,
	},
	{
		id: 'role-contributor',
		name: 'Contributor',
		description: 'Everything a viewer can do, and uploads documents.',
		permissions: ['view', 'download', 'upload', 'ask_assistant'],
	},
	{
		id: 'role-editor',
		name: 'Editor',
		description: 'Organizes documents and shares folders.',
		permissions: ['view', 'download', 'upload', 'edit', 'delete', 'share', 'ask_assistant'],
	},
	{
		id: 'role-manager',
		name: 'Manager',
		description: 'Runs the room: people, settings, the agreement, and questions.',
		permissions: ['view', 'download', 'upload', 'edit', 'delete', 'share', 'invite', 'manage_members', 'manage_room', 'ask_assistant'],
	},
];

export const DEMO_INHERITANCE: InheritancePolicy = { owners: true, admins: true, members: true, allowGuests: true };

export const DEMO_ROOMS: Room[] = [
	{
		id: 'room-atlas',
		unitId: 'unit-fund-2',
		name: 'Project Atlas',
		description: 'Sale of Atlas Freight. Second-round diligence for shortlisted bidders.',
		status: 'active',
		createdAt: '2026-07-02T09:00:00.000Z',
		createdBy: 'person-maya',
		closesAt: '2026-10-15T17:00:00.000Z',
		policies: { viewOnly: false, watermark: true, requireAgreement: true, restricted: true },
		agreement: {
			title: 'Confidentiality agreement',
			version: 2,
			updatedAt: '2026-09-01T09:00:00.000Z',
			body: [
				'You are receiving confidential information about Atlas Freight B.V. ("the Company") for the sole purpose of evaluating a possible acquisition.',
				'You will keep everything in this room confidential, share it only with advisors bound by the same terms, and not contact the Company’s employees, customers, or suppliers without written consent.',
				'Downloads are watermarked with your name and the time. Every view and download is logged.',
				'Version 2 adds the non-solicitation period of 18 months and the clean-team arrangement for customer pricing in /04 Commercial.',
			].join('\n\n'),
		},
	},
	{
		id: 'room-lumen',
		unitId: 'unit-fund-2',
		name: 'Series B · Lumen',
		description: 'Follow-on round materials shared with co-investors.',
		status: 'closing',
		createdAt: '2026-08-11T09:00:00.000Z',
		createdBy: 'person-dev',
		closesAt: '2026-09-30T17:00:00.000Z',
		policies: { viewOnly: true, watermark: true, requireAgreement: true, restricted: false },
		agreement: {
			title: 'Co-investor terms',
			version: 1,
			body: 'Materials are shared with prospective co-investors for evaluating the Series B only. Do not forward or reproduce them.',
		},
	},
	{
		id: 'room-board',
		unitId: 'unit-northwind',
		name: 'Board Q3 pack',
		description: 'Papers for the Q3 board meeting on October 2.',
		status: 'active',
		createdAt: '2026-09-15T09:00:00.000Z',
		createdBy: 'person-sofia',
		closesAt: '2026-10-02T09:00:00.000Z',
		policies: { viewOnly: false, watermark: false, requireAgreement: false, restricted: true },
	},
	{
		id: 'room-kpis',
		unitId: 'unit-portfolio',
		name: 'Portfolio KPIs',
		description: 'Monthly reporting packs from portfolio companies.',
		status: 'active',
		createdAt: '2026-03-01T09:00:00.000Z',
		createdBy: 'person-tom',
		policies: { viewOnly: false, watermark: false, requireAgreement: false, restricted: false },
	},
];

export const DEMO_MEMBERSHIPS: Membership[] = [
	// Organization
	{ id: 'mem-elliot-org', personId: 'person-elliot', scope: { kind: 'unit', id: 'unit-northwind' }, owner: true, status: 'active', joinedAt: '2021-01-04T09:00:00.000Z' },
	{ id: 'mem-sofia-org', personId: 'person-sofia', scope: { kind: 'unit', id: 'unit-northwind' }, admin: true, status: 'active', joinedAt: '2021-03-01T09:00:00.000Z' },
	{ id: 'mem-maya-org', personId: 'person-maya', scope: { kind: 'unit', id: 'unit-northwind' }, roleId: 'role-viewer', status: 'active', joinedAt: '2022-05-09T09:00:00.000Z' },
	{ id: 'mem-grace-org', personId: 'person-grace', scope: { kind: 'unit', id: 'unit-northwind' }, roleId: 'role-viewer', status: 'active', joinedAt: '2023-02-13T09:00:00.000Z' },
	{ id: 'mem-tom-org', personId: 'person-tom', scope: { kind: 'unit', id: 'unit-northwind' }, roleId: 'role-viewer', status: 'active', joinedAt: '2023-06-01T09:00:00.000Z' },
	// Fund II
	{ id: 'mem-maya-fund', personId: 'person-maya', scope: { kind: 'unit', id: 'unit-fund-2' }, admin: true, status: 'active', joinedAt: '2022-05-09T09:00:00.000Z' },
	{ id: 'mem-dev-fund', personId: 'person-dev', scope: { kind: 'unit', id: 'unit-fund-2' }, roleId: 'role-contributor', status: 'active', joinedAt: '2024-09-02T09:00:00.000Z' },
	{ id: 'mem-hana-fund', personId: 'person-hana', scope: { kind: 'unit', id: 'unit-fund-2' }, roleId: 'role-viewer', status: 'active', joinedAt: '2025-08-18T09:00:00.000Z' },
	{ id: 'mem-nina-fund', personId: 'person-nina', scope: { kind: 'unit', id: 'unit-fund-2' }, roleId: 'role-viewer', status: 'active', joinedAt: '2026-09-01T09:00:00.000Z' },
	// Portfolio Ops
	{ id: 'mem-tom-ops', personId: 'person-tom', scope: { kind: 'unit', id: 'unit-portfolio' }, admin: true, status: 'active', joinedAt: '2023-06-01T09:00:00.000Z' },
	// Project Atlas
	{ id: 'mem-dev-atlas', personId: 'person-dev', scope: { kind: 'room', id: 'room-atlas' }, roleId: 'role-editor', status: 'active', joinedAt: '2026-07-02T10:00:00.000Z', invitedBy: 'person-maya' },
	{ id: 'mem-grace-atlas', personId: 'person-grace', scope: { kind: 'room', id: 'room-atlas' }, roleId: 'role-manager', status: 'active', joinedAt: '2026-07-02T10:00:00.000Z', invitedBy: 'person-maya' },
	{ id: 'mem-rui-atlas', personId: 'person-rui', scope: { kind: 'room', id: 'room-atlas' }, roleId: 'role-contributor', status: 'active', joinedAt: '2026-07-04T08:30:00.000Z', invitedBy: 'person-maya' },
	{
		id: 'mem-priya-atlas',
		personId: 'person-priya',
		scope: { kind: 'room', id: 'room-atlas' },
		roleId: 'role-viewer',
		status: 'active',
		joinedAt: '2026-07-06T14:00:00.000Z',
		invitedBy: 'person-grace',
		expiresAt: '2026-10-31T23:59:00.000Z',
	},
	{
		id: 'mem-dana-atlas',
		personId: 'person-dana',
		scope: { kind: 'room', id: 'room-atlas' },
		roleId: 'role-viewer',
		status: 'active',
		joinedAt: '2026-09-02T09:20:00.000Z',
		invitedBy: 'person-maya',
		expiresAt: '2026-10-15T17:00:00.000Z',
	},
	{ id: 'mem-nina-atlas', personId: 'person-nina', scope: { kind: 'room', id: 'room-atlas' }, roleId: 'role-viewer', status: 'invited', invitedBy: 'person-maya' },
	// Series B · Lumen
	{
		id: 'mem-lena-lumen',
		personId: 'person-lena',
		scope: { kind: 'room', id: 'room-lumen' },
		roleId: 'role-viewer',
		readOnly: true,
		status: 'active',
		joinedAt: '2026-08-14T11:00:00.000Z',
		invitedBy: 'person-dev',
		expiresAt: '2026-09-30T17:00:00.000Z',
	},
	// Board Q3 pack
	{ id: 'mem-maya-board', personId: 'person-maya', scope: { kind: 'room', id: 'room-board' }, roleId: 'role-viewer', status: 'active', joinedAt: '2026-09-15T10:00:00.000Z' },
	{ id: 'mem-james-board', personId: 'person-james', scope: { kind: 'room', id: 'room-board' }, roleId: 'role-viewer', status: 'active', joinedAt: '2026-09-16T08:00:00.000Z', invitedBy: 'person-sofia' },
];
