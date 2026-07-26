// Native overlay open/close state machine. The Phase-4 analogue of glide's
// imperative editor activation, but as a tiny React hook with NO heavy effects:
// `open(cell)` records the active cell (rect captured by the caller from the cell
// DOM node), `close()` clears it. `handleKeyDown` is a host-attachable helper —
// Enter/F2 open (the caller supplies the cell to open, since only the host knows
// which DOM node is focused), Escape closes.
//
// TODO(Phase 7): Tab should commit-and-open-next; today Tab is left to default.

import { useCallback, useState } from 'react';

export interface OverlayCell {
	rowIndex: number;
	colKey: string;
	anchorRect: DOMRect;
	/** Type-to-edit seed: when set, value editors initialize the input to this char (overwrite). */
	initialText?: string;
	/**
	 * Edit surface for this active cell. `'overlay'` (default when omitted) renders the portal
	 * editor; `'inline'` edits IN PLACE inside the cell (no portal — the cell host renders the
	 * input) yet still rides this controller so nav/clipboard suppression + scroll commit-on-unmount
	 * are shared. The portal (`OverlayManager` / `editorNode`) is skipped for `'inline'`.
	 */
	mode?: 'overlay' | 'inline';
}

export interface OverlayController {
	active: OverlayCell | null;
	isOpen: boolean;
	open: (cell: OverlayCell) => void;
	close: () => void;
	/**
	 * Re-anchor the open overlay to a freshly-measured rect WITHOUT changing the active
	 * cell — the editor-follows-cell-on-scroll path (Stage B). No-op when closed. Keeps
	 * the same {@link OverlayCell} identity for every field except `anchorRect`, so the
	 * editor's local state (in-progress value, focus) survives the reposition.
	 */
	reanchor: (anchorRect: DOMRect) => void;
	/**
	 * Host key handler. Enter/F2 open the cell returned by `resolveCell` (the host
	 * resolves the focused cell + measures its rect); Escape closes. `resolveCell`
	 * may return null (nothing focused / not editable) — then the open is skipped.
	 */
	handleKeyDown: (e: React.KeyboardEvent, resolveCell: () => OverlayCell | null) => void;
}

export function useOverlayController(): OverlayController {
	const [active, setActive] = useState<OverlayCell | null>(null);

	const open = useCallback((cell: OverlayCell) => {
		setActive(cell);
	}, []);

	const close = useCallback(() => {
		setActive(null);
	}, []);

	const reanchor = useCallback((anchorRect: DOMRect) => {
		setActive((prev) => (prev ? { ...prev, anchorRect } : prev));
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, resolveCell: () => OverlayCell | null) => {
			if (e.key === 'Enter' || e.key === 'F2') {
				const cell = resolveCell();
				if (!cell) return;
				e.preventDefault();
				setActive(cell);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				setActive(null);
			}
			// TODO(Phase 7): Tab -> commit current + open next cell.
		},
		[],
	);

	return { active, isOpen: active != null, open, close, reanchor, handleKeyDown };
}
