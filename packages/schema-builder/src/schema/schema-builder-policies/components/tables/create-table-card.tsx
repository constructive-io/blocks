'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { useCardStack, type CardComponent, type CardId } from '@constructive-io/ui/stack';
import { Stepper, StepperIndicator, StepperItem, StepperTitle } from '@constructive-io/ui/stepper';
import { showErrorToast, showSuccessToast } from '@constructive-io/ui/toast';
import { Check, Circle, Grid3X3, Loader2Icon } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useCreateTable } from '../../lib/gql/hooks/schema-builder/use-create-table';
import { mapConditionNodeToAst } from '@/blocks/schema/schema-builder-core/lib/policies/ast-helpers';
import { cn } from '@/lib/utils';
// Note: Using string for selectedModel since policy types come from dynamic registry
// and may include types not in the static AccessModelId type
import {
	createEmptyCompositePolicyData,
	type CompositePolicyData,
} from '../policies/composite-policy-builder';
import {
	buildNodeData,
	getFieldsRequiringColumns,
	injectSchemaFields,
	injectSchemaFieldsIntoCompositeTree,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-config';
import { PolicyConfigContent } from '../policies/policy-config-card';
import { PolicyDiagramByKey } from '../policies/policy-diagram';
import { getDefaultFormValues, useCreateTableWithPolicies, usePolicyTypes } from '../policies/policy-hooks';
import { PolicyKnowMoreCard, type PolicyKnowMoreCardProps } from '../policies/policy-know-more-card';
import type { CrudOperation, MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';
import { useCrudPolicyState } from '../policies/use-crud-policy-state';

export interface CreateTableCardProps {
	/** Mode: 'create-table' creates new table with policies, 'add-policies' adds policies to existing table */
	mode?: 'create-table' | 'add-policies';
	/** Required when mode='add-policies': the existing table ID */
	tableId?: string;
	/** Used as table name when mode='add-policies', or as initial value when mode='create-table' */
	tableName?: string;
	/** Pre-select only this operation in the config step (used when adding policy for specific CRUD operation) */
	preSelectedOperation?: CrudOperation;
	onTableCreated?: (table: { id: string; name: string }) => void;
	/** Called when policies are created for an existing table (when mode='add-policies') */
	onPoliciesCreated?: () => void;
}

type WizardStep = 'select' | 'config';

interface PolicyTypeCardProps {
	policyType: MergedPolicyType;
	tableName: string;
	isSelected: boolean;
	onSelect: () => void;
	onKnowMore: () => void;
}

function PolicyTypeCard({ policyType, tableName, isSelected, onSelect, onKnowMore }: PolicyTypeCardProps) {
	const Icon = policyType.icon;

	const handleKnowMoreClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onKnowMore();
	};

	return (
		<div
			data-testid={`policy-card-${policyType.name}`}
			data-chat-component='policy-type-card'
			data-chat-policy-type={policyType.name}
			data-chat-policy-title={policyType.title}
			data-chat-policy-description={policyType.description}
			data-chat-selected={String(isSelected)}
			className={cn(
				`relative flex w-full flex-col gap-3 rounded-lg border p-4 text-left
				transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out
				motion-safe:has-[:active]:scale-[0.96]`,
				isSelected
					? 'border-primary bg-primary/5 ring-primary/20 ring-2'
					: 'border-border/60 hover:border-border hover:bg-muted/50',
			)}
		>
			<button
				type='button'
				onClick={onSelect}
				aria-label={`Select ${policyType.title}`}
				aria-pressed={isSelected}
				className='absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
			/>
			<div className='pointer-events-none relative z-10 contents'>
			{/* Diagram on top - fixed height for consistency */}
			<div className='flex h-28 items-center justify-center'>
				<ResponsiveDiagram className='h-full w-full [&>div]:border-0'>
					<PolicyDiagramByKey diagramKey={policyType.diagramKey ?? 'AuthzAllowAll'} tableName={tableName || 'table'} />
				</ResponsiveDiagram>
			</div>

			{/* Title and description */}
			<div className='flex items-start gap-3'>
				<Icon className={cn('h-5 w-5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />

				<div className='min-w-0 flex-1'>
					<p className={cn('text-sm font-semibold', isSelected && 'text-primary')}>{policyType.title}</p>
					<p className='text-muted-foreground mt-0.5 line-clamp-2 text-pretty text-xs leading-relaxed'>{policyType.description}</p>
					<button
						type='button'
						data-testid={`policy-know-more-${policyType.name}`}
						onClick={handleKnowMoreClick}
						className='text-primary hover:text-primary/80 pointer-events-auto relative z-20 mt-1 inline-flex min-h-10 cursor-pointer
							items-center gap-1 rounded-lg pr-2 text-xs font-medium transition-[color,scale] duration-150 ease-out
							motion-safe:active:scale-[0.96]'
					>
						Know More →
					</button>
				</div>

				<div className='shrink-0'>
					{isSelected ? (
						<span className='bg-primary flex h-5 w-5 items-center justify-center rounded-full'>
							<Check className='h-3 w-3 text-white' />
						</span>
					) : (
						<Circle className='text-muted-foreground/40 h-5 w-5' />
					)}
				</div>
			</div>
			</div>
		</div>
	);
}

function BlankTableCard({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
	return (
		<button
			type='button'
			onClick={onSelect}
			className={cn(
				`relative flex w-full flex-col gap-3 rounded-lg border p-4 text-left
				transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.96]`,
				isSelected
					? 'border-primary bg-primary/5 ring-primary/20 ring-2'
					: 'border-border/60 hover:border-border hover:bg-muted/30 border-dashed',
			)}
		>
			{/* Simple diagram area with icon */}
			<div
				className={cn(
					'flex h-28 items-center justify-center rounded-lg border border-dashed',
					isSelected ? 'border-primary/30 bg-primary/5' : 'border-border/40 bg-muted/20',
				)}
			>
				<div
					className={cn(
						'flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed',
						isSelected ? 'border-primary/40 bg-primary/10' : 'border-muted-foreground/20 bg-muted/30',
					)}
				>
					<Grid3X3 className={cn('h-7 w-7', isSelected ? 'text-primary/60' : 'text-muted-foreground/40')} />
				</div>
			</div>

			{/* Title and description */}
			<div className='flex items-start gap-3'>
				<Grid3X3 className={cn('h-5 w-5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />

				<div className='min-w-0 flex-1'>
					<p className={cn('text-sm font-semibold', isSelected && 'text-primary')}>Custom Table (Blank)</p>
					<p className='text-muted-foreground mt-0.5 text-pretty text-xs leading-relaxed'>
						No fields or RLS policies will be pre-created.
					</p>
				</div>

				<div className='shrink-0'>
					{isSelected ? (
						<span className='bg-primary flex h-5 w-5 items-center justify-center rounded-full'>
							<Check className='h-3 w-3 text-white' />
						</span>
					) : (
						<Circle className='text-muted-foreground/40 h-5 w-5' />
					)}
				</div>
			</div>
		</button>
	);
}

export const CreateTableCard: CardComponent<CreateTableCardProps> = ({
	mode = 'create-table',
	tableId,
	tableName: propTableName,
	preSelectedOperation,
	onTableCreated,
	onPoliciesCreated,
	card,
}) => {
	const isAddPoliciesMode = mode === 'add-policies';

	// Form state
	const [tableNameInput, setTableNameInput] = useState(propTableName ?? '');
	const [tableNameTouched, setTableNameTouched] = useState(false);
	const [selectedModel, setSelectedModel] = useState<string | null>(null);
	const [wizardStep, setWizardStep] = useState<WizardStep>('select');
	const [knowMoreCardId, setKnowMoreCardId] = useState<CardId | null>(null);

	// Track if defaults have been initialized with policyType defaults
	const [defaultsInitialized, setDefaultsInitialized] = useState(false);

	// Track scroll position to show/hide shadow on sticky table name
	const [isScrolled, setIsScrolled] = useState(false);

	const scrollAreaRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;
		const viewport = node.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
		if (!viewport) return;

		const handleScroll = () => setIsScrolled(viewport.scrollTop > 0);
		const removeScrollListener = () => viewport.removeEventListener('scroll', handleScroll);
		handleScroll();
		viewport.addEventListener('scroll', handleScroll, { passive: true });
		return removeScrollListener;
	}, []);

	// In add-policies mode, use the prop tableName; otherwise use state
	const effectiveTableName = isAddPoliciesMode ? (propTableName ?? '') : tableNameInput;

	const stack = useCardStack();

	const { currentDatabase, currentSchema } = useSchemaBuilderSelectors();
	const databaseId = currentDatabase?.databaseId ?? '';
	const schemaId = currentDatabase?.schemaId ?? '';

	const createTableMutation = useCreateTable();
	const { policyTypes, error: policyTypesError } = usePolicyTypes();
	const { createTableWithPolicies, isCreating } = useCreateTableWithPolicies();

	// CRUD policy state management - if preSelectedOperation is set, only enable that operation
	const { defaults, operations, updateDefaults, getEnabledOperations } = useCrudPolicyState(
		undefined,
		preSelectedOperation ? [preSelectedOperation] : undefined,
	);

	// Get selected policy type
	const selectedPolicyType = useMemo(
		() => (selectedModel ? policyTypes.find((pt) => pt.name === selectedModel) : null),
		[selectedModel, policyTypes],
	);

	const isCompositePolicy = selectedModel === 'AuthzComposite';

	// Initialize defaults.policyData with default values when policyType loads
	useEffect(() => {
		if (selectedPolicyType && !defaultsInitialized) {
			// For composite policies, initialize with tree structure containing one default condition
			const defaultPolicyData = isCompositePolicy
				? createEmptyCompositePolicyData('AuthzDirectOwner', getDefaultFormValues(policyTypes[0] ?? selectedPolicyType))
				: getDefaultFormValues(selectedPolicyType);
			updateDefaults({ policyData: defaultPolicyData });
			setDefaultsInitialized(true);
		}
	}, [selectedPolicyType, policyTypes, defaultsInitialized, updateDefaults, isCompositePolicy]);

	// Reset defaults when selection changes
	useEffect(() => {
		setDefaultsInitialized(false);
	}, [selectedModel]);

	const existingTableNames = useMemo(
		() => new Set((currentSchema?.tables || []).map((t) => t.name.toLowerCase())),
		[currentSchema?.tables],
	);

	const tableNameError = useMemo(() => {
		// In add-policies mode, table name is already valid (comes from existing table)
		if (isAddPoliciesMode) return null;

		const trimmed = tableNameInput.trim();
		if (!trimmed) return 'Table name is required';
		if (existingTableNames.has(trimmed.toLowerCase())) return 'Table name already exists';
		if (!/^[a-z_][a-z0-9_]*$/i.test(trimmed)) return 'Use letters, numbers, and underscores only';
		return null;
	}, [tableNameInput, existingTableNames, isAddPoliciesMode]);

	const isTableNameValid = tableNameError === null;
	// In add-policies mode, can proceed if a non-blank model is selected
	// In create-table mode, need valid table name and a selected model
	const canProceed = isAddPoliciesMode
		? selectedModel !== null && selectedModel !== 'blank'
		: isTableNameValid && selectedModel !== null;

	// Composite validity reported by CompositePolicyBuilder via onValidChange callback
	const [compositeValid, setCompositeValid] = useState(false);
	const hasValidCompositeConditions = !isCompositePolicy || compositeValid;

	// Create table with policies
	const handleCreateWithPolicies = useCallback(async () => {
		if (!selectedPolicyType || !databaseId || !schemaId) return;

		const enabledOps = getEnabledOperations();
		if (enabledOps.length === 0) return;

		// Validate composite policy has at least one condition
		if (isCompositePolicy && !hasValidCompositeConditions) return;

		// Prepare operations with injected schema fields in policyData (only enabled ones)
		const preparedOperations = { ...operations };
		for (const op of enabledOps) {
			preparedOperations[op] = {
				...operations[op],
				policyData: injectSchemaFields(operations[op].policyData, schemaId, selectedPolicyType.name),
			};
		}

		// Build table module data from defaults policyData (field name customizations)
		const nodeData = buildNodeData(defaults.policyData, selectedPolicyType);

		// Extract field name overrides for 'needs-fields' category policies
		const fieldNameOverrides: Record<string, string | string[]> = {};
		if (selectedPolicyType.category === 'needs-fields') {
			const fieldsToCreate = getFieldsRequiringColumns(selectedPolicyType.name);
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
		const enrichedTree = isCompositePolicy ? injectSchemaFieldsIntoCompositeTree(compositeData, schemaId) : undefined;
		const sharedPolicyData = isCompositePolicy
			? (mapConditionNodeToAst(enrichedTree!) ?? {})
			: injectSchemaFields(defaults.policyData, schemaId, selectedPolicyType.name);

		try {
			const result = await createTableWithPolicies({
				databaseId,
				schemaId,
				tableId: isAddPoliciesMode ? tableId : undefined,
				tableName: effectiveTableName.trim(),
				policyType: selectedPolicyType.name,
				dataNodeType: selectedPolicyType.dataNodeType,
				nodeData,
				sharedPolicyData,
				operations: preparedOperations,
				enabledOperations: enabledOps,
				fieldNameOverrides,
				compositeTree: enrichedTree,
			});

			if (isAddPoliciesMode) {
				showSuccessToast({
					message: 'Policies created successfully!',
					description: `${enabledOps.length} policies have been added to "${effectiveTableName}".`,
				});
				onPoliciesCreated?.();
			} else {
				showSuccessToast({
					message: 'Table created successfully!',
					description: `Table "${result.tableName}" with ${enabledOps.length} policies has been created.`,
				});
				onTableCreated?.({ id: result.tableId, name: result.tableName });
			}

			// Reset form state and close
			setTableNameInput('');
			setTableNameTouched(false);
			setSelectedModel(null);
			setWizardStep('select');
			card.close();
		} catch (error) {
			showErrorToast({
				message: isAddPoliciesMode ? 'Failed to create policies' : 'Failed to create table',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	}, [
		selectedPolicyType,
		databaseId,
		schemaId,
		getEnabledOperations,
		isCompositePolicy,
		hasValidCompositeConditions,
		operations,
		defaults.policyData,
		createTableWithPolicies,
		isAddPoliciesMode,
		tableId,
		effectiveTableName,
		onPoliciesCreated,
		onTableCreated,
		card,
	]);

	// Handle Next button click - always go to config step
	const handleNext = useCallback(() => {
		if (!selectedModel || selectedModel === 'blank') return;

		// Close Know More card if open
		if (knowMoreCardId && stack.has(knowMoreCardId)) {
			stack.dismiss(knowMoreCardId, { cascade: false });
			setKnowMoreCardId(null);
		}

		// Always show config step (even for policies with no config, they see policy info)
		setWizardStep('config');
	}, [selectedModel, knowMoreCardId, stack]);

	// Update Know More card when selection changes
	useEffect(() => {
		if (!knowMoreCardId) return;
		if (!stack.has(knowMoreCardId)) {
			setKnowMoreCardId(null);
			return;
		}

		// If blank is selected or no selection, close Know More
		if (!selectedModel || selectedModel === 'blank') {
			stack.dismiss(knowMoreCardId, { cascade: false });
			setKnowMoreCardId(null);
			return;
		}

		// Find the policy type for the current selection
		if (selectedPolicyType) {
			stack.updateProps<PolicyKnowMoreCardProps>(knowMoreCardId, {
				policyType: selectedPolicyType,
				onApply: handleNext,
			});
		}
	}, [knowMoreCardId, selectedModel, stack, selectedPolicyType, handleNext]);

	// Handle Know More card
	const handleKnowMore = (policyType: MergedPolicyType) => {
		// Select this policy type
		setSelectedModel(policyType.name);

		// If Know More card already open, just update it (handled by useEffect)
		if (knowMoreCardId && stack.has(knowMoreCardId)) {
			return;
		}

		// Push Know More card
		const pushedId = card.push({
			id: `know-more-${policyType.name}`,
			title: 'Policy Details',
			Component: PolicyKnowMoreCard,
			props: {
				policyType,
				onApply: handleNext, // handleNext will create directly or show config step
			},
			onClose: () => {
				setKnowMoreCardId(null);
			},
			width: 420,
		});

		setKnowMoreCardId(pushedId);
	};

	// Handle blank table creation directly (only in create-table mode)
	const handleCreateBlankTable = async () => {
		if (!isTableNameValid || !databaseId || !schemaId || isAddPoliciesMode) return;

		try {
			const result = await createTableMutation.mutateAsync({
				name: tableNameInput.trim(),
				databaseId,
				schemaId,
				useRls: true,
			});

			showSuccessToast({
				message: 'Table created successfully!',
				description: `Table "${result.name}" has been created with RLS enabled.`,
			});

			onTableCreated?.(result);
			// Reset form state before closing
			setTableNameInput('');
			setTableNameTouched(false);
			setSelectedModel(null);
			card.close();
		} catch (error) {
			showErrorToast({
				message: 'Failed to create table',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	const handleSubmit = () => {
		if (selectedModel === 'blank' && !isAddPoliciesMode) {
			handleCreateBlankTable();
		} else {
			handleNext();
		}
	};

	const handleBack = () => {
		setWizardStep('select');
	};

	const isLoading = createTableMutation.isPending || isCreating;

	// Determine button text and disabled state based on wizard step
	const getButtonConfig = () => {
		if (wizardStep === 'config') {
			return {
				text: isAddPoliciesMode ? 'Create Policy' : 'Create Table',
				disabled: isLoading || (isCompositePolicy && !hasValidCompositeConditions),
				action: handleCreateWithPolicies,
			};
		}
		// Select step
		if (selectedModel === 'blank' && !isAddPoliciesMode) {
			return {
				text: 'Create Table',
				disabled: !canProceed || isLoading,
				action: handleSubmit,
			};
		}
		return {
			text: 'Next',
			disabled: !canProceed || isLoading,
			action: handleSubmit,
		};
	};

	const buttonConfig = getButtonConfig();

	return (
		<div className='flex h-full flex-col'>
			{/* Stepper - always visible, centered */}
			<div className='flex justify-center border-b px-6 py-4'>
				<Stepper value={wizardStep === 'select' ? 1 : 2} className='inline-flex !w-auto items-start'>
					<StepperItem step={1}>
						<div className='flex flex-col items-center gap-1'>
							<StepperIndicator />
							<StepperTitle className='text-xs whitespace-nowrap'>Select Policy</StepperTitle>
						</div>
					</StepperItem>
					{/* Connector line - vertically centered with indicators (size-6 = 24px, center at 12px) */}
					<div className='bg-border -mx-1 mt-[11px] h-px w-20 shrink-0' />
					<StepperItem step={2}>
						<div className='flex flex-col items-center gap-1'>
							<StepperIndicator />
							<StepperTitle className='text-xs whitespace-nowrap'>Configure Policy</StepperTitle>
						</div>
					</StepperItem>
				</Stepper>
			</div>

			{/* Table Name Input - sticky above scroll area, only in create-table mode */}
			{wizardStep === 'select' && !isAddPoliciesMode && (
				<div className={cn('bg-card relative z-10 px-6 pt-6 pb-4 transition-shadow', isScrolled && 'shadow-md')}>
					<Field
						label='Table Name'
						required
						htmlFor='table-name'
						error={tableNameTouched ? (tableNameError ?? undefined) : undefined}
					>
						<Input
							id='table-name'
							data-testid='table-name-input'
							value={tableNameInput}
							onChange={(e) => setTableNameInput(e.target.value)}
							onBlur={() => setTableNameTouched(true)}
							placeholder='e.g., posts, comments, orders'
							autoComplete='off'
							autoFocus
							className={cn('font-mono', tableNameTouched && tableNameError && 'border-destructive')}
						/>
					</Field>
				</div>
			)}

			<ScrollArea ref={scrollAreaRef} className='min-h-0 flex-1'>
				{wizardStep === 'select' ? (
					<div className='space-y-6 p-6 pt-2'>
						{/* Access Model Selection */}
						<div className='space-y-3'>
							<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Select Access Model</p>

							{/* Show error only if no fallback data available */}
							{policyTypesError && policyTypes.length === 0 && (
								<div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30'>
									<p className='text-sm text-red-600 dark:text-red-400'>Failed to load policy types</p>
								</div>
							)}

							{/* Always show policy types (fallback data provides immediate availability) */}
							<div className='grid gap-3 sm:grid-cols-2'>
								{policyTypes.map((policyType) => (
									<PolicyTypeCard
										key={policyType.name}
										policyType={policyType}
										tableName={effectiveTableName.trim()}
										isSelected={selectedModel === policyType.name}
										onSelect={() => setSelectedModel(policyType.name)}
										onKnowMore={() => handleKnowMore(policyType)}
									/>
								))}
								{/* Blank table option - only in create-table mode */}
								{!isAddPoliciesMode && (
									<BlankTableCard isSelected={selectedModel === 'blank'} onSelect={() => setSelectedModel('blank')} />
								)}
							</div>
						</div>
					</div>
				) : (
					<div className='p-6'>
						{selectedPolicyType && (
							<PolicyConfigContent
								policyType={selectedPolicyType}
								policyTypes={policyTypes}
								tableName={effectiveTableName.trim()}
								defaults={defaults}
								updateDefaults={updateDefaults}
								isCreating={isCreating}
								onCompositeValidChange={setCompositeValid}
							/>
						)}
					</div>
				)}
			</ScrollArea>

			<div className='flex justify-end gap-2 border-t p-4'>
				{wizardStep === 'config' ? (
					<>
						<Button variant='outline' onClick={handleBack} disabled={isLoading}>
							Back
						</Button>
						<Button onClick={buttonConfig.action} disabled={buttonConfig.disabled}>
							{isLoading && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
							{isLoading ? 'Creating...' : buttonConfig.text}
						</Button>
					</>
				) : (
					<>
						<Button variant='outline' onClick={() => card.close()} disabled={isLoading}>
							Cancel
						</Button>
						<Button onClick={buttonConfig.action} disabled={buttonConfig.disabled}>
							{isLoading && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
							{isLoading ? 'Creating...' : buttonConfig.text}
						</Button>
					</>
				)}
			</div>
		</div>
	);
};
