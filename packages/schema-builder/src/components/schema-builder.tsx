'use client';

import { CardStackProvider, CardStackViewport } from '@constructive-io/ui/stack';
import { MotionConfig } from 'motion/react';

import { SchemaBuilderProvider } from '../core/context';
import type { SchemaBuilderProps } from '../types';
import { cn } from '../lib/utils';
import { ClientOnly } from '../schema/schema-builder/components/client-only';
import { SchemasRoute } from '../schema/schema-builder/components/schemas/schemas-route';
import { SchemaBuilderDataProvider } from '../schema/schema-builder-core/lib/gql/hooks/schema-builder';

function assertDataStateMatchesScope(props: SchemaBuilderProps): void {
  if (!props.dataState) return;

  const matchesOrganization = props.dataState.routeOrgId === props.scope.orgId;
  const matchesDatabase = props.dataState.routeDatabaseId === props.scope.databaseId;
  if (!matchesOrganization || !matchesDatabase) {
    throw new Error('SchemaBuilder dataState must match the configured organization and database scope');
  }
}

export function SchemaBuilder(props: SchemaBuilderProps) {
  assertDataStateMatchesScope(props);

  return (
    <MotionConfig reducedMotion='user'>
      <SchemaBuilderProvider
        adapter={props.adapter}
        scope={props.scope}
        colorMode={props.colorMode}
        preferences={props.preferences}
        onPreferencesChange={props.onPreferencesChange}
        activeTab={props.activeTab}
        onActiveTabChange={props.onActiveTabChange}
        selectedTableId={props.selectedTableId}
        onSelectedTableChange={props.onSelectedTableChange}
        onNavigate={props.onNavigate}
        onInvalidate={props.onInvalidate}
        tabs={props.tabs}
      >
        <CardStackProvider layoutMode='side-by-side' defaultPeekOffset={48}>
          <SchemaBuilderDataProvider value={props.dataState}>
            <div
              className={cn('relative flex h-full min-h-0 w-full flex-col', props.className)}
              data-color-mode={props.colorMode}
              data-schema-builder='root'
            >
              <SchemasRoute emptyState={props.emptyState} />
              <ClientOnly>
                <CardStackViewport peekDepth={3} />
              </ClientOnly>
            </div>
          </SchemaBuilderDataProvider>
        </CardStackProvider>
      </SchemaBuilderProvider>
    </MotionConfig>
  );
}
