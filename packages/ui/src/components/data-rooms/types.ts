import type { WorkspaceTheme } from '../workspace-kit/menu';

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

export type DataRoomsView = 'home' | 'access-map' | 'activity' | 'room';

export type RoomTab = 'documents' | 'people' | 'questions' | 'insights' | 'settings';

export type DataRoomsTheme = WorkspaceTheme;

/* ------------------------------------------------------------------ *
 * People and structure
 * ------------------------------------------------------------------ */

/**
 * What someone can do. Roles bundle these; extra grants add to them; folder
 * shares grant view, edit, and delete inside a subtree.
 */
export type Permission =
	| 'view'
	| 'download'
	| 'upload'
	| 'edit'
	| 'delete'
	| 'share'
	| 'invite'
	| 'manage_members'
	| 'manage_room'
	| 'ask_assistant';

export type Person = {
	id: string;
	name: string;
	email: string;
	title?: string;
	/** Company shown beside guests, e.g. the law firm or the buyer. */
	company?: string;
	/** From outside the organization. Guests only see rooms and folders they were added to. */
	guest?: boolean;
	avatarUrl?: string;
};

/**
 * The organization and its sub-organizations. Exactly one unit has no parent:
 * the organization itself. `kind` is the label people see, e.g. "Fund".
 */
export type OrgUnit = {
	id: string;
	parentId: string | null;
	name: string;
	kind: string;
};

export type Role = {
	id: string;
	name: string;
	description?: string;
	permissions: Permission[];
	/** Picked when nobody chooses a role, e.g. for invites. */
	isDefault?: boolean;
};

export type MembershipScope = { kind: 'unit' | 'room'; id: string };

export type MembershipStatus = 'active' | 'invited' | 'suspended';

export type Membership = {
	id: string;
	personId: string;
	scope: MembershipScope;
	/** Owners hold every permission and cannot be removed by admins. */
	owner?: boolean;
	/** Admins hold every permission. */
	admin?: boolean;
	roleId?: string;
	/** Permissions granted on top of the role. */
	extraPermissions?: Permission[];
	/** Can open and download, never change anything. */
	readOnly?: boolean;
	status: MembershipStatus;
	/** Access ends at this time. */
	expiresAt?: string;
	invitedBy?: string;
	joinedAt?: string;
};

/**
 * How membership in a unit carries into its sub-units and rooms. Owners and
 * admins usually follow; plain members only when the organization says so.
 */
export type InheritancePolicy = {
	owners: boolean;
	admins: boolean;
	members: boolean;
	/** People from outside the organization may be invited to rooms. */
	allowGuests: boolean;
};

/* ------------------------------------------------------------------ *
 * Rooms and documents
 * ------------------------------------------------------------------ */

export type RoomStatus = 'active' | 'closing' | 'archived';

export type RoomPolicies = {
	/** Documents open in the viewer but cannot be downloaded. */
	viewOnly: boolean;
	/** The viewer tiles the reader's name, email, and time over every page. */
	watermark: boolean;
	/** People who don't manage the room accept the agreement before entering. */
	requireAgreement: boolean;
	/** Members of the parent units don't join automatically; owners and admins still do when inheritance says so. */
	restricted: boolean;
};

export type RoomAgreement = {
	title: string;
	body: string;
	/** Bump to ask everyone to accept again. */
	version: number;
	updatedAt?: string;
};

export type Room = {
	id: string;
	unitId: string;
	name: string;
	description?: string;
	status: RoomStatus;
	createdAt: string;
	createdBy?: string;
	/** A deadline people should see, e.g. when bids are due. */
	closesAt?: string;
	policies: RoomPolicies;
	agreement?: RoomAgreement;
};

export type DocumentKind = 'pdf' | 'sheet' | 'doc' | 'slides' | 'image' | 'archive' | 'other';

export type DocumentVersion = {
	id: string;
	number: number;
	uploadedBy: string;
	uploadedAt: string;
	size: number;
	note?: string;
};

export type DataRoomDocument = {
	id: string;
	roomId: string;
	/** Folder path, e.g. `/02 Financials/Audited`. `/` is the room root. */
	folder: string;
	name: string;
	kind: DocumentKind;
	size: number;
	pages?: number;
	versions: DocumentVersion[];
	uploadedBy: string;
	updatedAt: string;
	/** `processing` while the host indexes a fresh upload. */
	status?: 'processing' | 'ready';
	/** Per-document overrides on top of the room's policies. */
	restrictions?: { viewOnly?: boolean; watermark?: boolean };
	tags?: string[];
};

/** A folder with no documents yet. Folders with documents come from their paths. */
export type DataRoomFolder = { roomId: string; path: string };

/** Access to one folder and everything below it, for one person. */
export type FolderShare = {
	id: string;
	roomId: string;
	folder: string;
	personId: string;
	can: { view: boolean; edit: boolean; delete: boolean };
	expiresAt?: string;
	createdBy: string;
	createdAt: string;
};

export type RoomInvite = {
	id: string;
	roomId: string;
	email: string;
	roleId: string;
	invitedBy: string;
	invitedAt: string;
	expiresAt?: string;
};

export type AgreementAcceptance = {
	roomId: string;
	personId: string;
	version: number;
	acceptedAt: string;
};

/* ------------------------------------------------------------------ *
 * Activity, questions, and the assistant
 * ------------------------------------------------------------------ */

export type ActivityKind =
	| 'view'
	| 'download'
	| 'upload'
	| 'version'
	| 'move'
	| 'delete'
	| 'share'
	| 'unshare'
	| 'invite'
	| 'join'
	| 'role'
	| 'remove'
	| 'agreement'
	| 'question'
	| 'answer'
	| 'settings';

export type ActivityEvent = {
	id: string;
	at: string;
	actorId: string;
	kind: ActivityKind;
	roomId: string;
	documentId?: string;
	/** The person an access change was about. */
	subjectId?: string;
	/** Short free text, e.g. a folder path or a role name. */
	detail?: string;
	/** Seconds spent reading, for `view`. */
	seconds?: number;
};

export type QuestionStatus = 'open' | 'answered' | 'closed';

export type QuestionMessage = {
	id: string;
	authorId: string;
	at: string;
	body: string;
};

export type Citation = {
	documentId: string;
	page?: number;
	quote?: string;
};

export type QuestionThread = {
	id: string;
	roomId: string;
	documentId?: string;
	askedBy: string;
	askedAt: string;
	title: string;
	status: QuestionStatus;
	assigneeId?: string;
	messages: QuestionMessage[];
	/** A drafted answer an editor can send as is or change. */
	draft?: { body: string; citations: Citation[] };
};

export type AssistantAnswer = {
	text: string;
	citations: Citation[];
};

export type AssistantReply = AssistantAnswer & {
	/** Words that pick this reply for a prompt. */
	match: string[];
};

/** Scripted answers for the room assistant when the host does not run one. */
export type AssistantScript = {
	suggestions: string[];
	replies: AssistantReply[];
	fallback: string;
};

/* ------------------------------------------------------------------ *
 * The template's contract
 * ------------------------------------------------------------------ */

/**
 * Everything the template renders. Map it from your data room API: people,
 * the organization and its units, rooms, roles, memberships, documents,
 * folder shares, invites, agreement acceptances, activity, and questions.
 */
export type DataRoomsData = {
	/** The clock relative dates and expiries are measured from. Pass a fixed value for identical server and client output. */
	clock: string;
	org: { name: string };
	/** The person using the workspace. */
	viewerId: string;
	people: Person[];
	units: OrgUnit[];
	rooms: Room[];
	roles: Role[];
	memberships: Membership[];
	inheritance: InheritancePolicy;
	documents: DataRoomDocument[];
	folders?: DataRoomFolder[];
	shares: FolderShare[];
	invites: RoomInvite[];
	acceptances: AgreementAcceptance[];
	activity: ActivityEvent[];
	questions: QuestionThread[];
	assistant?: AssistantScript;
};

/** Changes the template asks the host to make. Reject to keep the dialog open with your message. */
export type DataRoomsCommand =
	| { type: 'create-room'; room: Room }
	| { type: 'update-room'; roomId: string; patch: Partial<Pick<Room, 'name' | 'description' | 'status' | 'closesAt' | 'policies' | 'agreement'>> }
	| { type: 'invite'; roomId: string; invites: { email: string; personId?: string }[]; roleId: string; expiresAt?: string; message?: string }
	| { type: 'revoke-invite'; inviteId: string }
	| {
			type: 'update-membership';
			membershipId: string;
			patch: Partial<Pick<Membership, 'roleId' | 'extraPermissions' | 'readOnly' | 'admin' | 'expiresAt'>>;
	  }
	| { type: 'remove-membership'; membershipId: string }
	| { type: 'create-share'; roomId: string; folder: string; personIds: string[]; can: FolderShare['can']; expiresAt?: string }
	| { type: 'revoke-share'; shareId: string }
	| { type: 'upload'; roomId: string; folder: string; files: { name: string; size: number; kind: DocumentKind; pages?: number }[] }
	| { type: 'create-folder'; roomId: string; path: string }
	| { type: 'move-documents'; documentIds: string[]; folder: string }
	| { type: 'update-document'; documentId: string; patch: { restrictions?: DataRoomDocument['restrictions'] } }
	| { type: 'update-inheritance'; inheritance: InheritancePolicy }
	| { type: 'save-role'; role: Role }
	| { type: 'accept-agreement'; roomId: string; version: number }
	| { type: 'ask-question'; roomId: string; documentId?: string; title: string; body: string }
	| { type: 'answer-question'; questionId: string; body: string; close?: boolean }
	| { type: 'set-question-status'; questionId: string; status: QuestionStatus };

/** Controls the template renders but does not own. */
export type DataRoomsAction =
	| { type: 'download'; documentId: string; versionId?: string }
	/** A document opened in the viewer, for the host's access log. */
	| { type: 'view-document'; documentId: string }
	| { type: 'export-activity'; roomId?: string }
	| { type: 'search'; query: string }
	| { type: 'contact'; personId: string }
	| { type: 'org-menu'; item: 'organization-settings' | 'profile' | 'support' | 'log-out' };

/** What the room assistant is asked; answer with text and the documents it drew on. */
export type AssistantRequest = { roomId: string; prompt: string; viewerId: string; documentId?: string };
