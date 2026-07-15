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
				className='bg-card border-border/60 flex h-14 items-center justify-between border-b px-4'
			>
				<div className='flex items-center gap-4'>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setLeftPanelVisible(!leftPanelVisible)}
						className='h-8 w-8 p-0'
					>
						{leftPanelVisible ? <PanelLeftClose className='h-4 w-4' /> : <PanelLeftOpen className='h-4 w-4' />}
					</Button>

					<Tabs value={activeTab} onValueChange={setActiveTab}>
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
						variant='ghost'
						size='sm'
						className='text-muted-foreground hover:text-foreground h-8 gap-1.5'
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
