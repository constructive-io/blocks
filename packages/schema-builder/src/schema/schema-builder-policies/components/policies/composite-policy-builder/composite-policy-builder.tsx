'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { useCardStack } from '@constructive-io/ui/stack';
import { Settings } from 'lucide-react';

import type { ConditionLeafNode } from '@/blocks/schema/schema-builder-core/components/policies/condition-builder/types';

import { getDefaultFormValues, hasRequiredFieldsMissing } from '../policy-hooks';
import type { MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { CompositeConditionEditCard, type CompositeConditionEditCardProps } from './composite-condition-edit-card';
import { FlatConditionList } from './flat-condition-list';
import {
	createNewCompositeCondition,
	flattenConditionTree,
	type CompositeConditionData,
	type CompositePolicyData,
} from '../../../../schema-builder-core/components/policies/composite-policy-builder/types';

interface CompositePolicyBuilderProps {
	value: CompositePolicyData;
	onChange: (value: CompositePolicyData) => void;
	policyTypes: MergedPolicyType[];
	disabled?: boolean;
	onValidChange?: (isValid: boolean) => void;
}

/**
 * Update a leaf node's data in the flat children array.
 */
function updateConditionData(
	root: CompositePolicyData,
	leafId: string,
	newData: CompositeConditionData,
): CompositePolicyData {
	return {
		...root,
		children: root.children.map((child) => (child.id === leafId ? { ...child, data: newData } : child)),
	};
}

/**
 * Wrapper around FlatConditionList for composite policy configuration.
 */
const EDIT_CARD_ID = 'edit-composite-condition';

export function CompositePolicyBuilder({
	value,
	onChange,
	policyTypes,
	disabled,
	onValidChange,
}: CompositePolicyBuilderProps) {
	const stack = useCardStack();
	const [editingLeafId, setEditingLeafId] = useState<string | null>(null);
	const editingLeafIdRef = useRef<string | null>(null);

	// Filter out composite policy type (no nesting allowed)
	const availablePolicyTypes = useMemo(
		() => policyTypes.filter((pt) => pt.name !== 'AuthzComposite'),
		[policyTypes],
	);

	// Default policy type for new conditions
	const defaultPolicyType = availablePolicyTypes[0]?.name ?? 'AuthzDirectOwner';

	// Get default data for the default policy type
	const defaultPolicyTypeObj = availablePolicyTypes.find((pt) => pt.name === defaultPolicyType);
	const defaultPolicyData = useMemo(
		() => (defaultPolicyTypeObj ? getDefaultFormValues(defaultPolicyTypeObj) : {}),
		[defaultPolicyTypeObj],
	);
	const fallbackId = useId().replace(/:/g, '');

	// Ensure value has valid structure - create default if not initialized, then flatten
	const safeValue = useMemo<CompositePolicyData>(
		() =>
			flattenConditionTree(
				value?.type === 'group' && Array.isArray(value?.children)
					? value
					: {
							id: `composite-${fallbackId}`,
							type: 'group',
							operator: 'AND',
							children: [
								{
									id: `condition-${fallbackId}`,
									type: 'condition',
									data: { policyType: defaultPolicyType, data: defaultPolicyData },
								},
							],
						},
			),
		[value, fallbackId, defaultPolicyType, defaultPolicyData],
	);

	// Use ref for onChange to avoid stale closures in the edit card's onSave
	const onChangeRef = useRef(onChange);
	const safeValueRef = useRef(safeValue);

	// Compute validity: all conditions must have required fields filled
	const isValid =
		safeValue.children.length > 0 &&
		safeValue.children.every((child) => {
			if (child.type !== 'condition') return true;
			const pt = availablePolicyTypes.find((p) => p.name === child.data.policyType);
			return pt ? !hasRequiredFieldsMissing(pt, child.data.data) : false;
		});

	const onValidChangeRef = useRef(onValidChange);
	const prevIsValidRef = useRef(isValid);

	useEffect(() => {
		onChangeRef.current = onChange;
		safeValueRef.current = safeValue;
		onValidChangeRef.current = onValidChange;
	}, [onChange, safeValue, onValidChange]);

	useEffect(() => {
		if (prevIsValidRef.current !== isValid) {
			prevIsValidRef.current = isValid;
			onValidChangeRef.current?.(isValid);
		}
	}, [isValid]);

	// Report initial validity on mount
	useEffect(() => {
		onValidChangeRef.current?.(isValid);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// --- Flat array operations ---

	const handleAddCondition = useCallback(() => {
		const policyType = availablePolicyTypes.find((pt) => pt.name === defaultPolicyType);
		const defaultData = policyType ? getDefaultFormValues(policyType) : {};
		const newLeaf = createNewCompositeCondition(defaultPolicyType, defaultData);
		onChange({ ...safeValue, children: [...safeValue.children, newLeaf] });
	}, [safeValue, availablePolicyTypes, defaultPolicyType, onChange]);

	const handleDeleteCondition = useCallback(
		(id: string) => {
			// Close edit card if deleting the condition being edited
			if (editingLeafIdRef.current === id) {
				stack.dismiss(EDIT_CARD_ID);
				editingLeafIdRef.current = null;
				setEditingLeafId(null);
			}
			onChange({ ...safeValue, children: safeValue.children.filter((c) => c.id !== id) });
		},
		[safeValue, onChange, stack],
	);

	const handleToggleOperator = useCallback(() => {
		onChange({ ...safeValue, operator: safeValue.operator === 'AND' ? 'OR' : 'AND' });
	}, [safeValue, onChange]);

	// --- Policy type change & edit ---

	const handlePolicyTypeChange = useCallback(
		(leafId: string, newPolicyType: string) => {
			const policyType = availablePolicyTypes.find((pt) => pt.name === newPolicyType);
			const defaultData = policyType ? getDefaultFormValues(policyType) : {};
			const newConditionData: CompositeConditionData = {
				policyType: newPolicyType,
				data: defaultData,
			};
			const updatedRoot = updateConditionData(safeValue, leafId, newConditionData);
			onChange(updatedRoot);

			// If this is the condition being edited, re-open the edit card with the new policy type
			if (editingLeafIdRef.current === leafId && policyType) {
				stack.push({
					id: EDIT_CARD_ID,
					title: 'Edit Condition',
					Component: CompositeConditionEditCard,
					props: {
						policyType,
						policyData: defaultData,
						onSave: (newPolicyData: Record<string, unknown>) => {
							const updated = updateConditionData(safeValueRef.current, leafId, {
								policyType: newPolicyType,
								data: newPolicyData,
							});
							onChangeRef.current(updated);
						},
					} satisfies CompositeConditionEditCardProps,
					onClose: () => {
						if (editingLeafIdRef.current === leafId) {
							editingLeafIdRef.current = null;
							setEditingLeafId(null);
						}
					},
					width: 420,
				});
			}
		},
		[safeValue, availablePolicyTypes, onChange, stack],
	);

	const handleEditCondition = useCallback(
		(leafId: string, leafData: CompositeConditionData) => {
			const policyType = availablePolicyTypes.find((pt) => pt.name === leafData.policyType);
			if (!policyType) return;

			// Toggle: clicking the same condition closes the card
			if (editingLeafIdRef.current === leafId) {
				stack.dismiss(EDIT_CARD_ID);
				editingLeafIdRef.current = null;
				setEditingLeafId(null);
				return;
			}

			// Push with stable ID — PUSH reducer auto-replaces any existing card with same ID
			stack.push({
				id: EDIT_CARD_ID,
				title: 'Edit Condition',
				Component: CompositeConditionEditCard,
				props: {
					policyType,
					policyData: leafData.data,
					onSave: (newPolicyData: Record<string, unknown>) => {
						const updatedRoot = updateConditionData(safeValueRef.current, leafId, {
							...leafData,
							data: newPolicyData,
						});
						onChangeRef.current(updatedRoot);
					},
				} satisfies CompositeConditionEditCardProps,
				onClose: () => {
					// Only reset if this card hasn't already been replaced
					if (editingLeafIdRef.current === leafId) {
						editingLeafIdRef.current = null;
						setEditingLeafId(null);
					}
				},
				width: 420,
			});

			editingLeafIdRef.current = leafId;
			setEditingLeafId(leafId);
		},
		[availablePolicyTypes, stack],
	);

	// Render function for each leaf condition
	const renderCondition = useCallback(
		(leaf: ConditionLeafNode<CompositeConditionData>) => {
			const policyType = availablePolicyTypes.find((pt) => pt.name === leaf.data.policyType);
			const PolicyIcon = policyType?.icon;
			const needsConfig = hasRequiredFieldsMissing(policyType ?? null, leaf.data.data);

			return (
				<div className='flex flex-1 items-center gap-2'>
					<span className='text-muted-foreground text-xs whitespace-nowrap'>Policy Type:</span>
					<Select
						value={leaf.data.policyType}
						onValueChange={(newType) => handlePolicyTypeChange(leaf.id, newType)}
						disabled={disabled}
					>
						<SelectTrigger className='bg-background h-8 w-fit rounded-lg text-xs'>
							<SelectValue>
								{policyType && (
									<span className='flex items-center gap-2'>
										{PolicyIcon && <PolicyIcon className='text-muted-foreground size-4 shrink-0' />}
										{policyType.title}
									</span>
								)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent className='max-h-60'>
							{availablePolicyTypes.map((pt) => {
								const Icon = pt.icon;
								return (
									<SelectItem key={pt.name} value={pt.name}>
										<span className='flex items-center gap-2'>
											<Icon className='text-muted-foreground size-4 shrink-0' />
											{pt.title}
										</span>
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>

					<button
						type='button'
						onClick={() => handleEditCondition(leaf.id, leaf.data)}
						disabled={disabled}
						aria-label={`Configure ${policyType?.title ?? 'policy'} condition`}
						className='text-muted-foreground/80 hover:text-foreground hover:bg-muted relative grid size-10 shrink-0 cursor-pointer
							place-items-center rounded-lg transition-[background-color,color,scale] duration-150 ease-out motion-safe:active:scale-[0.96]
							disabled:pointer-events-none disabled:opacity-50'
					>
						<Settings className='size-4' />
						{needsConfig && <span className='absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-400' />}
					</button>
				</div>
			);
		},
		[availablePolicyTypes, handlePolicyTypeChange, handleEditCondition, disabled],
	);

	return (
		<div
			data-chat-component='composite-policy-builder'
			data-chat-condition-count={String(safeValue.children.length)}
			data-chat-operator={safeValue.operator}
			className='overflow-x-auto rounded-lg border'
		>
			<FlatConditionList
				value={safeValue}
				renderCondition={renderCondition}
				onAddCondition={handleAddCondition}
				onDeleteCondition={handleDeleteCondition}
				onToggleOperator={handleToggleOperator}
				activeLeafId={editingLeafId}
				disabled={disabled}
			/>
		</div>
	);
}
