// The ONE event -> command pipeline of the grid: the command registry, the keymap and
// the interceptor chain, latched so the public `dispatch` stays referentially stable.
import { useCallback, useMemo, useRef } from 'react';

import type { GridCommandContext } from '../../commands/context';
import { makeDispatch, tailObserver, type Dispatch, type Interceptor } from '../../commands/dispatch';
import { DEFAULT_KEYMAP, type Binding } from '../../commands/keymap';
import { createGridCommandRegistry } from '../../commands/registry';
import type { GridCommandRegistry } from '../../commands/types';
import type { DataGridProps } from '../sheets.types';

export function useGridCommandPipeline({
	commands,
	keymap,
	interceptors,
	onCommand,
}: Pick<DataGridProps, 'commands' | 'keymap' | 'interceptors' | 'onCommand'>) {
	// ============== EVENT->COMMAND DISPATCH (P4 Phase 1) ==============
	// ONE interceptable pipeline: every grid event resolves to a named command and runs
	// through `dispatch`. The registry + keymap are latched (so a Phase 2 consumer override
	// is a ref swap, not a new dispatch identity); `ctxRef.current` is the assembled
	// GridCommandContext, repointed each render below (mirrors the openEditor ref-latch).
	// `dispatch` is useCallback([]) reading the refs, so it stays referentially STABLE — the
	// per-cell memo gates on the pointer callbacks that close over it, so it must never churn.
	// PUBLIC CUSTOMIZATION SEAM (P4 Phase 2): registry / keymap / interceptors derive from the
	// consumer props but rebuild ONLY when the prop IDENTITY changes (useMemo), so omitting them
	// is identical to the defaults. Each is latched into a ref so the keydown handler + dispatch
	// read the latest without re-creating. The PUBLIC `dispatch` callback stays referentially
	// STABLE (reads dispatchRef.current), so the per-cell memo never churns; dispatchRef itself is
	// rebuilt when the registry or interceptor list identity changes (additive, no identity leak).
	const registry = useMemo<GridCommandRegistry>(() => createGridCommandRegistry(commands), [commands]);
	// Consumer bindings scan FIRST (resolveKeyCommand is first-match-wins) so a rebind of a
	// built-in chord wins over the default; the defaults follow as the fallback set.
	const fullKeymap = useMemo<Binding[]>(() => [...(keymap ?? []), ...DEFAULT_KEYMAP], [keymap]);
	const keymapRef = useRef<Binding[]>(fullKeymap);
	keymapRef.current = fullKeymap;
	// Consumer interceptors are OUTERMOST (first-listed); the onCommand tail observer is appended
	// LAST so it sits innermost (after every consumer interceptor) and observes the real result.
	const chain = useMemo<Interceptor[]>(
		() => [...(interceptors ?? []), ...(onCommand ? [tailObserver(onCommand)] : [])],
		[interceptors, onCommand],
	);
	const ctxRef = useRef<GridCommandContext>(undefined as unknown as GridCommandContext);
	const dispatchRef = useRef<Dispatch>(undefined as unknown as Dispatch);
	dispatchRef.current = useMemo<Dispatch>(() => makeDispatch(registry, () => ctxRef.current, chain), [registry, chain]);
	const dispatch = useCallback<Dispatch>((command, native, payload) => dispatchRef.current(command, native, payload), []);

	// Enabled-state probe for the menu items: run the resolved command's `canRun` against the latched
	// context (same gate the dispatch core applies). A missing canRun means "always runnable".
	const isCommandEnabled = useCallback(
		(commandId: string, payload?: unknown) => {
			const cmd = registry.get(commandId);
			return cmd ? (cmd.canRun ? cmd.canRun(ctxRef.current, payload) : true) : false;
		},
		[registry],
	);

	return { registry, keymapRef, ctxRef, dispatch, isCommandEnabled };
}
