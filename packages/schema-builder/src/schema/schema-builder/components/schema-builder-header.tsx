'use client';

import { Tabs, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { focusRingClass, pressClass, TooltipIconButton } from '@constructive-io/ui/workspace-kit';
import { Columns3, Eye, EyeOff, ListTree, Network, PanelLeft, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { SchemaBuilderTab } from '@/blocks/schema/schema-builder-core/context/block-config';
import { cn } from '@/lib/utils';

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

const BUILT_IN_TABS: readonly { value: string; label: string; icon: LucideIcon }[] = [
	{ value: 'editor', label: 'Structure', icon: Columns3 },
	{ value: 'relationships', label: 'Relationships', icon: Network },
	{ value: 'indexes', label: 'Indexes', icon: ListTree },
	{ value: 'security', label: 'Policies', icon: ShieldCheck },
];

const TRIGGER = cn(
	'h-7 min-h-7 shrink-0 gap-1.5 rounded-[6px] px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground',
	'data-[active]:font-medium pointer-coarse:min-h-9 [&_svg]:size-3.5 [&_svg]:text-muted-foreground data-[active]:[&_svg]:text-foreground',
);

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
		<div
			data-testid='schema-builder-header'
			className='flex h-12 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-dashed border-foreground/10 px-3 sm:px-4'
		>
			<div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
				{leftPanelVisible ? null : (
					<TooltipIconButton className='hidden sm:grid' label='Show table sidebar' onClick={() => setLeftPanelVisible(true)}>
						<PanelLeft aria-hidden='true' className='size-3.5' />
					</TooltipIconButton>
				)}

				<Tabs className='min-w-0 flex-1 gap-0' value={activeTab} onValueChange={setActiveTab}>
					<TabsList
						className={cn(
							'bg-muted/70 h-auto max-w-full justify-start overflow-x-auto rounded-lg p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
							'[&>[data-slot=tabs-indicator]]:bg-card [&>[data-slot=tabs-indicator]]:rounded-[6px] [&>[data-slot=tabs-indicator]]:shadow-card dark:[&>[data-slot=tabs-indicator]]:bg-foreground/10',
						)}
					>
						{BUILT_IN_TABS.map(({ value, label, icon: Icon }) => (
							<TabsTrigger className={TRIGGER} key={value} value={value}>
								<Icon aria-hidden='true' />
								<span className={cn(value !== activeTab && 'max-md:sr-only')}>{label}</span>
							</TabsTrigger>
						))}
						{tabs.filter((tab) => !tab.hidden).map((tab) => (
							<TabsTrigger className={TRIGGER} key={tab.id} value={tab.id} onMouseEnter={() => void tab.preload?.()}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>

			{hasSystemTablesInCurrentSchema && (
				<button
					type='button'
					aria-label={showSystemTablesInSidebar ? 'Hide system tables' : 'Show system tables'}
					aria-pressed={showSystemTablesInSidebar}
					className={cn(
						'hidden h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] sm:inline-flex',
						showSystemTablesInSidebar
							? 'bg-overlay-hover text-foreground'
							: 'text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
						pressClass,
						focusRingClass,
					)}
					onClick={() => setShowSystemTablesInSidebar(!showSystemTablesInSidebar)}
				>
					{showSystemTablesInSidebar ? <Eye aria-hidden='true' className='size-3.5' /> : <EyeOff aria-hidden='true' className='size-3.5' />}
					System tables
				</button>
			)}
		</div>
	);
}
