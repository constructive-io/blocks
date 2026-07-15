/**
 * Schema Types and Utilities
 *
 * Shared types and utilities for schema/table/field definitions.
 * Used by both components and lib/gql hooks.
 */

// Types
export * from './types';

// Schema conversion
export { dbLightToSchemaData, clearPositionCache } from './schema-conversion';

// Field type registry
export {
	getFieldTypeInfo,
	getFieldTypesInCategory,
	getAllFieldTypes,
	searchFieldTypes,
	getDefaultConstraintsForType,
	isTypeConfigurable,
	getBasicFieldTypes,
	getAdvancedFieldTypes,
	FIELD_TYPE_CATEGORIES,
} from './field-type-registry';

// Common constraints
export {
	COMMON_CONSTRAINTS,
	type CommonConstraintId,
	type CommonConstraintInfo,
} from './common-constraint-registry';

// Constraint mapping
export {
	getCommonConstraintsDisplay,
	getConfigurableConstraints,
	hasConfigurableConstraints,
	getConstraintDisplayInfo,
	updateCommonConstraint,
	updateConfigurableConstraint,
	removeConfigurableConstraint,
	type CommonConstraintDisplay,
	type ConfigurableConstraintValue,
	type ConstraintDisplayInfo,
} from './constraint-mapping';
