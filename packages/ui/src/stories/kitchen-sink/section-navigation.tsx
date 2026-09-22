import { useState } from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';

import { Button } from '../../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/collapsible';
import { PageHeader } from '../../components/page-header';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/resizable';
import { ScrollArea, ScrollBar } from '../../components/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/tabs';
import { Section, Specimen } from './sink-layout';

function CollapsibleDemo() {
	const [open, setOpen] = useState(false);
	return (
		<Collapsible open={open} onOpenChange={setOpen} className='w-full rounded-md border'>
			<CollapsibleTrigger className='flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50'>
				Connection pooling
				<ChevronsUpDownIcon className='size-4 text-muted-foreground' />
			</CollapsibleTrigger>
			<CollapsibleContent className='border-t px-4 py-3 text-sm text-muted-foreground'>
				Pooler maintains 20 warm connections and scales to 200 under load.
			</CollapsibleContent>
		</Collapsible>
	);
}

const TAGS = Array.from({ length: 24 }, (_, i) => `index-${String(i + 1).padStart(2, '0')}`);

export function NavigationSection() {
	return (
		<Section id='navigation' index='06' title='Navigation & layout' description='Tabs, disclosure, scroll, and split panes'>
			<Specimen label='Tabs' wide>
				<Tabs defaultValue='overview' className='w-full'>
					<TabsList>
						<TabsTrigger value='overview'>Overview</TabsTrigger>
						<TabsTrigger value='usage'>Usage</TabsTrigger>
						<TabsTrigger value='settings'>Settings</TabsTrigger>
					</TabsList>
					<TabsContent value='overview' className='mt-3 rounded-md border p-3 text-sm text-muted-foreground'>
						PostgreSQL 17 · us-east-1 · 12 tables.
					</TabsContent>
					<TabsContent value='usage' className='mt-3 rounded-md border p-3 text-sm text-muted-foreground'>
						1.2M rows read · 84K rows written this month.
					</TabsContent>
					<TabsContent value='settings' className='mt-3 rounded-md border p-3 text-sm text-muted-foreground'>
						Row-level security on · public reads disabled.
					</TabsContent>
				</Tabs>
			</Specimen>
			<Specimen label='Tabs — vertical' wide>
				<Tabs defaultValue='general' orientation='vertical' className='w-full flex-row items-start gap-4'>
					<TabsList className='flex-col'>
						<TabsTrigger value='general' className='w-full justify-start'>
							General
						</TabsTrigger>
						<TabsTrigger value='members' className='w-full justify-start'>
							Members
						</TabsTrigger>
						<TabsTrigger value='billing' className='w-full justify-start' disabled>
							Billing
						</TabsTrigger>
					</TabsList>
					<TabsContent value='general' className='min-w-0 flex-1 rounded-md border p-3 text-sm text-muted-foreground'>
						Rename the project and choose its default region.
					</TabsContent>
					<TabsContent value='members' className='min-w-0 flex-1 rounded-md border p-3 text-sm text-muted-foreground'>
						Manage roles and pending invitations.
					</TabsContent>
				</Tabs>
			</Specimen>
			<Specimen label='Collapsible'>
				<CollapsibleDemo />
			</Specimen>
			<Specimen label='ScrollArea'>
				<ScrollArea className='h-40 w-full rounded-md border'>
					<div className='p-3'>
						{TAGS.map((tag) => (
							<div key={tag} className='px-1 py-1.5 font-mono text-xs text-muted-foreground'>
								{tag}
							</div>
						))}
					</div>
					<ScrollBar orientation='horizontal' />
				</ScrollArea>
			</Specimen>
			<Specimen label='Resizable' wide>
				<ResizablePanelGroup direction='horizontal' className='h-40 rounded-md border'>
					<ResizablePanel defaultSize={35} className='flex items-center justify-center text-sm text-muted-foreground'>
						Schema
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={65} className='flex items-center justify-center text-sm text-muted-foreground'>
						Rows
					</ResizablePanel>
				</ResizablePanelGroup>
			</Specimen>
			<Specimen label='PageHeader' wide>
				<div className='rounded-md border'>
					<PageHeader
						title='production-db'
						description='PostgreSQL 17 database in us-east-1.'
						actions={
							<>
								<Button size='sm' variant='outline'>
									Logs
								</Button>
								<Button size='sm'>Connect</Button>
							</>
						}
					/>
				</div>
			</Specimen>
		</Section>
	);
}
