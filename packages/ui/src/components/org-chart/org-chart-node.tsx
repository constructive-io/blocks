'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Badge } from '../badge';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';

import { NODE_WIDTH } from './layout';
import { useNodeActions, useOrgChartContext } from './org-chart-context';
import { getInitials } from './org-chart-utils';
import type { OrgChartNode } from './org-chart.types';

function OrgChartNodeComponent({ id, data }: NodeProps<OrgChartNode>) {
	const { selectedNodeId, dropTargetNodeId, editable } = useOrgChartContext();
	const { onEditNode, onRemoveNode } = useNodeActions();
	const isSelected = selectedNodeId === id;
	const isDropTarget = dropTargetNodeId === id;
	const [isHovered, setIsHovered] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div
			style={{ width: NODE_WIDTH }}
			className={cn(
				'bg-card dark:bg-muted relative rounded-xl border shadow-sm transition-all',
				'border-border/60',
				isSelected && 'ring-primary ring-2 ring-offset-2 dark:ring-offset-zinc-900',
				isDropTarget && 'ring-primary/50 border-primary scale-105 ring-2',
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{!data.isRoot && (
				<Handle type='target' position={Position.Top} className='!bg-border !size-2 !rounded-full !border-0' />
			)}

			<div className='flex items-center gap-3 px-4 py-3'>
				<Avatar className='size-10 shrink-0'>
					{data.avatarUrl && (
						<AvatarImage src={data.avatarUrl} alt={data.displayName ?? ''} />
					)}
					<AvatarFallback className='bg-primary/10 text-primary text-xs font-medium'>
						{getInitials(data.displayName)}
					</AvatarFallback>
				</Avatar>
				<div className='min-w-0 flex-1'>
					<p className='text-foreground truncate text-sm font-semibold'>{data.displayName ?? 'Unknown'}</p>
					{data.positionTitle && <p className='text-muted-foreground truncate text-xs'>{data.positionTitle}</p>}
				</div>
				{editable && (isHovered || isMenuOpen) ? (
					<div className='nodrag nopan shrink-0'>
						<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									className='size-7 rounded-full'
									onClick={(e) => e.stopPropagation()}
								>
									<Ellipsis className='size-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='start' side='right' className='translate-x-1 -translate-y-3.5'>
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										setIsMenuOpen(false);
										onEditNode(data);
									}}
								>
									<Pencil className='mr-2 size-3.5' />
									Edit Position
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className='text-destructive hover:bg-destructive/10 focus:bg-destructive/10 hover:text-destructive
										focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive'
									onClick={(e) => {
										e.stopPropagation();
										setIsMenuOpen(false);
										onRemoveNode(data);
									}}
								>
									<Trash2 className='mr-2 size-3.5' />
									Remove from Chart
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				) : (
					data.childCount > 0 && (
						<Badge variant='secondary' className='shrink-0 text-[10px]'>
							{data.childCount}
						</Badge>
					)
				)}
			</div>

			<Handle type='source' position={Position.Bottom} className='!bg-border !size-2 !rounded-full !border-0' />
		</div>
	);
}

export const OrgChartNodeMemo = memo(OrgChartNodeComponent);
