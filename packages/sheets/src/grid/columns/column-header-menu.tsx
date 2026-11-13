/**
 * The menu in a column header: sort, filter by the field, move, freeze, hide.
 * Every item runs a named command for this column, so it is interceptable and
 * has the same keyboard equivalents; an item whose command cannot run is
 * disabled and says why.
 */
import { Fragment } from 'react';
import {
	RiArrowDownSLine,
	RiArrowLeftLine,
	RiArrowRightLine,
	RiEyeOffLine,
	RiFilterLine,
	RiPushpinLine,
	RiSortAsc,
	RiSortDesc,
	RiUnpinLine,
} from '@remixicon/react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';

import { cn } from '../../utils/cn';
import { INSTANT_POPUP } from '../popup-classes';
import type { ColumnCommandPayload } from '../../commands/registry';
import { viewCommandReason } from '../view-state/view-command-target';
import type { SheetsViewBindings } from '../view-state/use-sheets-view';

export interface ColumnHeaderMenuProps {
	colKey: string;
	view: SheetsViewBindings;
	/** Run a command with this column as its payload. */
	run: (commandId: string, payload: ColumnCommandPayload) => void;
	/** Whether a command can run with this column as its payload. */
	canRun: (commandId: string, payload: ColumnCommandPayload) => boolean;
}

interface Item {
	commandId: string;
	label: string;
	icon: React.ReactNode;
	shortcut?: string;
}

const icon = (Icon: typeof RiSortAsc) => <Icon className='size-4' aria-hidden='true' />;

export function ColumnHeaderMenu({ colKey, view, run, canRun }: ColumnHeaderMenuProps) {
	const { layout } = view;
	const label = view.columnLabel(colKey);
	const open = layout.menuColumn === colKey;
	const frozen = layout.visibleKeys.indexOf(colKey) < layout.frozenCount;
	const payload: ColumnCommandPayload = { colKey };

	const groups: Item[][] = [
		[
			{ commandId: 'view.sortAscending', label: 'Sort ascending', icon: icon(RiSortAsc) },
			{ commandId: 'view.sortDescending', label: 'Sort descending', icon: icon(RiSortDesc) },
			{ commandId: 'view.filterByColumn', label: 'Filter by this field', icon: icon(RiFilterLine) },
		],
		[
			{ commandId: 'column.moveLeft', label: 'Move left', icon: icon(RiArrowLeftLine), shortcut: '⌥⇧←' },
			{ commandId: 'column.moveRight', label: 'Move right', icon: icon(RiArrowRightLine), shortcut: '⌥⇧→' },
			frozen
				? { commandId: 'column.unfreeze', label: 'Unfreeze fields', icon: icon(RiUnpinLine) }
				: { commandId: 'column.freezeUpTo', label: 'Freeze up to this field', icon: icon(RiPushpinLine) },
			{ commandId: 'column.hide', label: 'Hide field', icon: icon(RiEyeOffLine) },
		],
	];

	return (
		<DropdownMenu open={open} onOpenChange={(next) => layout.setMenuColumn(next ? colKey : null)}>
			<DropdownMenuTrigger
				aria-label={`Field options for ${label}`}
				data-part-id='sheets-header-menu-trigger'
				className={cn(
					'text-muted-foreground hover:text-foreground hover:bg-muted rounded p-0.5 focus-visible:opacity-100',
					!open && 'opacity-0 group-hover:opacity-100',
				)}
			>
				<RiArrowDownSLine className='size-3.5' aria-hidden='true' />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' aria-label={`Options for ${label}`} className={INSTANT_POPUP}>
				{groups.map((group, index) => (
					<Fragment key={index}>
						{index > 0 && <DropdownMenuSeparator />}
						{group.map((item) => {
							const enabled = canRun(item.commandId, payload);
							const reason = enabled ? null : viewCommandReason(view, item.commandId, colKey);
							return (
								<DropdownMenuItem
									key={item.commandId}
									disabled={!enabled}
									title={reason ?? undefined}
									onClick={() => {
										layout.setMenuColumn(null);
										run(item.commandId, payload);
									}}
								>
									{item.icon}
									{item.label}
									{item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
								</DropdownMenuItem>
							);
						})}
					</Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
