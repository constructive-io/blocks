'use client';

import * as React from 'react';

import { useDataRooms } from './data-rooms-context';
import type { DataRoomsCommand } from './types';

const FALLBACK = 'That change couldn’t be saved. Try again.';

/**
 * Runs commands for one control or form: tracks whether one is pending, keeps
 * the host's error message, and reports whether changes are locked because
 * the workspace is being previewed as someone else. Views show controls by
 * `can()` alone and disable them with `locked`, so a preview shows exactly
 * what the person would see.
 */
export function useCommand() {
	const { run, previewAs } = useDataRooms();
	const [pending, setPending] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	/** Resolves true once the host saved the change, false when it refused. */
	const execute = React.useCallback(
		async (command: DataRoomsCommand) => {
			setPending(true);
			setError(null);
			try {
				await run(command);
				return true;
			} catch (reason) {
				setError(reason instanceof Error && reason.message ? reason.message : FALLBACK);
				return false;
			} finally {
				setPending(false);
			}
		},
		[run],
	);

	return {
		run: execute,
		pending,
		error,
		clearError: React.useCallback(() => setError(null), []),
		/** Changes are off while previewing as someone else. */
		locked: previewAs !== null,
	};
}
