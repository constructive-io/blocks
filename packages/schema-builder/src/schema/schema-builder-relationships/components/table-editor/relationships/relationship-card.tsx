'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import {
	Combobox,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
} from '@constructive-io/ui/combobox';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@constructive-io/ui/select';
import type { CardComponent } from '@constructive-io/ui/stack';
import { Switch } from '@constructive-io/ui/switch';
import { toast } from '@constructive-io/ui/toast';
import { ChevronRight, Info, Loader2 } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDatabasePolicies } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { useRelationProvision } from '../../../lib/gql/hooks/schema-builder/use-relation-provision';
import { useUpdateForeignKey } from '../../../lib/gql/hooks/schema-builder/use-relationship-mutations';
import type {
	FieldDefinition,
	ForeignKeyAction,
	ForeignKeyConstraint,
	RelationshipType,
	TableDefinition,
} from '@/blocks/schema/schema-builder-core/lib/schema';
import { ForeignKeyActionLabels, ForeignKeyActions, RelationshipTypes } from '@/blocks/schema/schema-builder-core/lib/schema';
import { cn } from '@/lib/utils';
import { PolicyConfigForm } from '@/blocks/schema/schema-builder-policies/components/policies/policy-config-form/policy-config-form';
import { getDefaultFormValues, usePolicyTypes } from '@/blocks/schema/schema-builder-policies/components/policies/policy-hooks';
import type { MergedPolicyType } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

import { RelationshipDiagram } from './relationship-diagrams';
import { RelationshipTypeSelector } from './relationship-type-selector';
import type { TableRelationship } from './relationship-utils';

export type RelationshipCardProps = {
	editingRelationship: TableRelationship | null;
	sourceTable?: TableDefinition;
	prefilledSourceTableId?: string;
	prefilledTargetTableId?: string;
};

// =============================================================================
// Table Combobox
// =============================================================================

type TableOption = { value: string; label: string; table: TableDefinition };

function TableCombobox({
	tables,
	value,
	onChange,
	placeholder = 'Select table',
	disabled,
}: {
	tables: TableDefinition[];
	value: string;
	onChange: (tableId: string) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	const options: TableOption[] = tables.map((t) => ({ value: t.id, label: t.name, table: t }));
	const selected = options.find((o) => o.value === value) ?? null;

	return (
		<Combobox
			items={options}
			value={selected}
			onValueChange={(next) => next && onChange(next.value)}
			filter={(item: TableOption, q: string) => item.label.toLowerCase().includes(q.toLowerCase())}
			disabled={disabled}
		>
			<ComboboxInput placeholder={placeholder} showClear={false} />
			<ComboboxPopup>
				<ComboboxEmpty>No tables found</ComboboxEmpty>
				<ComboboxList>
					{(option: TableOption) => (
						<ComboboxItem key={option.value} value={option}>
							{option.label}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}

// =============================================================================
// Field Combobox
// =============================================================================

type FieldOption = { value: string; label: string; field: FieldDefinition };

function FieldCombobox({
	fields,
	value,
	onChange,
	placeholder = 'Select field',
	disabled,
}: {
	fields: FieldDefinition[];
	value: string;
	onChange: (fieldId: string) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	const selectedField = fields.find((f) => f.id === value);
	const options: FieldOption[] = fields.map((f) => ({
		value: f.id,
		label: selectedField?.id === f.id ? `${f.name}  ` : f.name,
		field: f,
	}));
	const selected = options.find((o) => o.value === value) ?? null;

	return (
		<div className='relative'>
			<Combobox
				items={options}
				value={selected}
				onValueChange={(next) => next && onChange(next.value)}
				filter={(item: FieldOption, q: string) => {
					const lower = q.toLowerCase();
					return item.field.name.toLowerCase().includes(lower) || item.field.type.toLowerCase().includes(lower);
				}}
				disabled={disabled}
			>
				<ComboboxInput placeholder={placeholder} showClear={false} />
				<ComboboxPopup>
					<ComboboxEmpty>No fields found</ComboboxEmpty>
					<ComboboxList>
						{(option: FieldOption) => (
							<ComboboxItem key={option.value} value={option}>
								<div className='flex w-full items-center justify-between gap-2'>
									<span>{option.field.name}</span>
									<span className='bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]'>
										{option.field.type}
									</span>
								</div>
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxPopup>
			</Combobox>
			{selectedField && (
				<span
					className='bg-muted text-muted-foreground pointer-events-none absolute top-1/2 right-9 -translate-y-1/2
						rounded px-1.5 py-0.5 font-mono text-[10px]'
				>
					{selectedField.type}
				</span>
			)}
		</div>
	);
}

// =============================================================================
// Relationship Card
// =============================================================================

const isSystemTable = (category?: 'CORE' | 'MODULE' | 'APP') => category === 'CORE' || category === 'MODULE';

export const RelationshipCard: CardComponent<RelationshipCardProps> = ({
	editingRelationship,
	sourceTable: directSourceTable,
	prefilledSourceTableId,
	prefilledTargetTableId,
	card,
}) => {
	const editingConstraint = editingRelationship?.constraint ?? null;
	const { currentSchema, currentTable: selectedTable, currentDatabase } = useSchemaBuilderSelectors();

	const relationProvisionMutation = useRelationProvision();
	const updateForeignKeyMutation = useUpdateForeignKey();
	const { policyTypes } = usePolicyTypes();

	const databaseId = currentDatabase?.databaseId ?? currentSchema?.metadata?.databaseId ?? '';
	const { data: tablesWithPolicies = [] } = useDatabasePolicies(databaseId, { enabled: !!databaseId });

	const tables = currentSchema?.tables || [];

	// Default source table: prop > prefilled > current selected
	const defaultSourceTableId = useMemo(() => {
		if (directSourceTable) return directSourceTable.id;
		if (prefilledSourceTableId) return prefilledSourceTableId;
		return selectedTable?.id || '';
	}, [directSourceTable, prefilledSourceTableId, selectedTable?.id]);

	// Form state
	const [relationshipType, setRelationshipType] = useState<RelationshipType>(RelationshipTypes.ONE_TO_ONE);
	const [sourceTableId, setSourceTableId] = useState(defaultSourceTableId);
	const [sourceFieldId, setSourceFieldId] = useState('');
	const [targetTableId, setTargetTableId] = useState(prefilledTargetTableId || '');
	const [targetFieldId, setTargetFieldId] = useState('');
	const [onDelete, setOnDelete] = useState<ForeignKeyAction>(ForeignKeyActions.NO_ACTION);
	const [junctionTableName, setJunctionTableName] = useState('');
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Advanced fields (for relation provision)
	const [fieldNameOverride, setFieldNameOverride] = useState('');
	const [isRequired, setIsRequired] = useState(true);
	const [useCompositeKey, setUseCompositeKey] = useState(true);

	// M2M advanced fields
	const [sourceFieldName, setSourceFieldName] = useState('');
	const [targetFieldName, setTargetFieldName] = useState('');
	const [exposeInApi, setExposeInApi] = useState(true);
	const [selectedPolicyTypeName, setSelectedPolicyTypeName] = useState('AuthzAllowAll');
	const [policyData, setPolicyData] = useState<Record<string, unknown>>({});

	const isEditMode = editingConstraint !== null;
	const isManyToMany = relationshipType === RelationshipTypes.MANY_TO_MANY;
	const isFkType = !isManyToMany;
	const isM2MEdit = isEditMode && isManyToMany;

	const sourceTable = useMemo(() => tables.find((t) => t.id === sourceTableId), [tables, sourceTableId]);
	const targetTable = useMemo(() => tables.find((t) => t.id === targetTableId), [tables, targetTableId]);

	const availableSourceTables = useMemo(() => tables.filter((t) => !isSystemTable(t.category)), [tables]);

	const availableTargetTables = useMemo(
		() => tables.filter((t) => (isEditMode || t.id !== sourceTableId) && !isSystemTable(t.category)),
		[tables, sourceTableId, isEditMode],
	);

	const sourceFields = sourceTable?.fields || [];
	const targetFields = targetTable?.fields || [];

	const existingTableNames = useMemo(() => new Set(tables.map((t) => t.name.toLowerCase())), [tables]);

	const isJunctionNameTaken = useMemo(
		() => junctionTableName.trim() && existingTableNames.has(junctionTableName.trim().toLowerCase()),
		[junctionTableName, existingTableNames],
	);

	// Derive default policy type from source table's existing policies
	// Priority: read (SELECT) → create/update/delete → AuthzAllowAll
	// Composite policies are mapped to DirectOwner for junction tables
	const inferredPolicyTypeName = useMemo(() => {
		const tableData = tablesWithPolicies.find((t) => t.id === sourceTableId);
		if (!tableData?.policies?.length) return 'AuthzAllowAll';

		const readPolicy = tableData.policies.find((p) => p.privilege === 'SELECT' && p.policyType);
		const resolved = readPolicy?.policyType
			?? tableData.policies.find((p) => p.policyType)?.policyType
			?? 'AuthzAllowAll';

		return resolved === 'AuthzComposite' ? 'AuthzDirectOwner' : resolved;
	}, [tablesWithPolicies, sourceTableId]);

	// Resolved policy type object
	const selectedPolicyType = useMemo<MergedPolicyType | null>(
		() => policyTypes.find((pt) => pt.name === selectedPolicyTypeName) ?? null,
		[policyTypes, selectedPolicyTypeName],
	);

	// Initialize form when editing - use oriented relationship data
	useEffect(() => {
		if (editingRelationship) {
			const { constraint, sourceTable: relSource, targetTable: relTarget, relationshipType: relType } = editingRelationship;
			setOnDelete(constraint.onDelete || ForeignKeyActions.NO_ACTION);
			setRelationshipType(relType);
			setJunctionTableName('');

			if (relType === 'many-to-many') {
				// For M2M: targetTable in the relationship is the junction table
				// The actual target is identified by withTableName
				const actualTarget = tables.find((t) => t.name === editingRelationship.withTableName);
				setTargetTableId(actualTarget?.id || '');
			} else {
				setTargetTableId(relTarget?.id || '');
				// Resolve source/target field IDs from the oriented field names
				const srcField = relSource?.fields.find((f) => f.name === editingRelationship.sourceFieldName);
				const tgtField = relTarget?.fields.find((f) => f.name === editingRelationship.targetFieldName);
				setSourceFieldId(srcField?.id || '');
				setTargetFieldId(tgtField?.id || '');
			}
		}
	}, [editingRelationship, tables]);

	// Reset M2M state when switching type or source table changes
	// Derive M2M edit data from junction table
	const m2mEditInfo = useMemo(() => {
		if (!isM2MEdit || !editingRelationship) return null;
		// In the relationship, targetTable is the junction table
		const junction = editingRelationship.targetTable;
		if (!junction) return null;

		const actualTarget = tables.find((t) => t.name === editingRelationship.withTableName);
		// Source FK = the constraint field name on junction pointing to source
		const srcFkName = editingRelationship.targetFieldName;
		// Target FK = the other FK on junction pointing to actual target
		const junctionFks = (junction.constraints || []).filter(
			(c): c is ForeignKeyConstraint => c.type === 'foreign_key',
		);
		const targetFk = junctionFks.find((c) => c.referencedTable === actualTarget?.id);
		const tgtFkName = targetFk ? junction.fields.find((f) => f.id === targetFk.fields[0])?.name || '' : '';
		// Composite PK detection
		const pk = (junction.constraints || []).find((c) => c.type === 'primary_key');
		const hasCompositePk = pk ? pk.fields.length > 1 : false;

		return { junctionName: junction.name, srcFkName, tgtFkName, hasCompositePk };
	}, [isM2MEdit, editingRelationship, tables]);

	useEffect(() => {
		if (!isManyToMany) {
			setJunctionTableName('');
			setSourceFieldName('');
			setTargetFieldName('');
		}
		// Always sync policy type to inferred value when switching to M2M or source changes
		setSelectedPolicyTypeName(inferredPolicyTypeName);
		setPolicyData({});
	}, [isManyToMany, inferredPolicyTypeName]);

	// Reset policy data when policy type changes
	useEffect(() => {
		if (selectedPolicyType) {
			setPolicyData(getDefaultFormValues(selectedPolicyType));
		}
	}, [selectedPolicyTypeName]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleSourceTableChange = useCallback((tableId: string) => {
		setSourceTableId(tableId);
		// Clear target if it matches new source
		setTargetTableId((prev) => (prev === tableId ? '' : prev));
	}, []);

	const handleTargetTableChange = useCallback((tableId: string) => {
		setTargetTableId(tableId);
		setTargetFieldId('');
	}, []);

	const handleSave = useCallback(async () => {
		if (!sourceTable) {
			toast.error({ message: 'No source table selected' });
			return;
		}
		if (!targetTableId) {
			toast.error({ message: 'Please select a target table' });
			return;
		}

		// M2M creation
		if (isManyToMany) {
			try {
				await relationProvisionMutation.mutateAsync({
					relationshipType,
					sourceTableId: sourceTable.id,
					targetTableId,
					...(junctionTableName.trim() && { junctionTableName: junctionTableName.trim() }),
					useCompositeKey,
					exposeInApi,
					...(sourceFieldName.trim() && { sourceFieldName: sourceFieldName.trim() }),
					...(targetFieldName.trim() && { targetFieldName: targetFieldName.trim() }),
					policyType: selectedPolicyTypeName,
					policyData,
					policyTypeObj: selectedPolicyType ?? undefined,
				});
				toast.success({
					message: 'Many-to-many relationship created',
					description: junctionTableName.trim()
						? `Junction table "${junctionTableName}" created.`
						: 'Junction table created.',
				});
				card.close();
			} catch (error) {
				toast.error({
					message: 'Failed to create relationship',
					description: error instanceof Error ? error.message : 'An error occurred',
				});
			}
			return;
		}

		// Edit FK - only on delete action is editable
		if (isEditMode && editingConstraint) {
			try {
				await updateForeignKeyMutation.mutateAsync({
					id: editingConstraint.id,
					deleteAction: onDelete,
				});
				toast.success({ message: 'Relationship updated' });
				card.close();
			} catch (error) {
				toast.error({
					message: 'Failed to update relationship',
					description: error instanceof Error ? error.message : 'An error occurred',
				});
			}
			return;
		}

		// Create FK via provision
		try {
			await relationProvisionMutation.mutateAsync({
				relationshipType,
				sourceTableId: sourceTable.id,
				targetTableId,
				deleteAction: onDelete,
				...(fieldNameOverride.trim() && { fieldName: fieldNameOverride.trim() }),
				...(isRequired !== undefined && { isRequired }),
			});
			toast.success({ message: 'Relationship created' });
			card.close();
		} catch (error) {
			toast.error({
				message: 'Failed to create relationship',
				description: error instanceof Error ? error.message : 'An error occurred',
			});
		}
	}, [
		sourceTable,
		targetTableId,
		isManyToMany,
		junctionTableName,
		relationshipType,
		onDelete,
		isEditMode,
		editingConstraint,
		fieldNameOverride,
		isRequired,
		useCompositeKey,
		exposeInApi,
		sourceFieldName,
		targetFieldName,
		selectedPolicyTypeName,
		selectedPolicyType,
		policyData,
		relationProvisionMutation,
		updateForeignKeyMutation,
		card,
	]);

	const isPending = relationProvisionMutation.isPending || updateForeignKeyMutation.isPending;

	// Validation
	const canSaveM2M = isManyToMany && sourceTableId && targetTableId;
	const initialOnDelete = editingRelationship?.constraint.onDelete || ForeignKeyActions.NO_ACTION;
	const canSaveEditFK = isEditMode && isFkType && onDelete !== initialOnDelete;
	const canSaveCreateFK = !isEditMode && isFkType && sourceTableId && targetTableId;
	const canSave = canSaveM2M || canSaveEditFK || canSaveCreateFK;

	// Diagram labels
	const sourceTableName = sourceTable?.name || 'source';
	const targetTableName = targetTable?.name || 'target';
	const isOneToMany = relationshipType === RelationshipTypes.ONE_TO_MANY;
	const fkDerivedTable = isOneToMany ? sourceTable : targetTable;
	const diagramFieldName = fieldNameOverride.trim() || (fkDerivedTable ? `${fkDerivedTable.name}_id` : 'fk');
	const diagramJunctionName =
		m2mEditInfo?.junctionName ||
		junctionTableName.trim() ||
		(sourceTable && targetTable ? [sourceTable.name, targetTable.name].sort().join('_') : 'junction');

	// Auto-derived placeholders for M2M FK names
	const sourceFkPlaceholder = sourceTable ? `${sourceTable.name}_id (auto)` : 'Auto-derived';
	const targetFkPlaceholder = targetTable ? `${targetTable.name}_id (auto)` : 'Auto-derived';

	return (
		<div
			data-chat-component='relationship-card'
			data-chat-relationship-type={relationshipType}
			data-chat-source-table={sourceTable?.name ?? ''}
			data-chat-target-table={targetTable?.name ?? ''}
			className='flex h-full flex-col'
		>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='space-y-6 p-6'>
					{/* Type Selector */}
					<RelationshipTypeSelector
						value={relationshipType}
						onChange={setRelationshipType}
						disabled={isEditMode}
					/>

					{/* Configuration */}
					<div className='space-y-4'>
						<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>Connect tables</p>

						{/* Diagram */}
						<RelationshipDiagram
							type={relationshipType}
							sourceTable={sourceTableName}
							targetTable={targetTableName}
							fieldName={isManyToMany ? undefined : diagramFieldName}
							junctionTable={isManyToMany ? diagramJunctionName : undefined}
							sourceFkName={isManyToMany ? (m2mEditInfo?.srcFkName || sourceFieldName.trim() || undefined) : undefined}
							targetFkName={isManyToMany ? (m2mEditInfo?.tgtFkName || targetFieldName.trim() || undefined) : undefined}
						/>

						{/* Source Table */}
						<div className='space-y-1.5'>
							<Label>Source table</Label>
							<TableCombobox
								tables={availableSourceTables}
								value={sourceTableId}
								onChange={handleSourceTableChange}
								placeholder='Select source table'
								disabled={isEditMode}
							/>
						</div>

						{/* Target Table */}
						<div className='space-y-1.5'>
							<Label>Target table</Label>
							<TableCombobox
								tables={availableTargetTables}
								value={targetTableId}
								onChange={handleTargetTableChange}
								placeholder='Select target table'
								disabled={isEditMode}
							/>
						</div>

						{/* M2M basic: PK Strategy */}
						{isManyToMany && (
							<div className='space-y-3'>
								<div className='flex items-center justify-between gap-3'>
									<div className='space-y-0.5'>
										<Label>Use composite primary key</Label>
										<p className='text-muted-foreground text-xs'>
											{(isM2MEdit ? m2mEditInfo?.hasCompositePk : useCompositeKey)
												? 'Each source–target pair can only appear once.'
												: 'Rows get a UUID id — pairs are not enforced as unique.'}
										</p>
									</div>
									<Switch
										checked={isM2MEdit ? m2mEditInfo?.hasCompositePk ?? true : useCompositeKey}
										onCheckedChange={setUseCompositeKey}
										disabled={isM2MEdit}
									/>
								</div>
								<div className='bg-muted/50 rounded-md px-3 py-2 font-mono text-xs'>
									{(isM2MEdit ? m2mEditInfo?.hasCompositePk : useCompositeKey) ? (
										<>
											<span className='text-muted-foreground'>PK</span> ({sourceTable?.name || 'source'}_id,{' '}
											{targetTable?.name || 'target'}_id)
										</>
									) : (
										<>
											<span className='text-muted-foreground'>PK</span> id{' '}
											<span className='text-muted-foreground'>uuid</span>
										</>
									)}
								</div>
							<div className='flex items-center justify-between gap-3'>
								<div className='space-y-0.5'>
									<Label>Expose in GraphQL API</Label>
									<p className='text-muted-foreground text-xs'>
										Makes this many-to-many relation directly queryable in the GraphQL API.
									</p>
								</div>
								<Switch
									checked={isM2MEdit ? editingRelationship?.provision?.exposeInApi ?? true : exposeInApi}
									onCheckedChange={setExposeInApi}
									disabled={isM2MEdit}
								/>
							</div>
							</div>
						)}

						{/* M2M edit mode: readonly junction details */}
						{isM2MEdit && m2mEditInfo && (
							<>
								<div className='space-y-1.5'>
									<Label>Junction table name</Label>
									<Input value={m2mEditInfo.junctionName} disabled />
								</div>
								<div className='space-y-1.5'>
									<Label>Source FK name</Label>
									<Input value={m2mEditInfo.srcFkName} disabled />
								</div>
								<div className='space-y-1.5'>
									<Label>Target FK name</Label>
									<Input value={m2mEditInfo.tgtFkName} disabled />
								</div>
							</>
						)}

						{/* Edit mode: source/target field selectors */}
						{isEditMode && isFkType && (
							<>
								<div className='space-y-1.5'>
									<Label>Source field</Label>
									<FieldCombobox
										fields={sourceFields}
										value={sourceFieldId}
										onChange={setSourceFieldId}
										placeholder='Select field'
										disabled
									/>
								</div>

								<div className='space-y-1.5'>
									<Label>Target field</Label>
									<FieldCombobox
										fields={targetFields}
										value={targetFieldId}
										onChange={setTargetFieldId}
										placeholder='Select field'
										disabled
									/>
								</div>
							</>
						)}

						{/* On Delete */}
						{isFkType && (
							<div className='space-y-1.5'>
								<Label>On delete</Label>
								<Select value={onDelete} onValueChange={(v) => setOnDelete(v as ForeignKeyAction)}>
									<SelectTrigger>
										<span>{ForeignKeyActionLabels[onDelete]}</span>
									</SelectTrigger>
									<SelectContent>
										{Object.entries(ForeignKeyActions).map(([key, value]) => (
											<SelectItem key={key} value={value}>
												{ForeignKeyActionLabels[value]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Advanced (create mode only) */}
					{!isEditMode && (
						<div className='border-border/60 rounded-lg border'>
							<button
								type='button'
								onClick={() => setShowAdvanced(!showAdvanced)}
								className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium'
							>
								<ChevronRight
									className={cn('text-muted-foreground h-4 w-4 transition-transform', showAdvanced && 'rotate-90')}
								/>
								Advanced
							</button>

							{showAdvanced && (
								<div className='space-y-4 border-t px-4 pt-3 pb-4'>
									{/* FK type advanced: FK column name, nullable */}
									{isFkType && (
										<>
											<div className='space-y-1.5'>
												<Label>Foreign key field name</Label>
												<Input
													value={fieldNameOverride}
													onChange={(e) => setFieldNameOverride(e.target.value)}
													placeholder={targetTable ? `${targetTable.name}_id (auto)` : 'Auto-derived'}
												/>
												<p className='text-muted-foreground text-xs'>
													Leave empty to auto-derive from the target table name.
												</p>
											</div>

											<div className='flex items-center justify-between gap-3'>
												<div className='space-y-0.5'>
													<Label>Foreign key field required</Label>
													<p className='text-muted-foreground text-xs'>Whether the foreign key field is NOT NULL.</p>
												</div>
												<Switch checked={isRequired} onCheckedChange={setIsRequired} />
											</div>
										</>
									)}

									{/* M2M advanced: junction name, FK names, on delete, policy */}
									{isManyToMany && (
										<>
											{/* Junction table name */}
											<div className='space-y-1.5'>
												<Label>Junction table name</Label>
												<Input
													value={junctionTableName}
													onChange={(e) => setJunctionTableName(e.target.value)}
													placeholder={
														sourceTable && targetTable
															? `${[sourceTable.name, targetTable.name].sort().join('_')} (auto)`
															: 'Auto-derived'
													}
													className={isJunctionNameTaken ? 'border-destructive' : ''}
												/>
												{isJunctionNameTaken ? (
													<p className='text-destructive text-xs'>Table name already exists</p>
												) : (
													<p className='text-muted-foreground text-xs'>Leave empty to auto-derive from table names.</p>
												)}
											</div>

											{/* Source FK name */}
											<div className='space-y-1.5'>
												<Label>Source FK name</Label>
												<Input
													value={sourceFieldName}
													onChange={(e) => setSourceFieldName(e.target.value)}
													placeholder={sourceFkPlaceholder}
												/>
											</div>

											{/* Target FK name */}
											<div className='space-y-1.5'>
												<Label>Target FK name</Label>
												<Input
													value={targetFieldName}
													onChange={(e) => setTargetFieldName(e.target.value)}
													placeholder={targetFkPlaceholder}
												/>
											</div>

											{/* Policy type */}
											<div className='space-y-1.5'>
												<Label>Junction table policy</Label>
												<Select value={selectedPolicyTypeName} onValueChange={setSelectedPolicyTypeName}>
													<SelectTrigger>
														<div className='flex items-center gap-2'>
															{selectedPolicyType && (
																<selectedPolicyType.icon className='text-muted-foreground h-4 w-4 shrink-0' />
															)}
															<span>{selectedPolicyType?.title || selectedPolicyTypeName}</span>
														</div>
													</SelectTrigger>
													<SelectContent>
														{policyTypes.filter((pt) => pt.name !== 'AuthzComposite').map((pt) => {
															const Icon = pt.icon;
															return (
																<SelectItem key={pt.name} value={pt.name}>
																	<div className='flex items-center gap-2'>
																		<Icon className='text-muted-foreground h-4 w-4 shrink-0' />
																		<span>{pt.title}</span>
																	</div>
																</SelectItem>
															);
														})}
													</SelectContent>
												</Select>
												{selectedPolicyType && selectedPolicyTypeName === inferredPolicyTypeName && inferredPolicyTypeName !== 'AuthzAllowAll' && (
													<div className='text-muted-foreground flex items-start gap-2 text-xs'>
														<Info className='mt-0.5 h-3 w-3 shrink-0' />
														<span>Inherited from source table&rsquo;s policy.</span>
													</div>
												)}
												{selectedPolicyType && (selectedPolicyTypeName !== inferredPolicyTypeName || inferredPolicyTypeName === 'AuthzAllowAll') && (
													<p className='text-muted-foreground text-xs'>{selectedPolicyType.description}</p>
												)}
											</div>

											{/* Policy config form */}
											{selectedPolicyType &&
												selectedPolicyTypeName !== 'AuthzAllowAll' &&
												(selectedPolicyType.fieldOverrides && Object.keys(selectedPolicyType.fieldOverrides).length > 0 ||
													selectedPolicyType.generatedFields.length > 0) && (
												<div className='space-y-3'>
													<p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
														Policy config
													</p>
													<PolicyConfigForm policyType={selectedPolicyType} value={policyData} onChange={setPolicyData} />
												</div>
											)}
										</>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Footer */}
			<div className='flex justify-end gap-2 border-t px-4 py-3'>
				<Button variant='outline' onClick={() => card.close()} disabled={isPending}>
					{isM2MEdit ? 'Close' : 'Cancel'}
				</Button>
				{!isM2MEdit && (
					<Button onClick={handleSave} disabled={!canSave || isPending}>
						{isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
						{isEditMode ? 'Update Relationship' : 'Create Relationship'}
					</Button>
				)}
			</div>
		</div>
	);
};
