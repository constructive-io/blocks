'use client';

import { useCallback, useMemo, useState } from 'react';

import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';

export interface PolicyEditState {
	roleName: string;
	isPermissive: boolean;
	isEnabled: boolean;
	policyData: Record<string, unknown>;
}

interface UsePolicyEditStateReturn {
	state: PolicyEditState;
	updateState: (updates: Partial<PolicyEditState>) => void;
	updatePolicyData: (updates: Record<string, unknown>) => void;
	hasChanges: boolean;
	reset: () => void;
}

function getInitialState(policy: DatabasePolicy): PolicyEditState {
	return {
		roleName: policy.granteeName ?? 'authenticated',
		isPermissive: policy.permissive ?? true,
		isEnabled: !(policy.disabled ?? false),
		policyData: (policy.data as Record<string, unknown>) ?? {},
	};
}

/**
 * Hook for managing policy edit form state and change detection
 */
export function usePolicyEditState(policy: DatabasePolicy): UsePolicyEditStateReturn {
	const [state, setState] = useState<PolicyEditState>(() => getInitialState(policy));

	const updateState = useCallback((updates: Partial<PolicyEditState>) => {
		setState((prev) => ({ ...prev, ...updates }));
	}, []);

	const updatePolicyData = useCallback((updates: Record<string, unknown>) => {
		setState((prev) => ({
			...prev,
			policyData: { ...prev.policyData, ...updates },
		}));
	}, []);

	const reset = useCallback(() => {
		setState(getInitialState(policy));
	}, [policy]);

	const hasChanges = useMemo(() => {
		const original = getInitialState(policy);
		return (
			state.roleName !== original.roleName ||
			state.isPermissive !== original.isPermissive ||
			state.isEnabled !== original.isEnabled ||
			JSON.stringify(state.policyData) !== JSON.stringify(original.policyData)
		);
	}, [policy, state]);

	return {
		state,
		updateState,
		updatePolicyData,
		hasChanges,
		reset,
	};
}
