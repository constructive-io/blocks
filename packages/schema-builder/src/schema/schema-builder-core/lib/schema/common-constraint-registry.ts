import type { ComponentType } from 'react';
import { RiQuestionMark } from '@remixicon/react';
import { Fingerprint, Key } from 'lucide-react';

import type { FieldConstraints } from './types';

export type CommonConstraintId = keyof Pick<FieldConstraints, 'primaryKey' | 'unique' | 'nullable'>;

export interface CommonConstraintInfo {
	id: CommonConstraintId;
	label: string;
	icon: ComponentType<{ className?: string }>;
	conflictsWith?: CommonConstraintId[];
}

export const COMMON_CONSTRAINTS: CommonConstraintInfo[] = [
	{
		id: 'primaryKey',
		label: 'Primary Key',
		icon: Key,
		conflictsWith: ['nullable'],
	},
	{
		id: 'unique',
		label: 'Unique',
		icon: Fingerprint,
	},
	{
		id: 'nullable',
		label: 'Nullable',
		icon: RiQuestionMark,
		conflictsWith: ['primaryKey'],
	},
];

export function getCommonConstraintInfo(constraintId: CommonConstraintId): CommonConstraintInfo | undefined {
	return COMMON_CONSTRAINTS.find((constraint) => constraint.id === constraintId);
}

export function getConflictingConstraints(constraintId: CommonConstraintId): CommonConstraintId[] {
	const constraint = getCommonConstraintInfo(constraintId);
	return constraint?.conflictsWith || [];
}

export function getAllCommonConstraints(): CommonConstraintInfo[] {
	return COMMON_CONSTRAINTS;
}
