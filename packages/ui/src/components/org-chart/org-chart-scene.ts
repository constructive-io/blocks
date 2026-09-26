'use client';

import * as React from 'react';

import type { WirePoint } from '../workspace-kit/canvas';
import type { OrgLayout, PlacedPerson } from './layout';
import { CHART_SPRING } from './org-chart-spring';
import type { AnchorSpec, WireSpec } from './org-chart-wires';

/** A card being dragged: its offset in canvas units and the manager it would report to if dropped now. */
export type DragState = { id: string; dx: number; dy: number; targetId: string | null; blocked: ReadonlySet<string> };

/** A card on the canvas: where it is heading, where a new one grows from, and whether it is folding away. */
export type SceneCard = { person: PlacedPerson; x: number; y: number; enterFrom?: { x: number; y: number }; leaving: boolean };

type Point = { x: number; y: number };
type Spot = Point & { width: number; height: number };
type Leaving = { person: PlacedPerson; anchorId: string };
/**
 * `shift` moves the whole layout on the canvas so the anchor person stays
 * put across layout changes; `beforeShift` is the shift `before` was drawn with.
 */
type Scene = { layout: OrgLayout; before: OrgLayout | null; leaving: ReadonlyMap<string, Leaving>; shift: Point; beforeShift: Point };

const EMPTY: ReadonlyMap<string, Leaving> = new Map();
const ORIGIN: Point = { x: 0, y: 0 };
const top = (spot: Spot): WirePoint => [spot.x + spot.width / 2, spot.y];
const bottom = (spot: Spot): WirePoint => [spot.x + spot.width / 2, spot.y + spot.height];

/** The closest manager above `id` (in `before`) who is still on the chart `after`. */
function nearestShown(before: OrgLayout, after: OrgLayout, id: string) {
	let current = before.byId.get(id)?.parentId ?? null;
	while (current && !after.byId.has(current)) current = before.byId.get(current)?.parentId ?? null;
	return current ? after.byId.get(current) : undefined;
}

/**
 * People who just left the chart keep sliding under the nearest manager still
 * on it; everyone else is laid out afresh, shifted so the anchor stays put.
 */
function nextScene(scene: Scene, layout: OrgLayout, anchorId: string | null, animate: boolean): Scene {
	const was = anchorId ? scene.layout.byId.get(anchorId) : undefined;
	const now = anchorId ? layout.byId.get(anchorId) : undefined;
	const shift = was && now ? { x: scene.shift.x + was.x - now.x, y: scene.shift.y + was.y - now.y } : scene.shift;
	const base = { layout, before: scene.layout, shift, beforeShift: scene.shift };
	if (!animate) return { ...base, leaving: EMPTY };
	const leaving = new Map<string, Leaving>();
	for (const [id, item] of scene.leaving) if (!layout.byId.has(id) && layout.byId.has(item.anchorId)) leaving.set(id, item);
	for (const person of scene.layout.people) {
		const id = person.data.id;
		if (layout.byId.has(id)) continue;
		const anchor = nearestShown(scene.layout, layout, id);
		if (anchor) leaving.set(id, { person, anchorId: anchor.data.id });
	}
	return { ...base, leaving };
}

/**
 * Turns each new layout into what the canvas draws, so every change springs:
 * new reports slide out from under their manager, folded-away reports slide
 * back beneath the nearest manager still shown and unmount once hidden, and
 * everyone else springs to their new slot. The anchor (the person whose team
 * was just folded, say) keeps its spot on screen, so the pointer stays on it.
 * Cards and wires keep a stable DOM order, because moving an element in the
 * DOM cancels its running transition (and would lose a pointer capture mid-drag).
 */
export function useScene(layout: OrgLayout, anchorId: string | null, drag: DragState | null, highlighted: ReadonlySet<string>, animate: boolean) {
	const [scene, setScene] = React.useState<Scene>({ layout, before: null, leaving: EMPTY, shift: ORIGIN, beforeShift: ORIGIN });
	let current = scene;
	if (scene.layout !== layout) {
		current = nextScene(scene, layout, anchorId, animate);
		setScene(current);
	}
	const { before, leaving, shift, beforeShift } = current;

	// Once the last slide has settled, the cards that folded away can go.
	React.useEffect(() => {
		if (leaving.size === 0) return;
		const timer = window.setTimeout(() => setScene((latest) => (latest.leaving.size ? { ...latest, leaving: EMPTY } : latest)), CHART_SPRING.duration + 60);
		return () => window.clearTimeout(timer);
	}, [leaving]);

	const order = React.useRef<string[]>([]);

	return React.useMemo(() => {
		// Append-only order: survivors keep their place, newcomers join the end.
		const shown = new Set([...layout.byId.keys(), ...leaving.keys()]);
		const ids = order.current.filter((id) => shown.has(id));
		const placed = new Set(ids);
		for (const person of layout.people) if (!placed.has(person.data.id)) ids.push(person.data.id);
		order.current = ids;

		/** Where a card is heading: its slot, or its anchor's slot while it folds away. */
		const slotOf = (id: string): Spot | undefined => {
			const person = layout.byId.get(id);
			if (person) return { x: person.x + shift.x, y: person.y + shift.y, width: person.width, height: person.height };
			const item = leaving.get(id);
			const anchor = item ? layout.byId.get(item.anchorId) : undefined;
			return item && anchor ? { x: anchor.x + shift.x, y: anchor.y + shift.y, width: item.person.width, height: item.person.height } : undefined;
		};
		/** Where someone was drawn before this change. */
		const beforeOf = (id: string): Spot | undefined => {
			const person = before?.byId.get(id);
			return person && { x: person.x + beforeShift.x, y: person.y + beforeShift.y, width: person.width, height: person.height };
		};
		/** The slot plus the drag offset, while the card follows the pointer. */
		const spotOf = (id: string): Spot | undefined => {
			const slot = slotOf(id);
			return slot && drag?.id === id ? { ...slot, x: slot.x + drag.dx, y: slot.y + drag.dy } : slot;
		};
		/** Where a newly shown card grows from: the closest manager who was already on the chart, as they were. */
		const enterSpot = (person: PlacedPerson): Spot | undefined => {
			if (!before || before.byId.has(person.data.id)) return undefined;
			let source = person.parentId;
			while (source && !before.byId.has(source)) source = layout.byId.get(source)?.parentId ?? null;
			const from = source ? beforeOf(source) : undefined;
			return from ? { ...from, width: person.width, height: person.height } : undefined;
		};

		const cards: SceneCard[] = [];
		const wires: WireSpec[] = [];
		const anchors = new Map<string, AnchorSpec>();
		const addAnchor = (anchor: AnchorSpec) => {
			const existing = anchors.get(anchor.id);
			anchors.set(anchor.id, { ...anchor, live: anchor.live || Boolean(existing?.live), instant: anchor.instant || Boolean(existing?.instant) });
		};
		for (const id of ids) {
			const shown = layout.byId.get(id);
			const person = shown ?? leaving.get(id)!.person;
			const slot = slotOf(id)!;
			const enter = shown ? enterSpot(shown) : undefined;
			cards.push({ person, x: slot.x, y: slot.y, enterFrom: enter && { x: enter.x, y: enter.y }, leaving: !shown });

			const parentId = person.parentId;
			const parent = parentId ? spotOf(parentId) : undefined;
			// Over a new manager, the dragged card's own line gives way to the preview line.
			if (!parentId || !parent || (drag?.id === id && drag.targetId)) continue;
			const live = Boolean(shown) && highlighted.has(id);
			const instant = drag?.id === id || drag?.id === parentId;
			// A newly shown line grows from its manager's old spot, collapsed behind that card.
			const from = beforeOf(parentId) ?? (enter && shown?.parentId ? enterSpot(layout.byId.get(parentId)!) : undefined);
			const growFrom = from && bottom({ ...from, height: parent.height });
			wires.push({ id, start: bottom(parent), end: top(spotOf(id)!), tone: live ? 'live' : 'rest', marching: false, instant, enter: enter && growFrom ? { start: growFrom, end: top(enter) } : undefined });
			addAnchor({ id: parentId, at: bottom(parent), live, instant, enter: growFrom });
		}
		const target = drag?.targetId ? spotOf(drag.targetId) : undefined;
		const dragged = drag ? spotOf(drag.id) : undefined;
		if (drag?.targetId && target && dragged) {
			wires.push({ id: `preview-${drag.id}`, start: bottom(target), end: top(dragged), tone: 'live', marching: animate, instant: true });
			addAnchor({ id: drag.targetId, at: bottom(target), live: true, instant: false });
		}
		// Anchors follow the card order too, so none of them moves in the DOM either.
		const orderedAnchors: AnchorSpec[] = [];
		for (const id of ids) {
			const anchor = anchors.get(id);
			if (anchor) orderedAnchors.push(anchor);
		}
		return { cards, wires, anchors: orderedAnchors, shift };
	}, [animate, before, beforeShift, drag, highlighted, layout, leaving, shift]);
}
