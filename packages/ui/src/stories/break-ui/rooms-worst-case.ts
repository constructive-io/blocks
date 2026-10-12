/**
 * Worst-case Data Rooms workspace, built on `DATA_ROOMS_DEMO` so people,
 * memberships, folders, and shares keep the relationships the access engine
 * needs. Names and file names are the lengths and scripts real deal rooms hold:
 * a 255-character file name, `Exhibit 2` next to `Exhibit 10`, a 5 TB scan, a
 * guest from a law firm with a nine-word company name, an avatar that 404s.
 */
import {
	type ActivityEvent,
	DATA_ROOMS_DEMO,
	type DataRoomDocument,
	type DataRoomsData,
	type Membership,
	type OrgUnit,
	type Person,
	type QuestionThread,
	type Room,
	type RoomInvite,
} from '../../components/data-rooms';
import { emails, identifiers, labels, manyRows, names } from './worst-case';

const MB = 1024 * 1024;
const TB = MB * 1024 * 1024;
const LONG_NAME_255 = `${'Quarterly reconciliation of enterprise seat licenses across the EMEA and APAC regions '.repeat(3).trim().replace(/ /g, '_')}`.slice(0, 247) + '.pdf';
const DEEP = ['02 Financials', 'Audited accounts for the statutory consolidated group', '2025 fiscal year end', 'Netherlands B.V. subsidiaries', 'Signed copies and auditor correspondence', 'Appendices'];
const PANORAMA = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><rect width="4000" height="200" fill="#38bdf8"/><rect x="1900" width="200" height="200" fill="#0f172a"/></svg>')}`;

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

const extraPeople: Person[] = [
	{ id: 'w-long', name: names.longHyphenated, email: emails.long, title: 'Senior Product Design Engineer, Platform Infrastructure', company: 'Hale, Mercer & Associates Solicitors LLP (EMEA Regional Office, Amsterdam)', guest: true },
	{ id: 'w-cjk', name: names.cjk, email: emails.short, title: '合伙人', company: '王氏集团', guest: true },
	{ id: 'w-rtl', name: names.rtl, email: 'noor@example.sa', title: 'مستشار', company: 'شركة النور للاستشارات' },
	{ id: 'w-emoji', name: names.emojiFirst, email: emails.plus, guest: true },
	{ id: 'w-zwj', name: names.zwjEmoji, email: emails.subdomains },
	{ id: 'w-one', name: names.oneLetter, email: 'j@example.com', guest: true, company: 'J' },
	{ id: 'w-spaces', name: names.extraSpaces, email: 'sam.lee@example.com' },
	{ id: 'w-lower', name: names.lowercase, email: 'dana@example.com', guest: true },
	{ id: 'w-email', name: emails.long, email: emails.long },
	{ id: 'w-404', name: 'María José de la Cruz y Fernández', email: 'maria.jose@example.com', guest: true, company: 'Fernández y Asociados', avatarUrl: 'https://example.invalid/avatars/does-not-exist.png' },
	{ id: 'w-panorama', name: names.vietnamese, email: 'han@example.com', avatarUrl: PANORAMA },
	{ id: 'w-apos', name: names.apostrophe, email: 'sean@example.ie', guest: true, company: "O'Brien & Ó Súilleabháin Solicitors" },
];

const extraMemberships: Membership[] = extraPeople.map((person, index) => ({
	id: `w-mem-${index}`,
	personId: person.id,
	scope: { kind: 'room', id: 'room-atlas' },
	roleId: 'role-viewer',
	status: index === 3 ? 'invited' : index === 5 ? 'suspended' : 'active',
	joinedAt: '2026-09-02T09:20:00.000Z',
	invitedBy: 'person-maya',
	expiresAt: index % 4 === 0 ? '2026-09-25T10:00:00.000Z' : index % 4 === 1 ? '2026-09-20T10:00:00.000Z' : undefined,
	readOnly: index % 3 === 0 || undefined,
}));

/* ------------------------------------------------------------------ *
 * Units and rooms
 * ------------------------------------------------------------------ */

const deepUnits: OrgUnit[] = [
	{ id: 'u-deep-1', parentId: 'unit-fund-2', name: 'Northern Europe and Benelux Regional Investment Committee', kind: 'Committee' },
	{ id: 'u-deep-2', parentId: 'u-deep-1', name: 'Logistics and Transportation Infrastructure Sub-Committee', kind: 'Sub-committee' },
	{ id: 'u-deep-3', parentId: 'u-deep-2', name: 'Port Authority Concession Working Group', kind: 'Working group' },
];

const unit = (id: string) => ({ unitId: id });
const baseRoom = DATA_ROOMS_DEMO.rooms.find((room) => room.id === 'room-atlas')!;

const worstRooms: Room[] = [
	{
		...baseRoom,
		name: 'Project Atlas: Sale of Atlas Freight B.V. (second-round diligence for shortlisted bidders, EMEA and APAC)',
		description: labels.longDescription,
		closesAt: '2026-09-24T17:00:00.000Z',
	},
	...DATA_ROOMS_DEMO.rooms.filter((room) => room.id !== 'room-atlas'),
	{ ...baseRoom, id: 'w-room-cjk', ...unit('u-deep-3'), name: '项目阿特拉斯', description: '关于阿特拉斯货运的出售', policies: { viewOnly: false, watermark: false, requireAgreement: false, restricted: false }, agreement: undefined, closesAt: undefined },
	{ ...baseRoom, id: 'w-room-rtl', ...unit('u-deep-3'), name: 'غرفة بيانات مشروع أطلس للشحن', description: undefined, policies: { viewOnly: true, watermark: true, requireAgreement: false, restricted: true }, agreement: undefined },
	{ ...baseRoom, id: 'w-room-emoji', ...unit('u-deep-2'), name: '🚀 Launch', status: 'closing', closesAt: '2026-09-23T00:00:00.000Z', agreement: undefined },
	{ ...baseRoom, id: 'w-room-one', ...unit('unit-fund-2'), name: 'X', description: '', agreement: undefined, closesAt: '2026-09-25T09:00:00.000Z' },
	{ ...baseRoom, id: 'w-room-unbroken', ...unit('unit-northwind'), name: 'Q3_2026_Board_Pack_FINAL_v12_approved_by_legal_EMEA_APAC_consolidated_with_appendices', description: identifiers.url, agreement: undefined },
];

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

type Seed = { id: string; folder: string; name: string; kind: DataRoomDocument['kind']; size: number; pages?: number; versions?: number; status?: DataRoomDocument['status']; tags?: string[]; note?: string };

const doc = (seed: Seed): DataRoomDocument => {
	const versions = manyRows(seed.versions ?? 1, (index) => ({
		id: `${seed.id}-v${index + 1}`,
		number: index + 1,
		uploadedBy: index % 2 ? 'w-long' : 'person-dev',
		uploadedAt: new Date(Date.parse('2026-07-04T09:10:00.000Z') + index * 86_400_000).toISOString(),
		size: seed.size,
		note: index === 0 ? undefined : (seed.note ?? labels.longDescription.slice(0, 220)),
	}));
	return { id: seed.id, roomId: 'room-atlas', folder: seed.folder, name: seed.name, kind: seed.kind, size: seed.size, pages: seed.pages, versions, uploadedBy: versions[0]!.uploadedBy, updatedAt: versions[versions.length - 1]!.uploadedAt, status: seed.status ?? 'ready', tags: seed.tags };
};

const DEEP_PATH = `/${DEEP.join('/')}`;

const worstDocuments: DataRoomDocument[] = [
	doc({ id: 'w-d-deck', folder: '/01 Corporate', name: identifiers.fileName, kind: 'pdf', size: 12.4 * MB, pages: 128, versions: 12, tags: ['audited', 'clean team', 'customer-feedback-from-enterprise-onboarding', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }),
	doc({ id: 'w-d-heic', folder: '/01 Corporate', name: identifiers.cameraFile, kind: 'image', size: 4.2 * MB }),
	doc({ id: 'w-d-255', folder: '/01 Corporate', name: LONG_NAME_255, kind: 'pdf', size: 1.1 * MB, pages: 1 }),
	doc({ id: 'w-d-snake', folder: '/01 Corporate', name: `${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}_2026_09_24.xlsx`, kind: 'sheet', size: 88 * MB }),
	doc({ id: 'w-d-ex1', folder: '/01 Corporate', name: 'Exhibit 1.pdf', kind: 'pdf', size: 0.1 * MB, pages: 1 }),
	doc({ id: 'w-d-ex2', folder: '/01 Corporate', name: 'Exhibit 2.pdf', kind: 'pdf', size: 0.1 * MB, pages: 1 }),
	doc({ id: 'w-d-ex10', folder: '/01 Corporate', name: 'Exhibit 10.pdf', kind: 'pdf', size: 0.1 * MB, pages: 1 }),
	doc({ id: 'w-d-dsstore', folder: '/01 Corporate', name: '.DS_Store', kind: 'other', size: 6148 }),
	doc({ id: 'w-d-readme', folder: '/01 Corporate', name: 'README', kind: 'other', size: 0 }),
	doc({ id: 'w-d-one', folder: '/01 Corporate', name: 'a.b', kind: 'other', size: 1 }),
	doc({ id: 'w-d-cjk', folder: '/01 Corporate', name: '王秀英的合同.docx', kind: 'doc', size: 0.3 * MB, pages: 9 }),
	doc({ id: 'w-d-emoji', folder: '/01 Corporate', name: '🦊 notes.md', kind: 'doc', size: 2048 }),
	doc({ id: 'w-d-rtl', folder: '/01 Corporate', name: 'تقرير الربع الثالث.pdf', kind: 'pdf', size: 0.5 * MB }),
	doc({ id: 'w-d-spaces', folder: '/01 Corporate', name: '  spaced   name .pdf', kind: 'pdf', size: 0.5 * MB }),
	doc({ id: 'w-d-tb', folder: '/01 Corporate', name: 'Full disk image of the legacy ERP server.zip', kind: 'archive', size: 5 * TB, status: 'processing' }),
	doc({ id: 'w-d-markup', folder: '/01 Corporate', name: '<script>alert(1)</script> &amp; **bold**.pdf', kind: 'pdf', size: 0.2 * MB }),
	doc({ id: 'w-d-deep', folder: DEEP_PATH, name: 'Signed statutory accounts, Atlas Freight Netherlands B.V., FY2025.pdf', kind: 'pdf', size: 3.3 * MB, pages: 64 }),
	...manyRows(40, (index) => doc({ id: `w-d-bulk-${index}`, folder: '/05 Bulk', name: `Invoice batch ${index + 1}.pdf`, kind: 'pdf', size: (index + 1) * 0.1 * MB, pages: index + 1 })),
];

const worstFolders = [
	{ roomId: 'room-atlas', path: `/${DEEP[0]}` },
	{ roomId: 'room-atlas', path: '/Empty folder with a name that keeps going and going well past the width of the folder tree' },
	{ roomId: 'room-atlas', path: '/王秀英' },
	{ roomId: 'room-atlas', path: '/نور' },
];

/* ------------------------------------------------------------------ *
 * Questions and activity
 * ------------------------------------------------------------------ */

const worstQuestions: QuestionThread[] = [
	{
		id: 'w-q-long',
		roomId: 'room-atlas',
		documentId: 'w-d-deck',
		askedBy: 'w-long',
		askedAt: '2026-09-23T16:12:00.000Z',
		title: 'Could you confirm whether the change of control provision in clause 18.3 of the Halvorsen master services agreement survives the 2026 rent review side letter described in the disclosure schedule',
		status: 'open',
		assigneeId: 'person-maya',
		messages: [
			{ id: 'w-q-long-1', authorId: 'w-long', at: '2026-09-23T16:12:00.000Z', body: `${labels.longDescription} See ${identifiers.url}` },
			{ id: 'w-q-long-2', authorId: 'person-grace', at: '2026-09-23T17:00:00.000Z', body: identifiers.url },
		],
		draft: { body: `${identifiers.snakeIdentifier}_${identifiers.snakeIdentifier}`, citations: [{ documentId: 'w-d-deck', page: 14, quote: labels.longDescription }, { documentId: 'w-d-255', page: 1 }, { documentId: 'does-not-exist', page: 2 }] },
	},
	{ id: 'w-q-emoji', roomId: 'room-atlas', askedBy: 'w-emoji', askedAt: '2026-09-24T09:05:00.000Z', title: '🔥🔥🔥', status: 'open', messages: [{ id: 'w-q-emoji-1', authorId: 'w-emoji', at: '2026-09-24T09:05:00.000Z', body: labels.markup }] },
	{ id: 'w-q-rtl', roomId: 'room-atlas', askedBy: 'w-rtl', askedAt: '2026-09-22T09:05:00.000Z', title: 'ما هي نسبة تركيز العملاء الأكبر عشرة؟', status: 'answered', messages: [{ id: 'w-q-rtl-1', authorId: 'w-rtl', at: '2026-09-22T09:05:00.000Z', body: 'مرحبا' }] },
	{ id: 'w-q-empty', roomId: 'room-atlas', askedBy: 'w-one', askedAt: '2026-09-21T09:05:00.000Z', title: '', status: 'closed', messages: [] },
	...manyRows(30, (index): QuestionThread => ({ id: `w-q-bulk-${index}`, roomId: 'room-atlas', askedBy: 'person-dana', askedAt: '2026-09-20T09:05:00.000Z', title: `Question ${index + 1}`, status: 'open', messages: [{ id: `w-q-bulk-${index}-1`, authorId: 'person-dana', at: '2026-09-20T09:05:00.000Z', body: 'Short.' }] })),
];

const worstActivity: ActivityEvent[] = [
	{ id: 'w-a-1', at: '2026-09-24T14:59:30.000Z', actorId: 'w-long', kind: 'view', roomId: 'room-atlas', documentId: 'w-d-255', seconds: 86_400 },
	{ id: 'w-a-2', at: '2026-09-24T14:50:00.000Z', actorId: 'w-emoji', kind: 'settings', roomId: 'room-atlas', detail: labels.longDescription },
	{ id: 'w-a-3', at: '2026-09-24T14:40:00.000Z', actorId: 'w-cjk', kind: 'download', roomId: 'room-atlas', documentId: 'w-d-tb' },
	{ id: 'w-a-4', at: '2026-09-24T14:30:00.000Z', actorId: 'w-404', kind: 'move', roomId: 'room-atlas', documentId: 'w-d-deep', detail: `${DEEP_PATH} → ${DEEP_PATH}/${DEEP_PATH}` },
	{ id: 'w-a-5', at: '2027-01-01T00:00:00.000Z', actorId: 'person-maya', kind: 'view', roomId: 'room-atlas', documentId: 'w-d-deck', seconds: 0 },
	{ id: 'w-a-6', at: '1970-01-01T00:00:00.000Z', actorId: 'person-maya', kind: 'upload', roomId: 'room-atlas', documentId: 'w-d-heic' },
	{ id: 'w-a-7', at: '2026-09-24T14:20:00.000Z', actorId: 'ghost-user-that-was-deleted', kind: 'share', roomId: 'room-atlas', subjectId: 'w-apos', detail: '/' },
];

const worstInvites: RoomInvite[] = [
	{ id: 'w-inv-1', roomId: 'room-atlas', email: emails.long, roleId: 'role-viewer', invitedBy: 'person-grace', invitedAt: '2026-09-22T11:00:00.000Z', expiresAt: '2026-09-24T16:00:00.000Z' },
	{ id: 'w-inv-2', roomId: 'room-atlas', email: emails.plus, roleId: 'role-missing-from-catalog', invitedBy: 'ghost', invitedAt: '2026-09-22T11:00:00.000Z' },
];

/* ------------------------------------------------------------------ *
 * The datasets
 * ------------------------------------------------------------------ */

export const worstRoomsData: DataRoomsData = {
	...DATA_ROOMS_DEMO,
	org: { name: 'Wiśniewska-Kowalczyk Industrial Holdings International' },
	people: [...DATA_ROOMS_DEMO.people, ...extraPeople],
	units: [...DATA_ROOMS_DEMO.units, ...deepUnits],
	rooms: worstRooms,
	memberships: [...DATA_ROOMS_DEMO.memberships, ...extraMemberships],
	documents: [...DATA_ROOMS_DEMO.documents, ...worstDocuments],
	folders: [...(DATA_ROOMS_DEMO.folders ?? []), ...worstFolders],
	invites: [...DATA_ROOMS_DEMO.invites, ...worstInvites],
	questions: [...worstQuestions, ...DATA_ROOMS_DEMO.questions],
	activity: [...DATA_ROOMS_DEMO.activity, ...worstActivity].sort((a, b) => a.at.localeCompare(b.at)),
};

export const emptyRooms: DataRoomsData = {
	...DATA_ROOMS_DEMO,
	rooms: [],
	memberships: DATA_ROOMS_DEMO.memberships.filter((membership) => membership.scope.kind === 'unit'),
	documents: [],
	folders: [],
	shares: [],
	invites: [],
	acceptances: [],
	activity: [],
	questions: [],
};

export const oneRoom: DataRoomsData = {
	...DATA_ROOMS_DEMO,
	rooms: DATA_ROOMS_DEMO.rooms.slice(0, 1),
	documents: DATA_ROOMS_DEMO.documents.filter((document) => document.roomId === 'room-atlas').slice(0, 1),
	folders: [],
	shares: [],
	invites: [],
	questions: DATA_ROOMS_DEMO.questions.slice(0, 1),
	activity: DATA_ROOMS_DEMO.activity.filter((event) => event.roomId === 'room-atlas').slice(0, 1),
};

const hugePeople: Person[] = manyRows(1_284, (index) => {
	const base = extraPeople[index % extraPeople.length]!;
	return { ...base, id: `huge-p-${index}`, name: index < extraPeople.length ? base.name : `${base.name} ${index}`, email: `member${index}@example.com` };
});

export const hugeRooms: DataRoomsData = {
	...DATA_ROOMS_DEMO,
	people: [...DATA_ROOMS_DEMO.people, ...hugePeople],
	memberships: [
		...DATA_ROOMS_DEMO.memberships,
		...hugePeople.map((person, index): Membership => ({ id: `huge-m-${index}`, personId: person.id, scope: { kind: 'room', id: 'room-atlas' }, roleId: 'role-viewer', status: 'active', joinedAt: '2026-09-02T09:20:00.000Z', invitedBy: 'person-maya' })),
	],
	rooms: [
		...DATA_ROOMS_DEMO.rooms,
		...manyRows(60, (index): Room => ({ ...baseRoom, id: `huge-room-${index}`, name: `Room ${index + 1}`, agreement: undefined, closesAt: undefined })),
	],
	documents: [
		...DATA_ROOMS_DEMO.documents,
		...manyRows(1_000, (index) => doc({ id: `huge-d-${index}`, folder: '/02 Financials', name: `Report ${index + 1}.pdf`, kind: 'pdf', size: (index + 1) * 1024, pages: 3 })),
	],
};
