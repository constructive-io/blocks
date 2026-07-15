'use client';

import { CardStackProvider, CardStackViewport } from '@constructive-io/ui/stack';

import { ClientOnly } from './components/client-only';
import { SchemasRoute } from './components/schemas/schemas-route';
import { SchemaBuilderConfigProvider, type SchemaBuilderConfig } from '@/blocks/schema/schema-builder-core/context/block-config';
import { SchemaBuilderDataProvider } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';

export type SchemaBuilderProps = SchemaBuilderConfig;

/**
 * Self-contained schema builder for a single database: Structure, Relationships,
 * Indexes and Policies tabs. Data flows through the host-provided `@/generated/*`
 * SDKs wired by `<BlocksRuntime>`; this block mounts no QueryClient or auth provider.
 */
export function SchemaBuilder(config: SchemaBuilderProps) {
	return (
		<SchemaBuilderConfigProvider config={config}>
			<CardStackProvider layoutMode='side-by-side' defaultPeekOffset={48}>
				<SchemaBuilderDataProvider>
					<div className='relative flex h-full min-h-0 w-full flex-col'>
						<SchemasRoute />
						<ClientOnly>
							<CardStackViewport peekDepth={3} />
						</ClientOnly>
					</div>
				</SchemaBuilderDataProvider>
			</CardStackProvider>
		</SchemaBuilderConfigProvider>
	);
}
