'use client';

import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { Input } from '../input';
import { Switch } from '../switch';
import { Textarea } from '../textarea';
import { enterClass, focusRingClass, staggerStyle } from '../workspace-kit/primitives';
import { dashedRule, Panel } from '../workspace-kit/surface';
import { ALL_PERMISSIONS, PERMISSION_COPY, roomPeople, unitChain } from './access';
import { useDataRooms } from './data-rooms-context';
import { ChoiceSelect, FormField } from './parts';
import type { Permission, Role, Room, RoomPolicies, RoomStatus } from './types';
import { useCommand } from './use-command';

function ErrorLine({ error }: { error: string | null }) {
	return error ? (
		<p role="alert" className="text-[13px] text-destructive">
			{error}
		</p>
	) : null;
}

const STATUS_OPTIONS: { value: RoomStatus; label: string }[] = [
	{ value: 'active', label: 'Active' },
	{ value: 'closing', label: 'Closing' },
	{ value: 'archived', label: 'Archived' },
];

function RoomDetails({ room }: { room: Room }) {
	const { run, pending: busy, error, locked } = useCommand();
	const initial = React.useMemo(
		() => ({ name: room.name, description: room.description ?? '', status: room.status, closesOn: room.closesAt?.slice(0, 10) ?? '' }),
		[room],
	);
	const [form, setForm] = React.useState(initial);
	const [source, setSource] = React.useState(initial);
	if (source !== initial) {
		setSource(initial);
		setForm(initial);
	}
	const id = React.useId();
	const dirty = form.name !== initial.name || form.description !== initial.description || form.status !== initial.status || form.closesOn !== initial.closesOn;

	const save = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!dirty || !form.name.trim()) return;
		const time = room.closesAt?.slice(10) ?? 'T17:00:00.000Z';
		await run({
			type: 'update-room',
			roomId: room.id,
			patch: {
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				status: form.status,
				closesAt: form.closesOn ? `${form.closesOn}${time}` : undefined,
			},
		});
	};

	return (
		<Panel title="Room" description="What people see in the sidebar and at the top of the room." className={enterClass}>
			<form onSubmit={save} className="flex flex-col gap-4">
				<FormField label="Name" htmlFor={`${id}-name`}>
					<Input id={`${id}-name`} value={form.name} disabled={locked} onChange={(event) => setForm({ ...form, name: event.target.value })} size="sm" />
				</FormField>
				<FormField label="Description" htmlFor={`${id}-description`}>
					<Textarea id={`${id}-description`} value={form.description} disabled={locked} rows={2} onChange={(event) => setForm({ ...form, description: event.target.value })} size="sm" />
				</FormField>
				<div className="grid gap-4 @md/view:grid-cols-2">
					<FormField label="Status" htmlFor={`${id}-status`} hint="Closing rooms show a badge; archived rooms leave the sidebar.">
						<ChoiceSelect
							id={`${id}-status`}
							value={form.status}
							disabled={locked}
							onValueChange={(next) => setForm({ ...form, status: STATUS_OPTIONS.find((option) => option.value === next)?.value ?? form.status })}
							className="w-full"
							options={STATUS_OPTIONS}
						/>
					</FormField>
					<FormField label="Closes on" htmlFor={`${id}-closes`} hint="Shown as a countdown in the room header.">
						<Input id={`${id}-closes`} type="date" value={form.closesOn} disabled={locked} onChange={(event) => setForm({ ...form, closesOn: event.target.value })} size="sm" />
					</FormField>
				</div>
				<ErrorLine error={error} />
				<div className="flex justify-end gap-2">
					<Button type="button" size="xs" variant="ghost" disabled={!dirty || busy} onClick={() => setForm(initial)}>
						Reset
					</Button>
					<Button type="submit" size="xs" disabled={!dirty || busy || locked || !form.name.trim()} aria-busy={busy || undefined}>
						{busy ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</form>
		</Panel>
	);
}

const PROTECTIONS: { key: keyof RoomPolicies; label: string; description: string }[] = [
	{ key: 'restricted', label: 'Restricted', description: 'Only people added to the room can open it. Owners and admins above it still can.' },
	{ key: 'viewOnly', label: 'View only', description: 'Documents open in the viewer but can’t be downloaded, except by room managers.' },
	{ key: 'watermark', label: 'Watermark', description: 'Every page shows the reader’s name, email, and the time.' },
	{ key: 'requireAgreement', label: 'Require agreement', description: 'People accept the room’s agreement before they can enter.' },
];

function Protection({ room }: { room: Room }) {
	const { data } = useDataRooms();
	const { run, pending: busy, error, locked } = useCommand();
	const [pending, setPending] = React.useState<keyof RoomPolicies | null>(null);
	const chain = unitChain(data, room.unitId).reverse();
	const names = chain.map((unit) => unit.name);
	const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
	const leaders = [data.inheritance.owners ? 'Owners' : null, data.inheritance.admins ? 'admins' : null].filter(Boolean) as string[];
	const lines: string[] = [];
	if (leaders.length) lines.push(`${leaders.join(' and ').replace(/^./, (char) => char.toUpperCase())} of ${list(names)} join this room automatically.`);
	if (data.inheritance.members && !room.policies.restricted) lines.push(`Members of ${list(names)} join too.`);
	else if (data.inheritance.members) lines.push('Members above it don’t join while the room is restricted.');
	if (!lines.length) lines.push('Nobody joins automatically; only people added to the room can open it.');

	const toggle = async (key: keyof RoomPolicies, value: boolean) => {
		setPending(key);
		await run({ type: 'update-room', roomId: room.id, patch: { policies: { ...room.policies, [key]: value } } });
		setPending(null);
	};

	return (
		<Panel title="Protection" description="How the room is opened, read, and shared." className={enterClass} style={staggerStyle(1)} footer={lines.join(' ')}>
			<ul className="flex flex-col">
				{PROTECTIONS.map((protection, index) => {
					const id = `protection-${room.id}-${protection.key}`;
					return (
						<li key={protection.key} className={cn('flex items-center gap-4 py-2', index > 0 && cn('border-t', dashedRule))}>
							<div className="min-w-0 flex-1">
								<label htmlFor={id} className="text-[13px] font-medium text-foreground">
									{protection.label}
								</label>
								<p id={`${id}-description`} className="text-[13px] text-pretty text-muted-foreground">
									{protection.description}
								</p>
							</div>
							<Switch
								id={id}
								aria-describedby={`${id}-description`}
								checked={room.policies[protection.key]}
								disabled={locked || (busy && pending === protection.key)}
								onCheckedChange={(checked) => toggle(protection.key, checked)}
							/>
						</li>
					);
				})}
			</ul>
			<ErrorLine error={error} />
		</Panel>
	);
}

function Agreement({ room }: { room: Room }) {
	const { data, can } = useDataRooms();
	const { run, pending: busy, error, locked } = useCommand();
	const current = room.agreement;
	const initial = React.useMemo(() => ({ title: current?.title ?? 'Confidentiality agreement', body: current?.body ?? '' }), [current]);
	const [form, setForm] = React.useState(initial);
	const [source, setSource] = React.useState(initial);
	if (source !== initial) {
		setSource(initial);
		setForm(initial);
	}
	const id = React.useId();
	const version = current?.version ?? 0;
	const dirty = form.title !== initial.title || form.body !== initial.body;

	const readers = roomPeople(data, room.id).filter(
		({ person, access }) => access.level !== 'none' && !can('manage_room', { kind: 'room', roomId: room.id }, person.id),
	);
	const accepted = readers.filter(({ person }) =>
		data.acceptances.some((acceptance) => acceptance.roomId === room.id && acceptance.personId === person.id && acceptance.version >= version),
	).length;

	const save = (nextVersion: number) =>
		run({
			type: 'update-room',
			roomId: room.id,
			patch: { agreement: { title: form.title.trim() || 'Agreement', body: form.body, version: nextVersion, updatedAt: data.clock } },
		});

	return (
		<Panel
			title="Agreement"
			description={
				version ? (
					<span className="tabular-nums">
						Version {version} · {accepted} of {readers.length} {readers.length === 1 ? 'person has' : 'people have'} accepted it
					</span>
				) : (
					'Write the terms people accept before entering.'
				)
			}
			className={enterClass}
			style={staggerStyle(2)}
		>
			<div className="flex flex-col gap-4">
				<FormField label="Title" htmlFor={`${id}-title`}>
					<Input id={`${id}-title`} value={form.title} disabled={locked} onChange={(event) => setForm({ ...form, title: event.target.value })} size="sm" />
				</FormField>
				<FormField label="Terms" htmlFor={`${id}-body`} hint="Blank lines start new paragraphs.">
					<Textarea id={`${id}-body`} value={form.body} disabled={locked} rows={8} onChange={(event) => setForm({ ...form, body: event.target.value })} size="sm" />
				</FormField>
				<ErrorLine error={error} />
				<div className="flex flex-wrap justify-end gap-2">
					{version ? (
						<Button size="xs" variant="outline" disabled={!dirty || busy || locked} onClick={() => save(version)}>
							Save
						</Button>
					) : null}
					<Button size="xs" disabled={(!dirty && version > 0) || busy || locked || !form.body.trim()} aria-busy={busy || undefined} onClick={() => save(version + 1)}>
						{version ? 'Save and ask everyone again' : 'Save agreement'}
					</Button>
				</div>
			</div>
		</Panel>
	);
}

function RoleEditor({ role }: { role: Role }) {
	const { run, pending: busy, error, locked } = useCommand();
	const [expanded, setExpanded] = React.useState(false);
	const [advanced, setAdvanced] = React.useState(false);
	const [draft, setDraft] = React.useState(role);
	const [source, setSource] = React.useState(role);
	if (source !== role) {
		setSource(role);
		setDraft(role);
	}
	const id = React.useId();
	const dirty =
		draft.name !== role.name ||
		(draft.description ?? '') !== (role.description ?? '') ||
		draft.permissions.length !== role.permissions.length ||
		draft.permissions.some((permission) => !role.permissions.includes(permission));

	const toggle = (permission: Permission, on: boolean) =>
		setDraft((current) => ({
			...current,
			permissions: on ? ALL_PERMISSIONS.filter((candidate) => candidate === permission || current.permissions.includes(candidate)) : current.permissions.filter((candidate) => candidate !== permission),
		}));

	return (
		<li className="py-1">
			<button
				type="button"
				aria-expanded={expanded}
				aria-controls={`${id}-panel`}
				onClick={() => setExpanded((value) => !value)}
				className={cn('-mx-1.5 flex w-[calc(100%+0.75rem)] cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-overlay-hover', focusRingClass)}
			>
				<ChevronRight
					aria-hidden="true"
					className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) motion-reduce:transition-none', expanded && 'rotate-90')}
				/>
				<span className="min-w-0 flex-1">
					<span className="text-[13px] font-medium text-foreground">{role.name}</span>
					{role.isDefault ? <span className="ml-1.5 text-xs text-muted-foreground">Default</span> : null}
					{role.description ? <span className="block truncate text-[13px] text-muted-foreground">{role.description}</span> : null}
				</span>
				<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
					{role.permissions.length} of {ALL_PERMISSIONS.length}
				</span>
			</button>
			{expanded ? (
				<div id={`${id}-panel`} className="flex flex-col gap-3 pt-2 pb-3 pl-6">
					<div className="grid gap-3 @md/view:grid-cols-2">
						<FormField label="Name" htmlFor={`${id}-name`}>
							<Input id={`${id}-name`} value={draft.name} disabled={locked} onChange={(event) => setDraft({ ...draft, name: event.target.value })} size="sm" />
						</FormField>
						<FormField label="Description" htmlFor={`${id}-description`}>
							<Input id={`${id}-description`} value={draft.description ?? ''} disabled={locked} onChange={(event) => setDraft({ ...draft, description: event.target.value })} size="sm" />
						</FormField>
					</div>
					<button
						type="button"
						aria-expanded={advanced}
						onClick={() => setAdvanced((value) => !value)}
						className={cn('flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground', focusRingClass)}
					>
						<ChevronRight aria-hidden="true" className={cn('size-3 transition-transform duration-(--duration-fast) motion-reduce:transition-none', advanced && 'rotate-90')} />
						Advanced: permissions
					</button>
					{advanced ? (
						<fieldset className="grid gap-x-4 gap-y-2.5 rounded-lg border border-border bg-muted/30 p-3 @md/view:grid-cols-2">
							<legend className="sr-only">Permissions for {role.name}</legend>
							{ALL_PERMISSIONS.map((permission) => {
								const checkboxId = `${id}-${permission}`;
								return (
									<label key={permission} htmlFor={checkboxId} className="flex cursor-pointer items-start gap-2.5">
										<Checkbox
											id={checkboxId}
											checked={draft.permissions.includes(permission)}
											disabled={locked}
											onCheckedChange={(checked) => toggle(permission, checked === true)}
											className="mt-0.5"
										/>
										<span className="min-w-0">
											<span className="block text-[13px] text-foreground">{PERMISSION_COPY[permission].label}</span>
											<span className="block text-xs text-muted-foreground">{PERMISSION_COPY[permission].description}</span>
										</span>
									</label>
								);
							})}
						</fieldset>
					) : null}
					<ErrorLine error={error} />
					<div className="flex justify-end gap-2">
						<Button size="xs" variant="ghost" disabled={!dirty || busy} onClick={() => setDraft(role)}>
							Reset
						</Button>
						<Button
							size="xs"
							disabled={!dirty || busy || locked || !draft.name.trim()}
							aria-busy={busy || undefined}
							onClick={() => run({ type: 'save-role', role: { ...draft, name: draft.name.trim() } })}
						>
							Save role
						</Button>
					</div>
				</div>
			) : null}
		</li>
	);
}

function Roles() {
	const { data } = useDataRooms();
	return (
		<Panel
			title="Roles"
			description={`Shared by every room in ${data.org.name}. Changing a role changes it everywhere it is used.`}
			className={enterClass}
			style={staggerStyle(3)}
		>
			<ul className="flex flex-col">
				{data.roles.map((role) => (
					<RoleEditor key={role.id} role={role} />
				))}
			</ul>
		</Panel>
	);
}

/**
 * Room settings for people who manage it: details, protection, the
 * agreement, and the organization's roles. Locked while previewing.
 */
export function SettingsTab({ room }: { room: Room }) {
	const { locked } = useCommand();
	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 @3xl/view:px-6">
				{locked ? <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">Settings are read-only while previewing.</p> : null}
				<RoomDetails room={room} />
				<Protection room={room} />
				{room.policies.requireAgreement ? <Agreement room={room} /> : null}
				<Roles />
			</div>
		</div>
	);
}
