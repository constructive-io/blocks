import type {
	ActivityEvent,
	DataRoomDocument,
	DataRoomsData,
	FolderShare,
	Membership,
	MembershipScope,
	OrgUnit,
	Permission,
	Person,
	QuestionThread,
	Room,
} from './types';

/**
 * Effective access for the Data Rooms template. Pure and synchronous, so the
 * UI can gate controls, explain why someone has access, and preview the
 * workspace as another person. It is a reading aid, not a security boundary:
 * the host's own authorization decides every request.
 */

export const ALL_PERMISSIONS: readonly Permission[] = [
	'view',
	'download',
	'upload',
	'edit',
	'delete',
	'share',
	'invite',
	'manage_members',
	'manage_room',
	'ask_assistant',
];

export const PERMISSION_COPY: Record<Permission, { label: string; description: string }> = {
	view: { label: 'View', description: 'Open documents in the viewer.' },
	download: { label: 'Download', description: 'Save a copy, unless the document is view-only.' },
	upload: { label: 'Upload', description: 'Add documents and new versions.' },
	edit: { label: 'Edit', description: 'Rename, move, and change document settings.' },
	delete: { label: 'Delete', description: 'Remove documents.' },
	share: { label: 'Share folders', description: 'Give people access to a folder.' },
	invite: { label: 'Invite', description: 'Invite people to the room.' },
	manage_members: { label: 'Manage people', description: 'Change roles and remove people.' },
	manage_room: { label: 'Manage room', description: 'Change settings, the agreement, and answer questions.' },
	ask_assistant: { label: 'Ask assistant', description: 'Ask questions about documents they can open.' },
};

/** Permissions that change something. Read-only access keeps everything else. */
export const WRITE_PERMISSIONS: readonly Permission[] = ['upload', 'edit', 'delete', 'share', 'invite', 'manage_members', 'manage_room'];

export type AccessTarget =
	| { kind: 'unit'; unitId: string }
	| { kind: 'room'; roomId: string }
	| { kind: 'folder'; roomId: string; folder: string }
	| { kind: 'document'; documentId: string };

export type AccessLevel = 'owner' | 'admin' | 'member' | 'share' | 'none';

export type AccessGrant =
	| {
			kind: 'membership';
			membershipId: string;
			scope: MembershipScope;
			level: 'owner' | 'admin' | 'member';
			/** Held on a parent unit and carried down. */
			inherited: boolean;
			/** Units from where the membership is held down to the target's unit, top first. */
			path: string[];
			roleId?: string;
			permissions: Permission[];
			readOnly: boolean;
	  }
	| {
			kind: 'share';
			shareId: string;
			folder: string;
			expiresAt?: string;
			permissions: Permission[];
			/** True when the target is wider than the shared folder, so the share covers only part of it. */
			partial: boolean;
	  };

/** Access someone would have had, and why it doesn't count. */
export type AccessIgnored = {
	reason: 'pending' | 'suspended' | 'expired' | 'not-inherited' | 'restricted';
	membershipId?: string;
	shareId?: string;
	scope?: MembershipScope;
	level?: 'owner' | 'admin' | 'member';
	at?: string;
};

export type AccessLimit = { reason: 'read-only' | 'view-only'; removed: Permission[] };

export type EffectiveAccess = {
	level: AccessLevel;
	permissions: Permission[];
	grants: AccessGrant[];
	limits: AccessLimit[];
	ignored: AccessIgnored[];
};

const NONE: EffectiveAccess = { level: 'none', permissions: [], grants: [], limits: [], ignored: [] };

const LEVEL_RANK: Record<AccessLevel, number> = { owner: 4, admin: 3, member: 2, share: 1, none: 0 };

/* ------------------------------------------------------------------ *
 * Indexes and caches
 *
 * Data is treated as immutable: every change produces new arrays and a new
 * data object. Lookups are indexed per array and results cached per data
 * object, so the many access checks one render makes cost one pass each.
 * Cached results are shared; treat them as read-only.
 * ------------------------------------------------------------------ */

function indexed<T, K>(cache: WeakMap<readonly T[], Map<K, T>>, rows: readonly T[], key: (row: T) => K) {
	let map = cache.get(rows);
	if (!map) {
		map = new Map(rows.map((row) => [key(row), row]));
		cache.set(rows, map);
	}
	return map;
}

function grouped<T>(cache: WeakMap<readonly T[], Map<string, T[]>>, rows: readonly T[], key: (row: T) => string) {
	let map = cache.get(rows);
	if (!map) {
		map = new Map();
		for (const row of rows) {
			const bucket = map.get(key(row));
			if (bucket) bucket.push(row);
			else map.set(key(row), [row]);
		}
		cache.set(rows, map);
	}
	return map;
}

const UNITS_BY_ID = new WeakMap<readonly OrgUnit[], Map<string, OrgUnit>>();
const ROOMS_BY_ID = new WeakMap<readonly Room[], Map<string, Room>>();
const DOCUMENTS_BY_ID = new WeakMap<readonly DataRoomDocument[], Map<string, DataRoomDocument>>();
const MEMBERSHIPS_BY_PERSON = new WeakMap<readonly Membership[], Map<string, Membership[]>>();
const SHARES_BY_PERSON = new WeakMap<readonly FolderShare[], Map<string, FolderShare[]>>();
const PEOPLE_BY_ID = new WeakMap<readonly Person[], Map<string, Person>>();

/** Memoizes `compute` per data object and key. */
function memoized<T>(cache: WeakMap<DataRoomsData, Map<string, T>>, data: DataRoomsData, key: string, compute: () => T): T {
	let entries = cache.get(data);
	if (!entries) {
		entries = new Map();
		cache.set(data, entries);
	}
	const hit = entries.get(key);
	if (hit !== undefined) return hit;
	const value = compute();
	entries.set(key, value);
	return value;
}

const ACCESS_CACHE = new WeakMap<DataRoomsData, Map<string, EffectiveAccess>>();
const VISIBLE_CACHE = new WeakMap<DataRoomsData, Map<string, DataRoomDocument[]>>();
const PEOPLE_CACHE = new WeakMap<DataRoomsData, Map<string, { person: Person; access: EffectiveAccess }[]>>();

function targetKey(target: AccessTarget) {
	switch (target.kind) {
		case 'unit':
			return `unit:${target.unitId}`;
		case 'room':
			return `room:${target.roomId}`;
		case 'folder':
			return `folder:${target.roomId}:${normalizeFolder(target.folder)}`;
		case 'document':
			return `document:${target.documentId}`;
	}
}

/* ------------------------------------------------------------------ *
 * Paths and structure
 * ------------------------------------------------------------------ */

/** `"02 Financials/"` → `"/02 Financials"`; `""` → `"/"`. */
export function normalizeFolder(path: string) {
	const parts = path.split('/').filter(Boolean);
	return parts.length ? `/${parts.join('/')}` : '/';
}

/** True when `folder` is `container` or sits anywhere below it. */
export function folderContains(container: string, folder: string) {
	const outer = normalizeFolder(container);
	const inner = normalizeFolder(folder);
	return outer === '/' || inner === outer || inner.startsWith(`${outer}/`);
}

/** The folder's name: its last path segment, or the room name at the root. */
export function folderName(path: string, rootName = 'All documents') {
	const normalized = normalizeFolder(path);
	return normalized === '/' ? rootName : normalized.slice(normalized.lastIndexOf('/') + 1);
}

/** The folder above, or null at the root. */
export function parentFolder(path: string) {
	const normalized = normalizeFolder(path);
	if (normalized === '/') return null;
	const index = normalized.lastIndexOf('/');
	return index === 0 ? '/' : normalized.slice(0, index);
}

/** Every folder in a room, from document paths and explicit empty folders, including their parents. Sorted. */
export function roomFolders(data: Pick<DataRoomsData, 'documents' | 'folders'>, roomId: string) {
	const paths = new Set<string>(['/']);
	const add = (path: string) => {
		let current: string | null = normalizeFolder(path);
		while (current && !paths.has(current)) {
			paths.add(current);
			current = parentFolder(current);
		}
	};
	for (const document of data.documents) if (document.roomId === roomId) add(document.folder);
	for (const folder of data.folders ?? []) if (folder.roomId === roomId) add(folder.path);
	return [...paths].sort((a, b) => a.localeCompare(b));
}

/** The unit and its ancestors, nearest first, ending at the organization. Guards against cycles. */
export function unitChain(data: Pick<DataRoomsData, 'units'>, unitId: string): OrgUnit[] {
	const byId = indexed(UNITS_BY_ID, data.units, (unit) => unit.id);
	const chain: OrgUnit[] = [];
	let current = byId.get(unitId);
	while (current && !chain.includes(current)) {
		chain.push(current);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}
	return chain;
}

/** The organization unit: the one without a parent. */
export function rootUnit(data: Pick<DataRoomsData, 'units'>) {
	return data.units.find((unit) => unit.parentId === null);
}

/** Units directly below a unit. */
export function childUnits(data: Pick<DataRoomsData, 'units'>, unitId: string) {
	return data.units.filter((unit) => unit.parentId === unitId);
}

/* ------------------------------------------------------------------ *
 * Effective access
 * ------------------------------------------------------------------ */

function isPast(iso: string | undefined, clock: string) {
	return iso !== undefined && Date.parse(iso) <= Date.parse(clock);
}

function membershipLevel(membership: Membership): 'owner' | 'admin' | 'member' {
	return membership.owner ? 'owner' : membership.admin ? 'admin' : 'member';
}

function membershipPermissions(data: DataRoomsData, membership: Membership): Permission[] {
	if (membership.owner || membership.admin) return [...ALL_PERMISSIONS];
	const role = data.roles.find((candidate) => candidate.id === membership.roleId) ?? data.roles.find((candidate) => candidate.isDefault);
	return [...new Set([...(role?.permissions ?? []), ...(membership.extraPermissions ?? [])])];
}

function sharePermissions(share: FolderShare): Permission[] {
	const permissions: Permission[] = [];
	if (share.can.view) permissions.push('view', 'download');
	if (share.can.edit) permissions.push('upload', 'edit');
	if (share.can.delete) permissions.push('delete');
	return permissions;
}

function ordered(permissions: Iterable<Permission>) {
	const set = new Set(permissions);
	return ALL_PERMISSIONS.filter((permission) => set.has(permission));
}

type Resolved = { unitId: string; room?: Room; folder?: string; document?: DataRoomDocument };

function resolveTarget(data: DataRoomsData, target: AccessTarget): Resolved | null {
	switch (target.kind) {
		case 'unit':
			return indexed(UNITS_BY_ID, data.units, (unit) => unit.id).has(target.unitId) ? { unitId: target.unitId } : null;
		case 'room': {
			const room = indexed(ROOMS_BY_ID, data.rooms, (candidate) => candidate.id).get(target.roomId);
			return room ? { unitId: room.unitId, room } : null;
		}
		case 'folder': {
			const room = indexed(ROOMS_BY_ID, data.rooms, (candidate) => candidate.id).get(target.roomId);
			return room ? { unitId: room.unitId, room, folder: normalizeFolder(target.folder) } : null;
		}
		case 'document': {
			const document = indexed(DOCUMENTS_BY_ID, data.documents, (candidate) => candidate.id).get(target.documentId);
			const room = document && indexed(ROOMS_BY_ID, data.rooms, (candidate) => candidate.id).get(document.roomId);
			return document && room ? { unitId: room.unitId, room, folder: normalizeFolder(document.folder), document } : null;
		}
	}
}

/**
 * What a person can do on a unit, room, folder, or document, with every grant
 * that contributes, the limits applied, and the access that was ruled out.
 *
 * - Owners and admins hold every permission where they are members, and carry
 *   it into sub-units and rooms when inheritance allows.
 * - Members hold their role plus extra grants, and carry it down only when
 *   inheritance includes members and the room is not restricted.
 * - Folder shares grant view, edit, and delete inside their subtree.
 * - Read-only memberships lose every write permission; view-only documents
 *   lose `download` for anyone who doesn't manage the room.
 * - Pending, suspended, and expired access grants nothing.
 */
export function effectiveAccess(data: DataRoomsData, personId: string, target: AccessTarget): EffectiveAccess {
	return memoized(ACCESS_CACHE, data, `${personId}|${targetKey(target)}`, () => computeAccess(data, personId, target));
}

function computeAccess(data: DataRoomsData, personId: string, target: AccessTarget): EffectiveAccess {
	const resolved = resolveTarget(data, target);
	if (!resolved) return NONE;
	const chain = unitChain(data, resolved.unitId);
	const chainIds = chain.map((unit) => unit.id);
	const grants: AccessGrant[] = [];
	const limits: AccessLimit[] = [];
	const ignored: AccessIgnored[] = [];
	const granted = new Set<Permission>();

	for (const membership of grouped(MEMBERSHIPS_BY_PERSON, data.memberships, (row) => row.personId).get(personId) ?? []) {
		const { scope } = membership;
		let path: string[];
		let inherited: boolean;
		if (scope.kind === 'room') {
			if (!resolved.room || scope.id !== resolved.room.id) continue;
			path = [];
			inherited = false;
		} else {
			const index = chainIds.indexOf(scope.id);
			if (index === -1) continue;
			path = chainIds.slice(0, index + 1).reverse();
			// A unit membership reaches its own unit directly; anything below it is inherited.
			inherited = Boolean(resolved.room) || index > 0;
		}
		const level = membershipLevel(membership);
		if (membership.status !== 'active') {
			ignored.push({ reason: membership.status === 'invited' ? 'pending' : 'suspended', membershipId: membership.id, scope, level });
			continue;
		}
		if (isPast(membership.expiresAt, data.clock)) {
			ignored.push({ reason: 'expired', membershipId: membership.id, scope, level, at: membership.expiresAt });
			continue;
		}
		if (inherited) {
			const allowed = level === 'owner' ? data.inheritance.owners : level === 'admin' ? data.inheritance.admins : data.inheritance.members;
			if (!allowed) {
				ignored.push({ reason: 'not-inherited', membershipId: membership.id, scope, level });
				continue;
			}
			if (level === 'member' && resolved.room?.policies.restricted) {
				ignored.push({ reason: 'restricted', membershipId: membership.id, scope, level });
				continue;
			}
		}
		let permissions = membershipPermissions(data, membership);
		if (membership.readOnly) {
			const removed = permissions.filter((permission) => WRITE_PERMISSIONS.includes(permission));
			if (removed.length) limits.push({ reason: 'read-only', removed });
			permissions = permissions.filter((permission) => !WRITE_PERMISSIONS.includes(permission));
		}
		for (const permission of permissions) granted.add(permission);
		grants.push({
			kind: 'membership',
			membershipId: membership.id,
			scope,
			level,
			inherited,
			path,
			roleId: level === 'member' ? (membership.roleId ?? data.roles.find((role) => role.isDefault)?.id) : undefined,
			permissions: ordered(permissions),
			readOnly: Boolean(membership.readOnly),
		});
	}

	if (resolved.room) {
		for (const share of grouped(SHARES_BY_PERSON, data.shares, (row) => row.personId).get(personId) ?? []) {
			if (share.roomId !== resolved.room.id) continue;
			const folder = resolved.folder ?? '/';
			const covers = folderContains(share.folder, folder);
			const inside = folderContains(folder, share.folder);
			if (!covers && !inside) continue;
			if (isPast(share.expiresAt, data.clock)) {
				ignored.push({ reason: 'expired', shareId: share.id, at: share.expiresAt });
				continue;
			}
			const permissions = sharePermissions(share);
			grants.push({ kind: 'share', shareId: share.id, folder: normalizeFolder(share.folder), expiresAt: share.expiresAt, permissions, partial: !covers });
			// A share on a subfolder doesn't open the wider target, it only shows the way in.
			if (covers) for (const permission of permissions) granted.add(permission);
		}
	}

	const viewOnly = resolved.document
		? Boolean(resolved.room?.policies.viewOnly || resolved.document.restrictions?.viewOnly)
		: false;
	if (viewOnly && granted.has('download') && !granted.has('manage_room')) {
		granted.delete('download');
		limits.push({ reason: 'view-only', removed: ['download'] });
	}

	let level: AccessLevel = 'none';
	for (const grant of grants) {
		const next: AccessLevel = grant.kind === 'share' ? 'share' : grant.level;
		if (LEVEL_RANK[next] > LEVEL_RANK[level]) level = next;
	}
	return { level, permissions: ordered(granted), grants, limits, ignored };
}

export function can(data: DataRoomsData, personId: string, permission: Permission, target: AccessTarget) {
	return effectiveAccess(data, personId, target).permissions.includes(permission);
}

/** A person can enter a room with room-wide view access, or with any live folder share inside it. */
export function canEnterRoom(data: DataRoomsData, personId: string, roomId: string) {
	const access = effectiveAccess(data, personId, { kind: 'room', roomId });
	return access.permissions.includes('view') || access.grants.some((grant) => grant.kind === 'share' && grant.permissions.includes('view'));
}

export function visibleRooms(data: DataRoomsData, personId: string) {
	return data.rooms.filter((room) => canEnterRoom(data, personId, room.id));
}

/**
 * Documents a person can open in a room. Room-wide view opens every document;
 * otherwise only live folder shares do, so this checks the room once rather
 * than every document.
 */
export function visibleDocuments(data: DataRoomsData, personId: string, roomId: string) {
	return memoized(VISIBLE_CACHE, data, `${personId}|${roomId}`, () => {
		const inRoom = data.documents.filter((document) => document.roomId === roomId);
		if (effectiveAccess(data, personId, { kind: 'room', roomId }).permissions.includes('view')) return inRoom;
		const folders = (grouped(SHARES_BY_PERSON, data.shares, (row) => row.personId).get(personId) ?? [])
			.filter((share) => share.roomId === roomId && share.can.view && !isPast(share.expiresAt, data.clock))
			.map((share) => share.folder);
		return folders.length ? inRoom.filter((document) => folders.some((folder) => folderContains(folder, document.folder))) : [];
	});
}

/** Owner or admin of a unit, held there or carried down from a parent unit. */
export function leadsUnit(data: DataRoomsData, personId: string, unitId: string) {
	const { level } = effectiveAccess(data, personId, { kind: 'unit', unitId });
	return level === 'owner' || level === 'admin';
}

/** Leads any unit or manages any room: who gets the access map, activity, and room creation. */
export function managesAnything(data: DataRoomsData, personId: string) {
	return (
		data.units.some((unit) => leadsUnit(data, personId, unit.id)) ||
		data.rooms.some((room) => can(data, personId, 'manage_room', { kind: 'room', roomId: room.id }))
	);
}

const QUESTIONS_CACHE = new WeakMap<DataRoomsData, Map<string, QuestionThread[]>>();
const ACTIVITY_CACHE = new WeakMap<DataRoomsData, Map<string, ActivityEvent[]>>();

/**
 * Q&A threads a person may read in a room. Room managers read every thread;
 * everyone else reads their own and their company's, never another bidder's.
 */
export function visibleQuestions(data: DataRoomsData, personId: string, roomId: string) {
	return memoized(QUESTIONS_CACHE, data, `${personId}|${roomId}`, () => {
		const inRoom = data.questions.filter((question) => question.roomId === roomId);
		if (can(data, personId, 'manage_room', { kind: 'room', roomId })) return inRoom;
		const people = indexed(PEOPLE_BY_ID, data.people, (row) => row.id);
		const company = people.get(personId)?.company;
		return inRoom.filter((question) => question.askedBy === personId || (company !== undefined && people.get(question.askedBy)?.company === company));
	});
}

/** Activity a person may read: everything in rooms they manage, and their own actions anywhere. */
export function visibleActivity(data: DataRoomsData, personId: string) {
	return memoized(ACTIVITY_CACHE, data, personId, () => {
		const managed = new Set(data.rooms.filter((room) => can(data, personId, 'manage_room', { kind: 'room', roomId: room.id })).map((room) => room.id));
		return data.activity.filter((event) => managed.has(event.roomId) || event.actorId === personId);
	});
}

/** Whether a person must accept the room's agreement before entering. Room managers never do. */
export function needsAgreement(data: DataRoomsData, personId: string, roomId: string) {
	const room = data.rooms.find((candidate) => candidate.id === roomId);
	if (!room?.policies.requireAgreement || !room.agreement) return false;
	if (can(data, personId, 'manage_room', { kind: 'room', roomId })) return false;
	const version = room.agreement.version;
	return !data.acceptances.some((acceptance) => acceptance.roomId === roomId && acceptance.personId === personId && acceptance.version >= version);
}

/** Everyone with access to a room, or a pending invite, ordered by level then name. */
export function roomPeople(data: DataRoomsData, roomId: string) {
	return memoized(PEOPLE_CACHE, data, roomId, () => computeRoomPeople(data, roomId));
}

function computeRoomPeople(data: DataRoomsData, roomId: string) {
	const rows: { person: Person; access: EffectiveAccess }[] = [];
	for (const person of data.people) {
		const access = effectiveAccess(data, person.id, { kind: 'room', roomId });
		const pending = access.ignored.some((entry) => entry.reason === 'pending' && entry.scope?.kind === 'room' && entry.scope.id === roomId);
		if (access.grants.length || pending) rows.push({ person, access });
	}
	return rows.sort((a, b) => LEVEL_RANK[b.access.level] - LEVEL_RANK[a.access.level] || a.person.name.localeCompare(b.person.name));
}

/* ------------------------------------------------------------------ *
 * Explanations
 * ------------------------------------------------------------------ */

const LEVEL_NOUN = { owner: 'Owner', admin: 'Admin', member: 'Member' } as const;

function scopeName(data: DataRoomsData, scope: MembershipScope) {
	return scope.kind === 'room'
		? (data.rooms.find((room) => room.id === scope.id)?.name ?? 'this room')
		: (data.units.find((unit) => unit.id === scope.id)?.name ?? 'a unit');
}

/** One grant in plain words, e.g. "Admin of Northwind Holdings, carried into Fund II". */
export function describeGrant(data: DataRoomsData, grant: AccessGrant, formatDate: (iso: string) => string = (iso) => iso.slice(0, 10)) {
	if (grant.kind === 'share') {
		const what = grant.permissions.includes('delete') ? 'view, edit, and delete' : grant.permissions.includes('edit') ? 'view and edit' : 'view';
		return `Shared ${folderName(grant.folder)} to ${what}${grant.expiresAt ? ` until ${formatDate(grant.expiresAt)}` : ''}`;
	}
	const role = grant.roleId ? data.roles.find((candidate) => candidate.id === grant.roleId)?.name : undefined;
	const where = scopeName(data, grant.scope);
	const what = grant.level === 'member' ? `${role ?? 'Member'} in ${where}` : `${LEVEL_NOUN[grant.level]} of ${where}`;
	if (!grant.inherited) return grant.readOnly ? `${what}, read-only` : what;
	const below = grant.path
		.slice(1)
		.map((unitId) => data.units.find((unit) => unit.id === unitId)?.name)
		.filter(Boolean);
	const carried = below.length ? `, carried through ${below.join(' and ')}` : ', carried into its rooms';
	return `${what}${carried}${grant.readOnly ? ', read-only' : ''}`;
}

/** Why some access doesn't count, in plain words. */
export function describeIgnored(data: DataRoomsData, entry: AccessIgnored, formatDate: (iso: string) => string = (iso) => iso.slice(0, 10)) {
	const where = entry.scope ? scopeName(data, entry.scope) : 'a folder';
	const who = entry.level ? `${LEVEL_NOUN[entry.level]} of ${where}` : entry.shareId ? 'Folder share' : `Access to ${where}`;
	switch (entry.reason) {
		case 'pending':
			return `Invited to ${where}, not accepted yet`;
		case 'suspended':
			return `${who}, suspended`;
		case 'expired':
			return `${who}, expired ${entry.at ? formatDate(entry.at) : ''}`.trim();
		case 'not-inherited':
			return `${who}, but ${entry.level === 'member' ? 'members' : `${entry.level}s`} don't join sub-units and rooms automatically`;
		case 'restricted':
			return `${who}, but this room only admits people added to it`;
	}
}
