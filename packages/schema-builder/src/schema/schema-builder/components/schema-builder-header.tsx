'use client';

import { Button } from '@constructive-io/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { Eye, EyeOff, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { SchemaBuilderTab } from '@/blocks/schema/schema-builder-core/context/block-config';

interface SchemaBuilderHeaderProps {
	leftPanelVisible: boolean;
	setLeftPanelVisible: (visible: boolean) => void;
	activeTab: string;
	setActiveTab: (tab: string) => void;
	showSystemTablesInSidebar: boolean;
	setShowSystemTablesInSidebar: (show: boolean) => void;
	hasSystemTablesInCurrentSchema: boolean;
	tabs?: readonly SchemaBuilderTab[];
}

export function SchemaBuilderHeader({
	leftPanelVisible,
	setLeftPanelVisible,
	activeTab,
	setActiveTab,
	showSystemTablesInSidebar,
	setShowSystemTablesInSidebar,
	hasSystemTablesInCurrentSchema,
	tabs = [],
}: SchemaBuilderHeaderProps) {
	return (
		<>
			<div
				data-testid='schema-builder-header'
				className='bg-card border-border/60 flex min-h-14 items-center justify-between gap-2 overflow-hidden border-b px-2 sm:px-4'
			>
				<div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-4'>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setLeftPanelVisible(!leftPanelVisible)}
						className='hidden size-8 p-0 sm:inline-flex'
						aria-label={leftPanelVisible ? 'Hide table sidebar' : 'Show table sidebar'}
					>
						{leftPanelVisible ? <PanelLeftClose className='h-4 w-4' /> : <PanelLeftOpen className='h-4 w-4' />}
					</Button>

					<Tabs className='min-w-0 flex-1 overflow-x-auto' value={activeTab} onValueChange={setActiveTab}>
						<TabsList>
							<TabsTrigger value='editor'>Structure</TabsTrigger>
							<TabsTrigger value='relationships'>Relationships</TabsTrigger>
							<TabsTrigger value='indexes'>Indexes</TabsTrigger>
							<TabsTrigger value='security'>Policies</TabsTrigger>
							{tabs.filter((tab) => !tab.hidden).map((tab) => (
								<TabsTrigger key={tab.id} value={tab.id} onMouseEnter={() => void tab.preload?.()}>
									{tab.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>

				{hasSystemTablesInCurrentSchema && (
					<Button
						aria-label={showSystemTablesInSidebar ? 'Hide system tables' : 'Show system tables'}
						variant='ghost'
						size='sm'
						className='text-muted-foreground hover:text-foreground hidden h-8 shrink-0 gap-1.5 px-3 sm:inline-flex'
						onClick={() => setShowSystemTablesInSidebar(!showSystemTablesInSidebar)}
						aria-pressed={showSystemTablesInSidebar}
					>
						{showSystemTablesInSidebar ? <Eye className='size-4' /> : <EyeOff className='size-4' />}
						<span className='text-xs'>System tables</span>
					</Button>
				)}
			</div>
		</>
	);
}
