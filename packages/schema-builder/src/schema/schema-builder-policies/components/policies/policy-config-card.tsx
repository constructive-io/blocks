'use client';

import { useEffect, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { type CardComponent } from '@constructive-io/ui/stack';
import { showErrorToast, showSuccessToast } from '@constructive-io/ui/toast';
import { Loader2Icon } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { mapConditionNodeToAst } from '@/blocks/schema/schema-builder-core/lib/policies/ast-helpers';

import {
	CompositePolicyBuilder,
	createEmptyCompositePolicyData,
	type CompositePolicyData,
} from './composite-policy-builder';
import {
	buildNodeData,
	getFieldsRequiringColumns,
	injectSchemaFields,
	injectSchemaFieldsIntoCompositeTree,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { PolicyConfigForm } from './policy-config-form';
import { PolicyDiagramByKey } from './policy-diagram';
import {
	getDefaultFormValues,
	useCreateTableWithPolicies,
	usePolicyType,
	usePolicyTypes,
} from './policy-hooks';
import type { CrudOperation, DefaultPolicyConfig, MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { useCrudPolicyState } from './use-crud-policy-state';

// ============================================================================
// POLICY CONFIG CONTENT (extracted for reuse in wizard)
// ============================================================================

export interface PolicyConfigContentProps {
	policyType: MergedPolicyType;
	policyTypes: MergedPolicyType[];
	tableName: string;
	defaults: DefaultPolicyConfig;
	updateDefaults: (updates: Partial<DefaultPolicyConfig>) => void;
	isCreating: boolean;
	onCompositeValidChange?: (isValid: boolean) => void;
}

/**
 * Reusable config content for policy configuration.
 * Shows policy header, diagram, and config form (composite or regular).
 * Can be embedded in wizard or used in standalone card.
 */
export function PolicyConfigContent({
	policyType,
	policyTypes,
	tableName,
	defaults,
	updateDefaults,
	isCreating,
	onCompositeValidChange,
}: PolicyConfigContentProps) {
	const isCompositePolicy = policyType.name === 'AuthzComposite';
	const PolicyIcon = policyType.icon;

	return (
		<div
			className='space-y-6'
			data-chat-component='policy-config'
			data-chat-policy-type={policyType.name}
			data-chat-policy-title={policyType.title}
			data-chat-policy-description={policyType.description}
			data-chat-table-name={tableName}
		>
			<div className='space-y-4'>
				{/* Policy Header */}
				<div className='flex items-start gap-3'>
					<div className='bg-primary/10 flex size-10 shrink-0 items-center mt-0.5 justify-center rounded-lg'>
						<PolicyIcon className='text-primary size-5' />
					</div>
					<div className='min-w-0 flex-1'>
						<h3 className='text-balance font-semibold'>{policyType.title}</h3>
						<p className='text-muted-foreground text-sm'>{policyType.description}</p>
					</div>
				</div>

				{/* Policy Diagram */}
				<ResponsiveDiagram>
					<PolicyDiagramByKey
						diagramKey={policyType.diagramKey ?? 'AuthzAllowAll'}
						tableName={tableName}
						config={defaults.policyData}
					/>
				</ResponsiveDiagram>
			</div>

			{/* Access Rule Config */}
			<div className='space-y-3'>
				<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Access Rule Config</p>
				{isCompositePolicy ? (
					<CompositePolicyBuilder
						value={defaults.policyData as CompositePolicyData}
						onChange={(policyData) => updateDefaults({ policyData })}
						policyTypes={policyTypes}
						disabled={isCreating}
						onValidChange={onCompositeValidChange}
					/>
				) : (
					<PolicyConfigForm
						policyType={policyType}
						value={defaults.policyData}
						onChange={(policyData) => updateDefaults({ policyData })}
						disabled={isCreating}
					/>
				)}
			</div>
		</div>
	);
}

// ============================================================================
// TABLE POLICY CONFIG CARD
// ============================================================================

export interface TablePolicyConfigCardProps {
	/** If provided, skip table creation and create policies for this existing table */
	tableId?: string;
	tableName: string;
	selectedPolicyType: string;
	/** Pre-select only this operation in the config step */
	preSelectedOperation?: CrudOperation;
	onTableCreated?: (table: { id: string; name: string }) => void;
	/** Called when policies are created for an existing table (when tableId is provided) */
	onPoliciesCreated?: () => void;
	onComplete?: () => void;
}

/**
 * Config card for table policy settings.
 * Shows access rule config and creates all 4 CRUD operation policies by default.
 */
export const TablePolicyConfigCard: CardComponent<TablePolicyConfigCardProps> = ({
	tableId,
	tableName,
	selectedPolicyType,
	preSelectedOperation: _preSelectedOperation,
	onTableCreated,
	onPoliciesCreated,
	onComplete,
	card,
}) => {
	const isAddingToExistingTable = Boolean(tableId);
	const { policyType, isLoading: isPolicyTypeLoading } = usePolicyType(selectedPolicyType);
	const { policyTypes } = usePolicyTypes();
	const { createTableWithPolicies, isCreating } = useCreateTableWithPolicies();
	const isCompositePolicy = selectedPolicyType === 'AuthzComposite';

	const { currentDatabase } = useSchemaBuilderSelectors();
	const databaseId = currentDatabase?.databaseId ?? '';
	const schemaId = currentDatabase?.schemaId ?? '';

	// CRUD policy state management - all 4 operations enabled by default
	const { defaults, operations, updateDefaults, getEnabledOperations } = useCrudPolicyState();

	// Track if defaults have been initialized with policyType defaults
	const [defaultsInitialized, setDefaultsInitialized] = useState(false);

	// Composite validity reported by CompositePolicyBuilder via onValidChange callback
	const [compositeValid, setCompositeValid] = useState(false);
	const hasValidCompositeConditions = !isCompositePolicy || compositeValid;

	// Initialize defaults.policyData with default values when policyType loads
	useEffect(() => {
		if (policyType && !defaultsInitialized) {
			// For composite policies, initialize with tree structure containing one default condition
			const defaultPolicyData = isCompositePolicy
				? createEmptyCompositePolicyData('AuthzDirectOwner', getDefaultFormValues(policyTypes[0] ?? policyType))
				: getDefaultFormValues(policyType);
			updateDefaults({ policyData: defaultPolicyData });
			setDefaultsInitialized(true);
		}
	}, [policyType, policyTypes, defaultsInitialized, updateDefaults, isCompositePolicy]);

	const handleSubmit = async () => {
		const enabledOps = getEnabledOperations();
		if (!policyType || !databaseId || !schemaId || enabledOps.length === 0) return;

		// Validate composite policy has at least one condition
		if (isCompositePolicy && !hasValidCompositeConditions) return;

		// Prepare operations with injected schema fields in policyData (only enabled ones)
		const preparedOperations = { ...operations };
		for (const op of enabledOps) {
			preparedOperations[op] = {
				...operations[op],
				policyData: injectSchemaFields(operations[op].policyData, schemaId, policyType.name),
			};
		}

		// Build table module data from defaults policyData (field name customizations)
		const nodeData = buildNodeData(defaults.policyData, policyType);

		// Extract field name overrides for 'needs-fields' category policies
		const fieldNameOverrides: Record<string, string | string[]> = {};
		if (policyType.category === 'needs-fields') {
			const fieldsToCreate = getFieldsRequiringColumns(policyType.name);
			for (const field of fieldsToCreate) {
				const customName = defaults.policyData[field.key];
				if (Array.isArray(customName) && customName.length > 0) {
					fieldNameOverrides[field.key] = customName;
				} else if (typeof customName === 'string' && customName.trim()) {
					fieldNameOverrides[field.key] = customName;
				}
			}
		}

		// For composite policies, convert tree structure to AST format
		const compositeData = defaults.policyData as CompositePolicyData;
		const enrichedTree = isCompositePolicy
			? injectSchemaFieldsIntoCompositeTree(compositeData, schemaId)
			: undefined;
		const sharedPolicyData = isCompositePolicy
			? (mapConditionNodeToAst(enrichedTree!) ?? {})
			: injectSchemaFields(defaults.policyData, schemaId, policyType.name);

		try {
			const result = await createTableWithPolicies({
				databaseId,
				schemaId,
				tableId,
				tableName,
				policyType: policyType.name,
				dataNodeType: policyType.dataNodeType,
				nodeData,
				sharedPolicyData,
				operations: preparedOperations,
				enabledOperations: enabledOps,
				fieldNameOverrides,
				compositeTree: enrichedTree,
			});

			if (isAddingToExistingTable) {
				showSuccessToast({
					message: 'Policies created successfully!',
					description: `${enabledOps.length} policies have been added to "${tableName}".`,
				});
				onPoliciesCreated?.();
			} else {
				showSuccessToast({
					message: 'Table created successfully!',
					description: `Table "${result.tableName}" with ${enabledOps.length} policies has been created.`,
				});
				onTableCreated?.({ id: result.tableId, name: result.tableName });
			}

			onComplete?.();
			card.close();
		} catch (error) {
			showErrorToast({
				message: isAddingToExistingTable ? 'Failed to create policies' : 'Failed to create table',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isCreating) {
			handleSubmit();
		}
	};

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

	return (
		<form onSubmit={handleFormSubmit} className='flex h-full flex-col'>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='p-6'>
					<PolicyConfigContent
						policyType={policyType}
						policyTypes={policyTypes}
						tableName={tableName}
						defaults={defaults}
						updateDefaults={updateDefaults}
						isCreating={isCreating}
						onCompositeValidChange={setCompositeValid}
					/>
				</div>
			</ScrollArea>

			<div className='flex justify-end gap-2 border-t px-4 py-3'>
				<Button type='button' variant='outline' onClick={() => card.close()} disabled={isCreating}>
					Back
				</Button>
				<Button type='submit' disabled={isCreating || !hasValidCompositeConditions}>
					{isCreating && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
					{isCreating ? 'Creating...' : isAddingToExistingTable ? 'Create Policy' : 'Create Table'}
				</Button>
			</div>
		</form>
	);
};
