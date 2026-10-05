'use client';

import { Building2, Droplets, Eye, FileSignature, Lock, type LucideIcon, Network, Users } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Switch } from '../switch';
import {
	CANVAS_NODE_ATTRIBUTE,
	CanvasSurface,
	CanvasWire,
	CanvasZoomControls,
	NodeIconTile,
	NodeShell,
	useCanvasViewport,
	type WirePoint,
	type WireTone,
} from '../workspace-kit/canvas';
import { focusRingClass, ToneBadge, ViewHeader } from '../workspace-kit/primitives';
import { dashedRule, Panel } from '../workspace-kit/surface';
import { type EffectiveAccess, effectiveAccess, leadsUnit, roomPeople, rootUnit } from './access';
import { useDataRooms } from './data-rooms-context';
import { ChoiceSelect, LEVEL_PRESENTATION } from './parts';
import type { InheritancePolicy, OrgUnit, Room } from './types';
import { useCommand } from './use-command';

const COLUMN_WIDTH = 240;
const COLUMN_GAP = 32;
const UNIT_HEIGHT = 96;
const ROOM_HEIGHT = 148;
const ROW_GAP = 64;

type UnitBox = { unit: OrgUnit; x: number; y: number; depth: number };
type RoomBox = { room: Room; x: number; y: number };
type Wire = { id: string; start: WirePoint; end: WirePoint; to: { kind: 'unit' | 'room'; id: string } };

/**
 * Deterministic top-down tree: each unit sits centred over its children, which
 * are its sub-units first and then the rooms it owns, side by side. Rows share
 * one height so wires run straight down between levels.
 */
function useLayout() {
	const { data } = useDataRooms();
	return React.useMemo(() => {
		const root = rootUnit(data);
		const rooms = data.rooms.filter((room) => room.status !== 'archived');
		const rowHeight = Math.max(UNIT_HEIGHT, ROOM_HEIGHT) + ROW_GAP;
		type TreeNode = { kind: 'unit'; unit: OrgUnit; children: TreeNode[] } | { kind: 'room'; room: Room };
		const build = (unit: OrgUnit, seen: Set<string>): TreeNode => {
			seen.add(unit.id);
			const subUnits = data.units.filter((candidate) => candidate.parentId === unit.id && !seen.has(candidate.id));
			return {
				kind: 'unit',
				unit,
				children: [
					...subUnits.map((child) => build(child, seen)),
					...rooms.filter((room) => room.unitId === unit.id).map((room) => ({ kind: 'room' as const, room })),
				],
			};
		};
		if (!root) return { units: [] as UnitBox[], rooms: [] as RoomBox[], wires: [] as Wire[], width: COLUMN_WIDTH, height: UNIT_HEIGHT };
		const tree = build(root, new Set());
		const widths = new Map<TreeNode, number>();
		const measure = (node: TreeNode): number => {
			const width =
				node.kind === 'room' || node.children.length === 0
					? COLUMN_WIDTH
					: Math.max(COLUMN_WIDTH, node.children.reduce((sum, child) => sum + measure(child), 0) + COLUMN_GAP * (node.children.length - 1));
			widths.set(node, width);
			return width;
		};
		const width = measure(tree);

		const units: UnitBox[] = [];
		const roomBoxes: RoomBox[] = [];
		const wires: Wire[] = [];
		const place = (node: TreeNode, left: number, depth: number, parentAnchor?: WirePoint) => {
			const x = left + ((widths.get(node) ?? COLUMN_WIDTH) - COLUMN_WIDTH) / 2;
			const y = depth * rowHeight;
			const top: WirePoint = [x + COLUMN_WIDTH / 2, y];
			if (node.kind === 'room') {
				roomBoxes.push({ room: node.room, x, y });
				if (parentAnchor) wires.push({ id: `room-${node.room.id}`, start: parentAnchor, end: top, to: { kind: 'room', id: node.room.id } });
				return;
			}
			units.push({ unit: node.unit, x, y, depth });
			if (parentAnchor) wires.push({ id: `unit-${node.unit.id}`, start: parentAnchor, end: top, to: { kind: 'unit', id: node.unit.id } });
			const anchor: WirePoint = [x + COLUMN_WIDTH / 2, y + UNIT_HEIGHT];
			const childrenWidth = node.children.reduce((sum, child) => sum + (widths.get(child) ?? COLUMN_WIDTH), 0) + COLUMN_GAP * Math.max(0, node.children.length - 1);
			let cursor = left + ((widths.get(node) ?? COLUMN_WIDTH) - childrenWidth) / 2;
			for (const child of node.children) {
				place(child, cursor, depth + 1, anchor);
				cursor += (widths.get(child) ?? COLUMN_WIDTH) + COLUMN_GAP;
			}
		};
		place(tree, 0, 0);
		const height = Math.max(UNIT_HEIGHT, ...roomBoxes.map((box) => box.y + ROOM_HEIGHT), ...units.map((box) => box.y + UNIT_HEIGHT));
		return { units, rooms: roomBoxes, wires, width, height };
	}, [data]);
}

/** Inherited membership on a node means its wire carries access down. */
function carried(access: EffectiveAccess | undefined) {
	return Boolean(access?.grants.some((grant) => grant.kind === 'membership' && grant.inherited));
}

function NodeBadge({ access }: { access: EffectiveAccess | undefined }) {
	if (!access) return null;
	if (access.level === 'none') {
		const ruledOut = access.ignored.find((entry) => entry.reason === 'restricted' || entry.reason === 'not-inherited' || entry.reason === 'expired');
		if (!ruledOut) return null;
		const note =
			ruledOut.reason === 'restricted' ? 'Not carried in: restricted room' : ruledOut.reason === 'expired' ? 'Access expired' : 'Not carried in by the organization';
		return <span className="text-[11px] text-muted-foreground">{note}</span>;
	}
	const presentation = LEVEL_PRESENTATION[access.level];
	const inherited = carried(access);
	return (
		<span className="flex items-center gap-1.5">
			<ToneBadge tone={presentation.tone}>{presentation.label}</ToneBadge>
			{inherited ? <span className="text-[11px] text-muted-foreground">inherited</span> : null}
		</span>
	);
}

const POLICY_ICONS: { key: keyof Room['policies']; label: string; icon: LucideIcon }[] = [
	{ key: 'restricted', label: 'Restricted', icon: Lock },
	{ key: 'viewOnly', label: 'View only', icon: Eye },
	{ key: 'watermark', label: 'Watermark', icon: Droplets },
	{ key: 'requireAgreement', label: 'Agreement required', icon: FileSignature },
];

function UnitNode({ box, access, dimmed }: { box: UnitBox; access?: EffectiveAccess; dimmed: boolean }) {
	const { data } = useDataRooms();
	const members = data.memberships.filter((membership) => membership.scope.kind === 'unit' && membership.scope.id === box.unit.id && membership.status === 'active');
	const admins = members.filter((membership) => membership.owner || membership.admin).length;
	return (
		<NodeShell
			{...{ [CANVAS_NODE_ATTRIBUTE]: '' }}
			selected={Boolean(access && access.level !== 'none')}
			className={cn('absolute transition-opacity duration-(--duration-moderate) motion-reduce:transition-none', dimmed && 'opacity-40')}
			style={{ left: box.x, top: box.y, width: COLUMN_WIDTH, height: UNIT_HEIGHT }}
			cardClassName="flex-1"
			innerClassName="flex flex-col gap-1.5 p-3"
		>
			<div className="flex items-center gap-2">
				<NodeIconTile icon={box.depth === 0 ? Building2 : Users} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-[13px] font-medium text-foreground">{box.unit.name}</p>
					<p className="truncate text-[11px] text-muted-foreground">{box.unit.kind}</p>
				</div>
			</div>
			<div className="mt-auto flex items-center justify-between gap-2">
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{members.length} members · {admins} {admins === 1 ? 'admin' : 'admins'}
				</span>
				<NodeBadge access={access} />
			</div>
		</NodeShell>
	);
}

function RoomNode({ box, access, dimmed }: { box: RoomBox; access?: EffectiveAccess; dimmed: boolean }) {
	const { data, openRoom } = useDataRooms();
	const { room } = box;
	const people = roomPeople(data, room.id).filter((row) => row.access.grants.length > 0);
	const guests = people.filter((row) => row.person.guest).length;
	const documents = data.documents.filter((document) => document.roomId === room.id).length;
	const shareOnly = access?.level === 'share';
	return (
		<NodeShell
			{...{ [CANVAS_NODE_ATTRIBUTE]: '' }}
			selected={Boolean(access && access.level !== 'none')}
			className={cn('absolute transition-opacity duration-(--duration-moderate) motion-reduce:transition-none', dimmed && 'opacity-40')}
			style={{ left: box.x, top: box.y, width: COLUMN_WIDTH, height: ROOM_HEIGHT }}
			cardClassName="flex-1"
		>
			<button
				type="button"
				onClick={() => openRoom(room.id)}
				aria-label={`Open ${room.name}`}
				className={cn('flex size-full cursor-pointer flex-col gap-1.5 p-3 text-left hover:bg-overlay-hover', focusRingClass)}
			>
				<span className="flex items-start gap-2">
					<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{room.name}</span>
					<span className="flex shrink-0 gap-1 text-muted-foreground">
						{POLICY_ICONS.filter((policy) => room.policies[policy.key]).map((policy) => (
							<policy.icon key={policy.key} aria-label={policy.label} className="size-3" />
						))}
					</span>
				</span>
				<span className="line-clamp-2 text-[11px] text-muted-foreground">{room.description}</span>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{people.length} people · {guests} {guests === 1 ? 'guest' : 'guests'} · {documents} docs
				</span>
				<span className="mt-auto flex min-h-5 items-center">
					{shareOnly ? <ToneBadge tone="info">Folder access</ToneBadge> : <NodeBadge access={access} />}
				</span>
			</button>
		</NodeShell>
	);
}

const INHERITANCE_ROWS: { key: keyof InheritancePolicy; label: string; description: string }[] = [
	{ key: 'owners', label: 'Owners carry down', description: 'Owners of a unit can open every sub-unit and room below it.' },
	{ key: 'admins', label: 'Admins carry down', description: 'Admins of a unit can open and manage every sub-unit and room below it.' },
	{ key: 'members', label: 'Members carry down', description: 'Members join open rooms below their unit with their role. Restricted rooms still need an invite.' },
	{ key: 'allowGuests', label: 'Allow guests', description: 'People from outside the organization can be invited to rooms and folders.' },
];

function InheritancePanel() {
	const { data, actingId } = useDataRooms();
	const { run, pending, error, locked } = useCommand();
	const root = rootUnit(data);
	const leads = root ? leadsUnit(data, actingId, root.id) : false;
	const disabled = locked || !leads;

	return (
		<Panel
			title="Inheritance"
			description={
				disabled
					? locked
						? 'Exit the preview to change how access carries down.'
						: `Only owners and admins of ${root?.name ?? 'the organization'} can change this.`
					: 'How access carries from a unit into the sub-units and rooms below it.'
			}
			footer={
				<ul className="flex flex-col gap-1.5">
					<li className="flex items-center gap-2">
						<svg aria-hidden="true" width="28" height="8" className="shrink-0">
							<path d="M0 4 H28" stroke="color-mix(in oklab, var(--primary) 55%, transparent)" strokeDasharray="4 4" />
						</svg>
						Access carried down to the selected person
					</li>
					<li className="flex items-center gap-2">
						<svg aria-hidden="true" width="28" height="8" className="shrink-0">
							<path d="M0 4 H28" stroke="color-mix(in oklab, var(--foreground) 20%, transparent)" />
						</svg>
						Belongs to
					</li>
					<li className="flex items-center gap-2">
						<ToneBadge tone="info">Folder access</ToneBadge>
						Only shared folders in the room
					</li>
				</ul>
			}
		>
			<ul className="flex flex-col">
				{INHERITANCE_ROWS.map((row, index) => {
					const id = `inheritance-${row.key}`;
					return (
						<li key={row.key} className={cn('flex items-start gap-3 py-2', index > 0 && cn('border-t', dashedRule))}>
							<div className="min-w-0 flex-1">
								<label htmlFor={id} className="text-[13px] font-medium text-foreground">
									{row.label}
								</label>
								<p className="text-pretty text-xs text-muted-foreground">{row.description}</p>
							</div>
							<Switch
								id={id}
								className="-my-2.5 -mr-1.5"
								checked={data.inheritance[row.key]}
								disabled={disabled || pending}
								onCheckedChange={(checked) => void run({ type: 'update-inheritance', inheritance: { ...data.inheritance, [row.key]: checked } })}
							/>
						</li>
					);
				})}
			</ul>
			{error ? (
				<p role="alert" className="mt-2 text-[13px] text-destructive">
					{error}
				</p>
			) : null}
		</Panel>
	);
}

/**
 * The organization as a tree: units, their sub-units, and the rooms each
 * owns. Pick a person to see where their access reaches, what carries down
 * from above, and where it stops.
 */
export function AccessMapView() {
	const { data, person } = useDataRooms();
	const layout = useLayout();
	const viewport = useCanvasViewport(layout.width, { fit: 'contain', contentHeight: layout.height, minFitZoom: 0.6 });
	const [selected, setSelected] = React.useState<string>('');
	const selectId = React.useId();

	const accessFor = React.useMemo(() => {
		if (!selected) return null;
		const units = new Map(layout.units.map((box) => [box.unit.id, effectiveAccess(data, selected, { kind: 'unit', unitId: box.unit.id })]));
		const rooms = new Map(layout.rooms.map((box) => [box.room.id, effectiveAccess(data, selected, { kind: 'room', roomId: box.room.id })]));
		return { units, rooms };
	}, [data, layout, selected]);

	const wireTone = (wire: Wire): WireTone => {
		if (!accessFor) return 'rest';
		const access = wire.to.kind === 'unit' ? accessFor.units.get(wire.to.id) : accessFor.rooms.get(wire.to.id);
		return carried(access) ? 'live' : 'rest';
	};

	const members = data.people.filter((entry) => !entry.guest);
	const guests = data.people.filter((entry) => entry.guest);
	const chosen = selected ? person(selected) : undefined;
	const reach = accessFor ? [...accessFor.rooms.values()].filter((access) => access.level !== 'none').length : 0;

	return (
		<section aria-label="Access map" className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={Network} title="Access map" />
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 @4xl/view:overflow-hidden">
				{/* The prompt and the picker it asks for read as one line, above both the map and the panel, so those two
				    share a top edge. The prompt never changes, so the picker stays put; the result follows it. */}
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-1">
					<p className="text-[13px] text-muted-foreground">Pick a person to see where their access reaches.</p>
					<label htmlFor={selectId} className="sr-only">
						Show access for
					</label>
					<ChoiceSelect
						id={selectId}
						value={selected}
						onValueChange={setSelected}
						className="w-auto max-w-[14rem] min-w-40"
						options={[
							{ value: '', label: 'Everyone' },
							...members.map((entry) => ({ value: entry.id, label: entry.name, group: data.org.name })),
							...guests.map((entry) => ({ value: entry.id, label: entry.company ? `${entry.name} · ${entry.company}` : entry.name, group: 'Guests' })),
						]}
					/>
					<p aria-live="polite" className="text-[13px] font-medium text-foreground tabular-nums">
						{chosen ? `Can enter ${reach} of ${layout.rooms.length} rooms.` : null}
					</p>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-3 @4xl/view:flex-row">
					<div className="min-h-[26rem] min-w-0 flex-1">
						<CanvasSurface
							viewport={viewport}
							label="Access map. Drag or use arrow keys to pan; plus and minus to zoom."
							onPaneClick={() => setSelected('')}
							overlay={<CanvasZoomControls viewport={viewport} fit />}
						>
							<svg aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-visible" width={layout.width} height={layout.height}>
								{layout.wires.map((wire) => (
									<CanvasWire key={wire.id} start={wire.start} end={wire.end} axis="vertical" tone={wireTone(wire)} />
								))}
							</svg>
							{layout.units.map((box) => {
								const access = accessFor?.units.get(box.unit.id);
								return <UnitNode key={box.unit.id} box={box} access={access} dimmed={Boolean(accessFor) && access?.level === 'none'} />;
							})}
							{layout.rooms.map((box) => {
								const access = accessFor?.rooms.get(box.room.id);
								const visible = access && (access.level !== 'none' || access.grants.length > 0);
								return <RoomNode key={box.room.id} box={box} access={access} dimmed={Boolean(accessFor) && !visible} />;
							})}
						</CanvasSurface>
					</div>
					<div className="shrink-0 @4xl/view:w-[300px] @4xl/view:overflow-y-auto">
						<InheritancePanel />
					</div>
				</div>
			</div>
		</section>
	);
}
