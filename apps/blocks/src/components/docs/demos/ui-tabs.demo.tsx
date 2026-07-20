'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import { Demo } from '@/components/docs/showcase-kit';

function DatabasePanel({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border bg-background p-4 text-sm">
      <p className="text-pretty font-medium">{title}</p>
      <p className="mt-1 text-pretty text-muted-foreground tabular-nums">{children}</p>
    </div>
  );
}

export function BasicTabsDemo() {
  return (
    <Demo>
      <Tabs defaultValue="overview" className="w-full max-w-[420px]">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <DatabasePanel title="production-db">PostgreSQL 17 · us-east-1 · 12 tables.</DatabasePanel>
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <DatabasePanel title="This month">1.2M rows read · 84K rows written.</DatabasePanel>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <DatabasePanel title="Access">Row-level security on · public reads disabled.</DatabasePanel>
        </TabsContent>
      </Tabs>
    </Demo>
  );
}

export function ControlledTabsDemo() {
  const [value, setValue] = useState('queries');

  return (
    <Demo>
      <div className="flex w-full max-w-[420px] flex-col gap-3">
        <Tabs value={value} onValueChange={setValue}>
          <TabsList>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
          <TabsContent value="queries" className="mt-3">
            <DatabasePanel title="Queries">1.2M requests this month.</DatabasePanel>
          </TabsContent>
          <TabsContent value="storage" className="mt-3">
            <DatabasePanel title="Storage">18.4 GB across all tables.</DatabasePanel>
          </TabsContent>
        </Tabs>
        <p className="text-pretty text-sm text-muted-foreground">Selected tab: {value}</p>
      </div>
    </Demo>
  );
}

export function VerticalTabsDemo() {
  return (
    <Demo>
      <Tabs defaultValue="general" orientation="vertical" className="w-full max-w-xl flex-row items-start gap-4">
        <TabsList className="flex-col">
          <TabsTrigger value="general" className="w-full justify-start">General</TabsTrigger>
          <TabsTrigger value="members" className="w-full justify-start">Members</TabsTrigger>
          <TabsTrigger value="billing" className="w-full justify-start" disabled>Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="min-w-0 flex-1">
          <DatabasePanel title="General settings">Rename the project and choose its default region.</DatabasePanel>
        </TabsContent>
        <TabsContent value="members" className="min-w-0 flex-1">
          <DatabasePanel title="Members">Manage roles and pending invitations.</DatabasePanel>
        </TabsContent>
        <TabsContent value="billing" className="min-w-0 flex-1">
          <DatabasePanel title="Billing">Billing settings are unavailable for this project.</DatabasePanel>
        </TabsContent>
      </Tabs>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicTabsDemo />;
}
