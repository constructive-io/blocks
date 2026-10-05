'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { focusRingClass, SearchField } from '../workspace-kit/primitives';
import { dashedRule } from '../workspace-kit/surface';
import { type AccessEnd, AccessEndPicker, resolveAccessEnd } from './access-end';
import { folderName, normalizeFolder, roomFolders } from './access';
import { useDataRooms, type ShareRequest } from './data-rooms-context';
import { ChoiceSelect, FormField, PersonAvatar } from './parts';
import { useCommand } from './use-command';

type ShareDialogProps = {
	request: ShareRequest | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Shares one folder, and everything inside it, with chosen people for a while. */
export function ShareDialog({ request, open, onOpenChange }: ShareDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-lg">{request && open ? <ShareForm request={request} onDone={() => onOpenChange(false)} /> : null}</DialogPopup>
		</Dialog>
	);
}

/** The form; mounted fresh on every open so it starts from the request. */
function ShareForm({ request, onDone }: { request: ShareRequest; onDone: () => void }) {
	const { data, room: findRoom, person, format, viewerId } = useDataRooms();
	const command = useCommand();
	const room = findRoom(request.roomId);
	const [folder, setFolder] = React.useState(normalizeFolder(request.folder ?? '/'));
	const [chosen, setChosen] = React.useState<ReadonlySet<string>>(() => new Set(request.personId ? [request.personId] : []));
	const [query, setQuery] = React.useState('');
	const [edit, setEdit] = React.useState(false);
	const [remove, setRemove] = React.useState(false);
	const [expiry, setExpiry] = React.useState<AccessEnd>(room?.closesAt ? 'room-closes' : '30d');
	const formId = React.useId();

	if (!room) return null;
	const folders = roomFolders(data, room.id);
	const now = Date.parse(data.clock);
	const expiresAt = resolveAccessEnd(expiry, room, data.clock);

	const needle = query.trim().toLowerCase();
	const candidates = data.people
		.filter((candidate) => candidate.id !== viewerId)
		.filter((candidate) => !needle || `${candidate.name} ${candidate.email} ${candidate.company ?? ''}`.toLowerCase().includes(needle))
		.sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)) || Number(Boolean(b.guest)) - Number(Boolean(a.guest)) || a.name.localeCompare(b.name));
	const existing = data.shares.filter(
		(share) => share.roomId === room.id && share.folder === folder && (!share.expiresAt || Date.parse(share.expiresAt) > now),
	);

	const names = [...chosen].map((id) => person(id)?.name).filter((name): name is string => Boolean(name));
	const who = names.length === 0 ? 'Nobody' : names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} and ${names.length - 1} others`;
	const what = remove ? 'see, edit, and delete' : edit ? 'see and edit' : 'see';
	const until = expiresAt ? `until ${format.date(expiresAt)}` : 'with no end date';
	const summary = `${who} will ${what} ${folderName(folder, room.name)} and everything inside it ${until}.`;

	const toggle = (id: string) =>
		setChosen((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!chosen.size) return;
		if (await command.run({ type: 'create-share', roomId: room.id, folder, personIds: [...chosen], can: { view: true, edit, delete: remove }, expiresAt })) onDone();
	};


	return (
		<form id={formId} onSubmit={submit} className="flex min-h-0 flex-col">
			<DialogHeader variant="band" className="gap-1.5">
				<DialogTitle className="text-base font-medium">Share a folder</DialogTitle>
				<DialogDescription className="text-[13px]">People only see this folder and what’s inside it, not the rest of {room.name}.</DialogDescription>
			</DialogHeader>
			<div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-5">
				<FormField label="Folder" htmlFor={`${formId}-folder`}>
					<ChoiceSelect
						id={`${formId}-folder`}
						className="w-full"
						value={folder}
						onValueChange={setFolder}
						options={folders.map((path) => ({ value: path, label: path === '/' ? `${room.name} (everything)` : path.slice(1) }))}
					/>
				</FormField>

				<fieldset className="flex flex-col gap-1.5">
					<legend className="mb-1.5 text-[13px] font-medium text-foreground">
						People <span className="font-normal text-muted-foreground tabular-nums">{chosen.size ? `· ${chosen.size} selected` : ''}</span>
					</legend>
					<SearchField label="Find people" value={query} placeholder="Find people…" onChange={(event) => setQuery(event.target.value)} />
					<ul className="flex max-h-48 flex-col overflow-y-auto rounded-md border border-border">
						{candidates.map((candidate) => (
							<li key={candidate.id}>
								<label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 hover:bg-overlay-hover">
									<Checkbox checked={chosen.has(candidate.id)} onCheckedChange={() => toggle(candidate.id)} />
									<PersonAvatar person={candidate} size="sm" />
									<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{candidate.name}</span>
									<span className="truncate text-xs text-muted-foreground">{candidate.guest ? candidate.company : candidate.title}</span>
								</label>
							</li>
						))}
						{candidates.length === 0 ? <li className="px-2.5 py-2 text-[13px] text-muted-foreground">No one matches.</li> : null}
					</ul>
				</fieldset>

				<fieldset className="flex flex-col gap-1.5">
					<legend className="mb-1.5 text-[13px] font-medium text-foreground">They can</legend>
					<div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
						<label className="flex items-center gap-2 text-muted-foreground">
							<Checkbox checked disabled />
							View and download
						</label>
						<label className="flex cursor-pointer items-center gap-2 text-foreground">
							<Checkbox checked={edit} onCheckedChange={(checked) => setEdit(checked === true)} />
							Upload and edit
						</label>
						<label className="flex cursor-pointer items-center gap-2 text-foreground">
							<Checkbox checked={remove} onCheckedChange={(checked) => setRemove(checked === true)} />
							Delete
						</label>
					</div>
				</fieldset>

				<div className="flex flex-col gap-1.5">
					<span id={`${formId}-expiry`} className="text-[13px] font-medium text-foreground">
						Access ends
					</span>
					<AccessEndPicker room={room} value={expiry} onChange={setExpiry} />
				</div>

				<p aria-live="polite" className="rounded-md bg-muted/60 px-3 py-2 text-[13px] text-pretty text-foreground">
					{summary}
				</p>

				{existing.length ? (
					<div className="flex flex-col gap-1">
						<p className="text-xs text-muted-foreground">Already shared</p>
						<ul className="flex flex-col">
							{existing.map((share, index) => {
								const grantee = person(share.personId);
								return (
									<li key={share.id} className={cn('flex items-center gap-2.5 py-1.5', index > 0 && cn('border-t', dashedRule))}>
										<PersonAvatar person={grantee} size="sm" />
										<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{grantee?.name ?? 'Someone'}</span>
										<span className="text-xs text-muted-foreground tabular-nums">{share.expiresAt ? `until ${format.date(share.expiresAt)}` : 'no end date'}</span>
										<Button type="button" size="xs" variant="ghost" disabled={command.pending || command.locked} onClick={() => void command.run({ type: 'revoke-share', shareId: share.id })}>
											Revoke
										</Button>
									</li>
								);
							})}
						</ul>
					</div>
				) : null}

				{command.error ? (
					<p role="alert" className="text-[13px] text-destructive">
						{command.error}
					</p>
				) : null}
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" size="sm" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={!chosen.size || command.pending || command.locked} aria-busy={command.pending || undefined}>
					{command.pending ? 'Sharing…' : 'Share folder'}
				</Button>
			</DialogFooter>
		</form>
	);
}
