import type { AgreementAcceptance, DataRoomDocument, DataRoomFolder, DocumentKind, FolderShare, RoomInvite } from './types';

const MB = 1024 * 1024;

type Seed = {
	id: string;
	folder: string;
	name: string;
	kind: DocumentKind;
	size: number;
	pages?: number;
	/** Upload days, oldest first; one per version. */
	versions: { at: string; by: string; note?: string }[];
	restrictions?: DataRoomDocument['restrictions'];
	tags?: string[];
};

function documents(roomId: string, seeds: Seed[]): DataRoomDocument[] {
	return seeds.map((seed) => {
		const versions = seed.versions.map((version, index) => ({
			id: `${seed.id}-v${index + 1}`,
			number: index + 1,
			uploadedBy: version.by,
			uploadedAt: version.at,
			size: Math.round(seed.size * (0.82 + (index / Math.max(1, seed.versions.length - 1)) * 0.18)),
			note: version.note,
		}));
		const latest = versions[versions.length - 1]!;
		return {
			id: seed.id,
			roomId,
			folder: seed.folder,
			name: seed.name,
			kind: seed.kind,
			size: seed.size,
			pages: seed.pages,
			versions,
			uploadedBy: versions[0]!.uploadedBy,
			updatedAt: latest.uploadedAt,
			status: 'ready',
			restrictions: seed.restrictions,
			tags: seed.tags,
		};
	});
}

export const DEMO_DOCUMENTS: DataRoomDocument[] = [
	...documents('room-atlas', [
		{
			id: 'doc-incorporation',
			folder: '/01 Corporate',
			name: 'Certificate of incorporation.pdf',
			kind: 'pdf',
			size: 1.2 * MB,
			pages: 6,
			versions: [{ at: '2026-07-04T09:10:00.000Z', by: 'person-rui' }],
		},
		{
			id: 'doc-group-structure',
			folder: '/01 Corporate',
			name: 'Group structure chart.pdf',
			kind: 'pdf',
			size: 0.8 * MB,
			pages: 2,
			versions: [
				{ at: '2026-07-04T09:12:00.000Z', by: 'person-rui' },
				{ at: '2026-08-20T16:40:00.000Z', by: 'person-rui', note: 'Adds the Polish subsidiary' },
			],
		},
		{
			id: 'doc-cap-table',
			folder: '/01 Corporate',
			name: 'Cap table.xlsx',
			kind: 'sheet',
			size: 0.4 * MB,
			versions: [
				{ at: '2026-07-04T09:15:00.000Z', by: 'person-rui' },
				{ at: '2026-08-02T11:00:00.000Z', by: 'person-dev', note: 'Management options vested to June' },
				{ at: '2026-09-12T10:30:00.000Z', by: 'person-dev', note: 'Pro forma for the sale' },
			],
		},
		{
			id: 'doc-audited',
			folder: '/02 Financials',
			name: 'Audited accounts FY2025.pdf',
			kind: 'pdf',
			size: 6.4 * MB,
			pages: 48,
			versions: [{ at: '2026-07-05T08:00:00.000Z', by: 'person-rui' }],
			tags: ['audited'],
		},
		{
			id: 'doc-management-accounts',
			folder: '/02 Financials',
			name: 'Management accounts Q2 2026.xlsx',
			kind: 'sheet',
			size: 2.1 * MB,
			versions: [
				{ at: '2026-08-08T08:00:00.000Z', by: 'person-rui' },
				{ at: '2026-09-18T15:20:00.000Z', by: 'person-rui', note: 'Restated depot leases under IFRS 16' },
			],
		},
		{
			id: 'doc-revenue-bridge',
			folder: '/02 Financials',
			name: 'Revenue bridge FY24–FY26.pdf',
			kind: 'pdf',
			size: 0.9 * MB,
			pages: 4,
			versions: [{ at: '2026-09-21T13:00:00.000Z', by: 'person-dev' }],
		},
		{
			id: 'doc-valuation-model',
			folder: '/02 Financials/Model',
			name: 'Valuation model v7.xlsx',
			kind: 'sheet',
			size: 3.8 * MB,
			versions: [
				{ at: '2026-07-20T10:00:00.000Z', by: 'person-dev' },
				{ at: '2026-08-14T10:00:00.000Z', by: 'person-dev' },
				{ at: '2026-09-19T18:10:00.000Z', by: 'person-dev', note: 'Updated FY26 run-rate EBITDA' },
			],
			restrictions: { viewOnly: true },
		},
		{
			id: 'doc-model-assumptions',
			folder: '/02 Financials/Model',
			name: 'Model assumptions.pdf',
			kind: 'pdf',
			size: 0.6 * MB,
			pages: 9,
			versions: [{ at: '2026-09-19T18:15:00.000Z', by: 'person-dev' }],
		},
		{
			id: 'doc-spa',
			folder: '/03 Legal',
			name: 'Share purchase agreement, draft 4.docx',
			kind: 'doc',
			size: 0.7 * MB,
			pages: 86,
			versions: [
				{ at: '2026-08-01T12:00:00.000Z', by: 'person-priya' },
				{ at: '2026-08-22T12:00:00.000Z', by: 'person-priya' },
				{ at: '2026-09-06T12:00:00.000Z', by: 'person-priya' },
				{ at: '2026-09-22T17:45:00.000Z', by: 'person-priya', note: 'Seller mark-up of warranties' },
			],
		},
		{
			id: 'doc-disclosure',
			folder: '/03 Legal',
			name: 'Disclosure letter.docx',
			kind: 'doc',
			size: 0.5 * MB,
			pages: 31,
			versions: [{ at: '2026-09-10T12:00:00.000Z', by: 'person-priya' }],
		},
		{
			id: 'doc-contracts-index',
			folder: '/03 Legal',
			name: 'Material contracts index.pdf',
			kind: 'pdf',
			size: 0.3 * MB,
			pages: 3,
			versions: [{ at: '2026-07-08T09:00:00.000Z', by: 'person-priya' }],
		},
		{
			id: 'doc-msa-halvorsen',
			folder: '/03 Legal/Contracts',
			name: 'Master services agreement, Halvorsen.pdf',
			kind: 'pdf',
			size: 2.6 * MB,
			pages: 38,
			versions: [{ at: '2026-07-08T09:30:00.000Z', by: 'person-rui' }],
		},
		{
			id: 'doc-lease-rotterdam',
			folder: '/03 Legal/Contracts',
			name: 'Lease, Rotterdam depot.pdf',
			kind: 'pdf',
			size: 1.9 * MB,
			pages: 22,
			versions: [{ at: '2026-07-08T09:40:00.000Z', by: 'person-rui' }],
		},
		{
			id: 'doc-cohorts',
			folder: '/04 Commercial',
			name: 'Customer cohort analysis.xlsx',
			kind: 'sheet',
			size: 1.4 * MB,
			versions: [{ at: '2026-08-12T09:00:00.000Z', by: 'person-dev' }],
			tags: ['clean team'],
		},
		{
			id: 'doc-fleet',
			folder: '/04 Commercial',
			name: 'Fleet utilisation 2026.pdf',
			kind: 'pdf',
			size: 3.1 * MB,
			pages: 14,
			versions: [{ at: '2026-08-12T09:10:00.000Z', by: 'person-rui' }],
		},
		{
			id: 'doc-key-employees',
			folder: '/05 People',
			name: 'Key employee terms.pdf',
			kind: 'pdf',
			size: 0.5 * MB,
			pages: 7,
			versions: [{ at: '2026-08-25T09:00:00.000Z', by: 'person-rui' }],
			restrictions: { viewOnly: true },
		},
		{
			id: 'doc-headcount',
			folder: '/05 People',
			name: 'Headcount by depot.xlsx',
			kind: 'sheet',
			size: 0.3 * MB,
			versions: [{ at: '2026-08-25T09:05:00.000Z', by: 'person-rui' }],
		},
	]),
	...documents('room-lumen', [
		{
			id: 'doc-lumen-deck',
			folder: '/Data pack',
			name: 'Lumen Series B deck.pdf',
			kind: 'slides',
			size: 8.2 * MB,
			pages: 24,
			versions: [
				{ at: '2026-08-11T10:00:00.000Z', by: 'person-dev' },
				{ at: '2026-09-03T10:00:00.000Z', by: 'person-dev', note: 'Q2 actuals' },
			],
		},
		{
			id: 'doc-lumen-model',
			folder: '/Data pack',
			name: 'Lumen operating model.xlsx',
			kind: 'sheet',
			size: 2.7 * MB,
			versions: [{ at: '2026-08-11T10:05:00.000Z', by: 'person-dev' }],
		},
		{
			id: 'doc-lumen-pro-forma',
			folder: '/Data pack',
			name: 'Pro forma cap table.xlsx',
			kind: 'sheet',
			size: 0.2 * MB,
			versions: [{ at: '2026-08-20T10:00:00.000Z', by: 'person-dev' }],
		},
		{
			id: 'doc-lumen-term-sheet',
			folder: '/Legal',
			name: 'Term sheet, signed.pdf',
			kind: 'pdf',
			size: 0.4 * MB,
			pages: 5,
			versions: [{ at: '2026-09-09T10:00:00.000Z', by: 'person-maya' }],
		},
	]),
	...documents('room-board', [
		{
			id: 'doc-board-agenda',
			folder: '/',
			name: 'Agenda, October 2.pdf',
			kind: 'pdf',
			size: 0.2 * MB,
			pages: 2,
			versions: [{ at: '2026-09-15T10:00:00.000Z', by: 'person-sofia' }],
		},
		{
			id: 'doc-board-ceo',
			folder: '/',
			name: 'Managing Partner report Q3.pdf',
			kind: 'pdf',
			size: 1.1 * MB,
			pages: 12,
			versions: [{ at: '2026-09-22T10:00:00.000Z', by: 'person-elliot' }],
		},
		{
			id: 'doc-board-minutes',
			folder: '/',
			name: 'Minutes, Q2 meeting.pdf',
			kind: 'pdf',
			size: 0.3 * MB,
			pages: 6,
			versions: [{ at: '2026-09-15T10:05:00.000Z', by: 'person-sofia' }],
		},
		{
			id: 'doc-board-audit',
			folder: '/Committees',
			name: 'Audit committee report.pdf',
			kind: 'pdf',
			size: 0.6 * MB,
			pages: 8,
			versions: [{ at: '2026-09-20T10:00:00.000Z', by: 'person-grace' }],
		},
	]),
	...documents('room-kpis', [
		{
			id: 'doc-kpi-atlas',
			folder: '/2026-08',
			name: 'Atlas Freight KPI pack.xlsx',
			kind: 'sheet',
			size: 0.9 * MB,
			versions: [{ at: '2026-09-08T10:00:00.000Z', by: 'person-tom' }],
		},
		{
			id: 'doc-kpi-lumen',
			folder: '/2026-08',
			name: 'Lumen KPI pack.xlsx',
			kind: 'sheet',
			size: 0.7 * MB,
			versions: [{ at: '2026-09-09T10:00:00.000Z', by: 'person-tom' }],
		},
	]),
];

export const DEMO_FOLDERS: DataRoomFolder[] = [
	{ roomId: 'room-atlas', path: '/06 Q&A exports' },
	{ roomId: 'room-kpis', path: '/2026-09' },
];

export const DEMO_SHARES: FolderShare[] = [
	{
		id: 'share-priya-legal',
		roomId: 'room-atlas',
		folder: '/03 Legal',
		personId: 'person-priya',
		can: { view: true, edit: true, delete: false },
		expiresAt: '2026-10-31T23:59:00.000Z',
		createdBy: 'person-grace',
		createdAt: '2026-07-06T14:05:00.000Z',
	},
	{
		id: 'share-owen-financials',
		roomId: 'room-atlas',
		folder: '/02 Financials',
		personId: 'person-owen',
		can: { view: true, edit: false, delete: false },
		expiresAt: '2026-09-29T17:00:00.000Z',
		createdBy: 'person-maya',
		createdAt: '2026-09-08T09:00:00.000Z',
	},
	{
		id: 'share-marco-financials',
		roomId: 'room-atlas',
		folder: '/02 Financials',
		personId: 'person-marco',
		can: { view: true, edit: false, delete: false },
		expiresAt: '2026-09-20T17:00:00.000Z',
		createdBy: 'person-maya',
		createdAt: '2026-08-18T09:00:00.000Z',
	},
	{
		id: 'share-kai-model',
		roomId: 'room-atlas',
		folder: '/02 Financials/Model',
		personId: 'person-kai',
		can: { view: true, edit: false, delete: false },
		expiresAt: '2026-10-10T17:00:00.000Z',
		createdBy: 'person-dev',
		createdAt: '2026-09-19T18:30:00.000Z',
	},
];

export const DEMO_INVITES: RoomInvite[] = [
	{
		id: 'invite-clearview',
		roomId: 'room-atlas',
		email: 'audit.team@clearview-audit.com',
		roleId: 'role-viewer',
		invitedBy: 'person-grace',
		invitedAt: '2026-09-22T11:00:00.000Z',
		expiresAt: '2026-10-06T11:00:00.000Z',
	},
];

export const DEMO_ACCEPTANCES: AgreementAcceptance[] = [
	{ roomId: 'room-atlas', personId: 'person-rui', version: 2, acceptedAt: '2026-09-01T10:00:00.000Z' },
	{ roomId: 'room-atlas', personId: 'person-priya', version: 2, acceptedAt: '2026-09-01T12:30:00.000Z' },
	{ roomId: 'room-atlas', personId: 'person-dana', version: 2, acceptedAt: '2026-09-02T09:25:00.000Z' },
	{ roomId: 'room-atlas', personId: 'person-owen', version: 1, acceptedAt: '2026-08-30T09:00:00.000Z' },
	{ roomId: 'room-atlas', personId: 'person-kai', version: 2, acceptedAt: '2026-09-19T19:00:00.000Z' },
	{ roomId: 'room-atlas', personId: 'person-dev', version: 2, acceptedAt: '2026-09-01T09:00:00.000Z' },
	{ roomId: 'room-lumen', personId: 'person-lena', version: 1, acceptedAt: '2026-08-14T11:05:00.000Z' },
];
