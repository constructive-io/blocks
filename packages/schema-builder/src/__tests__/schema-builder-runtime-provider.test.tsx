import { StrictMode, Suspense, useEffect } from 'react';
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

describe('SchemaBuilderConfigProvider store ownership', () => {
	it('keeps one committed store while synchronizing changing config props', async () => {
		const stores = new Set<object>();
		const baseConfig = createConfig();

		function LifecycleProbe() {
			const runtime = useSchemaBuilderRuntime();
			const scopeKey = useSchemaBuilderRuntimeStore((state) => state.scopeKey);
			const activeTab = useSchemaBuilderRuntimeStore((state) => state.activeTab);
			const selectedTableId = useSchemaBuilderRuntimeStore((state) => state.selectedTableId);
			const sidebarPinned = useSchemaBuilderRuntimeStore((state) => state.preferences.sidebarPinned);

			useEffect(() => {
				stores.add(runtime.store);
			}, [runtime.store]);

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
		expect(stores.size).toBe(1);
	});

	it('keeps one committed store through Strict Mode and isolates provider remounts', async () => {
		const firstStores = new Set<object>();
		const secondStores = new Set<object>();

		function StoreCapture({ stores }: { stores: Set<object> }) {
			const { store } = useSchemaBuilderRuntime();
			useEffect(() => {
				stores.add(store);
			}, [store, stores]);
			return null;
		}

		const first = render(
			<StrictMode>
				<SchemaBuilderConfigProvider config={createConfig()}>
					<StoreCapture stores={firstStores} />
				</SchemaBuilderConfigProvider>
			</StrictMode>
		);
		await waitFor(() => expect(firstStores.size).toBe(1));
		first.rerender(
			<StrictMode>
				<SchemaBuilderConfigProvider config={createConfig({ colorMode: 'dark' })}>
					<StoreCapture stores={firstStores} />
				</SchemaBuilderConfigProvider>
			</StrictMode>
		);
		expect(firstStores.size).toBe(1);
		first.unmount();

		render(
			<StrictMode>
				<SchemaBuilderConfigProvider config={createConfig()}>
					<StoreCapture stores={secondStores} />
				</SchemaBuilderConfigProvider>
			</StrictMode>
		);
		await waitFor(() => expect(secondStores.size).toBe(1));
		expect([...secondStores][0]).not.toBe([...firstStores][0]);
	});

	it('does not leak a store from abandoned Suspense work into a committed provider', async () => {
		const suspended = new Promise<never>(() => undefined);
		const abandonedStores = new Set<object>();
		const committedStores = new Set<object>();

		function AbandonedProbe(): never {
			abandonedStores.add(useSchemaBuilderRuntime().store);
			throw suspended;
		}

		function CommittedProbe() {
			const { store } = useSchemaBuilderRuntime();
			const scopeKey = useSchemaBuilderRuntimeStore((state) => state.scopeKey);
			useEffect(() => {
				committedStores.add(store);
			}, [store]);
			return <output data-testid='committed-runtime-scope'>{scopeKey}</output>;
		}

		const view = render(
			<Suspense fallback={<span>loading abandoned runtime</span>}>
				<SchemaBuilderConfigProvider key='abandoned' config={createConfig()}>
					<AbandonedProbe />
				</SchemaBuilderConfigProvider>
			</Suspense>
		);
		expect(screen.getByText('loading abandoned runtime')).toBeTruthy();
		expect(abandonedStores.size).toBeGreaterThan(0);

		view.rerender(
			<Suspense fallback={<span>loading committed runtime</span>}>
				<SchemaBuilderConfigProvider
					key='committed'
					config={createConfig({ databaseId: 'db-committed' })}
				>
					<CommittedProbe />
				</SchemaBuilderConfigProvider>
			</Suspense>
		);

		await waitFor(() => expect(committedStores.size).toBe(1));
		expect(screen.getByTestId('committed-runtime-scope').textContent).toBe(
			'org-1:db-committed:user-1'
		);
		expect(abandonedStores.has([...committedStores][0])).toBe(false);
	});
});
