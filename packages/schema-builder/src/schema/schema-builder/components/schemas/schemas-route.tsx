'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@constructive-io/ui/tooltip';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { NoDatabasesEmptyState } from '@/blocks/schema/schema-builder-core/components/databases';
import { ContentFadeIn, SchemaBuilderSkeleton } from '@/blocks/schema/schema-builder-core/components/skeletons';
import { TableEditor } from '@/blocks/schema/schema-builder-fields/components/table-editor/table-editor';
import { RelationshipsView } from '@/blocks/schema/schema-builder-relationships/components/table-editor/relationships';
import { IndexesView } from '@/blocks/schema/schema-builder-indexes/components/table-editor/indexes';
import { PoliciesView } from '@/blocks/schema/schema-builder-policies/components/table-editor/policies';
import { SchemaBuilderHeader } from '../schema-builder-header';

import { ClientOnly } from '../client-only';
import { SchemaBuilderSidebar } from '@/blocks/schema/schema-builder-tables/components/schemas/schema-builder-sidebar';
import { SchemaStateDisplay } from '@/blocks/schema/schema-builder-core/components/schemas/schema-state-display';
import {
	useSchemaBuilderRuntime,
	useSchemaBuilderRuntimeStore,
} from '@/blocks/schema/schema-builder-core/context/block-config';

export function SchemasRoute({ emptyState }: { emptyState?: ReactNode } = {}) {
	const [leftPanelVisible, setLeftPanelVisible] = useState(true);
	const activeTab = useSchemaBuilderRuntimeStore((state) => state.activeTab);
	const showSystemTablesInSidebar = useSchemaBuilderRuntimeStore(
		(state) => state.preferences.showSystemTablesInSidebar,
	);
	const { colorMode, scope, tabs = [], setActiveTab, setPreferences } = useSchemaBuilderRuntime();
	const setShowSystemTablesInSidebar = (show: boolean) =>
		setPreferences((preferences) => ({ ...preferences, showSystemTablesInSidebar: show }));

	const {
		availableSchemas,
		currentSchema,
		currentTable,
		selectTable,
		isLoading,
		error: remoteSchemasError,
		refetch,
	} = useSchemaBuilderSelectors();

	const hasSystemTablesInCurrentSchema = useMemo(() => {
		const tables = currentSchema?.tables ?? [];
		if (tables.length === 0) return false;

		const hasCategoryData = tables.some((table) => table.category !== undefined);
		if (!hasCategoryData) return false;

		return tables.some((table) => table.category !== 'APP');
	}, [currentSchema?.tables]);

	useEffect(() => {
		if (!currentSchema || currentTable) return;

		const firstAppTable = currentSchema.tables.find((table) => table.category === 'APP');
		if (firstAppTable) {
			selectTable(firstAppTable.id, firstAppTable.name);
		}
	}, [currentSchema, currentTable, selectTable]);

	const databaseSchemas = availableSchemas.filter((s) => s.source === 'database');
	const hasDatabases = databaseSchemas.length > 0;
	const showSkeleton = isLoading && !hasDatabases;
	const extensionTab = tabs.find((tab) => tab.id === activeTab);

	const loadingFallback = (
		<div className='bg-background text-foreground flex h-full flex-col overflow-hidden'>
			<SchemaBuilderSkeleton />
		</div>
	);

	return (
		<ClientOnly fallback={loadingFallback}>
			<TooltipProvider>
				<div
					data-chat-component='schemas-route'
					data-chat-active-tab={activeTab}
					className='bg-background text-foreground flex h-full flex-col overflow-hidden'
				>
					{remoteSchemasError && (
						<SchemaStateDisplay
							config={{
								type: 'error',
								message: remoteSchemasError.message,
								error: remoteSchemasError,
								onRetry: refetch,
							}}
						/>
					)}

					{showSkeleton && !remoteSchemasError && <SchemaBuilderSkeleton />}

					{!remoteSchemasError && !showSkeleton && !hasDatabases && (emptyState ?? <NoDatabasesEmptyState />)}

					{!remoteSchemasError && !showSkeleton && hasDatabases && (
						<ContentFadeIn className='flex min-h-0 min-w-0 flex-1'>
							{leftPanelVisible && <SchemaBuilderSidebar showSystemTables={showSystemTablesInSidebar} />}

							<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
								<SchemaBuilderHeader
									leftPanelVisible={leftPanelVisible}
									setLeftPanelVisible={setLeftPanelVisible}
									activeTab={activeTab}
									setActiveTab={setActiveTab}
									showSystemTablesInSidebar={showSystemTablesInSidebar}
									setShowSystemTablesInSidebar={setShowSystemTablesInSidebar}
									hasSystemTablesInCurrentSchema={hasSystemTablesInCurrentSchema}
									tabs={tabs}
								/>

								<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
									{activeTab === 'editor' && <TableEditor />}

									{activeTab === 'relationships' && <RelationshipsView />}

									{activeTab === 'indexes' && <IndexesView />}

									{activeTab === 'security' && <PoliciesView />}

									{extensionTab?.render({ scope, colorMode, selectedTableId: currentTable?.id ?? null })}
								</div>
							</div>
						</ContentFadeIn>
					)}
				</div>
			</TooltipProvider>
		</ClientOnly>
	);
}
