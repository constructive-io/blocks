import { can, visibleDocuments } from './access';
import { DATA_ROOMS_CLOCK, DEMO_INHERITANCE, DEMO_MEMBERSHIPS, DEMO_PEOPLE, DEMO_ROLES, DEMO_ROOMS, DEMO_UNITS } from './demo-org';
import { DEMO_ACCEPTANCES, DEMO_DOCUMENTS, DEMO_FOLDERS, DEMO_INVITES, DEMO_SHARES } from './demo-documents';
import { DEMO_ASSISTANT, DEMO_QUESTIONS } from './demo-questions';
import type { ActivityEvent, DataRoomsData } from './types';

export { DATA_ROOMS_CLOCK } from './demo-org';

/** Small seeded generator, so the demo's activity is the same on every render and on the server. */
function seeded(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** How often each person reads, roughly sessions per day. */
const ENGAGEMENT: Record<string, number> = {
	'person-dana': 2.6,
	'person-owen': 2.2,
	'person-kai': 1.4,
	'person-priya': 1.2,
	'person-rui': 0.6,
	'person-dev': 1.6,
	'person-grace': 0.8,
	'person-maya': 0.9,
	'person-lena': 1.8,
	'person-james': 0.9,
	'person-hana': 0.4,
	'person-sofia': 0.3,
	'person-elliot': 0.3,
	'person-tom': 0.8,
};

function generateActivity(base: DataRoomsData): ActivityEvent[] {
	const random = seeded(20260924);
	const events: ActivityEvent[] = [];
	const now = Date.parse(base.clock);
	let n = 0;
	const push = (event: Omit<ActivityEvent, 'id'>) => events.push({ id: `activity-${++n}`, ...event });

	// Reading over the last two weeks, during working hours.
	for (const room of base.rooms) {
		for (const person of base.people) {
			const rate = ENGAGEMENT[person.id] ?? 0;
			if (!rate) continue;
			const documents = visibleDocuments(base, person.id, room.id);
			if (!documents.length) continue;
			for (let day = 13; day >= 0; day--) {
				const sessions = Math.floor(random() * rate * 2);
				for (let session = 0; session < sessions; session++) {
					const at = now - day * DAY - (random() * 9 + 1) * HOUR;
					if (at > now) continue;
					const document = documents[Math.floor(random() * documents.length)]!;
					const iso = new Date(at).toISOString();
					push({ at: iso, actorId: person.id, kind: 'view', roomId: room.id, documentId: document.id, seconds: Math.round(30 + random() * 540) });
					if (random() < 0.22 && can(base, person.id, 'download', { kind: 'document', documentId: document.id })) {
						push({ at: new Date(at + 2 * 60_000).toISOString(), actorId: person.id, kind: 'download', roomId: room.id, documentId: document.id });
					}
				}
			}
		}
	}

	// Marco read the financials until his share ran out.
	for (const [day, documentId] of [
		[10, 'doc-audited'],
		[9, 'doc-management-accounts'],
		[7, 'doc-audited'],
		[5, 'doc-management-accounts'],
	] as const) {
		push({ at: new Date(now - day * DAY - 3 * HOUR).toISOString(), actorId: 'person-marco', kind: 'view', roomId: 'room-atlas', documentId, seconds: 260 });
	}

	// Changes the rest of the fixtures already describe.
	for (const document of base.documents) {
		for (const version of document.versions) {
			push({
				at: version.uploadedAt,
				actorId: version.uploadedBy,
				kind: version.number === 1 ? 'upload' : 'version',
				roomId: document.roomId,
				documentId: document.id,
				detail: version.note,
			});
		}
	}
	for (const share of base.shares) {
		push({ at: share.createdAt, actorId: share.createdBy, kind: 'share', roomId: share.roomId, subjectId: share.personId, detail: share.folder });
	}
	for (const membership of base.memberships) {
		if (membership.scope.kind !== 'room' || !membership.invitedBy || !membership.joinedAt) continue;
		push({ at: membership.joinedAt, actorId: membership.invitedBy, kind: 'invite', roomId: membership.scope.id, subjectId: membership.personId });
	}
	for (const invite of base.invites) {
		push({ at: invite.invitedAt, actorId: invite.invitedBy, kind: 'invite', roomId: invite.roomId, detail: invite.email });
	}
	for (const acceptance of base.acceptances) {
		push({ at: acceptance.acceptedAt, actorId: acceptance.personId, kind: 'agreement', roomId: acceptance.roomId, detail: `Version ${acceptance.version}` });
	}
	for (const question of base.questions) {
		const [first, ...answers] = question.messages;
		if (first) push({ at: first.at, actorId: first.authorId, kind: 'question', roomId: question.roomId, documentId: question.documentId, detail: question.title });
		for (const answer of answers) push({ at: answer.at, actorId: answer.authorId, kind: 'answer', roomId: question.roomId, documentId: question.documentId, detail: question.title });
	}
	push({ at: '2026-09-21T09:30:00.000Z', actorId: 'person-maya', kind: 'settings', roomId: 'room-atlas', detail: 'Restricted the room to people added to it' });

	return events.filter((event) => Date.parse(event.at) <= now).sort((a, b) => a.at.localeCompare(b.at));
}

function withActivity(base: DataRoomsData): DataRoomsData {
	return { ...base, activity: generateActivity(base) };
}

const BASE: DataRoomsData = {
	clock: DATA_ROOMS_CLOCK,
	org: { name: 'Northwind Holdings' },
	viewerId: 'person-maya',
	people: DEMO_PEOPLE,
	units: DEMO_UNITS,
	rooms: DEMO_ROOMS,
	roles: DEMO_ROLES,
	memberships: DEMO_MEMBERSHIPS,
	inheritance: DEMO_INHERITANCE,
	documents: DEMO_DOCUMENTS,
	folders: DEMO_FOLDERS,
	shares: DEMO_SHARES,
	invites: DEMO_INVITES,
	acceptances: DEMO_ACCEPTANCES,
	activity: [],
	questions: DEMO_QUESTIONS,
	assistant: DEMO_ASSISTANT,
};

/**
 * A holding company, Northwind, with two sub-organizations. Fund II is selling
 * Atlas Freight to shortlisted bidders and raising a follow-on for Lumen; the
 * organization runs its board pack; Portfolio Ops collects monthly KPIs.
 * Maya Okafor, a Fund II admin, is signed in.
 */
// Pure, so bundlers drop the demo (and its generated activity) from hosts that never import it.
export const DATA_ROOMS_DEMO: DataRoomsData = /* @__PURE__ */ withActivity(BASE);

/** People worth previewing the demo as, each with a different kind of access. */
export const DATA_ROOMS_PERSONAS: { personId: string; label: string; description: string }[] = [
	{ personId: 'person-maya', label: 'Fund admin', description: 'Admin of Fund II, so every Fund II room opens with full access.' },
	{ personId: 'person-elliot', label: 'Organization owner', description: 'Owner of Northwind; ownership carries into every unit and room.' },
	{ personId: 'person-dev', label: 'Deal associate', description: 'Fund II contributor who is an editor in Project Atlas.' },
	{ personId: 'person-hana', label: 'Fund analyst', description: 'Fund II viewer. Joins open rooms automatically, but not restricted ones.' },
	{ personId: 'person-dana', label: 'Bidder', description: 'Guest from Kestrel Partners with viewer access until the bid deadline.' },
	{ personId: 'person-owen', label: 'Bidder associate', description: 'Guest with one shared folder that expires soon, and an outdated agreement.' },
	{ personId: 'person-kai', label: 'Valuation advisor', description: 'Guest who can only see the model folder.' },
];
