import { ShieldAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { SinkCard } from './sink-card';

export function SchemaTabsCard() {
  return (
    <SinkCard title="Schema tabs" contentClassName="px-0 py-0">
      <Tabs defaultValue="columns" className="gap-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="columns" className="px-4 py-3">
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            <li className="flex justify-between">
              <span>id</span>
              <span className="text-muted-foreground">uuid · pk</span>
            </li>
            <li className="flex justify-between">
              <span>email</span>
              <span className="text-muted-foreground">text · unique</span>
            </li>
            <li className="flex justify-between">
              <span>created_at</span>
              <span className="text-muted-foreground">timestamptz</span>
            </li>
          </ul>
        </TabsContent>
        <TabsContent value="indexes" className="px-4 py-3">
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            <li className="flex justify-between">
              <span>users_email_key</span>
              <span className="text-muted-foreground">btree (email)</span>
            </li>
            <li className="flex justify-between">
              <span>users_created_at_idx</span>
              <span className="text-muted-foreground">btree (created_at)</span>
            </li>
          </ul>
        </TabsContent>
        <TabsContent value="policies" className="px-4 py-3">
          <Alert variant="warning">
            <ShieldAlert aria-hidden />
            <AlertTitle>No policies</AlertTitle>
            <AlertDescription>RLS is enabled but this table has no policies — all access is denied.</AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </SinkCard>
  );
}
