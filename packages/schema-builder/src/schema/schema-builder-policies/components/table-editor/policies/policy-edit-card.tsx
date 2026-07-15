'use client';

import { useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import type { CardComponent } from '@constructive-io/ui/stack';
import { Switch } from '@constructive-io/ui/switch';
import { showErrorToast, showSuccessToast } from '@constructive-io/ui/toast';
import { useDeletePolicyMutation, useUpdatePolicyMutation } from '@/generated/schema-builder';
import { Loader2Icon, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import type { DatabasePolicy } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { mapConditionNodeToAst } from '@/blocks/schema/schema-builder-core/lib/policies/ast-helpers';
import { mapAstToConditionNode } from '@/blocks/schema/schema-builder-core/lib/policies/rls-parser';
import { CompositePolicyBuilder, type CompositePolicyData } from '../../policies/composite-policy-builder';
import { injectSchemaFields } from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { PolicyConfigForm } from '../../policies/policy-config-form';
import { PolicyDiagramByKey } from '../../policies/policy-diagram';
import { usePolicyType, usePolicyTypes } from '../../policies/policy-hooks';

import { usePolicyEditState } from './use-policy-edit-state';

export interface PolicyEditCardProps {
	policy: DatabasePolicy & { tableId: string };
	tableName: string;
	onSuccess?: () => void;
}

const PRIVILEGE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof Search }> = {
	SELECT: {
		label: 'Read',
		bg: 'bg-sky-500/10',
		text: 'text-sky-600 dark:text-sky-400',
		icon: Search,
	},
	INSERT: {
		label: 'Create',
		bg: 'bg-emerald-500/10',
		text: 'text-emerald-600 dark:text-emerald-400',
		icon: Plus,
	},
	UPDATE: {
		label: 'Update',
		bg: 'bg-amber-500/10',
		text: 'text-amber-600 dark:text-amber-400',
		icon: Pencil,
	},
	DELETE: {
		label: 'Delete',
		bg: 'bg-rose-500/10',
		text: 'text-rose-600 dark:text-rose-400',
		icon: Trash2,
	},
};

/**
 * Card component for editing an existing policy.
 * Shows policy header, diagram, settings form, and access rule config.
 */
export const PolicyEditCard: CardComponent<PolicyEditCardProps> = ({ policy, tableName, onSuccess, card }) => {
	const { currentDatabase } = useSchemaBuilderSelectors();
	const schemaId = currentDatabase?.schemaId ?? '';

	const { policyType, isLoading: isPolicyTypeLoading } = usePolicyType(policy.policyType ?? '');
	const { policyTypes } = usePolicyTypes();
	const updatePolicyMutation = useUpdatePolicyMutation({ selection: { fields: { id: true } } });
	const deletePolicyMutation = useDeletePolicyMutation({ selection: { fields: { id: true } } });

	const isCompositePolicy = policy.policyType === 'AuthzComposite';

	const { state, updateState, updatePolicyData, hasChanges } = usePolicyEditState(policy);

	// For composite policies, parse AST data to condition tree (memoized initial value)
	const initialCompositeData = useMemo(() => {
		if (!isCompositePolicy || !policy.data) return null;
		try {
			return mapAstToConditionNode(policy.data as Record<string, unknown>) as CompositePolicyData;
		} catch {
			return null;
		}
	}, [isCompositePolicy, policy.data]);

	const [compositeData, setCompositeData] = useState<CompositePolicyData | null>(initialCompositeData);
	const [compositeDataChanged, setCompositeDataChanged] = useState(false);

	const handleCompositeChange = (data: CompositePolicyData) => {
		setCompositeData(data);
		setCompositeDataChanged(true);
	};

	const handleSubmit = async () => {
		if (!policyType || !schemaId) return;

		try {
			// For composite policies, convert condition tree to AST
			const dataToSubmit =
				isCompositePolicy && compositeData
					? (mapConditionNodeToAst(compositeData) ?? {})
					: injectSchemaFields(state.policyData, schemaId, policyType.name);

			await updatePolicyMutation.mutateAsync({
				id: policy.id,
				policyPatch: {
					permissive: state.isPermissive,
					disabled: !state.isEnabled,
					data: dataToSubmit,
				},
			});

			showSuccessToast({
				message: 'Policy updated',
				description: `Policy "${policy.name}" has been updated successfully.`,
			});

			onSuccess?.();
			card.close();
		} catch (error) {
			showErrorToast({
				message: 'Failed to update policy',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const canSubmit = isCompositePolicy ? compositeDataChanged || hasChanges : hasChanges;
		if (!updatePolicyMutation.isPending && canSubmit) {
			handleSubmit();
		}
	};

	const handleDelete = async () => {
		try {
			await deletePolicyMutation.mutateAsync({ id: policy.id });

			showSuccessToast({
				message: 'Policy deleted',
				description: `Policy "${policy.name}" has been deleted.`,
			});

			onSuccess?.();
			card.close();
		} catch (error) {
			showErrorToast({
				message: 'Failed to delete policy',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	const hasAnyChanges = isCompositePolicy ? compositeDataChanged || hasChanges : hasChanges;
	const isLoading = updatePolicyMutation.isPending || deletePolicyMutation.isPending;

	if (isPolicyTypeLoading) {
		return (
			<div className='flex h-full items-center justify-center'>
				<Loader2Icon className='text-muted-foreground h-6 w-6 animate-spin' />
			</div>
		);
	}

	if (!policyType) {
		return (
			<div className='flex h-full items-center justify-center p-6'>
				<p className='text-muted-foreground text-sm'>Policy type not found</p>
			</div>
		);
	}

	const PolicyIcon = policyType.icon;
	const privilege = policy.privilege ?? 'SELECT';
	const privilegeConfig = PRIVILEGE_CONFIG[privilege] ?? PRIVILEGE_CONFIG.SELECT;
	const PrivilegeIcon = privilegeConfig.icon;

	return (
		<form
			onSubmit={handleFormSubmit}
			data-chat-component='policy-edit-card'
			data-chat-policy-type={policy.policyType ?? ''}
			data-chat-privilege={policy.privilege ?? ''}
			data-chat-table-name={tableName}
			data-chat-enabled={String(state.isEnabled)}
			data-chat-permissive={String(state.isPermissive)}
			className='flex h-full flex-col'
		>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='space-y-6 p-6'>
					{/* Policy Header */}
					<div className='space-y-4'>
						<div className='flex items-start gap-3'>
							<div className='bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg'>
								<PolicyIcon className='text-primary size-5' />
							</div>
							<div className='min-w-0 flex-1'>
								<div className='flex items-center gap-2'>
									<h3 className='text-balance font-semibold'>{policyType.title}</h3>
									<span
										className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
											${privilegeConfig.bg} ${privilegeConfig.text}`}
									>
										<PrivilegeIcon className='size-3' />
										{privilegeConfig.label}
									</span>
								</div>
								<p className='text-muted-foreground text-sm'>{policyType.description}</p>
							</div>
						</div>

						{/* Policy Diagram */}
						<ResponsiveDiagram>
							<PolicyDiagramByKey
								diagramKey={policyType.diagramKey ?? 'AuthzAllowAll'}
								tableName={tableName}
								config={state.policyData}
							/>
						</ResponsiveDiagram>
					</div>

					{/* Status */}
					<div className='space-y-3'>
						<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Settings</p>
						<div className='flex items-center justify-between'>
							<span className='text-sm font-medium'>Policy Status</span>
							<div className='flex items-center gap-2'>
								<Switch
									id='policy-enabled'
									checked={state.isEnabled}
									onCheckedChange={(checked) => updateState({ isEnabled: checked })}
									disabled={updatePolicyMutation.isPending}
								/>
								<span className='text-muted-foreground w-16 text-sm'>{state.isEnabled ? 'Enabled' : 'Disabled'}</span>
							</div>
						</div>
					</div>

					{/* Access Rule Config */}
					<div className='space-y-3'>
						<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Access Rule Config</p>
						{isCompositePolicy ? (
							<CompositePolicyBuilder
								value={compositeData as CompositePolicyData}
								onChange={handleCompositeChange}
								policyTypes={policyTypes}
								disabled={updatePolicyMutation.isPending}
							/>
						) : (
							<PolicyConfigForm
								policyType={policyType}
								value={state.policyData}
								onChange={updatePolicyData}
								disabled={updatePolicyMutation.isPending}
								hideAutoGeneratedInfo
							/>
						)}
					</div>
				</div>
			</ScrollArea>

			<div className='flex justify-between border-t px-4 py-3'>
				<Button
					type='button'
					variant='ghost'
					onClick={handleDelete}
					disabled={isLoading}
					className='text-destructive hover:text-destructive hover:bg-destructive/10'
				>
					{deletePolicyMutation.isPending ? (
						<Loader2Icon className='mr-1.5 size-4 animate-spin' />
					) : (
						<Trash2 className='mr-1.5 size-4' />
					)}
					{deletePolicyMutation.isPending ? 'Deleting...' : 'Delete'}
				</Button>
				<div className='flex gap-2'>
					<Button type='button' variant='outline' onClick={() => card.close()} disabled={isLoading}>
						Cancel
					</Button>
					<Button type='submit' disabled={isLoading || !hasAnyChanges}>
						{updatePolicyMutation.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
						{updatePolicyMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</div>
		</form>
	);
};
