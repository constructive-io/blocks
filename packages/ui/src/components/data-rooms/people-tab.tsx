'use client';

import { Ban, Building2, DoorOpen, Eye, FolderSymlink, Lock, LockOpen, type LucideIcon, Mail, MailX, MoreHorizontal, Rows3, Table2, UserMinus, UserPlus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { FilterGroup, focusRingClass, SearchField, Segmented } from '../workspace-kit/primitives';
import { EmptyState, TableSurface, tableHeadClass, tableRowClass } from '../workspace-kit/surface';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { type AccessGrant, type EffectiveAccess, folderName, normalizeFolder, roomFolders, roomPeople } from './access';
import { useDataRooms } from './data-rooms-context';
import { daysUntil, firstName, nameFromEmail } from './format';
import { ChoiceSelect, PersonAvatar, PersonLine } from './parts';
import type { DataRoomsCommand, Membership, Person, Room, RoomInvite } from './types';
import { useCommand } from './use-command';

type Filter = 'all' | 'members' | 'guests' | 'shares' | 'pending';
type Layout = 'list' | 'matrix';

type Row =
	| { kind: 'person'; id: string; person: Person; access: EffectiveAccess; membership?: Membership; pending: boolean }
	| { kind: 'invite'; id: string; invite: RoomInvite };

/** The membership held directly in this room, if any. */
function directMembership(memberships: Membership[], personId: string, roomId: string) {
	return memberships.find((membership) => membership.personId === personId && membership.scope.kind === 'room' && membership.scope.id === roomId);
}

/** The grant that best explains someone's access: the strongest membership, else a share. */
function primaryGrant(access: EffectiveAccess): AccessGrant | undefined {
	return access.grants.find((grant) => grant.kind === 'membership') ?? access.grants[0];
}

function matchesFilter(row: Row, filter: Filter) {
	if (filter === 'all') return true;
	if (row.kind === 'invite') return filter === 'pending';
	if (filter === 'pending') return row.pending;
	if (filter === 'guests') return Boolean(row.person.guest) && !row.pending;
	if (filter === 'shares') return row.access.level === 'share';
	return !row.person.guest && !row.pending;
}

/**
 * Everyone who can open the room: direct members, people who carry access
 * down from a unit, guests with shared folders, and pending invites. A list
 * for managing roles, or a matrix of what each person reaches per folder.
 */
export function PeopleTab({ room }: { room: Room }) {
	const { data, can, openTrace, openShare, openInvite, role, unit, format } = useDataRooms();
	const command = useCommand();
	const [query, setQuery] = React.useState('');
	const [filter, setFilter] = React.useState<Filter>('all');
	const [layout, setLayout] = React.useState<Layout>('list');
	const target = { kind: 'room', roomId: room.id } as const;
	const manages = can('manage_members', target);
	const shares = can('share', target);
	const disabled = command.pending || command.locked;

	const rows = React.useMemo<Row[]>(() => {
		const people: Row[] = roomPeople(data, room.id).map(({ person, access }) => {
			const membership = directMembership(data.memberships, person.id, room.id);
			return { kind: 'person', id: person.id, person, access, membership, pending: membership?.status === 'invited' };
		});
		const invites: Row[] = data.invites.filter((invite) => invite.roomId === room.id).map((invite) => ({ kind: 'invite', id: invite.id, invite }));
		return [...people, ...invites];
	}, [data, room.id]);

	const searched = React.useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) => {
			const text = row.kind === 'invite' ? row.invite.email : [row.person.name, row.person.email, row.person.company ?? ''].join(' ');
			return text.toLowerCase().includes(needle);
		});
	}, [query, rows]);

	const count = (value: Filter) => searched.filter((row) => matchesFilter(row, value)).length;
	const shown = searched.filter((row) => matchesFilter(row, filter));

	const attempt = (change: DataRoomsCommand) => void command.run(change);

	/** Where a person's access comes from: this room, a parent unit, a shared folder, or an invite. */
	const source = (row: Extract<Row, { kind: 'person' }>): AccessSource => {
		if (row.pending) return { icon: Mail, text: 'Invite not accepted yet' };
		const grant = primaryGrant(row.access);
		if (grant?.kind === 'share') return { icon: FolderSymlink, text: `${folderName(grant.folder)} folder` };
		if (grant?.inherited) return { icon: Building2, text: unit(grant.path[0] ?? '')?.name ?? 'The organization' };
		return { icon: DoorOpen, text: 'Added to this room' };
	};

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 @3xl/view:px-6">
				<div className="flex flex-wrap items-center gap-2">
					<SearchField
						label="Search people"
						placeholder="Search people…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className="w-full @xl/view:w-56"
					/>
					<FilterGroup
						label="Show"
						value={filter}
						onChange={setFilter}
						rootClassName="flex-1"
						options={[
							{ value: 'all', label: 'All', count: count('all') },
							{ value: 'members', label: 'Members', count: count('members') },
							{ value: 'guests', label: 'Guests', count: count('guests') },
							{ value: 'shares', label: 'Folder access', count: count('shares') },
							{ value: 'pending', label: 'Pending', count: count('pending') },
						]}
					/>
					<Segmented
						label="Layout"
						value={layout}
						onChange={(next) => startViewTransition(() => setLayout(next))}
						options={[
							{ value: 'list', label: 'List', icon: Rows3 },
							{ value: 'matrix', label: 'Matrix', icon: Table2 },
						]}
					/>
					{can('invite', target) ? (
						<Button size="xs" disabled={command.locked} onClick={() => openInvite(room.id)}>
							<UserPlus aria-hidden="true" />
							Invite
						</Button>
					) : null}
				</div>
				{command.error ? (
					<p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
						{command.error}
					</p>
				) : null}
				<ViewAnimation>
					<div key={layout}>
						{shown.length === 0 ? (
							<EmptyState icon={Eye} title="Nobody here yet" description={query ? 'No one matches that search.' : 'Invite people or share a folder to give them access.'} />
						) : layout === 'list' ? (
							<TableSurface minWidth="46rem">
								<thead className={tableHeadClass}>
									<tr>
										<th scope="col">Person</th>
										<th scope="col">Role</th>
										<th scope="col">Access from</th>
										<th scope="col" className="text-right">
											Expires
										</th>
										<th scope="col">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{shown.map((row) =>
										row.kind === 'invite' ? (
											<tr key={row.id} className={tableRowClass}>
												<td>
													<span className="flex min-w-0 items-center gap-2.5">
														<span
															aria-hidden="true"
															className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-foreground/30 text-muted-foreground"
														>
															<MailX className="size-3.5" />
														</span>
														<span className="min-w-0">
															<span className="block truncate text-[13px] font-medium text-foreground">{nameFromEmail(row.invite.email)}</span>
															<span className="block truncate text-xs text-muted-foreground">{row.invite.email}</span>
														</span>
													</span>
												</td>
												<td className="text-foreground">{role(row.invite.roleId)?.name ?? '—'}</td>
												<td>
													<SourceLine source={{ icon: Mail, text: `Invite sent ${format.relative(row.invite.invitedAt)}` }} />
												</td>
												<td className="text-right text-muted-foreground tabular-nums">{row.invite.expiresAt ? format.deadline(row.invite.expiresAt) : '—'}</td>
												<td className="w-10 text-right">
													{manages ? (
														<RowMenu label={`Actions for ${row.invite.email}`}>
															<DropdownMenuItem
																className="gap-2 [&_svg]:size-3.5"
																disabled={disabled}
																onClick={() => attempt({ type: 'revoke-invite', inviteId: row.invite.id })}
															>
																<MailX aria-hidden="true" />
																Revoke invite
															</DropdownMenuItem>
														</RowMenu>
													) : null}
												</td>
											</tr>
										) : (
											<PersonRow
												key={row.id}
												row={row}
												room={room}
												source={source(row)}
												manages={manages}
												shares={shares}
												disabled={disabled}
												onRun={attempt}
												onTrace={() => openTrace(row.person.id, room.id)}
												onShare={() => openShare({ roomId: room.id, personId: row.person.id })}
											/>
										),
									)}
								</tbody>
							</TableSurface>
						) : (
							<AccessMatrix room={room} people={shown.filter((row): row is Extract<Row, { kind: 'person' }> => row.kind === 'person' && !row.pending)} />
						)}
					</div>
				</ViewAnimation>
			</div>
		</div>
	);
}

function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={label}
				className={cn('grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-popup-open:bg-overlay-hover', focusRingClass)}
			>
				<MoreHorizontal aria-hidden="true" className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type AccessSource = { icon: LucideIcon; text: string };

/** Where access comes from, as one quiet line with a leading glyph so every row starts at the same edge. */
function SourceLine({ source }: { source: AccessSource }) {
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
			<source.icon aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" />
			<span className="truncate">{source.text}</span>
		</span>
	);
}

/** What someone is in the room, said once: Owner, Admin, their role, or folder access. */
function roleLabel(row: Extract<Row, { kind: 'person' }>, role: (id: string | undefined) => { name: string } | undefined) {
	const { access, membership } = row;
	if (access.level === 'owner') return 'Owner';
	if (access.level === 'admin') return 'Admin';
	if (access.level === 'share') return 'Folder access';
	const grant = primaryGrant(access);
	const roleId = membership?.roleId ?? (grant?.kind === 'membership' ? grant.roleId : undefined);
	return role(roleId)?.name ?? 'Member';
}

type PersonRowProps = {
	row: Extract<Row, { kind: 'person' }>;
	room: Room;
	source: AccessSource;
	manages: boolean;
	shares: boolean;
	/** A change is pending, or the workspace is being previewed. */
	disabled: boolean;
	onRun: (command: DataRoomsCommand) => void;
	onTrace: () => void;
	onShare: () => void;
};

function PersonRow({ row, room, source, manages, shares, disabled, onRun, onTrace, onShare }: PersonRowProps) {
	const { data, role, format } = useDataRooms();
	const { person, access, membership: direct } = row;
	/** A plain member held in this room: the only kind whose role this table edits. */
	const editable = manages && direct && !direct.owner && !direct.admin ? direct : undefined;
	const expiries = [
		direct?.expiresAt,
		...access.grants.map((grant) => (grant.kind === 'share' ? grant.expiresAt : undefined)),
	].filter((value): value is string => Boolean(value));
	const expires = expiries.sort()[0];
	const days = expires ? daysUntil(expires, data.clock) : null;
	const first = firstName(person.name);

	return (
		<tr className={tableRowClass}>
			<td>
				<button type="button" onClick={onTrace} className={cn('-mx-1 flex min-w-0 cursor-pointer rounded-md px-1 py-0.5 text-left hover:bg-overlay-hover', focusRingClass)}>
					<PersonLine person={person} />
					<span className="sr-only">, see why {first} has access</span>
				</button>
			</td>
			<td>
				{editable ? (
					// Pulled left by the select's border and padding, so its text lines up with the plain roles above and below.
					<ChoiceSelect
						label={`Role for ${person.name}`}
						className="-ml-2.5 w-auto min-w-32"
						disabled={disabled}
						value={editable.roleId ?? data.roles.find((candidate) => candidate.isDefault)?.id ?? ''}
						onValueChange={(roleId) => onRun({ type: 'update-membership', membershipId: editable.id, patch: { roleId } })}
						options={data.roles.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
					/>
				) : (
					<span className={cn(access.level === 'owner' || access.level === 'admin' ? 'font-medium text-foreground' : 'text-foreground')}>{roleLabel(row, role)}</span>
				)}
				{direct?.readOnly ? (
					<span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
						<Lock aria-hidden="true" className="size-3" />
						Read-only
					</span>
				) : null}
			</td>
			<td>
				<SourceLine source={source} />
			</td>
			<td className={cn('text-right tabular-nums', days !== null && days <= 7 ? 'text-warning' : 'text-muted-foreground')}>
				{expires ? format.deadline(expires) : '—'}
			</td>
			<td className="w-10 text-right">
				<RowMenu label={`Actions for ${person.name}`}>
					<DropdownMenuItem className="gap-2 [&_svg]:size-3.5" onClick={onTrace}>
						<Eye aria-hidden="true" />
						Why can they?
					</DropdownMenuItem>
					{shares ? (
						<DropdownMenuItem className="gap-2 [&_svg]:size-3.5" onClick={onShare}>
							<FolderSymlink aria-hidden="true" />
							Share a folder…
						</DropdownMenuItem>
					) : null}
					{manages && direct && !direct.owner ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 [&_svg]:size-3.5"
								disabled={disabled}
								onClick={() => onRun({ type: 'update-membership', membershipId: direct.id, patch: { readOnly: !direct.readOnly } })}
							>
								{direct.readOnly ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
								{direct.readOnly ? 'Allow changes' : 'Make read-only'}
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								className="gap-2 [&_svg]:size-3.5"
								disabled={disabled}
								onClick={() => onRun({ type: 'remove-membership', membershipId: direct.id })}
							>
								<UserMinus aria-hidden="true" />
								Remove from {room.name}
							</DropdownMenuItem>
						</>
					) : null}
					{!direct && access.level !== 'share' && manages ? (
						<>
							<DropdownMenuSeparator />
							<p className="flex gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
								<Ban aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
								Inherited access is changed where it’s held.
							</p>
						</>
					) : null}
				</RowMenu>
			</td>
		</tr>
	);
}

type CellState = { view: boolean; download: boolean; edit: boolean; remove: boolean; partial: boolean };

/** People down the side, top-level folders across, and what each person reaches in each folder. */
function AccessMatrix({ room, people }: { room: Room; people: Extract<Row, { kind: 'person' }>[] }) {
	const { data, access, openTrace } = useDataRooms();
	const columns = React.useMemo(() => {
		const top = roomFolders(data, room.id).filter((path) => path !== '/' && path.split('/').length === 2);
		const rootDocs = data.documents.some((document) => document.roomId === room.id && normalizeFolder(document.folder) === '/');
		return [...(rootDocs ? ['/'] : []), ...top];
	}, [data, room.id]);

	const cell = (personId: string, folder: string): CellState => {
		const result = access({ kind: 'folder', roomId: room.id, folder }, personId);
		const partial = !result.permissions.includes('view') && result.grants.some((grant) => grant.kind === 'share' && grant.partial && grant.permissions.includes('view'));
		return {
			view: result.permissions.includes('view'),
			download: result.permissions.includes('download'),
			edit: result.permissions.includes('edit'),
			remove: result.permissions.includes('delete'),
			partial,
		};
	};

	if (people.length === 0) {
		return <EmptyState icon={Table2} title="No one to compare" description="People with access appear here once they join." />;
	}

	return (
		<TableSurface minWidth={`${16 + columns.length * 8}rem`}>
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col" className="sticky left-0 z-10 bg-muted">
						Person
					</th>
					{columns.map((folder) => (
						<th key={folder} scope="col" className="text-center">
							<Tooltip>
								<TooltipTrigger render={<span className="inline-block max-w-28 cursor-default truncate align-middle">{folder === '/' ? 'Root' : folderName(folder)}</span>} />
								<TooltipContent>{folder}</TooltipContent>
							</Tooltip>
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{people.map((row) => (
					<tr key={row.id} className={cn(tableRowClass, 'cursor-pointer hover:bg-overlay-hover')} onClick={() => openTrace(row.person.id, room.id)}>
						<th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-normal">
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									openTrace(row.person.id, room.id);
								}}
								className={cn('flex min-w-0 cursor-pointer items-center gap-2 rounded-md text-left', focusRingClass)}
							>
								<PersonAvatar person={row.person} size="sm" />
								<span className="truncate text-[13px] text-foreground">{row.person.name}</span>
							</button>
						</th>
						{columns.map((folder) => (
							<td key={folder} className="text-center">
								<MatrixCell state={cell(row.person.id, folder)} folder={folder} />
							</td>
						))}
					</tr>
				))}
			</tbody>
		</TableSurface>
	);
}

function MatrixCell({ state, folder }: { state: CellState; folder: string }) {
	if (!state.view && !state.partial) {
		return (
			<span className="text-subtle-foreground">
				<span aria-hidden="true">—</span>
				<span className="sr-only">No access</span>
			</span>
		);
	}
	if (state.partial) {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<span className="inline-grid cursor-default place-items-center">
							<span aria-hidden="true" className="size-2 rounded-full border border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]" />
							<span className="sr-only">Some folders inside</span>
						</span>
					}
				/>
				<TooltipContent>Only a folder inside {folderName(folder)}</TooltipContent>
			</Tooltip>
		);
	}
	const chips: { on: boolean; letter: string; label: string }[] = [
		{ on: state.download, letter: 'D', label: 'download' },
		{ on: state.edit, letter: 'E', label: 'edit' },
		{ on: state.remove, letter: 'X', label: 'delete' },
	];
	return (
		<span className="inline-flex items-center gap-1">
			<span aria-hidden="true" className="size-2 rounded-full bg-primary" />
			<span className="sr-only">View</span>
			{chips
				.filter((chip) => chip.on)
				.map((chip) => (
					<span key={chip.letter} className="inline-grid h-4 min-w-4 place-items-center rounded-[4px] bg-muted px-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
						<span aria-hidden="true">{chip.letter}</span>
						<span className="sr-only">, {chip.label}</span>
					</span>
				))}
		</span>
	);
}
