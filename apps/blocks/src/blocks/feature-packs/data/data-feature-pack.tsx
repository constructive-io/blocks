'use client';

import * as React from 'react';
import { CircleAlertIcon, DatabaseIcon, RefreshCwIcon } from 'lucide-react';

import { selectConsoleDataTables } from '@constructive-io/data';
import {
  Sheets,
  SheetsProvider,
  SheetsTableSelector,
  useSheetsMeta,
  type SheetsConfig,
  type SheetsEvent,
  type SheetsProps
} from '@constructive-io/sheets';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';

import { FeaturePackPageHeader } from '../shared/feature-pack-ui';

export type DataFeaturePackProps = Readonly<{
  config: SheetsConfig;
  activeTable?: string;
  defaultActiveTable?: string;
  /** Exact `_meta.scope.scope` values that identify application-owned tables. */
  applicationScopes?: readonly string[];
  /** Exact `_meta` table names or `schema.table` identifiers allowed by the host. */
  includeTables?: readonly string[];
  excludeTables?: readonly string[];
  pageSize?: number;
  onActiveTableChange?: (tableName: string) => void;
  onCreateTable?: () => void;
  onEvent?: (event: SheetsEvent) => void;
  sheetsProps?: Omit<SheetsProps, 'tableName' | 'pageSize' | 'onEvent'>;
}>;

function DataExplorer({
  activeTable: controlledActiveTable,
  defaultActiveTable,
  applicationScopes,
  includeTables,
  excludeTables,
  pageSize = 50,
  onActiveTableChange,
  onCreateTable,
  onEvent,
  sheetsProps
}: Omit<DataFeaturePackProps, 'config'>) {
  const metaQuery = useSheetsMeta();
  const [uncontrolledActiveTable, setUncontrolledActiveTable] = React.useState(defaultActiveTable ?? '');
  const tables = React.useMemo(
    () => selectConsoleDataTables(metaQuery.data?._meta?.tables ?? [], {
      applicationScopes,
      includeTables,
      excludeTables
    }),
    [applicationScopes, excludeTables, includeTables, metaQuery.data?._meta?.tables]
  );
  const tableNames = React.useMemo(() => tables.map((table) => table.name), [tables]);
  const requestedTable = controlledActiveTable ?? uncontrolledActiveTable;
  const activeTable = tableNames.includes(requestedTable) ? requestedTable : tableNames[0] ?? '';

  React.useEffect(() => {
    if (!activeTable || activeTable === requestedTable) return;
    if (controlledActiveTable === undefined) setUncontrolledActiveTable(activeTable);
    onActiveTableChange?.(activeTable);
  }, [activeTable, controlledActiveTable, onActiveTableChange, requestedTable]);

  const selectTable = React.useCallback((tableName: string) => {
    if (controlledActiveTable === undefined) setUncontrolledActiveTable(tableName);
    onActiveTableChange?.(tableName);
  }, [controlledActiveTable, onActiveTableChange]);

  if (metaQuery.error) {
    return (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>Application metadata could not be loaded</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-3'>
          <span>{metaQuery.error instanceof Error ? metaQuery.error.message : 'The endpoint did not return compatible metadata.'}</span>
          <Button onClick={() => void metaQuery.refetch()} size='sm' variant='outline'>
            <RefreshCwIcon data-icon='inline-start' />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!metaQuery.isLoading && tableNames.length === 0) {
    return (
      <Card variant='flat'>
        <CardHeader>
          <div className='bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-lg'>
            <DatabaseIcon aria-hidden='true' />
          </div>
          <CardTitle>No application tables</CardTitle>
          <CardDescription>
            Console Kit only shows tables explicitly scoped to the application. Feature-owned, private, and junction tables stay hidden.
          </CardDescription>
        </CardHeader>
        {onCreateTable ? (
          <CardContent>
            <Button onClick={onCreateTable} variant='outline'>Create a table</Button>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return (
    <div className='grid min-h-[36rem] flex-1 overflow-hidden rounded-xl border bg-background lg:grid-cols-[15rem_minmax(0,1fr)]'>
      <aside className='min-h-0 border-b px-4 lg:border-b-0 lg:border-r'>
        <SheetsTableSelector
          activeTable={activeTable}
          isLoading={metaQuery.isLoading}
          onNewTable={onCreateTable}
          onTableChange={selectTable}
          tables={tableNames}
        />
      </aside>
      <div className='flex min-h-[28rem] min-w-0 flex-col overflow-hidden p-3'>
        {activeTable ? (
          <>
            <p className='text-muted-foreground mb-2 text-xs sm:hidden'>Swipe the table horizontally to see more fields and actions.</p>
            <Sheets
              {...sheetsProps}
              className='min-h-0 flex-1'
              onEvent={onEvent}
              pageSize={pageSize}
              tableName={activeTable}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export function DataFeaturePack({ config, ...props }: DataFeaturePackProps) {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6'>
      <FeaturePackPageHeader
        description='Explore and edit application tables discovered from the current Constructive _meta contract.'
        eyebrow='Database'
        title='Data explorer'
      />
      <SheetsProvider config={config}>
        <DataExplorer {...props} />
      </SheetsProvider>
    </div>
  );
}
