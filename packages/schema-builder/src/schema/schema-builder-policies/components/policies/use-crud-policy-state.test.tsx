import { StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';

import { CRUD_OPERATIONS } from '../../../schema-builder-core/components/policies/policy-types';
import { useCrudPolicyState } from './use-crud-policy-state';

describe('useCrudPolicyState', () => {
	it('applies single and rapid consecutive default patches to every inherited operation', () => {
		const { result } = renderHook(() => useCrudPolicyState());

		act(() => {
			result.current.updateDefaults({ roleName: 'member' });
			result.current.updateDefaults({ isPermissive: false });
			result.current.updateDefaults({ policyData: { scope: 'team' } });
		});

		expect(result.current.defaults).toEqual({
			roleName: 'member',
			isPermissive: false,
			policyData: { scope: 'team' },
		});
		for (const operation of CRUD_OPERATIONS) {
			expect(result.current.operations[operation]).toEqual({
				roleName: 'member',
				isPermissive: false,
				policyData: { scope: 'team' },
				isCustomized: false,
			});
		}
	});

	it('isolates customized operations and resets them to the latest defaults', () => {
		const { result } = renderHook(() => useCrudPolicyState());

		act(() => {
			result.current.updateOperation('read', {
				roleName: 'reader',
				isPermissive: true,
				policyData: { visibility: 'public' },
			});
			result.current.updateDefaults({
				roleName: 'editor',
				isPermissive: false,
				policyData: { visibility: 'private' },
			});
		});

		expect(result.current.operations.read).toEqual({
			roleName: 'reader',
			isPermissive: true,
			policyData: { visibility: 'public' },
			isCustomized: true,
		});
		expect(result.current.operations.create).toEqual({
			roleName: 'editor',
			isPermissive: false,
			policyData: { visibility: 'private' },
			isCustomized: false,
		});

		act(() => {
			result.current.resetOperationToDefaults('read');
		});

		expect(result.current.operations.read).toEqual({
			roleName: 'editor',
			isPermissive: false,
			policyData: { visibility: 'private' },
			isCustomized: false,
		});
		expect(result.current.operations.read.policyData).not.toBe(result.current.defaults.policyData);
	});

	it('clones policy data for each inherited operation', () => {
		const { result } = renderHook(() => useCrudPolicyState());
		const policyData = { ownerField: 'owner_id' };

		act(() => {
			result.current.updateDefaults({ policyData });
		});

		const operationPolicyData = CRUD_OPERATIONS.map(
			(operation) => result.current.operations[operation].policyData,
		);
		for (const clonedPolicyData of operationPolicyData) {
			expect(clonedPolicyData).toEqual(policyData);
			expect(clonedPolicyData).not.toBe(policyData);
		}
		expect(new Set(operationPolicyData).size).toBe(CRUD_OPERATIONS.length);
	});

	it('keeps rapid updates replay-safe in Strict Mode', () => {
		function StrictModeWrapper({ children }: { children: ReactNode }) {
			return <StrictMode>{children}</StrictMode>;
		}

		const { result } = renderHook(() => useCrudPolicyState(), { wrapper: StrictModeWrapper });

		act(() => {
			result.current.updateDefaults({ roleName: 'first' });
			result.current.updateDefaults({ roleName: 'second' });
			result.current.updateDefaults({ isPermissive: false });
		});

		expect(result.current.defaults).toMatchObject({ roleName: 'second', isPermissive: false });
		for (const operation of CRUD_OPERATIONS) {
			expect(result.current.operations[operation]).toMatchObject({
				roleName: 'second',
				isPermissive: false,
				isCustomized: false,
			});
		}
	});
});
