// The right-click (and Shift+F10) context menu: its anchor state, and activating the
// pressed cell first when it sits outside the current selection.
import { useCallback, useState, type MutableRefObject } from 'react';

import type { Dispatch } from '../../commands/dispatch';
import type { SheetsSelection } from '../../selection/selection-model';
import type { ContextMenuState } from '../sheets.context-menu';

export function useGridContextMenu({
	selectionRef,
	dispatch,
}: {
	selectionRef: MutableRefObject<SheetsSelection | undefined>;
	dispatch: Dispatch;
}) {
	// ============== RIGHT-CLICK CONTEXT MENU (Stage B) ==============
	// A menu is just another EVENT SOURCE → dispatch. State is the pointer anchor (null = closed),
	// rendered ONCE at the grid level. `handleContextMenu` is STABLE (reads selectionRef + the stable
	// dispatch), so it never busts the per-cell memo. When the right-clicked cell sits OUTSIDE the
	// current active cell / selection range, we activate it first so the menu acts on the clicked cell.
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const handleContextMenu = useCallback(
		(col: number, row: number, clientX: number, clientY: number) => {
			const sel = selectionRef.current;
			const active = sel?.current?.cell;
			const range = sel?.current?.range;
			const inRange =
				!!range && col >= range.x && col < range.x + range.width && row >= range.y && row < range.y + range.height;
			const isActive = !!active && active[0] === col && active[1] === row;
			if (!isActive && !inRange) dispatch('cell.activate', undefined, { col, row });
			setContextMenu({ clientX, clientY });
		},
		[dispatch],
	);
	const closeContextMenu = useCallback(() => setContextMenu(null), []);

	return { contextMenu, setContextMenu, handleContextMenu, closeContextMenu };
}
