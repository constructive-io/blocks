'use client';

import * as React from 'react';

import { Segmented } from '../workspace-kit/primitives';
import { addDays } from './format';
import type { Room } from './types';

/** When access granted by an invite or a folder share runs out. */
export type AccessEnd = '7d' | '30d' | 'room-closes' | 'never';

/** The choices that make sense for a room: "when the room closes" only if it has a close date. */
export function accessEndChoices(room: Room): { value: AccessEnd; label: string }[] {
	return [
		{ value: '7d', label: 'In 7 days' },
		{ value: '30d', label: 'In 30 days' },
		...(room.closesAt ? [{ value: 'room-closes' as const, label: 'When room closes' }] : []),
		{ value: 'never', label: 'Never' },
	];
}

/** The end date for a choice, measured from the workspace clock. `undefined` means access doesn't end. */
export function resolveAccessEnd(choice: AccessEnd, room: Room, clock: string): string | undefined {
	switch (choice) {
		case '7d':
			return addDays(clock, 7);
		case '30d':
			return addDays(clock, 30);
		case 'room-closes':
			return room.closesAt;
		case 'never':
			return undefined;
	}
}

export function AccessEndPicker({ room, value, onChange, className }: { room: Room; value: AccessEnd; onChange: (value: AccessEnd) => void; className?: string }) {
	return <Segmented label="Access ends" value={value} options={accessEndChoices(room)} onChange={onChange} className={className} />;
}
