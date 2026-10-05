'use client';

import { Info, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Textarea } from '../textarea';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { focusRingClass } from '../workspace-kit/primitives';
import { type AccessEnd, AccessEndPicker, resolveAccessEnd } from './access-end';
import { roomPeople } from './access';
import { useDataRooms } from './data-rooms-context';
import { isEmail } from './format';
import { ChoiceSelect, PersonAvatar } from './parts';
import type { Person, Room } from './types';
import { useCommand } from './use-command';

type InviteDialogProps = {
	roomId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type Token = { email: string; person?: Person };

/** Splits pasted or typed text into candidate emails. */
function splitEmails(text: string) {
	return text
		.split(/[\s,;]+/)
		.map((part) => part.trim())
		.filter(Boolean);
}

/**
 * Invite people to a room by email: org members join right away, everyone
 * else joins as a guest who only sees this room. Pick the role and,
 * optionally, when their access ends.
 */
export function InviteDialog({ roomId, open, onOpenChange }: InviteDialogProps) {
	const { room } = useDataRooms();
	const target = roomId ? room(roomId) : undefined;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{target ? (
				<DialogPopup className="max-w-md">
					{/* Keyed by the room and remounted on open, so every visit starts empty. */}
					{open ? <InviteForm key={target.id} room={target} onDone={() => onOpenChange(false)} /> : null}
				</DialogPopup>
			) : null}
		</Dialog>
	);
}

function InviteForm({ room, onDone }: { room: Room; onDone: () => void }) {
	const { data, format } = useDataRooms();
	const command = useCommand();
	const defaultRole = data.roles.find((role) => role.isDefault) ?? data.roles[0];
	const [tokens, setTokens] = React.useState<Token[]>([]);
	const [draft, setDraft] = React.useState('');
	const [roleId, setRoleId] = React.useState(defaultRole?.id ?? '');
	const [ending, setEnding] = React.useState<AccessEnd>('never');
	const [message, setMessage] = React.useState('');
	/** Problems with what was typed, before anything is sent. */
	const [notice, setNotice] = React.useState<string | null>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const listId = React.useId();
	const roleHelpId = React.useId();

	const inRoom = React.useMemo(() => new Set(roomPeople(data, room.id).map((entry) => entry.person.id)), [data, room.id]);
	const role = data.roles.find((candidate) => candidate.id === roleId);
	const guests = tokens.filter((token) => !token.person || token.person.guest);
	const guestsBlocked = guests.length > 0 && !data.inheritance.allowGuests;

	const suggestions = React.useMemo(() => {
		const needle = draft.trim().toLowerCase();
		if (!needle) return [];
		return data.people
			.filter((person) => !inRoom.has(person.id) && !tokens.some((token) => token.person?.id === person.id))
			.filter((person) => person.name.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle))
			.slice(0, 5);
	}, [data.people, draft, inRoom, tokens]);

	const add = (values: string[]) => {
		const invalid = values.filter((value) => !isEmail(value));
		const fresh: Token[] = [];
		for (const value of values.filter(isEmail)) {
			const email = value.toLowerCase();
			if (tokens.some((token) => token.email === email) || fresh.some((token) => token.email === email)) continue;
			fresh.push({ email, person: data.people.find((person) => person.email.toLowerCase() === email) });
		}
		if (fresh.length) setTokens((current) => [...current, ...fresh.filter((token) => !current.some((candidate) => candidate.email === token.email))]);
		setNotice(invalid.length ? `${invalid.join(', ')} ${invalid.length === 1 ? 'isn’t' : 'aren’t'} a valid email.` : null);
		command.clearError();
	};

	const commitDraft = () => {
		if (!draft.trim()) return;
		add(splitEmails(draft));
		setDraft('');
	};

	const pick = (person: Person) => {
		setTokens((current) => [...current, { email: person.email.toLowerCase(), person }]);
		setDraft('');
		inputRef.current?.focus();
	};

	const expiresAt = resolveAccessEnd(ending, room, data.clock);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const pending = draft.trim() ? splitEmails(draft).filter(isEmail) : [];
		const all = [...tokens, ...pending.filter((email) => !tokens.some((token) => token.email === email.toLowerCase())).map((email) => ({ email: email.toLowerCase(), person: data.people.find((person) => person.email.toLowerCase() === email.toLowerCase()) }))];
		if (!all.length) {
			setNotice('Add at least one email.');
			inputRef.current?.focus();
			return;
		}
		if (guestsBlocked) return;
		setNotice(null);
		const sent = await command.run({
			type: 'invite',
			roomId: room.id,
			invites: all.map((token) => ({ email: token.email, personId: token.person?.id })),
			roleId,
			expiresAt,
			message: message.trim() || undefined,
		});
		if (sent) onDone();
	};

	const error = notice ?? command.error;

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
			<DialogHeader variant="band" className="gap-1.5">
				<DialogTitle className="text-base font-medium">Invite to {room.name}</DialogTitle>
				<DialogDescription className="text-[13px]">People from {data.org.name} join right away. Everyone else joins as a guest.</DialogDescription>
			</DialogHeader>
			<div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-5">
				<div className="flex flex-col gap-1.5">
					<label htmlFor={`${listId}-input`} className="text-[13px] font-medium text-foreground">
						Emails
					</label>
					<div
						className={cn(
							'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-card px-1.5 py-1 shadow-2xs focus-within:ring-[3px] focus-within:ring-ring/50',
						)}
						onClick={() => inputRef.current?.focus()}
					>
						{tokens.map((token) => (
							<span
								key={token.email}
								className={cn(
									'inline-flex h-6 max-w-full items-center gap-1 rounded-[6px] border pr-0.5 pl-1 text-xs',
									token.person && !token.person.guest ? 'border-border bg-muted/60 text-foreground' : 'border-dashed border-foreground/30 text-foreground',
								)}
							>
								{token.person ? <PersonAvatar person={token.person} size="xs" className="size-4 text-[8px]" /> : null}
								<span className="truncate">{token.person?.name ?? token.email}</span>
								{!token.person || token.person.guest ? <span className="text-[10px] text-muted-foreground">Guest</span> : null}
								<button
									type="button"
									aria-label={`Remove ${token.email}`}
									onClick={(event) => {
										event.stopPropagation();
										setTokens((current) => current.filter((candidate) => candidate.email !== token.email));
									}}
									className={cn('grid size-4 cursor-pointer place-items-center rounded-[4px] text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
								>
									<X aria-hidden="true" className="size-3" />
								</button>
							</span>
						))}
						<input
							ref={inputRef}
							id={`${listId}-input`}
							type="text"
							inputMode="email"
							autoComplete="off"
							role="combobox"
							aria-expanded={suggestions.length > 0}
							aria-controls={listId}
							aria-autocomplete="list"
							value={draft}
							placeholder={tokens.length ? '' : 'name@company.com'}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ',' || event.key === ' ' || event.key === 'Tab') {
									if (!draft.trim()) return;
									const [only] = suggestions;
									if (event.key === 'Enter' && suggestions.length === 1 && only && !isEmail(draft)) {
										event.preventDefault();
										pick(only);
										return;
									}
									if (event.key !== 'Tab') event.preventDefault();
									commitDraft();
								} else if (event.key === 'Backspace' && !draft && tokens.length) {
									setTokens((current) => current.slice(0, -1));
								}
							}}
							onPaste={(event) => {
								const text = event.clipboardData.getData('text');
								if (!/[\s,;]/.test(text)) return;
								event.preventDefault();
								add(splitEmails(text));
							}}
							onBlur={commitDraft}
							className="h-6 min-w-32 flex-1 bg-transparent px-1 text-[13px] text-foreground outline-none placeholder:text-subtle-foreground pointer-coarse:text-base"
						/>
					</div>
					{suggestions.length ? (
						<ul id={listId} role="listbox" aria-label="People in the organization" className="flex flex-col rounded-md border border-border bg-card p-1 shadow-card">
							{suggestions.map((person) => (
								<li key={person.id} role="option" aria-selected={false}>
									<button
										type="button"
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => pick(person)}
										className={cn('flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 py-1.5 text-left hover:bg-overlay-hover', focusRingClass)}
									>
										<PersonAvatar person={person} size="sm" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[13px] text-foreground">{person.name}</span>
											<span className="block truncate text-xs text-muted-foreground">{person.email}</span>
										</span>
										{person.guest ? <span className="text-xs text-muted-foreground">Guest</span> : null}
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>

				{guests.length ? (
					guestsBlocked ? (
						<p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
							<TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
							{data.org.name} doesn’t allow guests from outside the organization. Remove {guests.length === 1 ? 'that email' : 'those emails'} or ask an
							organization admin.
						</p>
					) : (
						<p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">
							<Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
							<span>
								<span className="text-foreground tabular-nums">{guests.length}</span> {guests.length === 1 ? 'person' : 'people'} outside {data.org.name} will join as
								{guests.length === 1 ? ' a guest' : ' guests'}. They only see this room.
							</span>
						</p>
					)
				) : null}

				<div className="flex flex-col gap-1.5">
					<label htmlFor={`${listId}-role`} className="text-[13px] font-medium text-foreground">
						Role
					</label>
					<ChoiceSelect
						id={`${listId}-role`}
						describedBy={roleHelpId}
						className="w-full"
						value={roleId}
						onValueChange={setRoleId}
						options={data.roles.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
					/>
					<p id={roleHelpId} className="text-xs text-muted-foreground">
						{role?.description ?? ''}
					</p>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-[13px] font-medium text-foreground">Access ends</span>
					<AccessEndPicker room={room} value={ending} onChange={setEnding} />
					{expiresAt ? <p className="text-xs text-muted-foreground tabular-nums">On {format.date(expiresAt)}</p> : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor={`${listId}-message`} className="text-[13px] font-medium text-foreground">
						Message <span className="font-normal text-muted-foreground">(optional)</span>
					</label>
					<Textarea
						id={`${listId}-message`}
						size="sm"
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="Add a note to the invite"
						className="text-[13px]"
					/>
				</div>

				{error ? (
					<p role="alert" className="text-[13px] text-destructive">
						{error}
					</p>
				) : null}
			</div>
			<DialogFooter>
				<Button type="button" size="sm" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={command.pending || command.locked || guestsBlocked} aria-busy={command.pending || undefined}>
					{command.pending ? 'Sending…' : tokens.length > 1 ? `Invite ${tokens.length} people` : 'Send invite'}
				</Button>
			</DialogFooter>
		</form>
	);
}
