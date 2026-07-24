// Storybook glue: a sized <SheetsProvider> wrapper + a one-call renderSheets() helper.
//
// <SheetsProvider> bundles QueryClient + store + context; <Sheets> self-wraps FeedbackProvider.
// Stories render the PUBLIC <Sheets tableName=… __impl="dom"> for fidelity (internal DOM
// components stay unexported). Each render gets its OWN QueryClient so paging/draft state never
// leaks between stories.
import React, { useMemo } from 'react';
import { QueryClient } from '@tanstack/react-query';

import { SheetsProvider } from '../../context/sheets-provider';
import type { SheetsConfig } from '../../context/sheets-context';
import type { SheetsBackendAdapter } from '../../adapter/sheets-adapter';
import { Sheets } from '../../grid/sheets';
import type { SheetsProps } from '../../grid/sheets';
import type { MetaTable } from '../../forms/types';
import type { SheetsRow } from '../../grid/row-model';
import { createMockAdapter } from './mock-adapter';

/** A QueryClient tuned for stories: no retries, fast GC, so loading/error paths show immediately. */
function makeStoryQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false }
		}
	});
}

export interface ProviderHostProps {
	adapter: SheetsBackendAdapter;
	/** Outer container height (the grid fills its parent). Default 600. */
	height?: number | string;
	configOverrides?: Partial<SheetsConfig>;
	children: React.ReactNode;
}

/** Mount children inside a sized <SheetsProvider> wired to a mock adapter. */
export function ProviderHost({ adapter, height = 600, configOverrides, children }: ProviderHostProps) {
	const queryClient = useMemo(makeStoryQueryClient, []);
	const config: SheetsConfig = {
		endpoint: 'mock://sheets',
		auth: { mode: 'embedded', getToken: () => 't' },
		adapter,
		queryClient,
		...configOverrides
	};
	return (
		<div style={{ height, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			<SheetsProvider config={config}>{children}</SheetsProvider>
		</div>
	);
}

/**
 * Storybook decorator: wrap a Story in a sized <SheetsProvider>. The story body is expected to
 * supply its own adapter via context, so this variant is for stories that render <Sheets>
 * directly inside; for the common case prefer renderSheets() below.
 */
export function withSheets(adapter: SheetsBackendAdapter, configOverrides?: Partial<SheetsConfig>, height: number | string = 600) {
	return function SheetsDecorator(Story: React.ComponentType) {
		return (
			<ProviderHost adapter={adapter} height={height} configOverrides={configOverrides}>
				<Story />
			</ProviderHost>
		);
	};
}

export interface RenderSheetsArgs<TRow extends SheetsRow = SheetsRow> {
	table: MetaTable;
	rows: TRow[];
	/** Defaults to table.name — MUST match for the fixture to resolve. */
	tableName?: string;
	height?: number | string;
	delayMs?: number;
	configOverrides?: Partial<SheetsConfig>;
	/** Forwarded to <Sheets>; __impl defaults to 'dom' (the ported path under test). */
	sheetsProps?: Partial<SheetsProps<TRow>>;
}

/** One-call helper: build a mock adapter from (table, rows) and render <Sheets> through it. */
export function renderSheets<TRow extends SheetsRow = SheetsRow>(args: RenderSheetsArgs<TRow>): React.ReactElement {
	const { table, rows, tableName = table.name, height = 600, delayMs, configOverrides, sheetsProps } = args;
	const adapter = createMockAdapter({ table, rows, delayMs });
	return (
		<ProviderHost adapter={adapter} height={height} configOverrides={configOverrides}>
			<Sheets<TRow> tableName={tableName} __impl='dom' {...sheetsProps} />
		</ProviderHost>
	);
}
