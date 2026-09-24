'use client';

import { Plus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../command';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import { focusRingClass, hitAreaClass, pressClass } from './primitives';
import type { Integration } from './types';

/** Unconnected apps grouped as the directory groups them: models first, then categories. */
function groupAvailable(integrations: Integration[], categories: { id: string; label: string }[], isConnected: (id: string) => boolean) {
	const byCategory = new Map<string, Integration[]>();
	for (const integration of integrations) {
		if (isConnected(integration.id)) continue;
		const key = integration.categoryId ?? 'models';
		const group = byCategory.get(key);
		if (group) group.push(integration);
		else byCategory.set(key, [integration]);
	}
	return [{ id: 'models', label: 'Models' }, ...categories]
		.map((group) => ({ ...group, items: byCategory.get(group.id) ?? [] }))
		.filter((group) => group.items.length > 0);
}

/** "+" button that opens a searchable list of apps to connect. */
function AppPicker({ collapsed, onPick }: { collapsed: boolean; onPick?: () => void }) {
	const { data, isConnected, requestConnect } = useAgentsBuilder();
	const [open, setOpen] = React.useState(false);
	const groups = open ? groupAvailable(data.integrations, data.categories, isConnected) : [];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger
					render={
						<PopoverTrigger
							aria-label="Connect an app"
							className={cn(
								'grid shrink-0 cursor-pointer place-items-center rounded-md bg-card text-foreground shadow-card hover:bg-muted',
								collapsed ? 'size-8' : 'size-6',
								pressClass,
								focusRingClass,
								hitAreaClass,
							)}
						>
							<Plus aria-hidden="true" className="size-3.5" />
						</PopoverTrigger>
					}
				/>
				<TooltipContent side={collapsed ? 'right' : 'top'}>Connect an app</TooltipContent>
			</Tooltip>
			<PopoverContent side="right" align="end" sideOffset={8} className="w-64 p-0">
				<Command>
					<CommandInput placeholder="Search apps" />
					<CommandList className="max-h-80 p-1">
						<CommandEmpty>No apps matched</CommandEmpty>
						{groups.map((group) => (
							<CommandGroup key={group.id} heading={group.label}>
								{group.items.map((integration) => (
									<CommandItem
										key={integration.id}
										value={integration.name}
										className="gap-2"
										onSelect={() => {
											setOpen(false);
											onPick?.();
											requestConnect({ integrationId: integration.id });
										}}
									>
										<IntegrationMark integration={integration} size="xs" className="size-5" />
										{integration.name}
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { AppPicker };
