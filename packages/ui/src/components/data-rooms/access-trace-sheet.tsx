'use client';

import { Ban, Building2, Eye, FolderLock, FolderOpen, FolderSymlink, Info } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { ToneBadge } from '../workspace-kit/primitives';
import { StatusBadge } from '../workspace-kit/surface';
import { type AccessGrant, type AccessLimit, describeGrant, describeIgnored, folderName, PERMISSION_COPY } from './access';
import { useDataRooms } from './data-rooms-context';
import { daysUntil, firstName } from './format';
import { ChoiceSelect, LEVEL_PRESENTATION, PermissionChips, PersonLine } from './parts';
import type { Room } from './types';
import { useCommand } from './use-command';

type AccessTraceSheetProps = {
	request: { personId: string; roomId: string } | null;
	onOpenChange: (open: boolean) => void;
};

function limitText(limit: AccessLimit) {
	if (limit.reason === 'view-only') return 'View-only documents can’t be downloaded.';
	const names = limit.removed.map((permission) => PERMISSION_COPY[permission].label.toLowerCase());
	return `Read-only: can’t ${names.slice(0, -1).join(', ')}${names.length > 1 ? ', or ' : ''}${names[names.length - 1]}.`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className="text-xs text-muted-foreground">{title}</h3>
			{children}
		</section>
	);
}

/** A tile on the chain: a unit or the room. */
function StepTile({ kind, room }: { kind: 'unit' | 'room'; room?: Room }) {
	const Icon = kind === 'unit' ? Building2 : room?.policies.restricted ? FolderLock : FolderOpen;
	return (
		<span aria-hidden="true" className="relative z-10 grid size-6 shrink-0 place-items-center rounded-[7px] bg-card text-muted-foreground shadow-card">
			<Icon className="size-3.5" />
		</span>
	);
}

/** One grant drawn as a path from where it is held down to this room. */
function GrantChain({ grant, room }: { grant: AccessGrant; room: Room }) {
	const { data, unit, role, format } = useDataRooms();
	const text = describeGrant(data, grant, (iso) => format.date(iso));

	if (grant.kind === 'share') {
		const days = grant.expiresAt ? daysUntil(grant.expiresAt, data.clock) : null;
		return (
			<li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-2xs">
				<span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-info/10 text-info">
					<FolderSymlink className="size-3.5" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block text-[13px] font-medium text-foreground">{folderName(grant.folder)}</span>
					<span className="block text-xs text-muted-foreground">{text}</span>
					{grant.expiresAt ? (
						<span className={cn('mt-1 block text-xs tabular-nums', days !== null && days <= 7 ? 'text-warning' : 'text-muted-foreground')}>
							Ends {format.deadline(grant.expiresAt)}
						</span>
					) : null}
				</span>
				{grant.partial ? <ToneBadge tone="info">Inside only</ToneBadge> : null}
			</li>
		);
	}

	const badge =
		grant.level === 'member'
			? { label: role(grant.roleId)?.name ?? 'Member', tone: 'neutral' as const }
			: LEVEL_PRESENTATION[grant.level];
	const steps: { key: string; kind: 'unit' | 'room'; name: string; held: boolean }[] = [
		...grant.path.map((unitId, index) => ({ key: unitId, kind: 'unit' as const, name: unit(unitId)?.name ?? 'Unit', held: index === 0 })),
		{ key: room.id, kind: 'room' as const, name: room.name, held: !grant.inherited },
	];

	return (
		<li className="rounded-lg border border-border bg-card p-3 shadow-2xs">
			<ol className="relative flex flex-col gap-3">
				{steps.length > 1 ? <span aria-hidden="true" className="absolute top-3 bottom-3 left-3 w-px bg-border" /> : null}
				{steps.map((step, index) => (
					<li key={step.key} className="relative flex items-center gap-2.5">
						<StepTile kind={step.kind} room={room} />
						<span className={cn('min-w-0 flex-1 truncate text-[13px]', step.held ? 'font-medium text-foreground' : 'text-muted-foreground')}>{step.name}</span>
						{step.held ? (
							<StatusBadge presentation={badge} />
						) : index > 0 ? (
							<span className="text-xs text-subtle-foreground">carried down</span>
						) : null}
					</li>
				))}
			</ol>
			<p className="mt-2.5 border-t border-dashed border-foreground/10 pt-2 text-xs text-muted-foreground">{text}</p>
		</li>
	);
}

/**
 * Why someone can (or can't) do something in a room: what they can do, every
 * grant drawn as a path from where it's held, the limits applied, access that
 * doesn't count, and a check for any single document.
 */
export function AccessTraceSheet({ request, onOpenChange }: AccessTraceSheetProps) {
	const { data, person, room: findRoom, access, can, setPreviewAs, openRoom, openShare, format } = useDataRooms();
	const { locked } = useCommand();
	const [last, setLast] = React.useState(request);
	if (request && request !== last) setLast(request);
	const current = request ?? last;
	const subject = current ? person(current.personId) : undefined;
	const room = current ? findRoom(current.roomId) : undefined;
	const [documentId, setDocumentId] = React.useState('');
	// Start the document check over for each person and room, during render rather than in an effect.
	const subjectKey = current ? `${current.personId}|${current.roomId}` : '';
	const [checkedFor, setCheckedFor] = React.useState(subjectKey);
	if (checkedFor !== subjectKey) {
		setCheckedFor(subjectKey);
		setDocumentId('');
	}

	if (!current || !subject || !room) {
		return (
			<Sheet open={false} onOpenChange={onOpenChange}>
				<SheetContent side="right" className="hidden" />
			</Sheet>
		);
	}

	const first = firstName(subject.name);
	const result = access({ kind: 'room', roomId: room.id }, subject.id);
	const documents = data.documents.filter((document) => document.roomId === room.id);
	const checked = documentId ? access({ kind: 'document', documentId }, subject.id) : null;
	const manages = can('manage_members', { kind: 'room', roomId: room.id });
	const canShare = can('share', { kind: 'room', roomId: room.id });
	const shareOnly = result.level === 'share';

	return (
		<Sheet open={Boolean(request)} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[27rem] max-w-[92vw] gap-0 p-0 sm:max-w-[27rem]">
				<div className="flex flex-col gap-3 border-b border-border bg-muted/50 px-5 pt-5 pb-4">
					<div className="flex flex-col gap-1">
						<SheetTitle className="text-base font-medium">Why can {first} open this?</SheetTitle>
						<SheetDescription className="text-[13px]">Access to {room.name}, and where it comes from.</SheetDescription>
					</div>
					<div className="flex items-center justify-between gap-3">
						<PersonLine person={subject} />
						<StatusBadge presentation={LEVEL_PRESENTATION[result.level]} />
					</div>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 [&>*]:shrink-0">
					<Section title={shareOnly ? 'Can do in shared folders' : 'Can do here'}>
						<PermissionChips
							permissions={shareOnly ? [...new Set(result.grants.flatMap((grant) => grant.permissions))] : result.permissions}
						/>
					</Section>

					<Section title="Because">
						{result.grants.length ? (
							<ol className="flex flex-col gap-2">
								{result.grants.map((grant) => (
									<GrantChain key={grant.kind === 'share' ? grant.shareId : grant.membershipId} grant={grant} room={room} />
								))}
							</ol>
						) : (
							<p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground">
								<Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
								{first} has no access to this room right now.
							</p>
						)}
					</Section>

					{result.limits.length ? (
						<Section title="Limits">
							<ul className="flex flex-col gap-1.5 text-[13px] text-foreground">
								{result.limits.map((limit) => (
									<li key={limit.reason}>{limitText(limit)}</li>
								))}
							</ul>
						</Section>
					) : null}

					{result.ignored.length ? (
						<Section title="Not counted">
							<ul className="flex flex-col gap-1.5">
								{result.ignored.map((entry, index) => (
									<li key={entry.membershipId ?? entry.shareId ?? index} className="flex items-start gap-2 text-[13px] text-muted-foreground">
										<Ban aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" />
										{describeIgnored(data, entry, (iso) => format.date(iso))}
									</li>
								))}
							</ul>
						</Section>
					) : null}

					<Section title="Check a document">
						<ChoiceSelect
							label="Document to check"
							className="w-full"
							value={documentId}
							onValueChange={setDocumentId}
							options={[
								{ value: '', label: 'Choose a document…' },
								...documents.map((document) => ({
									value: document.id,
									label: `${document.folder === '/' ? '' : `${document.folder.slice(1)} / `}${document.name}`,
								})),
							]}
						/>
						{checked ? (
							<div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
								<p className="text-[13px] text-foreground">
									{checked.permissions.includes('view') ? `${first} can open it.` : `${first} can’t open it.`}
								</p>
								<PermissionChips permissions={checked.permissions} compact />
								{checked.limits.map((limit) => (
									<p key={limit.reason} className="text-xs text-muted-foreground">
										{limitText(limit)}
									</p>
								))}
							</div>
						) : null}
					</Section>
				</div>
				{manages || canShare ? (
					<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted/50 px-5 py-3">
						{canShare ? (
							<Button
								size="xs"
								variant="outline"
								disabled={locked}
								onClick={() => {
									onOpenChange(false);
									openShare({ roomId: room.id, personId: subject.id });
								}}
							>
								<FolderSymlink aria-hidden="true" />
								Share a folder
							</Button>
						) : null}
						{manages && subject.id !== data.viewerId && result.level !== 'none' ? (
							<Button
								size="xs"
								onClick={() => {
									setPreviewAs(subject.id);
									openRoom(room.id);
									onOpenChange(false);
								}}
							>
								<Eye aria-hidden="true" />
								Preview as {first}
							</Button>
						) : null}
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
