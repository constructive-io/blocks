'use client';

import { CardStackProvider, CardStackViewport } from '@constructive-io/ui/stack';
import { MotionConfig } from 'motion/react';

import { SchemaBuilderProvider } from '../core/context';
import type { SchemaBuilderProps } from '../types';
import { cn } from '../lib/utils';
import { ClientOnly } from '../schema/schema-builder/components/client-only';
import { SchemasRoute } from '../schema/schema-builder/components/schemas/schemas-route';
import { SchemaBuilderDataProvider } from '../schema/schema-builder-core/lib/gql/hooks/schema-builder';

export function SchemaBuilder({ className, emptyState, ...host }: SchemaBuilderProps) {
  return (
    <MotionConfig reducedMotion='user'>
      <SchemaBuilderProvider {...host}>
        <CardStackProvider layoutMode='side-by-side' defaultPeekOffset={48}>
          <SchemaBuilderDataProvider>
            <div
              className={cn('relative flex h-full min-h-0 w-full flex-col', className)}
              data-color-mode={host.colorMode}
              data-schema-builder='root'
            >
              <SchemasRoute emptyState={emptyState} />
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
