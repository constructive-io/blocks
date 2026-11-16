/**
 * The user's pending link choices in the relation editor, kept apart from
 * server state until Save. A single relation (belongsTo, hasOne) holds one
 * choice; a list relation (hasMany, manyToMany) holds the records to add and
 * the links to remove. Refused choices return the model's reason.
 */
import { useCallback, useMemo, useState } from 'react';

import type { RelationModel } from '@constructive-io/data';

import type { RelationEditCapability } from './relation-capability';
import type { LinkedRecord } from './relation-changes';
import { linkKey, type RecordValues } from './relation-keys';

export type LinkState = 'linked' | 'added' | 'removed';

export interface PendingLink extends LinkedRecord {
	state: LinkState;
}

export interface RelationSelection {
	/** One link (belongsTo, hasOne) or many (hasMany, manyToMany). */
	mode: 'single' | 'multi';
	/** Links as they will be after Save: current ones (some marked removed) and added ones. */
	pending: PendingLink[];
	/** Whether a record is linked after Save. */
	isSelected: (record: RecordValues) => boolean;
	/** Pick or unpick a record. Returns the reason when the model forbids it. */
	toggle: (record: RecordValues) => string | null;
	/** Single relation: remove the link. Returns the reason when the model forbids it. */
	clear: () => string | null;
	/** True when Save would write something. */
	dirty: boolean;
	/** Single relation: the chosen record (null to clear), or undefined when unchanged. */
	choice: RecordValues | null | undefined;
	/** List relation: records to link. */
	added: LinkedRecord[];
	/** List relation: links to remove. */
	removed: LinkedRecord[];
	/** Drop pending choices that the server now holds. */
	settle: (keys: ReadonlySet<string>) => void;
	/** Drop every pending choice. */
	reset: () => void;
}

const NO_KEY = 'This record has no value to link by.';

export function useRelationSelection(options: {
	relation: RelationModel;
	/** Current links from the server (or the row), first page first. */
	current: readonly LinkedRecord[];
	capability: RelationEditCapability;
	/** hasMany: true when a record already points at this row although its link is not loaded yet. */
	linkedHere?: (record: RecordValues) => boolean;
}): RelationSelection {
	const { relation, current, capability, linkedHere } = options;
	const mode = relation.kind === 'belongsTo' || relation.kind === 'hasOne' ? 'single' : 'multi';

	const [choice, setChoice] = useState<{ record: RecordValues | null } | null>(null);
	const [added, setAdded] = useState<ReadonlyMap<string, LinkedRecord>>(() => new Map());
	const [removed, setRemoved] = useState<ReadonlyMap<string, LinkedRecord>>(() => new Map());

	const currentByKey = useMemo(() => new Map(current.map((link) => [link.key, link])), [current]);
	const currentKey = current[0]?.key ?? null;
	const choiceKey = choice ? (choice.record ? linkKey(relation, choice.record) : null) : currentKey;

	const isLinkedNow = useCallback(
		(key: string, record: RecordValues) => currentByKey.has(key) || Boolean(linkedHere?.(record)),
		[currentByKey, linkedHere],
	);

	const isSelected = useCallback(
		(record: RecordValues) => {
			const key = linkKey(relation, record);
			if (!key) return false;
			if (mode === 'single') return key === choiceKey;
			return added.has(key) || (isLinkedNow(key, record) && !removed.has(key));
		},
		[added, choiceKey, isLinkedNow, mode, relation, removed],
	);

	const toggle = useCallback(
		(record: RecordValues): string | null => {
			const key = linkKey(relation, record);
			if (!key) return NO_KEY;
			if (mode === 'single') {
				if (key === choiceKey) {
					// Unpicking a new choice goes back to the current link; unpicking the current link clears it.
					if (choice) {
						setChoice(null);
						return null;
					}
					if (!capability.canUnlink) return capability.unlinkReason;
					setChoice({ record: null });
					return null;
				}
				if (!capability.canLink) return capability.linkReason;
				if (currentKey !== null && !capability.canUnlink && relation.kind === 'hasOne') return capability.unlinkReason;
				setChoice(key === currentKey ? null : { record });
				return null;
			}
			if (added.has(key)) {
				setAdded((map) => withoutKey(map, key));
				return null;
			}
			if (removed.has(key)) {
				setRemoved((map) => withoutKey(map, key));
				return null;
			}
			if (isLinkedNow(key, record)) {
				if (!capability.canUnlink) return capability.unlinkReason;
				const link = currentByKey.get(key) ?? { key, record, junctionRow: null };
				setRemoved((map) => withKey(map, key, link));
				return null;
			}
			if (!capability.canLink) return capability.linkReason;
			setAdded((map) => withKey(map, key, { key, record }));
			return null;
		},
		[added, capability, choice, choiceKey, currentByKey, currentKey, isLinkedNow, mode, relation, removed],
	);

	const clear = useCallback((): string | null => {
		if (choiceKey === null) return null;
		if (!capability.canUnlink) return capability.unlinkReason;
		setChoice(currentKey === null ? null : { record: null });
		return null;
	}, [capability, choiceKey, currentKey]);

	const settle = useCallback((keys: ReadonlySet<string>) => {
		setAdded((map) => withoutKeys(map, keys));
		setRemoved((map) => withoutKeys(map, keys));
		setChoice(null);
	}, []);

	const reset = useCallback(() => {
		setAdded(new Map());
		setRemoved(new Map());
		setChoice(null);
	}, []);

	const pending = useMemo<PendingLink[]>(() => {
		if (mode === 'single') {
			const now = current[0] ?? null;
			if (!choice) return now ? [{ ...now, state: 'linked' }] : [];
			const next = choice.record && choiceKey ? [{ key: choiceKey, record: choice.record, state: 'added' as const }] : [];
			return now ? [...next, { ...now, state: 'removed' }] : next;
		}
		return [
			...current.map((link) => ({ ...link, state: removed.has(link.key) ? ('removed' as const) : ('linked' as const) })),
			...[...removed.values()].filter((link) => !currentByKey.has(link.key)).map((link) => ({ ...link, state: 'removed' as const })),
			...[...added.values()].map((link) => ({ ...link, state: 'added' as const })),
		];
	}, [added, choice, choiceKey, current, currentByKey, mode, removed]);

	const dirty = mode === 'single' ? choice !== null && choiceKey !== currentKey : added.size + removed.size > 0;

	return {
		mode,
		pending,
		isSelected,
		toggle,
		clear,
		dirty,
		choice: choice ? choice.record : undefined,
		added: [...added.values()],
		removed: [...removed.values()],
		settle,
		reset,
	};
}

function withKey<T>(map: ReadonlyMap<string, T>, key: string, value: T): ReadonlyMap<string, T> {
	const next = new Map(map);
	next.set(key, value);
	return next;
}

function withoutKey<T>(map: ReadonlyMap<string, T>, key: string): ReadonlyMap<string, T> {
	const next = new Map(map);
	next.delete(key);
	return next;
}

function withoutKeys<T>(map: ReadonlyMap<string, T>, keys: ReadonlySet<string>): ReadonlyMap<string, T> {
	if (![...keys].some((key) => map.has(key))) return map;
	const next = new Map(map);
	for (const key of keys) next.delete(key);
	return next;
}
