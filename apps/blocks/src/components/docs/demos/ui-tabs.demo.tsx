'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Tabs defaultValue="overview" className="w-[420px]">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-pretty font-medium">production-db</p>
            <p className="text-pretty mt-1 text-muted-foreground">
              PostgreSQL 17 · us-east-1 · 12 tables, 4 schemas.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-pretty font-medium">This month</p>
            <p className="text-pretty mt-1 text-muted-foreground">1.2M rows read · 84K rows written · 38 active keys.</p>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="text-pretty font-medium">Access</p>
            <p className="text-pretty mt-1 text-muted-foreground">Row-level security on · 3 roles · public reads disabled.</p>
          </div>
        </TabsContent>
      </Tabs>
    </Demo>
  );
}
