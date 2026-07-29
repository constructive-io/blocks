'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Badge } from '../badge';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';

import { COMPACT_NODE_WIDTH, NODE_WIDTH } from './layout';
import { useNodeActions, useOrgChartContext } from './org-chart-context';
import { getInitials } from './org-chart-utils';
import type { OrgChartNode } from './org-chart.types';

function OrgChartNodeComponent({ id, data, positionAbsoluteX }: NodeProps<OrgChartNode>) {
	const { selectedNodeId, dropTargetNodeId, editable } = useOrgChartContext();
	const { onEditNode, onRemoveNode } = useNodeActions();
	const isSelected = selectedNodeId === id;
	const isDropTarget = dropTargetNodeId === id;
	const actionOnLeadingEdge = positionAbsoluteX > 0;
	const displayName = data.displayName ?? 'person';
	const reportCountLabel = `${data.childCount} direct ${data.childCount === 1 ? 'report' : 'reports'}`;
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div
			style={{ width: data.isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH }}
			className={cn(
				'group bg-card dark:bg-muted relative rounded-xl border shadow-sm transition-[border-color,box-shadow,scale] duration-200 motion-reduce:transition-none',
				'border-border/60',
				isSelected && 'ring-primary ring-2 ring-offset-2 dark:ring-offset-zinc-900',
				isDropTarget && 'ring-primary/50 border-primary scale-105 ring-2',
			)}
		>
			{!data.isRoot && (
				<Handle type='target' position={Position.Top} className='!bg-border !size-2 !rounded-full !border-0' />
			)}

			<div className={cn('flex items-center gap-3 px-4 py-3', data.isCompact && 'gap-2 px-3')}>
				<Avatar className={cn('size-10 shrink-0', data.isCompact && 'size-7')}>
					{data.avatarUrl && (
						<AvatarImage src={data.avatarUrl} alt={data.displayName ?? ''} />
					)}
					<AvatarFallback className='bg-primary/10 text-primary text-xs font-medium'>
						{getInitials(data.displayName)}
					</AvatarFallback>
				</Avatar>
				<div className='min-w-0 flex-1'>
					<p className={cn('text-foreground truncate text-base leading-tight font-semibold', data.isCompact && 'text-sm')}>
						{data.displayName ?? 'Unknown'}
					</p>
					{data.positionTitle && (
						<p className={cn('text-muted-foreground truncate text-sm leading-tight', data.isCompact && 'text-xs')}>
							{data.positionTitle}
						</p>
					)}
				</div>
				{(editable || data.childCount > 0) && (
					<div className={cn('relative size-7 shrink-0', actionOnLeadingEdge && 'order-first')}>
						{data.childCount > 0 && (!data.isCompact || !editable) && (
							<Badge
								aria-label={reportCountLabel}
								variant='secondary'
								className={cn(
									'absolute inset-0 flex size-7 items-center justify-center p-0 text-[10px] transition-opacity duration-150 ease-out motion-reduce:transition-none',
									editable && 'group-hover:opacity-0 group-focus-within:opacity-0 pointer-coarse:opacity-0',
									isMenuOpen && 'opacity-0',
								)}
							>
								{data.childCount}
							</Badge>
						)}
						{editable && (
							<div
								className={cn(
									'nodrag nopan absolute inset-0 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none',
									data.isCompact && 'opacity-100',
									isMenuOpen && 'opacity-100',
								)}
							>
								<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
									<DropdownMenuTrigger asChild>
										<Button
											aria-label={`Actions for ${displayName}${data.childCount > 0 ? `, ${reportCountLabel}` : ''}`}
											variant='ghost'
											size='icon'
											className='relative size-7 overflow-visible rounded-full'
											onClick={(e) => e.stopPropagation()}
										>
											<Ellipsis aria-hidden className='size-4' />
											{data.isCompact && data.childCount > 0 ? (
												<span
													aria-hidden
													className='bg-primary text-primary-foreground ring-card absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-none ring-2'
												>
													{data.childCount}
												</span>
											) : null}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align='start'
										side={actionOnLeadingEdge ? 'left' : 'right'}
										className={cn('-translate-y-3.5', actionOnLeadingEdge ? '-translate-x-1' : 'translate-x-1')}
									>
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
						)}
					</div>
				)}
			</div>

			<Handle type='source' position={Position.Bottom} className='!bg-border !size-2 !rounded-full !border-0' />
		</div>
	);
}

export const OrgChartNodeMemo = memo(OrgChartNodeComponent);
