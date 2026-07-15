'use client';

import { useCallback, useState } from 'react';

import {
	CRUD_OPERATIONS,
	type CrudOperation,
	type CrudPolicyConfigs,
	type DefaultPolicyConfig,
	type OperationPolicyConfig,
} from '../../../schema-builder-core/components/policies/policy-types';

/**
 * Tracks which operations are enabled for policy creation
 */
export type OperationEnabledState = Record<CrudOperation, boolean>;

/**
 * Create initial operation configs from defaults
 */
function createInitialOperationConfigs(defaults: DefaultPolicyConfig): CrudPolicyConfigs {
	const createConfig = (): OperationPolicyConfig => ({
		roleName: defaults.roleName,
		isPermissive: defaults.isPermissive,
		policyData: { ...defaults.policyData },
		isCustomized: false,
	});

	return {
		create: createConfig(),
		read: createConfig(),
		update: createConfig(),
		delete: createConfig(),
	};
}

/**
 * Create initial enabled state (all enabled by default)
 */
function createInitialEnabledState(): OperationEnabledState {
	return {
		create: true,
		read: true,
		update: true,
		delete: true,
	};
}

/**
 * Hook to manage state for 4 CRUD operation policy configs.
 *
 * Features:
 * - Default config that all operations inherit from (including policyData)
 * - Per-operation customization with tracking
 * - Default propagation to non-customized operations
 * - Reset operation to defaults
 * - Optional initial enabled operations for single-operation flows
 */
export function useCrudPolicyState(
	initialDefaults?: Partial<DefaultPolicyConfig>,
	initialEnabledOperations?: CrudOperation[],
) {
	// Default config that operations inherit from
	const [defaults, setDefaults] = useState<DefaultPolicyConfig>({
		roleName: 'authenticated',
		isPermissive: true,
		policyData: {},
		...initialDefaults,
	});

	// Per-operation configs
	const [operations, setOperations] = useState<CrudPolicyConfigs>(() =>
		createInitialOperationConfigs({
			roleName: 'authenticated',
			isPermissive: true,
			policyData: {},
			...initialDefaults,
		}),
	);

	// Track which operations are enabled for policy creation
	const [enabledOperations, setEnabledOperations] = useState<OperationEnabledState>(() => {
		if (initialEnabledOperations && initialEnabledOperations.length > 0) {
			return {
				create: initialEnabledOperations.includes('create'),
				read: initialEnabledOperations.includes('read'),
				update: initialEnabledOperations.includes('update'),
				delete: initialEnabledOperations.includes('delete'),
			};
		}
		return createInitialEnabledState();
	});

	/**
	 * Update a single operation's config
	 */
	const updateOperation = useCallback(
		(op: CrudOperation, updates: Partial<Omit<OperationPolicyConfig, 'isCustomized'>>) => {
			setOperations((prev) => ({
				...prev,
				[op]: { ...prev[op], ...updates, isCustomized: true },
			}));
		},
		[],
	);

	/**
	 * Reset an operation to use default values
	 */
	const resetOperationToDefaults = useCallback(
		(op: CrudOperation) => {
			setOperations((prev) => ({
				...prev,
				[op]: {
					roleName: defaults.roleName,
					isPermissive: defaults.isPermissive,
					policyData: { ...defaults.policyData },
					isCustomized: false,
				},
			}));
		},
		[defaults],
	);

	/**
	 * Update default config.
	 * Propagates changes to all non-customized operations.
	 */
	const updateDefaults = useCallback((updates: Partial<DefaultPolicyConfig>) => {
		setDefaults((previous) => ({ ...previous, ...updates }));
		setOperations((previous) => {
			const next = { ...previous };
			for (const operation of CRUD_OPERATIONS) {
				if (previous[operation].isCustomized) continue;
				next[operation] = {
					...previous[operation],
					...(updates.roleName !== undefined ? { roleName: updates.roleName } : {}),
					...(updates.isPermissive !== undefined ? { isPermissive: updates.isPermissive } : {}),
					...(updates.policyData !== undefined ? { policyData: { ...updates.policyData } } : {}),
				};
			}
			return next;
		});
	}, []);

	/**
	 * Check if any operation has been customized
	 */
	const hasAnyCustomized = CRUD_OPERATIONS.some((op) => operations[op].isCustomized);

	/**
	 * Reset all operations to defaults
	 */
	const resetAllToDefaults = useCallback(() => {
		setOperations(createInitialOperationConfigs(defaults));
	}, [defaults]);

	/**
	 * Toggle whether an operation is enabled for policy creation
	 */
	const toggleOperationEnabled = useCallback((op: CrudOperation) => {
		setEnabledOperations((prev) => ({
			...prev,
			[op]: !prev[op],
		}));
	}, []);

	/**
	 * Get list of enabled operations
	 */
	const getEnabledOperations = useCallback(() => {
		return CRUD_OPERATIONS.filter((op) => enabledOperations[op]);
	}, [enabledOperations]);

	return {
		defaults,
		operations,
		enabledOperations,
		updateDefaults,
		updateOperation,
		resetOperationToDefaults,
		resetAllToDefaults,
		toggleOperationEnabled,
		getEnabledOperations,
		hasAnyCustomized,
	};
}
