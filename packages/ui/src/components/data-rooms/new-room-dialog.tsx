'use client';

import { Info } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../dialog';
import { Input } from '../input';
import { Switch } from '../switch';
import { Textarea } from '../textarea';
import { dashedRule } from '../workspace-kit/surface';
import { leadsUnit, unitChain } from './access';
import { useDataRooms } from './data-rooms-context';
import { ChoiceSelect, FormField } from './parts';
import type { DataRoomsData, Room, RoomPolicies } from './types';
import { useCommand } from './use-command';

type NewRoomDialogProps = { unitId?: string; open: boolean; onOpenChange: (open: boolean) => void };

const POLICY_ROWS: { key: keyof RoomPolicies; label: string; description: string }[] = [
	{ key: 'restricted', label: 'Restricted', description: 'Only people you add, plus owners and admins above it, can open the room.' },
	{ key: 'viewOnly', label: 'View only', description: 'Documents open in the viewer but can’t be downloaded.' },
	{ key: 'watermark', label: 'Watermark', description: 'Every page shows the reader’s name, email, and the time.' },
	{ key: 'requireAgreement', label: 'Require agreement', description: 'People accept your terms before they can enter.' },
];

const DEFAULT_AGREEMENT =
	'You are receiving confidential information for the sole purpose of evaluating this opportunity. Keep everything in this room confidential, share it only with advisors bound by the same terms, and do not copy or forward it.';

function list(names: string[]) {
	return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Who joins a new room on their own, in plain words. */
function joinNote(data: DataRoomsData, unitId: string, restricted: boolean) {
	const chain = unitChain(data, unitId);
	const names = list(chain.map((unit) => unit.name));
	const nearest = chain[0]?.name ?? 'the unit';
	const { owners, admins, members } = data.inheritance;
	const lines: string[] = [];
	if (owners && admins) lines.push(`Owners and admins of ${names} join automatically.`);
	else if (owners) lines.push(`Owners of ${names} join automatically.`);
	else if (admins) lines.push(`Admins of ${names} join automatically.`);
	else lines.push('Nobody joins automatically; invite everyone who needs access.');
	if (!members) lines.push('Members don’t join on their own.');
	else if (restricted) lines.push(`Members of ${nearest} won’t, because the room is restricted.`);
	else lines.push(`Members of ${nearest} join with their usual role.`);
	lines.push('You’ll own the room.');
	return lines.join(' ');
}

function NewRoomForm({ unitId: initialUnit, onDone }: { unitId?: string; onDone: () => void }) {
	const { data, viewerId, openRoom } = useDataRooms();
	const command = useCommand();
	// Rooms can be created in any unit the person leads, held there or carried down from above.
	const units = React.useMemo(() => data.units.filter((unit) => leadsUnit(data, viewerId, unit.id)), [data, viewerId]);
	const [unitId, setUnitId] = React.useState(() => (initialUnit && units.some((unit) => unit.id === initialUnit) ? initialUnit : (units[0]?.id ?? '')));
	const [name, setName] = React.useState('');
	const [description, setDescription] = React.useState('');
	const [closesOn, setClosesOn] = React.useState('');
	const [policies, setPolicies] = React.useState<RoomPolicies>({ restricted: true, viewOnly: false, watermark: true, requireAgreement: false });
	const [agreementTitle, setAgreementTitle] = React.useState('Confidentiality agreement');
	const [agreementBody, setAgreementBody] = React.useState(DEFAULT_AGREEMENT);
	const [invalid, setInvalid] = React.useState<string | null>(null);
	const error = invalid ?? command.error;
	const busy = command.pending;
	const id = React.useId();

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!name.trim()) return setInvalid('Give the room a name.');
		if (!unitId) return setInvalid('Choose who owns the room.');
		setInvalid(null);
		const room: Room = {
			id: `local-room-${Date.now().toString(36)}`,
			unitId,
			name: name.trim(),
			description: description.trim() || undefined,
			status: 'active',
			createdAt: data.clock,
			createdBy: viewerId,
			closesAt: closesOn ? new Date(`${closesOn}T17:00:00.000Z`).toISOString() : undefined,
			policies,
			agreement: policies.requireAgreement ? { title: agreementTitle.trim() || 'Agreement', body: agreementBody.trim(), version: 1, updatedAt: data.clock } : undefined,
		};
		if (await command.run({ type: 'create-room', room })) {
			openRoom(room.id, 'documents');
			onDone();
		}
	};

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
			<DialogHeader variant="band" className="gap-1">
				<DialogTitle className="text-base font-medium">New room</DialogTitle>
				<DialogDescription className="text-[13px]">A private space for documents, people, and questions.</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-4">
				<FormField label="Name" htmlFor={`${id}-name`}>
					<Input id={`${id}-name`} value={name} placeholder="Project Halcyon" autoFocus onChange={(event) => setName(event.target.value)} aria-invalid={invalid === 'Give the room a name.' || undefined} />
				</FormField>
				<div className="grid gap-4 sm:grid-cols-2">
					<FormField label="Owned by" htmlFor={`${id}-unit`}>
						<ChoiceSelect
							id={`${id}-unit`}
							value={unitId}
							onValueChange={setUnitId}
							className="w-full"
							options={units.map((unit) => ({ value: unit.id, label: `${unit.name} · ${unit.kind}` }))}
						/>
					</FormField>
					<FormField label="Closes" htmlFor={`${id}-closes`} hint="Optional. Shown as a deadline.">
						<Input id={`${id}-closes`} type="date" value={closesOn} onChange={(event) => setClosesOn(event.target.value)} />
					</FormField>
				</div>
				<FormField label="Description" htmlFor={`${id}-description`}>
					<Textarea id={`${id}-description`} value={description} rows={2} placeholder="What the room is for" onChange={(event) => setDescription(event.target.value)} />
				</FormField>

				<fieldset className="flex flex-col">
					<legend className="mb-1 text-[13px] font-medium text-foreground">Protection</legend>
					{POLICY_ROWS.map((row, index) => {
						const switchId = `${id}-${row.key}`;
						return (
							<div key={row.key} className={cn('flex items-start gap-3 py-2', index > 0 && cn('border-t', dashedRule))}>
								<div className="min-w-0 flex-1">
									<label htmlFor={switchId} className="text-[13px] text-foreground">
										{row.label}
									</label>
									<p className="text-pretty text-xs text-muted-foreground">{row.description}</p>
								</div>
								<Switch
									id={switchId}
									className="-my-2.5 -mr-1.5"
									checked={policies[row.key]}
									onCheckedChange={(checked) => setPolicies((current) => ({ ...current, [row.key]: checked }))}
								/>
							</div>
						);
					})}
				</fieldset>

				{policies.requireAgreement ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
						<FormField label="Agreement title" htmlFor={`${id}-agreement-title`}>
							<Input id={`${id}-agreement-title`} value={agreementTitle} onChange={(event) => setAgreementTitle(event.target.value)} />
						</FormField>
						<FormField label="Terms" htmlFor={`${id}-agreement-body`}>
							<Textarea id={`${id}-agreement-body`} value={agreementBody} rows={4} onChange={(event) => setAgreementBody(event.target.value)} />
						</FormField>
					</div>
				) : null}

				{unitId ? (
					<p aria-live="polite" className="flex gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground">
						<Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
						<span className="text-pretty">{joinNote(data, unitId, policies.restricted)}</span>
					</p>
				) : null}

				{error ? (
					<p role="alert" className="text-[13px] text-destructive">
						{error}
					</p>
				) : null}
			</DialogPanel>
			<DialogFooter>
				<Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={busy || command.locked || units.length === 0} aria-busy={busy || undefined}>
					{busy ? 'Creating…' : 'Create room'}
				</Button>
			</DialogFooter>
		</form>
	);
}

/** Creates a room under a unit, with its protection and agreement, and opens it. */
export function NewRoomDialog({ unitId, open, onOpenChange }: NewRoomDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-lg">{open ? <NewRoomForm unitId={unitId} onDone={() => onOpenChange(false)} /> : null}</DialogPopup>
		</Dialog>
	);
}
