import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
	SchemaBuilderConfigProvider,
	type SchemaBuilderConfig,
	type SchemaBuilderPreferences,
	useSchemaBuilderRuntime,
	useSchemaBuilderRuntimeStore,
} from '../schema/schema-builder-core/context/block-config';

afterEach(cleanup);

const DEFAULT_PREFERENCES: SchemaBuilderPreferences = {
	sidebarSectionsExpanded: { app: true, system: false },
	showSystemTablesInSidebar: false,
	showSystemTablesInVisualizer: false,
	sidebarPinned: false,
	typesLibraryExpanded: true,
};

function createConfig(overrides: Partial<SchemaBuilderConfig> = {}): SchemaBuilderConfig {
	return {
		orgId: 'org-1',
		databaseId: 'db-1',
		userId: 'user-1',
		preferences: DEFAULT_PREFERENCES,
		activeTab: 'editor',
		selectedTableId: 'table-1',
		...overrides,
	};
}

describe('SchemaBuilderConfigProvider host synchronization', () => {
	it('reflects changing scope, selection, preferences, tab and color props', async () => {
		const baseConfig = createConfig();

		function LifecycleProbe() {
			const runtime = useSchemaBuilderRuntime();
			const scopeKey = useSchemaBuilderRuntimeStore((state) => state.scopeKey);
			const activeTab = useSchemaBuilderRuntimeStore((state) => state.activeTab);
			const selectedTableId = useSchemaBuilderRuntimeStore((state) => state.selectedTableId);
			const sidebarPinned = useSchemaBuilderRuntimeStore((state) => state.preferences.sidebarPinned);

			return (
				<output data-testid='runtime-lifecycle'>
					{scopeKey}|{activeTab}|{selectedTableId}|{String(sidebarPinned)}|{runtime.colorMode}
				</output>
			);
		}

		const view = render(
			<SchemaBuilderConfigProvider config={baseConfig}>
				<LifecycleProbe />
			</SchemaBuilderConfigProvider>
		);
		expect(screen.getByTestId('runtime-lifecycle').textContent).toBe(
			'org-1:db-1:user-1|editor|table-1|false|light'
		);

		view.rerender(
			<SchemaBuilderConfigProvider
				config={{
					...baseConfig,
					databaseId: 'db-2',
					preferences: { ...DEFAULT_PREFERENCES, sidebarPinned: true },
					activeTab: 'security',
					selectedTableId: 'table-2',
					colorMode: 'dark',
				}}
			>
				<LifecycleProbe />
			</SchemaBuilderConfigProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('runtime-lifecycle').textContent).toBe(
				'org-1:db-2:user-1|security|table-2|true|dark'
			);
		});
	});
});
