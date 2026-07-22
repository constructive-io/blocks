/**
 * The right-click CONTEXT MENU (Stage B) — the showcase of the command layer: a menu is just
 * another EVENT SOURCE that resolves to named commands and runs through the SAME `dispatch`
 * pipeline as keys / clicks. Rendered ONCE at the grid level (never per-cell, so the per-cell
 * memo is untouched); the cell host calls `open(col, row, clientX, clientY)` on `onContextMenu`.
 *
 * Anchoring: Base UI's Menu anchors to its Trigger. We render a 0×0 FIXED trigger at the pointer
 * coordinates and toggle the controlled `open`, so the popup floats at the right-clicked cell.
 *
 * The ITEM MODEL is a pure builder (`buildContextMenuItems`) so the action→command mapping +
 * disabled gating is unit-testable WITHOUT the Base-UI popup (which needs a real layout env). The
 * component maps the model to <DropdownMenuItem>s. "Delete row(s)" is the one destructive action —
 * its `run` requests the SAME AlertDialog confirm the toolbar Delete uses.
 */
import { useState, type ReactNode } from 'react';
import { RiAddLine, RiClipboardLine, RiDeleteBin6Line, RiEraserLine, RiScissorsLine, RiFileCopyLine } from '@remixicon/react';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@constructive-io/ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';

/** Where the menu is anchored + the cell it acts on. `null` = closed. */
export interface ContextMenuState {
	clientX: number;
	clientY: number;
}

/** One row of the menu (or a separator). `run` fires on click; `disabled` greys it out. */
export interface ContextMenuItem {
	key: string;
	separator?: boolean;
	label?: string;
	icon?: ReactNode;
	shortcut?: string;
	destructive?: boolean;
	disabled?: boolean;
	run?: () => void;
}

export interface BuildContextMenuItemsArgs {
	/** Dispatch a command id through the grid's stable dispatch pipeline. */
	onAction: (commandId: string) => void;
	/** True when the command's `canRun` passes against the latched context. */
	isEnabled: (commandId: string) => boolean;
	/** Append a draft row (the toolbar Add-row path). */
	onAddRow: () => void;
	/** Open the destructive delete confirm (the AlertDialog). */
	requestDelete: () => void;
	/** Count of currently selected rows — gates Delete + drives its label. */
	selectedRowCount: number;
	canAddRows?: boolean;
	canDeleteRows?: boolean;
}

/**
 * Pure menu model — the single source of truth for the items, their command mapping, and their
 * disabled state. Tested directly (no DOM). Clipboard / clear items dispatch their command id via
 * `onAction` and are disabled when `isEnabled(id)` is false; Add row / Delete use dedicated paths.
 */
export function buildContextMenuItems({
	onAction,
	isEnabled,
	onAddRow,
	requestDelete,
	selectedRowCount,
	canAddRows = true,
	canDeleteRows = true,
}: BuildContextMenuItemsArgs): ContextMenuItem[] {
	const cmd = (key: string, commandId: string, label: string, icon: ReactNode, shortcut?: string): ContextMenuItem => ({
		key,
		label,
		icon,
		shortcut,
		disabled: !isEnabled(commandId),
		run: () => onAction(commandId),
	});
	return [
		cmd('copy', 'clipboard.copy', 'Copy', <RiFileCopyLine className='size-4' aria-hidden='true' />, '⌘C'),
		cmd('cut', 'clipboard.cut', 'Cut', <RiScissorsLine className='size-4' aria-hidden='true' />, '⌘X'),
		cmd('paste', 'clipboard.paste', 'Paste', <RiClipboardLine className='size-4' aria-hidden='true' />, '⌘V'),
		cmd('clear', 'cell.clear', 'Clear', <RiEraserLine className='size-4' aria-hidden='true' />),
		{ key: 'sep', separator: true },
		{
			key: 'add-row',
			label: 'Add row',
			icon: <RiAddLine className='size-4' aria-hidden='true' />,
			disabled: !canAddRows,
			run: onAddRow,
		},
		{
			key: 'delete-rows',
			label: selectedRowCount > 1 ? `Delete ${selectedRowCount} rows` : 'Delete row',
			icon: <RiDeleteBin6Line className='size-4' aria-hidden='true' />,
			destructive: true,
			disabled: !canDeleteRows || selectedRowCount === 0,
			run: requestDelete,
		},
	];
}

export interface SheetsContextMenuProps {
	/** Open anchor + position; `null` keeps the menu closed. */
	state: ContextMenuState | null;
	/** Close the menu (clears `state`). */
	onClose: () => void;
	/** Dispatch a command id through the grid's stable dispatch pipeline. */
	onAction: (commandId: string) => void;
	/** True when the command's `canRun` passes against the latched context. */
	isEnabled: (commandId: string) => boolean;
	/** Append a draft row (the toolbar Add-row path). */
	onAddRow: () => void;
	/** Delete the selected row(s) (the toolbar deleteSelected path) — guarded by the AlertDialog. */
	onDeleteRows: () => void;
	/** Count of currently selected rows — drives the destructive dialog copy. */
	selectedRowCount: number;
	canAddRows?: boolean;
	canDeleteRows?: boolean;
}

export function SheetsContextMenu({
	state,
	onClose,
	onAction,
	isEnabled,
	onAddRow,
	onDeleteRows,
	selectedRowCount,
	canAddRows = true,
	canDeleteRows = true,
}: SheetsContextMenuProps) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const open = state !== null;

	const items = buildContextMenuItems({
		onAction,
		isEnabled,
		onAddRow,
		requestDelete: () => setConfirmDelete(true),
		selectedRowCount,
		canAddRows,
		canDeleteRows,
	});

	return (
		<>
			<DropdownMenu open={open} onOpenChange={(next) => !next && onClose()}>
				{/* 0×0 fixed anchor at the pointer — the menu floats from here. */}
				<DropdownMenuTrigger
					aria-hidden
					tabIndex={-1}
					style={{
						position: 'fixed',
						left: state?.clientX ?? 0,
						top: state?.clientY ?? 0,
						width: 0,
						height: 0,
					}}
				/>
				<DropdownMenuContent align='start'>
					{items.map((item) =>
						item.separator ? (
							<DropdownMenuSeparator key={item.key} />
						) : (
							<DropdownMenuItem
								key={item.key}
								variant={item.destructive ? 'destructive' : 'default'}
								disabled={item.disabled}
								onClick={() => {
									// Run then close — a menu pick is a one-shot (the popup dismisses).
									item.run?.();
									onClose();
								}}
							>
								{item.icon}
								{item.label}
								{item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
							</DropdownMenuItem>
						),
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Destructive confirm — mirrors the toolbar Delete AlertDialog. Driven open after the
			    menu closes so the two overlays never fight for focus. */}
			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete rows?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete {selectedRowCount} {selectedRowCount === 1 ? 'row' : 'rows'}. This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive text-white hover:bg-destructive/90'
							onClick={() => {
								onDeleteRows();
								setConfirmDelete(false);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
