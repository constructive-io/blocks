import type { ComponentType } from 'react';

import type { CellType } from '../types/cell-types';

import type { FieldConstraints } from './types';
import { COMMON_CONSTRAINTS, type CommonConstraintId } from './common-constraint-registry';
import { getFieldTypeInfo } from './field-type-registry';

export interface CommonConstraintDisplay {
	id: CommonConstraintId;
	label: string;
	icon: ComponentType<{ className?: string }>;
	active: boolean;
}

export interface ConfigurableConstraintValue {
	type: 'length' | 'precision' | 'scale' | 'range' | 'pattern' | 'enumValues';
	label: string;
	value: any;
	hasValue: boolean;
}

export interface ConstraintDisplayInfo {
	commonConstraints: CommonConstraintDisplay[];
	configurableConstraints: ConfigurableConstraintValue[];
	hasConfigurableConstraints: boolean;
}

/**
 * Maps field constraints to common constraint display info
 */
export function getCommonConstraintsDisplay(constraints: FieldConstraints): CommonConstraintDisplay[] {
	return COMMON_CONSTRAINTS.map((constraint) => ({
		id: constraint.id,
		label: constraint.label,
		icon: constraint.icon,
		active: getConstraintActiveState(constraints, constraint.id),
	}));
}

/**
 * Gets the active state for a common constraint
 */
function getConstraintActiveState(constraints: FieldConstraints, constraintId: CommonConstraintId): boolean {
	switch (constraintId) {
		case 'primaryKey':
			return !!constraints.primaryKey;
		case 'unique':
			return !!constraints.unique;
		case 'nullable':
			return !!constraints.nullable;
		default:
			return false;
	}
}

/**
 * Gets configurable constraint values for a field type and current constraints
 */
export function getConfigurableConstraints(
	fieldType: CellType,
	constraints: FieldConstraints,
): ConfigurableConstraintValue[] {
	const typeInfo = getFieldTypeInfo(fieldType);
	if (!typeInfo) return [];

	const configurableConstraints: ConfigurableConstraintValue[] = [];

	// Length constraints (maxLength, minLength)
	if (typeInfo.configurable.length) {
		if (constraints.maxLength !== undefined || constraints.minLength !== undefined) {
			configurableConstraints.push({
				type: 'length',
				label: 'Length',
				value: {
					min: constraints.minLength,
					max: constraints.maxLength,
				},
				hasValue: constraints.maxLength !== undefined || constraints.minLength !== undefined,
			});
		}
	}

	// Precision constraint
	if (typeInfo.configurable.precision && constraints.precision !== undefined) {
		configurableConstraints.push({
			type: 'precision',
			label: 'Precision',
			value: constraints.precision,
			hasValue: true,
		});
	}

	// Scale constraint
	if (typeInfo.configurable.scale && constraints.scale !== undefined) {
		configurableConstraints.push({
			type: 'scale',
			label: 'Scale',
			value: constraints.scale,
			hasValue: true,
		});
	}

	// Range constraints (minValue, maxValue)
	if (typeInfo.configurable.range) {
		if (constraints.minValue !== undefined || constraints.maxValue !== undefined) {
			configurableConstraints.push({
				type: 'range',
				label: 'Range',
				value: {
					min: constraints.minValue,
					max: constraints.maxValue,
				},
				hasValue: constraints.minValue !== undefined || constraints.maxValue !== undefined,
			});
		}
	}

	// Pattern constraint
	if (typeInfo.configurable.pattern && constraints.pattern !== undefined) {
		configurableConstraints.push({
			type: 'pattern',
			label: 'Pattern',
			value: constraints.pattern,
			hasValue: true,
		});
	}

	// Enum values constraint
	if (typeInfo.configurable.enumValues && constraints.enumValues !== undefined) {
		configurableConstraints.push({
			type: 'enumValues',
			label: 'Enum Values',
			value: constraints.enumValues,
			hasValue: true,
		});
	}

	return configurableConstraints;
}

/**
 * Checks if a field type has any configurable constraints available
 */
export function hasConfigurableConstraints(fieldType: CellType): boolean {
	const typeInfo = getFieldTypeInfo(fieldType);
	if (!typeInfo) return false;

	return Object.values(typeInfo.configurable).some(Boolean);
}

/**
 * Gets complete constraint display information for a field
 */
export function getConstraintDisplayInfo(fieldType: CellType, constraints: FieldConstraints): ConstraintDisplayInfo {
	return {
		commonConstraints: getCommonConstraintsDisplay(constraints),
		configurableConstraints: getConfigurableConstraints(fieldType, constraints),
		hasConfigurableConstraints: hasConfigurableConstraints(fieldType),
	};
}

/**
 * Updates a common constraint in the field constraints
 */
export function updateCommonConstraint(
	constraints: FieldConstraints,
	constraintId: CommonConstraintId,
	value: boolean,
): FieldConstraints {
	const updated = { ...constraints };

	switch (constraintId) {
		case 'primaryKey':
			updated.primaryKey = value;
			// Primary key implies not nullable
			if (value) {
				updated.nullable = false;
			}
			break;
		case 'unique':
			updated.unique = value;
			break;
		case 'nullable':
			updated.nullable = value;
			// Nullable conflicts with primary key
			if (value) {
				updated.primaryKey = false;
			}
			break;
	}

	return updated;
}

/**
 * Updates a configurable constraint in the field constraints
 */
export function updateConfigurableConstraint(
	constraints: FieldConstraints,
	type: ConfigurableConstraintValue['type'],
	value: any,
): FieldConstraints {
	const updated = { ...constraints };

	switch (type) {
		case 'length':
			if (value.min !== undefined) updated.minLength = value.min;
			if (value.max !== undefined) updated.maxLength = value.max;
			break;
		case 'precision':
			updated.precision = value;
			break;
		case 'scale':
			updated.scale = value;
			break;
		case 'range':
			if (value.min !== undefined) updated.minValue = value.min;
			if (value.max !== undefined) updated.maxValue = value.max;
			break;
		case 'pattern':
			updated.pattern = value;
			break;
		case 'enumValues':
			updated.enumValues = value;
			break;
	}

	return updated;
}

/**
 * Removes a configurable constraint from the field constraints
 */
export function removeConfigurableConstraint(
	constraints: FieldConstraints,
	type: ConfigurableConstraintValue['type'],
): FieldConstraints {
	const updated = { ...constraints };

	switch (type) {
		case 'length':
			delete updated.minLength;
			delete updated.maxLength;
			break;
		case 'precision':
			delete updated.precision;
			break;
		case 'scale':
			delete updated.scale;
			break;
		case 'range':
			delete updated.minValue;
			delete updated.maxValue;
			break;
		case 'pattern':
			delete updated.pattern;
			break;
		case 'enumValues':
			delete updated.enumValues;
			break;
	}

	return updated;
}
