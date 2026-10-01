import { normalizeFolder } from './access';
import type { ActivityEvent, DataRoomsCommand, DataRoomsData, Person } from './types';

export type CommandContext = {
	/** Who is making the change. */
	actorId: string;
	/** When the change happens. */
	now: string;
	/** Makes ids for rows the change creates. */
	id: (prefix: string) => string;
};

/** A counter-based id maker, stable across renders and fine for local, optimistic rows. */
export function createIdMaker(seed = 'local') {
	let next = 0;
	return (prefix: string) => `${seed}-${prefix}-${++next}`;
}

/**
 * Applies a command to the data the template renders, the way a host would
 * after its API accepts the change. The template uses it for optimistic
 * updates; hosts can use it too, then replace the result with fresh data.
 */
export function applyDataRoomsCommand(data: DataRoomsData, command: DataRoomsCommand, context: CommandContext): DataRoomsData {
	const { actorId, now, id } = context;
	const log = (event: Omit<ActivityEvent, 'id' | 'at' | 'actorId'>): ActivityEvent => ({ id: id('event'), at: now, actorId, ...event });

	switch (command.type) {
		case 'create-room':
			return {
				...data,
				rooms: [...data.rooms, command.room],
				memberships: [
					...data.memberships,
					{ id: id('membership'), personId: actorId, scope: { kind: 'room', id: command.room.id }, owner: true, status: 'active', joinedAt: now },
				],
				activity: [...data.activity, log({ kind: 'settings', roomId: command.room.id, detail: 'Created the room' })],
			};
		case 'update-room':
			return {
				...data,
				rooms: data.rooms.map((room) => (room.id === command.roomId ? { ...room, ...command.patch } : room)),
				activity: [...data.activity, log({ kind: 'settings', roomId: command.roomId, detail: Object.keys(command.patch).join(', ') })],
			};
		case 'invite': {
			const people: Person[] = [...data.people];
			const memberships = [...data.memberships];
			const invites = [...data.invites];
			const activity = [...data.activity];
			for (const entry of command.invites) {
				const known = entry.personId
					? people.find((person) => person.id === entry.personId)
					: people.find((person) => person.email.toLowerCase() === entry.email.toLowerCase());
				if (known) {
					const existing = memberships.find((membership) => membership.personId === known.id && membership.scope.kind === 'room' && membership.scope.id === command.roomId);
					if (existing) continue;
					memberships.push({
						id: id('membership'),
						personId: known.id,
						scope: { kind: 'room', id: command.roomId },
						roleId: command.roleId,
						status: 'active',
						expiresAt: command.expiresAt,
						invitedBy: actorId,
						joinedAt: now,
					});
					activity.push(log({ kind: 'invite', roomId: command.roomId, subjectId: known.id }));
				} else {
					invites.push({ id: id('invite'), roomId: command.roomId, email: entry.email, roleId: command.roleId, invitedBy: actorId, invitedAt: now, expiresAt: command.expiresAt });
					activity.push(log({ kind: 'invite', roomId: command.roomId, detail: entry.email }));
				}
			}
			return { ...data, people, memberships, invites, activity };
		}
		case 'revoke-invite':
			return { ...data, invites: data.invites.filter((invite) => invite.id !== command.inviteId) };
		case 'update-membership': {
			const membership = data.memberships.find((candidate) => candidate.id === command.membershipId);
			return {
				...data,
				memberships: data.memberships.map((candidate) => (candidate.id === command.membershipId ? { ...candidate, ...command.patch } : candidate)),
				activity:
					membership?.scope.kind === 'room'
						? [...data.activity, log({ kind: 'role', roomId: membership.scope.id, subjectId: membership.personId })]
						: data.activity,
			};
		}
		case 'remove-membership': {
			const membership = data.memberships.find((candidate) => candidate.id === command.membershipId);
			return {
				...data,
				memberships: data.memberships.filter((candidate) => candidate.id !== command.membershipId),
				activity:
					membership?.scope.kind === 'room'
						? [...data.activity, log({ kind: 'remove', roomId: membership.scope.id, subjectId: membership.personId })]
						: data.activity,
			};
		}
		case 'create-share': {
			const folder = normalizeFolder(command.folder);
			const shares = data.shares.filter(
				(share) => !(share.roomId === command.roomId && share.folder === folder && command.personIds.includes(share.personId)),
			);
			for (const personId of command.personIds) {
				shares.push({ id: id('share'), roomId: command.roomId, folder, personId, can: command.can, expiresAt: command.expiresAt, createdBy: actorId, createdAt: now });
			}
			return {
				...data,
				shares,
				activity: [...data.activity, ...command.personIds.map((personId) => log({ kind: 'share', roomId: command.roomId, subjectId: personId, detail: folder }))],
			};
		}
		case 'revoke-share': {
			const share = data.shares.find((candidate) => candidate.id === command.shareId);
			return {
				...data,
				shares: data.shares.filter((candidate) => candidate.id !== command.shareId),
				activity: share ? [...data.activity, log({ kind: 'unshare', roomId: share.roomId, subjectId: share.personId, detail: share.folder })] : data.activity,
			};
		}
		case 'upload': {
			const folder = normalizeFolder(command.folder);
			const documents = command.files.map((file) => {
				const documentId = id('document');
				return {
					id: documentId,
					roomId: command.roomId,
					folder,
					name: file.name,
					kind: file.kind,
					size: file.size,
					pages: file.pages,
					versions: [{ id: id('version'), number: 1, uploadedBy: actorId, uploadedAt: now, size: file.size }],
					uploadedBy: actorId,
					updatedAt: now,
					status: 'processing' as const,
				};
			});
			return {
				...data,
				documents: [...data.documents, ...documents],
				activity: [...data.activity, ...documents.map((document) => log({ kind: 'upload', roomId: command.roomId, documentId: document.id }))],
			};
		}
		case 'create-folder':
			return { ...data, folders: [...(data.folders ?? []), { roomId: command.roomId, path: normalizeFolder(command.path) }] };
		case 'move-documents': {
			const folder = normalizeFolder(command.folder);
			const moved = data.documents.filter((document) => command.documentIds.includes(document.id));
			return {
				...data,
				documents: data.documents.map((document) => (command.documentIds.includes(document.id) ? { ...document, folder, updatedAt: now } : document)),
				activity: [...data.activity, ...moved.map((document) => log({ kind: 'move', roomId: document.roomId, documentId: document.id, detail: folder }))],
			};
		}
		case 'update-document':
			return {
				...data,
				documents: data.documents.map((document) => (document.id === command.documentId ? { ...document, ...command.patch } : document)),
			};
		case 'update-inheritance':
			return { ...data, inheritance: command.inheritance };
		case 'save-role':
			return {
				...data,
				roles: data.roles.some((role) => role.id === command.role.id)
					? data.roles.map((role) => (role.id === command.role.id ? command.role : role))
					: [...data.roles, command.role],
			};
		case 'accept-agreement':
			return {
				...data,
				acceptances: [...data.acceptances, { roomId: command.roomId, personId: actorId, version: command.version, acceptedAt: now }],
				activity: [...data.activity, log({ kind: 'agreement', roomId: command.roomId, detail: `Version ${command.version}` })],
			};
		case 'ask-question': {
			const questionId = id('question');
			return {
				...data,
				questions: [
					...data.questions,
					{
						id: questionId,
						roomId: command.roomId,
						documentId: command.documentId,
						askedBy: actorId,
						askedAt: now,
						title: command.title,
						status: 'open',
						messages: [{ id: id('message'), authorId: actorId, at: now, body: command.body }],
					},
				],
				activity: [...data.activity, log({ kind: 'question', roomId: command.roomId, documentId: command.documentId, detail: command.title })],
			};
		}
		case 'answer-question': {
			const question = data.questions.find((candidate) => candidate.id === command.questionId);
			return {
				...data,
				questions: data.questions.map((candidate) =>
					candidate.id === command.questionId
						? {
								...candidate,
								status: command.close ? 'closed' : 'answered',
								draft: undefined,
								messages: [...candidate.messages, { id: id('message'), authorId: actorId, at: now, body: command.body }],
							}
						: candidate,
				),
				activity: question ? [...data.activity, log({ kind: 'answer', roomId: question.roomId, documentId: question.documentId, detail: question.title })] : data.activity,
			};
		}
		case 'set-question-status':
			return {
				...data,
				questions: data.questions.map((question) => (question.id === command.questionId ? { ...question, status: command.status } : question)),
			};
	}
}

/** Marks freshly uploaded documents as ready once the host has indexed them. */
export function markDocumentsReady(data: DataRoomsData, documentIds: string[]): DataRoomsData {
	return {
		...data,
		documents: data.documents.map((document) => (documentIds.includes(document.id) ? { ...document, status: 'ready' } : document)),
	};
}
